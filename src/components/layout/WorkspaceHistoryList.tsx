import type { PersistedSessionSummary } from '../../types/index';

interface WorkspaceHistoryListProps {
  sessionList: PersistedSessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void | Promise<void>;
}

export function WorkspaceHistoryList({ sessionList, activeSessionId, onSelectSession }: WorkspaceHistoryListProps) {
  if (!sessionList.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#2a2a2a] px-2.5 py-3 text-xs text-slate-500">
        No chat history yet.
      </div>
    );
  }

  return sessionList.map((session) => (
    <button
      key={session.id}
      type="button"
      onClick={() => { void onSelectSession(session.id); }}
      className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${activeSessionId === session.id ? 'border-[#2f5db3] bg-[#122340] text-slate-100' : 'border-transparent bg-[#161616] text-slate-300 hover:border-[#2a2a2a] hover:bg-[#1b1b1b]'}`}
      title={session.title}
    >
      <div className="truncate font-medium">{session.title}</div>
      <div className="mt-1 text-[10px] text-slate-500">{new Date(session.updatedAt).toLocaleString()}</div>
    </button>
  ));
}
