import type { Dispatch, SetStateAction } from 'react';
import type {
  DataFrameInfo,
  Message,
  PersistedSessionSummary,
  SyncStatus,
} from '../../../types/index';

export type Setter<T> = Dispatch<SetStateAction<T>>;

export type UseCloudSessionSyncArgs = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  fileName: string | null;
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  fileNames: string[];
  sessionTitle: string | null;
  sessionId: string | null;
  persistedDfInfo: DataFrameInfo | null;
  latestGoal: string | null;
  syncFingerprint: string;
  setDfInfo: Setter<DataFrameInfo | null>;
  setMessages: Setter<Message[]>;
  setFileNames: Setter<string[]>;
  setSessionTitle: Setter<string | null>;
  setSessionId: Setter<string | null>;
  setSessionList: Setter<PersistedSessionSummary[]>;
  setSyncStatus: Setter<SyncStatus>;
  setRequiresFileReload: Setter<boolean>;
};
