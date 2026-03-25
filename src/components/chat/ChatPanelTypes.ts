import type { ChatRuntimeOptions, Message } from '../../types/index';

export interface ChatPanelProps {
  messages: Message[];
  runtimeOptions: ChatRuntimeOptions;
  onRuntimeOptionsChange: (next: ChatRuntimeOptions) => void;
  isLoading: boolean;
  isFileLoading: boolean;
  onSendMessage: (message: string, options?: ChatRuntimeOptions) => void;
  onUploadFiles: (files: File[]) => void;
}
