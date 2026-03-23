import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { fetchLatestSession, syncSession } from '../../lib/persistence';
import type {
  DataFrameInfo,
  Message,
  PersistedSession,
  PersistedSessionSummary,
  SyncStatus,
} from '../../types/index';
import { getLatestGoal, OMIT_DATASET_FROM_CLOUD, summarizeSession } from './utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseCloudSessionSyncArgs = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  fileName: string | null;
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  recommendedActions: string[];
  fileNames: string[];
  sessionTitle: string | null;
  sessionId: string | null;
  persistedDfInfo: DataFrameInfo | null;
  latestGoal: string | null;
  syncFingerprint: string;
  setFileName: Setter<string | null>;
  setDfInfo: Setter<DataFrameInfo | null>;
  setMessages: Setter<Message[]>;
  setRecommendedActions: Setter<string[]>;
  setFileNames: Setter<string[]>;
  setSessionTitle: Setter<string | null>;
  setSessionId: Setter<string | null>;
  setSessionList: Setter<PersistedSessionSummary[]>;
  setSyncStatus: Setter<SyncStatus>;
  setRequiresFileReload: Setter<boolean>;
};

export function useCloudSessionSync({
  isLoaded,
  isSignedIn,
  userId,
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
}: UseCloudSessionSyncArgs) {
  const restoreStartedRef = useRef(false);
  const lastSyncedFingerprintRef = useRef('');

  const applySessionState = useCallback((session: PersistedSession | null) => {
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
  }, [
    setDfInfo,
    setFileName,
    setFileNames,
    setMessages,
    setRecommendedActions,
    setRequiresFileReload,
    setSessionId,
    setSessionTitle,
  ]);

  const resetCloudSyncTracking = useCallback(() => {
    restoreStartedRef.current = false;
    lastSyncedFingerprintRef.current = '';
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      resetCloudSyncTracking();
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
  }, [
    applySessionState,
    dfInfo,
    fileName,
    isLoaded,
    isSignedIn,
    messages,
    recommendedActions,
    resetCloudSyncTracking,
    setFileNames,
    setRequiresFileReload,
    setSessionId,
    setSessionList,
    setSessionTitle,
    setSyncStatus,
    userId,
  ]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !restoreStartedRef.current) {
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
    sessionId,
    sessionTitle,
    setSessionId,
    setSessionList,
    setSyncStatus,
    syncFingerprint,
    userId,
  ]);

  return {
    applySessionState,
    resetCloudSyncTracking,
  };
}
