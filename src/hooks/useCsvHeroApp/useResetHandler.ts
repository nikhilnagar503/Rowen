import { useCallback } from 'react';
import type { SyncStatus } from '../../types/index';

type Args = {
  isSignedIn: boolean | null | undefined;
  resetCloudSyncTracking: () => void;
  setDfInfo: (v: null) => void;
  setMessages: (v: []) => void;
  setFileNames: (v: []) => void;
  setSessionTitle: (v: null) => void;
  setSessionId: (v: null) => void;
  setRequiresFileReload: (v: boolean) => void;
  setSyncStatus: (v: SyncStatus) => void;
};

export function useResetHandler(args: Args) {
  const { isSignedIn, resetCloudSyncTracking, setDfInfo, setMessages, setFileNames, setSessionTitle, setSessionId, setRequiresFileReload, setSyncStatus } = args;

  return useCallback(() => {
    setDfInfo(null);
    setMessages([]);
    setFileNames([]);
    setSessionTitle(null);
    setSessionId(null);
    setRequiresFileReload(false);
    setSyncStatus(isSignedIn ? 'saved' : 'local-only');
    resetCloudSyncTracking();
  }, [isSignedIn, resetCloudSyncTracking, setDfInfo, setFileNames, setMessages, setRequiresFileReload, setSessionId, setSessionTitle, setSyncStatus]);
}
