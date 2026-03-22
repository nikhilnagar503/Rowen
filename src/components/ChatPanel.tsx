/**
 * ChatPanel.tsx — AI Conversation Interface
 *
 * WHY THIS FILE EXISTS:
 * This is the main interactive surface of the product. Users type natural-language
 * questions or goals here and receive AI-generated analysis, Python code, text
 * output, and reasoning — all displayed in a familiar chat format.
 *
 * WHAT IT DOES:
 * - Renders a scrollable message list where each bubble can contain:
 *     • Plain text / Markdown (AI reasoning & explanations)
 *     • A collapsible Python code block (what the agent ran)
 *     • Stdout text output (print() results)
 *     • An error block (if code execution failed)
 * - Shows a phase label ("Execution" / "Reasoning") on assistant messages so
 *   users can visually distinguish code-running steps from reflection steps.
 * - Renders an empty-state panel with:
 *     • An "Autopilot" button that fires a full multi-step autonomous analysis.
 *     • Dataset-specific one-click "Quick Goals" so users don't need to write prompts.
 * - Auto-scrolls to the newest message via a ref on the bottom sentinel div.
 * - Textarea composer with Enter-to-send, Shift+Enter for newline.
 *
 * ROLE IN THE PRODUCT:
 * This panel is the primary way users interact with the AI agent. It drives all
 * data exploration, cleaning, and summarization tasks in the app.
 */
import { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Paperclip, SlidersHorizontal, Wrench, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatRuntimeOptions, Message } from '../types/index';

interface ChatPanelProps {
  messages: Message[];
  runtimeOptions: ChatRuntimeOptions;
  onRuntimeOptionsChange: (next: ChatRuntimeOptions) => void;
  isLoading: boolean;
  isFileLoading: boolean;
  onSendMessage: (message: string, options?: ChatRuntimeOptions) => void;
  onUploadFiles: (files: File[]) => void;
  currentAgentActivity: string | null;
}

export default function ChatPanel({
  messages,
  runtimeOptions,
  onRuntimeOptionsChange,
  isLoading,
  isFileLoading,
  onSendMessage,
  onUploadFiles,
  currentAgentActivity,
}: ChatPanelProps) {
  const [input, setInput] = useState('');    // it will  store the text  that we will  enter in the  chatbox
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [visibleChars, setVisibleChars] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const phaseStyle = (phase?: string) => {
    if (phase === 'execution') return 'border-blue-700/60 bg-blue-500/10 text-blue-200';
    if (phase === 'reflection') return 'border-emerald-700/60 bg-emerald-500/10 text-emerald-200';
    return 'border-slate-700 bg-slate-800/70 text-slate-300';
  };

  const isQualityDeltaMessage = (msg: Message) => (
    (msg.kind === 'quality-delta') || (msg.role === 'system' && msg.content.startsWith('📊 Quality Delta after'))
  );

  useEffect(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && !isQualityDeltaMessage(msg));

    if (!lastAssistantMessage) {
      setStreamingMessageId(null);
      setVisibleChars(0);
      return;
    }

    if (lastAssistantMessage.id !== streamingMessageId) {
      setStreamingMessageId(lastAssistantMessage.id);
      setVisibleChars(0);
      return;
    }

    setVisibleChars((prev) => Math.min(prev, lastAssistantMessage.content.length));
  }, [messages, streamingMessageId]);

  useEffect(() => {
    if (!streamingMessageId) return;

    const activeMessage = messages.find((msg) => msg.id === streamingMessageId);
    if (!activeMessage) return;
    if (visibleChars >= activeMessage.content.length) return;

    const timer = window.setTimeout(() => {
      const remaining = activeMessage.content.length - visibleChars;
      const step = Math.max(1, Math.ceil(remaining / 24));
      setVisibleChars((prev) => Math.min(prev + step, activeMessage.content.length));
    }, 16);

    return () => window.clearTimeout(timer);
  }, [messages, streamingMessageId, visibleChars]);

  const getDeltaTone = (label: string, deltaText: string) => {
    const normalized = deltaText.trim();
    const isNeutral = normalized === '0%' || normalized === '+0%' || normalized === '-0%' || normalized === '+0 pts' || normalized === '0 pts';

    if (isNeutral) {
      return 'text-slate-600 dark:text-slate-300';
    }

    if (label.toLowerCase() === 'score') {
      return normalized.startsWith('+')
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-rose-700 dark:text-rose-300';
    }

    return normalized.startsWith('-')
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-rose-700 dark:text-rose-300';
  };

  const renderQualityDelta = (content: string) => {
    const lines = content.split('\n').filter(Boolean);
    const title = lines[0] ?? 'Quality Delta';
    const metricLines = lines.slice(1);

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <div className="mt-2 space-y-1.5">
          {metricLines.map((line) => {
            const match = line.match(/^([^:]+):\s*(.+)\s+\(([^)]+)\)$/);

            if (!match) {
              return (
                <p key={line} className="text-[11px] text-slate-700 dark:text-slate-300">{line}</p>
              );
            }

            const label = match[1];
            const valueText = match[2];
            const deltaText = match[3];
            const toneClass = getDeltaTone(label, deltaText);

            return (
              <div key={line} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-700 dark:text-slate-200">{valueText}</span>
                  <span className={["text-[11px] font-semibold", toneClass].join(' ')}>({deltaText})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const quickSuggestions = [
    'What is the main goal of your project?',
    'How would you measure success for this task?',
    'What other factors influence outcomes?',
  ];

  return (
    <div className="flex h-full flex-col bg-transparent text-slate-100">
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-6 sm:px-6 sm:pb-8">
        <div className="mx-auto w-full max-w-[860px]">
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1.5">
                  <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && (
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-blue-700/70 bg-[#0f172a] text-[11px] font-semibold text-blue-300">
                        R
                      </div>
                    )}
                    <div className={`min-w-0 ${msg.role === 'user' ? 'max-w-[84%]' : 'max-w-[94%] flex-1'}`}>
                      {msg.role === 'assistant' && (
                        <div className="mb-1 text-[12px] font-semibold text-slate-400">Rowen</div>
                      )}
                      {msg.role === 'assistant' && msg.phase && (
                        <div className="mb-1">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${phaseStyle(msg.phase)}`}>
                            {msg.phase === 'execution' ? 'Execution' : 'Reasoning'}
                          </span>
                        </div>
                      )}
                      <div
                        className={[
                          msg.role === 'user'
                            ? 'rounded-xl rounded-tr-sm border border-[#2b2b2b] bg-[#171717] px-3.5 py-2.5 text-sm text-slate-100'
                            : 'pl-0 text-slate-300',
                        ].join(' ')}
                      >
                        {msg.role === 'user' ? (
                          <p className="leading-6">{msg.content}</p>
                        ) : isQualityDeltaMessage(msg) ? (
                          renderQualityDelta(msg.content)
                        ) : (
                          <div className="chat-markdown font-sans text-[16px] leading-[1.75] tracking-[-0.01em] text-slate-100">
                            {(() => {
                              const shouldStream = msg.role === 'assistant' && msg.id === streamingMessageId;
                              const streamedContent = shouldStream ? msg.content.slice(0, visibleChars) : msg.content;
                              const isStreaming = shouldStream && visibleChars < msg.content.length;

                              return (
                                <>
                                  <ReactMarkdown>{streamedContent}</ReactMarkdown>
                                  {isStreaming ? <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-slate-300 align-middle" /> : null}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                        <User className="h-3 w-3 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {msg.code && (
                    <div className="ml-8">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Python</div>
                      <pre className="overflow-x-auto rounded-lg border border-[#2a2a2a] bg-[#121212] p-3 text-xs">
                        <code className="text-slate-200">{msg.code}</code>
                      </pre>
                    </div>
                  )}

                  {msg.output && (
                    <div className="ml-8">
                      <pre className="overflow-x-auto rounded-lg border border-[#2a2a2a] bg-[#121212] p-3 text-xs text-slate-300">
                        {msg.output}
                      </pre>
                    </div>
                  )}

                  {msg.error && (
                    <div className="ml-8">
                      <pre className="rounded-lg border border-rose-900/70 bg-rose-950/30 p-3 text-xs text-rose-300">
                        {msg.error}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={`${messages.length > 0 ? 'mt-8' : 'mt-24 sm:mt-28'}`}>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>Suggestions</span>
              <button type="button" className="text-slate-500 hover:text-slate-300">New suggestions</button>
            </div>
            <div className="divide-y divide-[#1f1f1f] rounded-lg border border-[#1a1a1a] bg-transparent">
              {quickSuggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => onSendMessage(question, runtimeOptions)}
                  disabled={isLoading}
                  className="flex w-full items-center justify-start px-4 py-3 text-left text-[14px] text-slate-300 hover:bg-[#121212] disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="mt-3 flex items-center gap-2.5 pl-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
              <span className="text-xs text-slate-500">
                {currentAgentActivity ? `Running: ${currentAgentActivity}` : 'Running analysis...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 bg-[#060606]/96 px-3 pb-3 pt-2 backdrop-blur sm:px-6 sm:pb-4 sm:pt-3">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[980px]">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#171717] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResizeInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="min-h-[52px] max-h-[220px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-base text-slate-100 placeholder-slate-500 focus:outline-none"
              rows={1}
              disabled={isLoading}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2a2a] pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isLoading || isFileLoading}
                  className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
                  title="Upload dataset"
                  aria-label="Upload dataset"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onRuntimeOptionsChange({ ...runtimeOptions, connectorsEnabled: !runtimeOptions.connectorsEnabled })}
                  className={`julius-control-chip ${runtimeOptions.connectorsEnabled ? 'julius-control-chip-active' : ''}`}
                >
                  <Database className="h-3 w-3" /> Connectors
                </button>
                <button
                  type="button"
                  onClick={() => onRuntimeOptionsChange({ ...runtimeOptions, toolsEnabled: !runtimeOptions.toolsEnabled })}
                  className={`julius-control-chip ${runtimeOptions.toolsEnabled ? 'julius-control-chip-active' : ''}`}
                >
                  <Wrench className="h-3 w-3" /> Tools
                </button>
                <select
                  value={runtimeOptions.model}
                  onChange={(event) => onRuntimeOptionsChange({ ...runtimeOptions, model: event.target.value as 'gpt-4o-mini' | 'gpt-4o' })}
                  className="julius-control-chip focus:outline-none"
                  aria-label="Select model"
                >
                  <option value="gpt-4o-mini">Customer S...</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRuntimeOptionsChange({ ...runtimeOptions, advancedReasoning: !runtimeOptions.advancedReasoning })}
                  className={`julius-control-chip ${runtimeOptions.advancedReasoning ? 'julius-control-chip-active' : ''}`}
                >
                  <SlidersHorizontal className="h-3 w-3" /> Advanced Reasoning
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-full bg-blue-700 p-2.5 text-slate-100 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length > 0) {
            onUploadFiles(files);
          }
          e.currentTarget.value = '';
        }}
        disabled={isLoading || isFileLoading}
      />
    </div>
  );
}
