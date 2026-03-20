/**
 * WorkspaceView.tsx — Post-Upload Main Workspace Layout
 *
 * WHY THIS FILE EXISTS:
 * Once a file is uploaded the app switches to a two-panel workspace. This
 * component owns that layout and wires the correct props to each panel.
 * Keeping layout separate from logic means we can rearrange panels or add
 * a third panel later without touching any state or AI code.
 *
 * WHAT IT DOES:
 * - Renders the persistent `AppHeader` (with logo + connection badge).
 * - Creates a side-by-side `<main>` grid:
 *   LEFT (42% width) — `ChatPanel`: the AI conversation interface.
 *     Receives messages, loading state, recommended actions, and all
 *     chat/autopilot action handlers.
 *   RIGHT (remaining width) — `DataPanel`: the live data dashboard.
 *     Receives dfInfo (DataFrame metadata), fileName, messages (for
 *     chart gallery + run history), download, and reset handlers.
 * - Uses `calc(100vh - 56px)` for the grid height to fit below the header
 *   exactly without overflow or scrollbars on the outer container.
 *
 * ROLE IN THE PRODUCT:
 * This is the main product experience. Every data conversation, chart, download,
 * and insight the user gets happens inside this layout. It is the screen users
 * spend 95% of their session time on.
 */
import ChatPanel from '../ChatPanel';
import type { ChatRuntimeOptions, DataFrameInfo, Message } from '../../types/index';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  NotebookTabs,
  Files,
  Database,
  Bot,
  MessagesSquare,
  PanelRightOpen,
  PanelRightClose,
  Settings,
  PenSquare,
  Link2,
  Sparkles,
  ShieldCheck,
  MoreHorizontal,
  PanelLeftOpen,
  PanelLeftClose,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  SlidersHorizontal,
  BookCopy,
} from 'lucide-react';

interface WorkspaceViewProps {
  fileName: string | null;
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  fileNames: string[];
  isLoading: boolean;
  isPyodideLoading: boolean;
  onSendMessage: (message: string, options?: ChatRuntimeOptions) => void;
  onUploadFiles: (files: File[]) => void;
  activeSessionId: string | null;
  runtimeOptions: ChatRuntimeOptions;
  onRuntimeOptionsChange: (next: ChatRuntimeOptions) => void;
  qualitySummary: {
    rows: number;
    columns: number;
    missingTotal: number;
    duplicates: number;
    score: number;
  } | null;
  currentAgentActivity: string | null;
}

export default function WorkspaceView({
  fileName,
  dfInfo,
  messages,
  fileNames,
  isLoading,
  isPyodideLoading,
  onSendMessage,
  onUploadFiles,
  activeSessionId,
  runtimeOptions,
  onRuntimeOptionsChange,
  qualitySummary,
  currentAgentActivity,
}: WorkspaceViewProps) {
  const { user } = useUser();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'explorer' | 'report'>('explorer');
  const [activePrimaryNavKey, setActivePrimaryNavKey] = useState('new');

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  const chartMessages = messages.filter((msg) => Boolean(msg.chartUrl));

  const primaryNav = [
    { key: 'new', label: 'New', icon: PenSquare },
    { key: 'chats', label: 'Chats', icon: MessagesSquare },
    { key: 'files', label: 'Files', icon: Files },
  
  
  ] as const;

 

  return (
    <div className="julius-shell flex h-screen flex-col overflow-hidden bg-[#050505] text-slate-100">
      <div className="flex flex-1 overflow-hidden">
        <aside className={`${sidebarExpanded ? 'w-[300px]' : 'w-[72px]'} flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] p-2.5 transition-all duration-200`}>
          <div className={`flex items-center ${sidebarExpanded ? 'justify-between' : 'justify-center'}`}>
            {sidebarExpanded ? <p className="px-1 text-[32px] font-semibold tracking-tight text-blue-500">Rowen</p> : null}
            <div className="flex items-center gap-1.5">

              {sidebarExpanded ? (
                <button className="julius-icon-btn" title="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                className="julius-icon-btn"
                title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className={`mt-3 flex items-center gap-2 rounded-xl border border-[#252525] bg-[#121212] p-2 ${sidebarExpanded ? '' : 'justify-center'}`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700/70 text-base font-medium text-slate-100">{userInitial}</div>
            {sidebarExpanded ? <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{userEmail}</p> : null}
            {sidebarExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : null}
          </div>

          <div className="mt-3 space-y-1">
            {primaryNav.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setActivePrimaryNavKey(item.key)}
                  className={`flex w-full items-center rounded-xl border px-3 py-2.5 transition ${activePrimaryNavKey === item.key ? 'border-[#2e2e2e] bg-[#181818] text-white' : 'border-transparent bg-transparent text-slate-200 hover:border-[#252525] hover:bg-[#131313]'} ${sidebarExpanded ? 'gap-2.5 justify-start' : 'justify-center px-0'}`}
                  title={item.label}
                >
                  <ItemIcon className="h-4 w-4 shrink-0" />
                  {sidebarExpanded ? <span className="text-[15px] font-medium">{item.label}</span> : null}
                  {sidebarExpanded && item.key === 'chats' ? <ChevronRight className="ml-auto h-4 w-4 text-slate-500" /> : null}
                </button>
              );
            })}
          </div>

          

          <div className="mt-auto space-y-2">
            {sidebarExpanded ? (
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-3">
                <p className="text-sm font-medium text-white">No messages left</p>
                <p className="mt-1 text-xs text-slate-400">Upgrade now to continue using Rowen</p>
                <button className="mt-2 w-full rounded-xl border border-[#3a3a3a] bg-[#171717] px-3 py-2 text-sm font-medium text-white hover:bg-[#202020]">
                  Upgrade Now
                </button>
              </div>
            ) : null}

            <div className={`${sidebarExpanded ? 'px-1' : 'flex justify-center'}`}>
              <button className="julius-icon-btn" title="Help & Settings">
                {sidebarExpanded ? <Settings className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 overflow-hidden bg-[#060606]">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#060606]">
            <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-[#060606] px-4 sm:px-5">
              <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
                <span className="font-medium text-slate-100">Rowen</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div className="text-center text-sm font-semibold text-slate-100">{activeSessionId ? 'Active Thread' : 'New Thread'}</div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="hidden rounded-xl border border-[#2b3340] bg-[#101726] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-[#152035] sm:inline-flex"
                >
                  Share
                </button>
                <button
                  type="button"
                  className="hidden rounded-xl border border-[#1b3f8f] bg-[#0f234b] px-4 py-2 text-[13px] font-medium text-[#3f86ff] hover:bg-[#133062] sm:inline-flex"
                >
                  Upgrade
                </button>
                
                
      
                
                <button
                  type="button"
                  onClick={() => setRightPanelOpen((prev) => !prev)}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-[#171a20]"
                  title={rightPanelOpen ? 'Hide side panel' : 'Show side panel'}
                >
                  {rightPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                </button>



                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-[#171a20] hover:text-slate-200"
                  title="More"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                
              </div>
            </div>

            <ChatPanel
              messages={messages}
              runtimeOptions={runtimeOptions}
              onRuntimeOptionsChange={onRuntimeOptionsChange}
              isLoading={isLoading}
              isFileLoading={isPyodideLoading}
              onSendMessage={onSendMessage}
              onUploadFiles={onUploadFiles}
              currentAgentActivity={currentAgentActivity}
            />
          </section>

          {rightPanelOpen && (
            <aside className="w-[86vw] max-w-[280px] border-l border-[#1f1f1f] bg-[#111111] p-3">
              {rightPanelTab === 'explorer' ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data Explorer</p>
                  <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                    <p className="text-[11px] font-medium text-slate-200">Dataset Shape</p>
                    <p className="mt-1 text-[12px] text-slate-300">{dfInfo ? `${dfInfo.shape[0].toLocaleString()} rows x ${dfInfo.shape[1]} cols` : 'No data loaded'}</p>
                  </div>

                  <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                    <p className="text-[11px] font-medium text-slate-200">Columns</p>
                    <div className="mt-1 max-h-[240px] space-y-1 overflow-y-auto pr-1">
                      {(dfInfo?.columns ?? []).slice(0, 40).map((column) => (
                        <div key={column} className="flex items-center justify-between rounded-md border border-slate-800 bg-[#161616] px-2 py-1">
                          <span className="truncate pr-2 text-[11px] text-slate-300">{column}</span>
                          <span className="rounded border border-slate-700 px-1 py-0.5 text-[9px] text-slate-400">
                            {dfInfo?.dtypes[column] ?? 'n/a'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Run Report</p>

                  {qualitySummary && (
                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <p className="text-[11px] font-medium">Quality</p>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-300">Score: {qualitySummary.score}/100</p>
                      <p className="text-[11px] text-slate-400">Missing: {qualitySummary.missingTotal.toLocaleString()} | Duplicates: {qualitySummary.duplicates.toLocaleString()}</p>
                    </div>
                  )}

                  <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      <p className="text-[11px] font-medium">Charts Generated</p>
                    </div>

                    <p className="mt-1 text-[12px] text-slate-300">{chartMessages.length} charts in this run</p>
                    
                    <div className="mt-2 space-y-2">
                      {chartMessages.slice(-3).map((msg) => (
                        <img
                          key={msg.id}
                          src={msg.chartUrl}
                          alt="Generated chart"
                          className="w-full rounded-md border border-slate-700"
                        />
                      ))}
                      {chartMessages.length === 0 && (
                        <p className="text-[11px] text-slate-500">No charts yet. Ask: "Create a chart for monthly revenue".</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}
