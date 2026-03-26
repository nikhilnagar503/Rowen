import type { Message, PersistedSessionSummary } from '../../types/index';

export interface WorkspaceViewProps {
  messages: Message[];
  isLoading: boolean;
  isPyodideLoading: boolean;
  onSendMessage: (message: string) => void;
  onUploadFiles: (files: File[]) => void;
  onCreateSession: () => void | Promise<void>;
  activeSessionId: string | null;
  sessionList: PersistedSessionSummary[];
  onSelectSession: (sessionId: string) => void | Promise<void>;
}
