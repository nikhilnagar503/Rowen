export type MessageRole = 'system' | 'user' | 'assistant';

export type MessagePhase = 'execution' | 'reflection';

export type MessageKind = 'quality-delta' | 'file-load' | 'warning' | 'reminder';

export type Message = {
  id: string;
  role: MessageRole;
  kind?: MessageKind;
  content: string;
  timestamp: number;
  phase?: MessagePhase;
  code?: string;
  output?: string;
  chartUrl?: string;
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
  chartUrl: string | null;
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
  fileName: string | null;
  fileNames: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  recommendedActions: string[];
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

export type CleaningToolName = string;
