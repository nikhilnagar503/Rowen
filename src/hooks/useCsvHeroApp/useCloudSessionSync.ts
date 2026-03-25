import { useRef } from 'react';
import type { UseCloudSessionSyncArgs } from './cloudSync/types';
import { useSessionStateApplier } from './cloudSync/useSessionStateApplier';
import { useCloudSessionRestore } from './cloudSync/useCloudSessionRestore';
import { useCloudSessionAutoSync } from './cloudSync/useCloudSessionAutoSync';

export function useCloudSessionSync({
  isLoaded,
  isSignedIn,
  userId,
  fileName,
  dfInfo,
  messages,
  fileNames,
  sessionTitle,
  sessionId,
  persistedDfInfo,
  latestGoal,
  syncFingerprint,
  setDfInfo,
  setMessages,
  setFileNames,
  setSessionTitle,
  setSessionId,
  setSessionList,
  setSyncStatus,
  setRequiresFileReload,
}: UseCloudSessionSyncArgs) {
  const restoreStartedRef = useRef(false);
  const lastSyncedFingerprintRef = useRef('');

  const { applySessionState, resetCloudSyncTracking } = useSessionStateApplier({
    setDfInfo,
    setMessages,
    setFileNames,
    setSessionTitle,
    setSessionId,
    setRequiresFileReload,
    restoreStartedRef,
    lastSyncedFingerprintRef,
  });

  useCloudSessionRestore({
    isLoaded,
    isSignedIn,
    userId,
    fileName,
    dfInfo,
    messages,
    setSessionId,
    setSessionTitle,
    setFileNames,
    setSessionList,
    setSyncStatus,
    setRequiresFileReload,
    resetCloudSyncTracking,
    applySessionState,
    restoreStartedRef,
  });

  useCloudSessionAutoSync({
    isLoaded,
    isSignedIn,
    userId,
    fileName,
    dfInfo,
    messages,
    fileNames,
    latestGoal,
    persistedDfInfo,
    sessionId,
    sessionTitle,
    syncFingerprint,
    setSessionId,
    setSessionList,
    setSyncStatus,
    restoreStartedRef,
    lastSyncedFingerprintRef,
  });

  return {
    applySessionState,
    resetCloudSyncTracking,
  };
}
