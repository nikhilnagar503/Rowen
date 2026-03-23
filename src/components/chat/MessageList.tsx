import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { MessageListProps } from './types';
import { getDeltaTone, getPhaseStyle, isQualityDeltaMessage } from './messageUtils';

function renderQualityDelta(content: string) {
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
}

export default function MessageList({ messages, streamingMessageId, visibleChars }: MessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
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
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${getPhaseStyle(msg.phase)}`}>
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
  );
}
