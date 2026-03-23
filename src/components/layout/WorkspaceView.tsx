/**
 * WorkspaceView.tsx - Main Workspace Layout
 *
 * WHY THIS FILE EXISTS:
 * This component owns the main app workspace and keeps layout concerns
 * separate from chat/runtime logic.
 *
 * WHAT IT DOES:
 * - Renders the app sidebar and top toolbar.
 * - Renders `ChatPanel` as the primary full-width workspace area.
 *
 * ROLE IN THE PRODUCT:
 * This is the main product experience. Every data conversation and insight
 * happens inside this layout. It is the screen users
 * spend 95% of their session time on.
 */
import ChatPanel from '../ChatPanel';
import type { ChatRuntimeOptions, Message, PersistedSessionSummary } from '../../types/index';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Files,
  MessagesSquare,
  Settings,
  PenSquare,
  MoreHorizontal,
  PanelLeftOpen,
  PanelLeftClose,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
} from 'lucide-react';

interface WorkspaceViewProps {
  messages: Message[];
  isLoading: boolean;
  isPyodideLoading: boolean;
  onSendMessage: (message: string, options?: ChatRuntimeOptions) => void;
  onUploadFiles: (files: File[]) => void;
  onCreateSession: () => void | Promise<void>;
  activeSessionId: string | null;
  sessionList: PersistedSessionSummary[];
  onSelectSession: (sessionId: string) => void | Promise<void>;
  runtimeOptions: ChatRuntimeOptions;
  onRuntimeOptionsChange: (next: ChatRuntimeOptions) => void;
}

export default function WorkspaceView({
  messages,
  isLoading,
  isPyodideLoading,
  onSendMessage,
  onUploadFiles,
  onCreateSession,
  activeSessionId,
  sessionList,
  onSelectSession,
  runtimeOptions,
  onRuntimeOptionsChange,
}: WorkspaceViewProps) {
  const { user } = useUser();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activePrimaryNavKey, setActivePrimaryNavKey] = useState('new');

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  const handlePrimaryNavClick = async (key: 'new' | 'chats' | 'files') => {
    setActivePrimaryNavKey(key);

    if (key === 'new') {
      await onCreateSession();
    }
  };

 

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
         
     
          {/* --------------------------------------------------------------------------------------------------------------------------------------------------------- */}
          <div className={`mt-3 flex items-center gap-2 rounded-xl border border-[#252525] bg-[#121212] p-2 ${sidebarExpanded ? '' : 'justify-center'}`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700/70 text-base font-medium text-slate-100">{userInitial}</div>
            {sidebarExpanded ? <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{userEmail}</p> : null}
            {sidebarExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : null}
          </div>
          {/* --------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}


          

          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                void handlePrimaryNavClick('new');
              }}
              className={`flex w-full items-center rounded-xl border px-3 py-2.5 transition ${activePrimaryNavKey === 'new' ? 'border-[#2e2e2e] bg-[#181818] text-white' : 'border-transparent bg-transparent text-slate-200 hover:border-[#252525] hover:bg-[#131313]'} ${sidebarExpanded ? 'gap-2.5 justify-start' : 'justify-center px-0'}`}
              title="New"
            >
              <PenSquare className="h-4 w-4 shrink-0" />
              {sidebarExpanded ? <span className="text-[15px] font-medium">New</span> : null}
            </button>

            <button
              type="button"
              onClick={() => {
                void handlePrimaryNavClick('chats');
              }}
              className={`flex w-full items-center rounded-xl border px-3 py-2.5 transition ${activePrimaryNavKey === 'chats' ? 'border-[#2e2e2e] bg-[#181818] text-white' : 'border-transparent bg-transparent text-slate-200 hover:border-[#252525] hover:bg-[#131313]'} ${sidebarExpanded ? 'gap-2.5 justify-start' : 'justify-center px-0'}`}
              title="Chats"
            >
              <MessagesSquare className="h-4 w-4 shrink-0" />
              {sidebarExpanded ? <span className="text-[15px] font-medium">Chats</span> : null}
              {sidebarExpanded ? <ChevronRight className="ml-auto h-4 w-4 text-slate-500" /> : null}
            </button>



            {sidebarExpanded && activePrimaryNavKey === 'chats' ? (
              <div className="mt-2 rounded-xl border border-[#252525] bg-[#111111] p-2">
                <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chat history</div>
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {sessionList.length ? (
                    sessionList.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          void onSelectSession(session.id);
                        }}
                        className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs transition ${activeSessionId === session.id ? 'border-[#2f5db3] bg-[#122340] text-slate-100' : 'border-transparent bg-[#161616] text-slate-300 hover:border-[#2a2a2a] hover:bg-[#1b1b1b]'}`}
                        title={session.title}
                      >
                        <div className="truncate font-medium">{session.title}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{new Date(session.updatedAt).toLocaleString()}</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#2a2a2a] px-2.5 py-3 text-xs text-slate-500">
                      No chat history yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}


            <button
              type="button"
              onClick={() => {
                void handlePrimaryNavClick('files');
              }}
              className={`flex w-full items-center rounded-xl border px-3 py-2.5 transition ${activePrimaryNavKey === 'files' ? 'border-[#2e2e2e] bg-[#181818] text-white' : 'border-transparent bg-transparent text-slate-200 hover:border-[#252525] hover:bg-[#131313]'} ${sidebarExpanded ? 'gap-2.5 justify-start' : 'justify-center px-0'}`}
              title="Files"
            >
              <Files className="h-4 w-4 shrink-0" />
              {sidebarExpanded ? <span className="text-[15px] font-medium">Files</span> : null}
            </button>
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

{/* ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */}
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
                  className="hidden rounded-xl border border-[#1b3f8f] bg-[#0f234b] px-4 py-2 text-[13px] font-medium text-[#3f86ff] hover:bg-[#133062] sm:inline-flex"
                >
                  Upgrade
                </button>
                
                
      
                {/* ... */}
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
            />

            
          </section>
        </main>


      </div>
    </div>
  );
}





