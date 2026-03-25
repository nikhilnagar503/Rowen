import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { fetchLatestSession } from '../../../lib/persistence';
import { normalizeError } from '../../../lib/errors';
import { createCorrelationId, logAppError } from '../../../lib/observability';
import type { PersistedSession, PersistedSessionSummary, SyncStatus } from '../../../types/index';
import type { Setter, UseCloudSessionSyncArgs } from './types';

type Args = Pick<UseCloudSessionSyncArgs, 'isLoaded' | 'isSignedIn' | 'userId' | 'fileName' | 'dfInfo' | 'messages'> & {
  setSessionId: Setter<string | null>;
  setSessionTitle: Setter<string | null>;
  setFileNames: Setter<string[]>;
  setSessionList: Setter<PersistedSessionSummary[]>;
  setSyncStatus: Setter<SyncStatus>;
  setRequiresFileReload: Setter<boolean>;
  resetCloudSyncTracking: () => void;
  applySessionState: (session: PersistedSession | null) => void;
  restoreStartedRef: MutableRefObject<boolean>;
};

export function useCloudSessionRestore({
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
}: Args) {
  useEffect(() => {
    if (!isLoaded) return;

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

    if (restoreStartedRef.current) return;

    let isCancelled = false;
    restoreStartedRef.current = true;
    setSyncStatus('syncing');

    void (async () => {
      const correlationId = createCorrelationId('cloud-restore');

      try {
        const restored = await fetchLatestSession();
        if (isCancelled) return;

        if (restored.storageAvailable === false) {
          setSyncStatus('disabled');
          return;
        }

        setSessionList(restored.sessions ?? []);
        if (restored.session && !fileName && !dfInfo && messages.length === 0) {
          applySessionState(restored.session);
        }

        setSyncStatus('saved');
      } catch (error) {
        const appError = normalizeError(error);
        logAppError('useCloudSessionSync.restore', correlationId, appError);
        setSyncStatus('error');
      }
    })();

    return () => { isCancelled = true; };
  }, [applySessionState, dfInfo, fileName, isLoaded, isSignedIn, messages, resetCloudSyncTracking, restoreStartedRef, setFileNames, setRequiresFileReload, setSessionId, setSessionList, setSessionTitle, setSyncStatus, userId]);
}
