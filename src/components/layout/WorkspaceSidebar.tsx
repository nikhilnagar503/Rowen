import { useUser } from '@clerk/nextjs';
import { Bell, ChevronDown, ChevronRight, CircleHelp, Files, MessagesSquare, PanelLeftClose, PanelLeftOpen, PenSquare, Settings } from 'lucide-react';
import { WorkspaceHistoryList } from './WorkspaceHistoryList';
import type { PersistedSessionSummary } from '../../types/index';

type NavKey = 'new' | 'chats' | 'files';

interface WorkspaceSidebarProps {
  sidebarExpanded: boolean;
  activePrimaryNavKey: NavKey;
  setSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onPrimaryNavClick: (key: NavKey) => Promise<void>;
  sessionList: PersistedSessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void | Promise<void>;
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const navClass = (key: NavKey) => `flex w-full items-center rounded-xl border px-3 py-2.5 transition ${props.activePrimaryNavKey === key ? 'border-[#2e2e2e] bg-[#181818] text-white' : 'border-transparent bg-transparent text-slate-200 hover:border-[#252525] hover:bg-[#131313]'} ${props.sidebarExpanded ? 'justify-start gap-2.5' : 'justify-center px-0'}`;

  return (
    <aside className={`${props.sidebarExpanded ? 'w-[300px]' : 'w-[72px]'} flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] p-2.5 transition-all duration-200`}>
      <div className={`flex items-center ${props.sidebarExpanded ? 'justify-between' : 'justify-center'}`}>
        {props.sidebarExpanded ? <p className="px-1 text-[32px] font-semibold tracking-tight text-blue-500">Rowen</p> : null}
        <div className="flex items-center gap-1.5">
          {props.sidebarExpanded ? <button className="julius-icon-btn" title="Notifications"><Bell className="h-4 w-4" /></button> : null}
          <button type="button" onClick={() => props.setSidebarExpanded((prev) => !prev)} className="julius-icon-btn" title={props.sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}>
            {props.sidebarExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-2 rounded-xl border border-[#252525] bg-[#121212] p-2 ${props.sidebarExpanded ? '' : 'justify-center'}`}>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700/70 text-base font-medium text-slate-100">{userInitial}</div>
        {props.sidebarExpanded ? <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{userEmail}</p> : null}
        {props.sidebarExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : null}
      </div>
      <div className="mt-3 space-y-1">
        <button type="button" onClick={() => { void props.onPrimaryNavClick('new'); }} className={navClass('new')} title="New"><PenSquare className="h-4 w-4 shrink-0" />{props.sidebarExpanded ? <span className="text-[15px] font-medium">New</span> : null}</button>
        <button type="button" onClick={() => { void props.onPrimaryNavClick('chats'); }} className={navClass('chats')} title="Chats"><MessagesSquare className="h-4 w-4 shrink-0" />{props.sidebarExpanded ? <span className="text-[15px] font-medium">Chats</span> : null}{props.sidebarExpanded ? <ChevronRight className="ml-auto h-4 w-4 text-slate-500" /> : null}</button>
        {props.sidebarExpanded && props.activePrimaryNavKey === 'chats' ? (
          <div className="mt-2 rounded-xl border border-[#252525] bg-[#111111] p-2"><div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chat history</div><div className="max-h-56 space-y-1 overflow-y-auto pr-1"><WorkspaceHistoryList sessionList={props.sessionList} activeSessionId={props.activeSessionId} onSelectSession={props.onSelectSession} /></div></div>
        ) : null}
        <button type="button" onClick={() => { void props.onPrimaryNavClick('files'); }} className={navClass('files')} title="Files"><Files className="h-4 w-4 shrink-0" />{props.sidebarExpanded ? <span className="text-[15px] font-medium">Files</span> : null}</button>
      </div>
      <div className="mt-auto space-y-2">
        {props.sidebarExpanded ? <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-3"><p className="text-sm font-medium text-white">No messages left</p><p className="mt-1 text-xs text-slate-400">Upgrade now to continue using Rowen</p><button className="mt-2 w-full rounded-xl border border-[#3a3a3a] bg-[#171717] px-3 py-2 text-sm font-medium text-white hover:bg-[#202020]">Upgrade Now</button></div> : null}
        <div className={`${props.sidebarExpanded ? 'px-1' : 'flex justify-center'}`}><button className="julius-icon-btn" title="Help & Settings">{props.sidebarExpanded ? <Settings className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}</button></div>
      </div>
    </aside>
  );
}
