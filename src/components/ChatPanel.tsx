import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import MessageList from './chat/MessageList';
import Composer from './chat/Composer';
import { useStreamingMessage } from './chat/useStreamingMessage';
import type { ChatPanelProps } from './chat/ChatPanelTypes';
import { HiddenFileInput } from './chat/HiddenFileInput';

export default function ChatPanel({
  messages,
  runtimeOptions,
  onRuntimeOptionsChange,
  isLoading,
  isFileLoading,
  onSendMessage,
  onUploadFiles,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { streamingMessageId, visibleChars } = useStreamingMessage(messages);

  const autoResizeInput = () => {
    const el = inputRef.current;
    if (!el) {
      return;
    }

    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 220);
    el.style.height = `${Math.max(nextHeight, 52)}px`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), runtimeOptions);
    setInput('');
    window.setTimeout(() => autoResizeInput(), 0);
  };

  useEffect(() => {
    autoResizeInput();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-full flex-col bg-transparent text-slate-100">
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-6 sm:px-6 sm:pb-8">
        <div className="mx-auto w-full max-w-[860px]">
          <MessageList
            messages={messages}
            streamingMessageId={streamingMessageId}
            visibleChars={visibleChars}
          />

          

          {isLoading && (
            <div className="mt-3 flex items-center gap-2.5 pl-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
              <span className="text-xs text-slate-500">Running analysis...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <Composer
        input={input}
        setInput={setInput}
        runtimeOptions={runtimeOptions}
        onRuntimeOptionsChange={onRuntimeOptionsChange}
        isLoading={isLoading}
        isFileLoading={isFileLoading}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        onUploadClick={handleUploadClick}
        inputRef={inputRef}
      />
      <HiddenFileInput
        fileInputRef={fileInputRef}
        onUploadFiles={onUploadFiles}
        isDisabled={isLoading || isFileLoading}
      />
    </div>
  );
}
