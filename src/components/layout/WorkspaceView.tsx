import { useState } from 'react';
import ChatPanel from '../ChatPanel';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceTopbar } from './WorkspaceTopbar';
import type { WorkspaceViewProps } from './workspaceTypes';

type NavKey = 'new' | 'chats' | 'files';

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
}: WorkspaceViewProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activePrimaryNavKey, setActivePrimaryNavKey] = useState<NavKey>('new');

  const handlePrimaryNavClick = async (key: NavKey) => {
    setActivePrimaryNavKey(key);
    if (key === 'new') {
      await onCreateSession();
    }
  };

  return (
    <div className="julius-shell flex h-screen flex-col overflow-hidden bg-[#050505] text-slate-100">
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar
          sidebarExpanded={sidebarExpanded}
          activePrimaryNavKey={activePrimaryNavKey}
          setSidebarExpanded={setSidebarExpanded}
          onPrimaryNavClick={handlePrimaryNavClick}
          sessionList={sessionList}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
        />
        <main className="flex flex-1 overflow-hidden bg-[#060606]">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#060606]">
            <WorkspaceTopbar activeSessionId={activeSessionId} />
            <ChatPanel
              messages={messages}
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
