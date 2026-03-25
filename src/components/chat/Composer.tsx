import { Database, Paperclip, Send, SlidersHorizontal, Wrench } from 'lucide-react';
import type { ComposerProps } from './types';

export default function Composer({
  input,
  setInput,
  runtimeOptions,
  onRuntimeOptionsChange,
  isLoading,
  isFileLoading,
  onSubmit,
  onKeyDown,
  onUploadClick,
  inputRef,
}: ComposerProps) {

  return (
    <div className="sticky bottom-0 z-20 bg-[#060606]/96 px-3 pb-3 pt-2 backdrop-blur sm:px-6 sm:pb-4 sm:pt-3">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-[980px]">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#171717] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message..."
            className="min-h-[52px] max-h-[220px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-base text-slate-100 placeholder-slate-500 focus:outline-none"
            rows={1}
            disabled={isLoading}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#2a2a2a] pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={onUploadClick}
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
  );
}
