import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type {
  DataFrameInfo,
  Message,
  PersistedSession,
} from '../../../types/index';
import { getLatestGoal, OMIT_DATASET_FROM_CLOUD } from '../utils';
import type { Setter } from './types';

type Args = {
  setDfInfo: Setter<DataFrameInfo | null>;
  setMessages: Setter<Message[]>;
  setFileNames: Setter<string[]>;
  setSessionTitle: Setter<string | null>;
  setSessionId: Setter<string | null>;
  setRequiresFileReload: Setter<boolean>;
  restoreStartedRef: MutableRefObject<boolean>;
  lastSyncedFingerprintRef: MutableRefObject<string>;
};

export function useSessionStateApplier({
  setDfInfo,
  setMessages,
  setFileNames,
  setSessionTitle,
  setSessionId,
  setRequiresFileReload,
  restoreStartedRef,
  lastSyncedFingerprintRef,
}: Args) {
  const applySessionState = useCallback((session: PersistedSession | null) => {
    if (!session) {
      setSessionId(null);
      setDfInfo(null);
      setMessages([]);
      setFileNames([]);
      setSessionTitle(null);
      setRequiresFileReload(false);
      lastSyncedFingerprintRef.current = '';
      return;
    }

    const restoredFileNames = Array.isArray(session.fileNames) ? session.fileNames : [];
    setSessionId(session.id);
    setSessionTitle(session.sessionTitle ?? null);
    setFileNames(restoredFileNames);
    setDfInfo(OMIT_DATASET_FROM_CLOUD ? null : session.dfInfo);
    setMessages(session.messages);
    setRequiresFileReload(restoredFileNames.length > 0);

    lastSyncedFingerprintRef.current = JSON.stringify({
      sessionTitle: session.sessionTitle ?? null,
      fileName: restoredFileNames[0] ?? null,
      fileNames: restoredFileNames,
      dfInfo: OMIT_DATASET_FROM_CLOUD ? null : session.dfInfo,
      messages: session.messages,
      latestGoal: session.latestGoal ?? getLatestGoal(session.messages),
    });
  }, [
    setDfInfo,
    setFileNames,
    setMessages,
    setRequiresFileReload,
    setSessionId,
    setSessionTitle,
    lastSyncedFingerprintRef,
  ]);

  const resetCloudSyncTracking = useCallback(() => {
    restoreStartedRef.current = false;
    lastSyncedFingerprintRef.current = '';
  }, [lastSyncedFingerprintRef, restoreStartedRef]);

  return {
    applySessionState,
    resetCloudSyncTracking,
  };
}
