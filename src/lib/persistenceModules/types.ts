import type { DataFrameInfo, Message, PersistedSession, PersistedSessionSummary } from '../../types/index';

export type SessionApiResponse = {
  session: PersistedSession | null;
  sessions?: PersistedSessionSummary[];
  storageAvailable?: boolean;
};

export type SessionListResponse = {
  sessions: PersistedSessionSummary[];
  storageAvailable?: boolean;
};

export type SyncSessionInput = {
  sessionId?: string | null;
  sessionTitle?: string | null;
  fileName: string | null;
  fileNames?: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  latestGoal?: string | null;
};
