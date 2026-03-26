import { Paperclip, Send } from 'lucide-react';
import type { ComposerProps } from './types';

export default function Composer({
  input,
  setInput,
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
            placeholder="Ask a question about your data, or upload a CSV to begin..."
            className="min-h-[52px] max-h-[220px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-base text-slate-100 placeholder-slate-500 focus:outline-none"
            rows={1}
            disabled={isLoading}
          />

          <div className="mt-2 flex items-center justify-between border-t border-[#2a2a2a] pt-2">
            <div className="flex items-center gap-2">
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
              <span className="text-xs text-slate-500">Tip: Upload a CSV first for the best results.</span>
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
