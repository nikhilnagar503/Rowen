import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { fetchSessionById, fetchSessionList, syncSession } from '../../lib/persistence';
import type { PersistedSession, PersistedSessionSummary, SyncStatus } from '../../types/index';
import { summarizeSession } from './utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseSessionActionsArgs = {
  isSignedIn: boolean;
  userId?: string;
  sessionId: string | null;
  applySessionState: (session: PersistedSession | null) => void;
  handleReset: () => void;
  setSessionList: Setter<PersistedSessionSummary[]>;
  setSessionTitle: Setter<string | null>;
  setSyncStatus: Setter<SyncStatus>;
};

export function useSessionActions({
  isSignedIn,
  userId,
  sessionId,
  applySessionState,
  handleReset,
  setSessionList,
  setSessionTitle,
  setSyncStatus,
}: UseSessionActionsArgs) {
  const handleCreateSession = useCallback(async () => {
    applySessionState(null);
    if (!isSignedIn || !userId) return setSyncStatus('local-only');
    setSyncStatus('syncing');
    try {
      const { session, storageAvailable } = await syncSession({
        sessionId: null,
        sessionTitle: null,
        fileName: null,
        fileNames: [],
        dfInfo: null,
        messages: [],
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
  }, [applySessionState, handleReset, isSignedIn, setSessionList, setSyncStatus, userId]);

  const handleSelectSession = useCallback(async (nextSessionId: string) => {
    if (!isSignedIn || !userId || !nextSessionId || nextSessionId === sessionId) return;
    setSyncStatus('syncing');
    try {
      const { session, sessions, storageAvailable } = await fetchSessionById(nextSessionId);
      if (storageAvailable === false) return setSyncStatus('disabled');
      if (!session) return setSyncStatus('error');
      applySessionState(session);
      if (sessions) setSessionList(sessions);
      setSyncStatus('saved');
    } catch (error) {
      console.error('Failed to load selected session:', error);
      setSyncStatus('error');
    }
  }, [applySessionState, isSignedIn, sessionId, setSessionList, setSyncStatus, userId]);

  const handleRefreshSessions = useCallback(async () => {
    if (!isSignedIn || !userId) return setSessionList([]);
    try {
      const { sessions, storageAvailable } = await fetchSessionList();
      if (storageAvailable === false) return setSyncStatus('disabled');
      setSessionList(sessions);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  }, [isSignedIn, setSessionList, setSyncStatus, userId]);

  const handleRenameSession = useCallback((targetSessionId: string, nextTitle: string) => {
    const cleaned = nextTitle.trim();
    if (!cleaned) return;
    if (targetSessionId === sessionId) setSessionTitle(cleaned);
    setSessionList((prev) => prev.map((session) => (
      session.id === targetSessionId ? { ...session, title: cleaned, sessionTitle: cleaned } : session
    )));
  }, [sessionId, setSessionList, setSessionTitle]);

  return { handleCreateSession, handleSelectSession, handleRefreshSessions, handleRenameSession };
}
