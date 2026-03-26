import type { Message } from '../../types/index';

export interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  isFileLoading: boolean;
  onSendMessage: (message: string) => void;
  onUploadFiles: (files: File[]) => void;
}
