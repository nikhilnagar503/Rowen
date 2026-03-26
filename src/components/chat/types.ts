import type { Message } from '../../types/index';

export interface MessageListProps {
  messages: Message[];
  streamingMessageId: string | null;
  visibleChars: number;
}

export interface ComposerProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isFileLoading: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onUploadClick: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}
