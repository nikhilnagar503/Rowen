/**
 * useCsvHeroApp.ts — Central Application State & Orchestration Hook
 *
 * WHY THIS FILE EXISTS:
 * React components should be thin and focused on rendering. All the complex
 * async logic (AI calls, Python execution, agent loops, loading flags) would
 * make App.tsx enormous if written inline. This hook extracts all of that into
 * one well-documented place, making it easy to understand the full app lifecycle
 * and easy to test each action in isolation.
 *
 * WHAT IT DOES (the full lifecycle):
 *
 * 1. STATE OWNERSHIP — owns every piece of cross-screen state:
 *    fileName, dfInfo, messages, recommendedActions, isLoading, isPyodideReady.
 *
 * 2. PYODIDE LAZY INIT (`ensurePyodide`) — only boots the Python/WASM runtime
 *    when the user first uploads a file. Avoids paying the ~10 s startup cost
 *    until it is actually needed.
 *
 * 3. FILE LOAD (`handleFileLoad`) — called when user uploads a CSV:
 *    a) Boots Pyodide if needed.
 *    b) Calls `loadCSV()` → pandas reads the CSV → returns DataFrameInfo.
 *    c) Generates dataset-specific one-click recommended actions via AI.
 *    d) Posts a system message showing rows × columns.
 *    e) Calls AI onboarding to greet user and ask what they want to do next.
 *
 * 4. AGENT LOOP (`runAgentLoop`) — the core multi-step autonomous analysis engine:
 *    a) Calls `createAgentPlan()` → AI returns a 1-3 step JSON plan.
 *    b) For each step: calls `sendMessage()` → gets explanation + Python code.
 *    c) Runs the code in Pyodide → captures stdout text + matplotlib chart URL.
 *    d) Calls `sendReflection()` → AI reasons about what was found.
 *    e) Calls `shouldContinueAgent()` → AI decides if another step adds value.
 *    f) Posts system messages at each stage so users can follow the plan.

 * 5. CHAT (`handleSendMessage`) — wraps runAgentLoop for regular user messages.
 *
 * 6. RECOMMENDED ACTIONS (`handleRunRecommendedAction`) — same as chat but
 *    pre-fills the user message with a suggested goal.
 *
 * 7. AUTOPILOT (`handleRunAutopilot`) — fires a full multi-goal preset prompt
 *    that covers quality check + analysis + visualization + summary.
 *
 * 8. DOWNLOAD (`handleDownload`) — exports the current in-memory `df` as CSV.
 *
 * 9. RESET (`handleReset`) — clears all state back to the initial empty session.
 *
 * ROLE IN THE PRODUCT:
 * 
 * This is the "brain" of CSVHero. Every user action ultimately flows through
 * this hook. UI components are pure rendering layers that just call the handlers
 * and display the state returned here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { initPyodide, loadCSV, executeCode, getCleanCSV } from '../lib/pyodide';
import {
  sendMessage,
  generateRecommendedActions,
  generateOnboardingMessage,
} from '../lib/ai';
import { fetchLatestSession, fetchSessionById, fetchSessionList, syncSession } from '../lib/persistence';
import type {
  ChatRuntimeOptions,
  DataFrameInfo,
  Message,
  PersistedSession,
  PersistedSessionSummary,
  SyncStatus,
} from '../types/index';
import { NICHE } from '../config/niche';

const newId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const OMIT_DATASET_FROM_CLOUD = true;

function getLatestGoal(messages: Message[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
}

function toDatasetTitle(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '') || fileName;
}

function summarizeSession(session: PersistedSession): PersistedSessionSummary {
  const title = session.sessionTitle?.trim() || session.fileName?.trim() || session.latestGoal?.trim() || 'Untitled session';

  return {
    id: session.id,
    title,
    sessionTitle: session.sessionTitle,
    fileName: session.fileName,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
  };
}

function getQualitySnapshot(info: DataFrameInfo) {
  const rows = info.shape[0];
  const columns = info.shape[1];
  const missingTotal = Object.values(info.missing).reduce((acc, count) => acc + count, 0);
  const duplicates = info.duplicates;
  const totalCells = Math.max(rows * columns, 1);
  const missingRatio = missingTotal / totalCells;
  const duplicateRatio = rows > 0 ? duplicates / rows : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - (missingRatio * 65 + duplicateRatio * 35) * 100)));

  return {
    rows,
    columns,
    missingTotal,
    duplicates,
    score,
  };
}

/**
 * useCsvHeroApp
 *
 * Centralized orchestration hook for CSVHero.
 *
 * Responsibilities:
 * 1) Own all cross-screen state (file, dataframe metadata, messages, loading flags, settings)
 * 2) Coordinate AI calls and Python execution lifecycle
 * 3) Expose a small action API to UI components
 *
 * This keeps presentational components simple and focused on rendering.
 */
export function useCsvHeroApp() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Dataset/session state
  const [fileName, setFileName] = useState<string | null>(null);
  const [dfInfo, setDfInfo] = useState<DataFrameInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendedActions, setRecommendedActions] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionList, setSessionList] = useState<PersistedSessionSummary[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');
  const [requiresFileReload, setRequiresFileReload] = useState(false);
  const [currentAgentActivity, setCurrentAgentActivity] = useState<string | null>(null);
  const [runtimeOptions, setRuntimeOptions] = useState<ChatRuntimeOptions>({
    model: 'gpt-4o-mini',
    toolsEnabled: true,
    connectorsEnabled: true,
    advancedReasoning: false,
  });

  const restoreStartedRef = useRef(false);
  const lastSyncedFingerprintRef = useRef('');

  // Generic async loading state for chat/analysis actions
  const [isLoading, setIsLoading] = useState(false);

  // Pyodide lifecycle flags
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);

  const latestGoal = useMemo(() => getLatestGoal(messages), [messages]);
  const persistedDfInfo = useMemo(
    () => (OMIT_DATASET_FROM_CLOUD ? null : dfInfo),
    [dfInfo]
  );
  const syncFingerprint = useMemo(() => JSON.stringify({
    sessionTitle,
    fileName,
    fileNames,
    dfInfo: persistedDfInfo,
    messages,
    recommendedActions,
    latestGoal,
  }), [fileName, fileNames, latestGoal, messages, persistedDfInfo, recommendedActions, sessionTitle]);

  const qualitySummary = useMemo(() => {
    if (!dfInfo) {
      return null;
    }

    return getQualitySnapshot(dfInfo);
  }, [dfInfo]);

  const applySessionState = useCallback((session: PersistedSession | null) => {
    setCurrentAgentActivity(null);

    if (!session) {
      setSessionId(null);
      setFileName(null);
      setDfInfo(null);
      setMessages([]);
      setRecommendedActions([]);
      setFileNames([]);
      setSessionTitle(null);
      setRequiresFileReload(false);
      lastSyncedFingerprintRef.current = '';
      return;
    }

    setSessionId(session.id);
    setSessionTitle(session.sessionTitle ?? null);
    setFileName(session.fileName);
    const restoredFileNames = Array.isArray(session.fileNames)
      ? session.fileNames
      : session.fileName
        ? [session.fileName]
        : [];
    setFileNames(restoredFileNames);
    setDfInfo(OMIT_DATASET_FROM_CLOUD ? null : session.dfInfo);
    setMessages(session.messages);
    setRecommendedActions(session.recommendedActions);
    setRequiresFileReload(Boolean(session.fileName));
    lastSyncedFingerprintRef.current = JSON.stringify({
      sessionTitle: session.sessionTitle ?? null,
      fileName: session.fileName,
      fileNames: restoredFileNames,
      dfInfo: OMIT_DATASET_FROM_CLOUD ? null : session.dfInfo,
      messages: session.messages,
      recommendedActions: session.recommendedActions,
      latestGoal: session.latestGoal ?? getLatestGoal(session.messages),
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user?.id) {
      restoreStartedRef.current = false;
      lastSyncedFingerprintRef.current = '';
      setSessionId(null);
      setSessionTitle(null);
      setFileNames([]);
      setSessionList([]);
      setSyncStatus('local-only');
      setRequiresFileReload(false);
      return;
    }

    if (restoreStartedRef.current) {
      return;
    }

    let isCancelled = false;
    restoreStartedRef.current = true;
    setSyncStatus('syncing');

    void (async () => {
      try {
        const restored = await fetchLatestSession();

        if (isCancelled) {
          return;
        }

        if (restored.storageAvailable === false) {
          setSyncStatus('disabled');
          return;
        }

        setSessionList(restored.sessions ?? []);

        if (
          restored.session &&
          !fileName &&
          !dfInfo &&
          messages.length === 0 &&
          recommendedActions.length === 0
        ) {
          applySessionState(restored.session);
        }

        setSyncStatus('saved');
      } catch (error) {
        console.error('Failed to restore cloud session:', error);
        setSyncStatus('error');
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [applySessionState, dfInfo, fileName, isLoaded, isSignedIn, messages, recommendedActions, user?.id]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || !restoreStartedRef.current) {
      return;
    }

    if (!fileName && !dfInfo && messages.length === 0 && recommendedActions.length === 0) {
      return;
    }

    if (syncFingerprint === lastSyncedFingerprintRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          setSyncStatus('syncing');
          const { session, storageAvailable } = await syncSession({
            sessionId,
            sessionTitle,
            fileName,
            fileNames,
            dfInfo: persistedDfInfo,
            messages,
            recommendedActions,
            latestGoal,
          });

          if (storageAvailable === false) {
            setSyncStatus('disabled');
            return;
          }

          if (!session) {
            setSyncStatus('disabled');
            return;
          }

          lastSyncedFingerprintRef.current = syncFingerprint;
          setSessionId(session.id);
          setSessionList((prev) => {
            const nextSummary = summarizeSession(session);
            const withoutActive = prev.filter((entry) => entry.id !== session.id);
            return [nextSummary, ...withoutActive];
          });
          setSyncStatus('saved');
        } catch (error) {
          console.error('Failed to sync cloud session:', error);
          setSyncStatus('error');
        }
      })();
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    dfInfo,
    fileName,
    fileNames,
    isLoaded,
    isSignedIn,
    latestGoal,
    messages,
    persistedDfInfo,
    recommendedActions,
    sessionTitle,
    sessionId,
    syncFingerprint,
    user?.id,
  ]);

  // Lazy-initialize Pyodide the first time we need it.
  // This avoids paying startup cost until user uploads a file.
  const ensurePyodide = useCallback(async () => {
    if (isPyodideReady) {
      return;
    }

    setIsPyodideLoading(true);
    try {
      await initPyodide();
      setIsPyodideReady(true);
    } catch (error) {
      console.error('Failed to init Pyodide:', error);
      throw new Error('Failed to load Python engine. Please refresh and try again.');
    } finally {
      setIsPyodideLoading(false);
    }
  }, [isPyodideReady]);

  const ensureAnalysisReady = useCallback(async () => {
    await ensurePyodide();

    if (requiresFileReload) {
      throw new Error('Session restored from cloud. Please re-upload your CSV to continue analysis.');
    }
  }, [ensurePyodide, requiresFileReload]);

  const runAgentLoop = useCallback(async (
    userText: string,
    initialDfInfo: DataFrameInfo | null,
    initialHistory: Message[],
    options: ChatRuntimeOptions
  ) => {
    const { explanation, code } = await sendMessage(
      userText,
      initialDfInfo,
      initialHistory,
      fileNames,
      fileName,
      options
    );

    if (!code) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: explanation,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setCurrentAgentActivity('Running Python analysis...');
    const result = await executeCode(code);
    setCurrentAgentActivity(null);

    if (result.updatedDfInfo) {
      setDfInfo(result.updatedDfInfo);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: 'assistant',
        phase: 'execution',
        content: explanation,
        code,
        output: result.output || undefined,
        chartUrl: result.chartUrl || undefined,
        error: result.error || undefined,
        timestamp: Date.now(),
      },
    ]);
  }, [fileName, fileNames]);

  /**
   * Chat action flow:
   * 1) Append user message immediately (optimistic UI)
   * 2) Build a short agent plan (1-3 steps)
   * 3) Execute/reflect per step and decide whether to continue
   */
  const handleSendMessage = useCallback(async (userText: string, options?: ChatRuntimeOptions) => {
    setIsLoading(true);

    try {
      await ensureAnalysisReady();
      const effectiveOptions = options ?? runtimeOptions;
      const userMsg: Message = {
        id: newId(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      await runAgentLoop(userText, dfInfo, [...messages, userMsg], effectiveOptions);
    } catch (error: unknown) {
      setCurrentAgentActivity(null);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('re-upload your CSV')) {
        const reminderMsg: Message = {
          id: newId(),
          role: 'system',
          content: '📎 Please re-upload your CSV from the chat bar clip icon to continue this saved session.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, reminderMsg]);
        return;
      }

      const assistantErrorMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: 'Something went wrong.',
        error: errorMessage,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [dfInfo, ensureAnalysisReady, messages, runAgentLoop, runtimeOptions]);

  const runGoal = useCallback(async (goal: string, options?: ChatRuntimeOptions) => {
    await handleSendMessage(goal, options);
  }, [handleSendMessage]);

  const handleRunRecommendedAction = useCallback(async (action: string) => {
    await runGoal(action);
  }, [runGoal]);

  const handleRunAutopilot = useCallback(async () => {
    const autopilotGoal = NICHE.defaultAutopilotGoal;
    await runGoal(autopilotGoal);
  }, [runGoal]);

  /**
   * File upload flow:
   * 1) Ensure Pyodide runtime is ready
   * 2) Load raw CSV content into pandas df
   * 3) Show a system "file loaded" message
  * 4) Ask interactive onboarding questions before any autonomous execution
   */
  const handleFileLoad = useCallback(async (name: string, content: string) => {
    setIsLoading(true);

    try {
      await ensurePyodide();

      const info = await loadCSV(name, content);
      setFileName(name);
      setSessionTitle((prev) => {
        if (!prev || prev === 'Untitled session') {
          return toDatasetTitle(name);
        }
        return prev;
      });
      setFileNames((prev) => {
        if (prev.includes(name)) {
          return prev;
        }
        return [name, ...prev];
      });
      setDfInfo(info);
      setRequiresFileReload(false);
      const actions = await generateRecommendedActions(info);
      setRecommendedActions(actions);

      const systemMsg: Message = {
        id: newId(),
        role: 'system',
        content: `📁 Loaded **${name}** — ${info.shape[0].toLocaleString()} rows × ${info.shape[1]} columns`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMsg]);

      const onboarding = await generateOnboardingMessage(info);
      const onboardingMsg: Message = {
        id: newId(),
        role: 'assistant',
        phase: 'reflection',
        content: onboarding,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, onboardingMsg]);
    } catch (error: unknown) {
      const loadErrorMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: 'Failed to load the file.',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, loadErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [ensurePyodide]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) {
      return;
    }

    for (const file of files) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
        const warningMsg: Message = {
          id: newId(),
          role: 'system',
          content: `⚠️ Skipped ${file.name}. Please upload CSV/TSV/TXT files only.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, warningMsg]);
        continue;
      }

      const content = await file.text();
      await handleFileLoad(file.name, content);
    }
  }, [handleFileLoad]);

  // Export current cleaned dataframe state as CSV for user download.
  const handleDownload = useCallback(async () => {
    try {
      await ensureAnalysisReady();
      const csv = await getCleanCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName?.replace('.csv', '') || 'dataset'}_clean.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [ensureAnalysisReady, fileName]);

  // Reset session back to landing state (file + dataframe + chat).
  const handleReset = useCallback(() => {
    setFileName(null);
    setDfInfo(null);
    setMessages([]);
    setRecommendedActions([]);
    setFileNames([]);
    setSessionTitle(null);
    setSessionId(null);
    setRequiresFileReload(false);
    setCurrentAgentActivity(null);
    setSyncStatus(isSignedIn ? 'saved' : 'local-only');
    lastSyncedFingerprintRef.current = '';
  }, [isSignedIn]);

  const handleCreateSession = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      handleReset();
      return;
    }

    setSyncStatus('syncing');
    try {
      const { session, storageAvailable } = await syncSession({
        sessionId: null,
        sessionTitle: null,
        fileName: null,
        fileNames: [],
        dfInfo: null,
        messages: [],
        recommendedActions: [],
        latestGoal: null,
      });

      if (storageAvailable === false || !session) {
        setSyncStatus('disabled');
        handleReset();
        return;
      }

      applySessionState(session);
      setSessionList((prev) => [summarizeSession(session), ...prev.filter((entry) => entry.id !== session.id)]);
      setSyncStatus('saved');
    } catch (error) {
      console.error('Failed to create new session:', error);
      setSyncStatus('error');
    }
  }, [applySessionState, handleReset, isSignedIn, user?.id]);

  const handleSelectSession = useCallback(async (nextSessionId: string) => {
    if (!isSignedIn || !user?.id) {
      return;
    }

    if (!nextSessionId || nextSessionId === sessionId) {
      return;
    }

    setSyncStatus('syncing');
    try {
      const { session, sessions, storageAvailable } = await fetchSessionById(nextSessionId);

      if (storageAvailable === false) {
        setSyncStatus('disabled');
        return;
      }

      if (!session) {
        setSyncStatus('error');
        return;
      }

      applySessionState(session);
      if (sessions) {
        setSessionList(sessions);
      }
      setSyncStatus('saved');
    } catch (error) {
      console.error('Failed to load selected session:', error);
      setSyncStatus('error');
    }
  }, [applySessionState, isSignedIn, sessionId, user?.id]);

  const handleRefreshSessions = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      setSessionList([]);
      return;
    }

    try {
      const { sessions, storageAvailable } = await fetchSessionList();
      if (storageAvailable === false) {
        setSyncStatus('disabled');
        return;
      }
      setSessionList(sessions);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  }, [isSignedIn, user?.id]);

  const handleRenameSession = useCallback((targetSessionId: string, nextTitle: string) => {
    const cleaned = nextTitle.trim();
    if (!cleaned) {
      return;
    }

    if (targetSessionId === sessionId) {
      setSessionTitle(cleaned);
    }

    setSessionList((prev) => prev.map((session) => (
      session.id === targetSessionId
        ? { ...session, title: cleaned, sessionTitle: cleaned }
        : session
    )));
  }, [sessionId]);

  // Friendly label for settings button in header.
  const connectionLabel = useMemo(() => 'ChatGPT Connected', []);
  const storageLabel = useMemo(() => {
    if (!isLoaded) {
      return 'Loading account';
    }

    switch (syncStatus) {
      case 'disabled':
        return 'Supabase not configured';
      case 'syncing':
        return 'Saving to Supabase';
      case 'saved':
        return isSignedIn ? 'Supabase synced' : 'Guest mode';
      case 'error':
        return 'Sync issue';
      case 'local-only':
      default:
        return 'Guest mode';
    }
  }, [isLoaded, isSignedIn, syncStatus]);

  // Public API consumed by App/layout components.
  return {
    fileName,
    dfInfo,
    messages,
    recommendedActions,
    isLoading,
    isPyodideLoading,
    connectionLabel,
    storageLabel,
    sessionId,
    sessionTitle,
    sessionList,
    fileNames,
    runtimeOptions,
    setRuntimeOptions,
    handleSendMessage,
    handleRunRecommendedAction,
    handleRunAutopilot,
    handleFileLoad,
    handleUploadFiles,
    handleDownload,
    handleReset,
    handleCreateSession,
    handleSelectSession,
    handleRefreshSessions,
    handleRenameSession,
    qualitySummary,
    currentAgentActivity,
  };
}
