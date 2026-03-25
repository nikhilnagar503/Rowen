export type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  kind?: 'quality-delta' | 'file-load' | 'warning' | 'reminder';
  content: string;
  timestamp: number;
  phase?: 'execution' | 'reflection';
  code?: string;
  output?: string;
  error?: string;
};

export type DataFrameInfo = {
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, string>;
  missing: Record<string, number>;
  duplicates: number;
  sample: Array<Array<string | number | boolean | null>>;
  head: string;
  describe: string;
};

export type CodeExecutionResult = {
  output: string;
  tableHtml: string | null;
  error: string | null;
  updatedDfInfo: DataFrameInfo | null;
};

export type ChatRuntimeOptions = {
  model: 'gpt-4o-mini' | 'gpt-4o';
  toolsEnabled: boolean;
  connectorsEnabled: boolean;
  advancedReasoning: boolean;
};

export type PersistedSession = {
  id: string;
  sessionTitle?: string | null;
  fileNames: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  latestGoal?: string | null;
  updatedAt: string;
};

export type PersistedSessionSummary = {
  id: string;
  title: string;
  sessionTitle?: string | null;
  fileName: string | null;
  updatedAt: string;
  messageCount: number;
};

export type SyncStatus = 'local-only' | 'syncing' | 'saved' | 'disabled' | 'error';

