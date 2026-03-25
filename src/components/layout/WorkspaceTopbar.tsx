import { ChevronDown, MoreHorizontal } from 'lucide-react';

interface WorkspaceTopbarProps {
  activeSessionId: string | null;
}

export function WorkspaceTopbar({ activeSessionId }: WorkspaceTopbarProps) {
  return (
    <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-[#060606] px-4 sm:px-5">
      <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
        <span className="font-medium text-slate-100">Rowen</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="text-center text-sm font-semibold text-slate-100">{activeSessionId ? 'Active Thread' : 'New Thread'}</div>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="hidden rounded-xl border border-[#1b3f8f] bg-[#0f234b] px-4 py-2 text-[13px] font-medium text-[#3f86ff] hover:bg-[#133062] sm:inline-flex">Upgrade</button>
        <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-[#171a20] hover:text-slate-200" title="More">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
