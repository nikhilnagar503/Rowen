/**
 * useCsvHeroApp.ts — Central Application State & Orchestration Hook
 *
 * WHY THIS FILE EXISTS:
 * React components should be thin and focused on rendering. All the complex
 * async logic (AI calls, Python execution, agent loops, loading flags) would
 * make App.tsx enormous if written inline. This hook extracts all of that into
 * one well-documented place, making it easy to understand the full app lifecycle
 * and easy to test each action in isolation.
 */
import { useCallback, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { initPyodide } from '../lib/pyodide';
import type {
  ChatRuntimeOptions,
  DataFrameInfo,
  Message,
  PersistedSessionSummary,
  SyncStatus,
} from '../types/index';
import { NICHE } from '../config/niche';
import {
  getLatestGoal,
  getQualitySnapshot,
  OMIT_DATASET_FROM_CLOUD,
} from './useCsvHeroApp/utils';
import { useCloudSessionSync } from './useCsvHeroApp/useCloudSessionSync';
import { useChatActions } from './useCsvHeroApp/chatActions';
import { useFileActions } from './useCsvHeroApp/fileActions';
import { useSessionActions } from './useCsvHeroApp/sessionActions';

/**
 * useCsvHeroApp
 *
 * Centralized orchestration hook for CSVHero.
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

  const { applySessionState, resetCloudSyncTracking } = useCloudSessionSync({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id,
    fileName,
    dfInfo,
    messages,
    recommendedActions,
    fileNames,
    sessionTitle,
    sessionId,
    persistedDfInfo,
    latestGoal,
    syncFingerprint,
    setFileName,
    setDfInfo,
    setMessages,
    setRecommendedActions,
    setFileNames,
    setSessionTitle,
    setSessionId,
    setSessionList,
    setSyncStatus,
    setRequiresFileReload,
    setCurrentAgentActivity,
  });

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

  const { handleSendMessage, handleRunRecommendedAction, handleRunAutopilot } = useChatActions({
    fileName,
    fileNames,
    dfInfo,
    messages,
    runtimeOptions,
    defaultAutopilotGoal: NICHE.defaultAutopilotGoal,
    ensureAnalysisReady,
    setIsLoading,
    setMessages,
    setDfInfo,
    setCurrentAgentActivity,
  });

  const { handleFileLoad, handleUploadFiles, handleDownload } = useFileActions({
    fileName,
    ensurePyodide,
    ensureAnalysisReady,
    setIsLoading,
    setFileName,
    setSessionTitle,
    setFileNames,
    setDfInfo,
    setRequiresFileReload,
    setRecommendedActions,
    setMessages,
  });

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
    resetCloudSyncTracking();
  }, [isSignedIn, resetCloudSyncTracking]);

  const {
    handleCreateSession,
    handleSelectSession
  } = useSessionActions({
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id,
    sessionId,
    applySessionState,
    handleReset,
    setSessionList,
    setSessionTitle,
    setSyncStatus,
  });

  return {
    fileName,
    dfInfo,
    messages,
    recommendedActions,
    isLoading,
    isPyodideLoading,
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
    qualitySummary,
    currentAgentActivity,
  };
}


