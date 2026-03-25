import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { syncSession } from '../../../lib/persistence';
import { normalizeError } from '../../../lib/errors';
import { createCorrelationId, logAppError } from '../../../lib/observability';
import { summarizeSession } from '../utils';
import type { PersistedSessionSummary, SyncStatus } from '../../../types/index';
import type { Setter, UseCloudSessionSyncArgs } from './types';

type Args = Pick<UseCloudSessionSyncArgs, 'isLoaded' | 'isSignedIn' | 'userId' | 'fileName' | 'dfInfo' | 'messages' | 'fileNames' | 'sessionTitle' | 'sessionId' | 'persistedDfInfo' | 'latestGoal' | 'syncFingerprint'> & {
  setSessionId: Setter<string | null>;
  setSessionList: Setter<PersistedSessionSummary[]>;
  setSyncStatus: Setter<SyncStatus>;
  restoreStartedRef: MutableRefObject<boolean>;
  lastSyncedFingerprintRef: MutableRefObject<string>;
};

export function useCloudSessionAutoSync({
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
  setSessionId,
  setSessionList,
  setSyncStatus,
  restoreStartedRef,
  lastSyncedFingerprintRef,
}: Args) {
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !restoreStartedRef.current) return;
    if (!fileName && !dfInfo && messages.length === 0) return;
    if (syncFingerprint === lastSyncedFingerprintRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const correlationId = createCorrelationId('cloud-sync');

        try {
          setSyncStatus('syncing');
          const { session, storageAvailable } = await syncSession({
            sessionId,
            sessionTitle,
            fileName,
            fileNames,
            dfInfo: persistedDfInfo,
            messages,
            latestGoal,
          });
          if (storageAvailable === false || !session) {
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
          const appError = normalizeError(error);
          logAppError('useCloudSessionSync.sync', correlationId, appError);
          setSyncStatus('error');
        }
      })();
    }, 700);

    return () => { window.clearTimeout(timeoutId); };
  }, [dfInfo, fileName, fileNames, isLoaded, isSignedIn, lastSyncedFingerprintRef, latestGoal, messages, persistedDfInfo, restoreStartedRef, sessionId, sessionTitle, setSessionId, setSessionList, setSyncStatus, syncFingerprint, userId]);
}
