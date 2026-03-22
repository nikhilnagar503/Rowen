/**
 * App.tsx — Root App Shell
 *
 * WHY THIS FILE EXISTS:
 * This is the top-level React component that `app/page.tsx` renders.
 *
 * WHAT IT DOES:
 * - Calls `useCsvHeroApp()` to get application state and action handlers.
 * - Passes required props into `WorkspaceView`.
 *
 * ROLE IN THE PRODUCT:
 * This is the entry point users see after the app boots.
 */
'use client';

import WorkspaceView from './components/layout/WorkspaceView';

// Custom hook that contains the core app logic/state/actions.
import { useCsvHeroApp } from './hooks/useCsvHeroApp';

// Root UI component for the app.

function App() {
  const {
    messages,
    isLoading,
    isPyodideLoading,
    runtimeOptions,
    setRuntimeOptions,
    sessionId,
    sessionList,
    handleSendMessage,
    handleUploadFiles,
    handleCreateSession,
    handleSelectSession,
    currentAgentActivity,
  } = useCsvHeroApp();

  return (
    <>
      <WorkspaceView
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onUploadFiles={handleUploadFiles}
        onCreateSession={handleCreateSession}
        isPyodideLoading={isPyodideLoading}
        activeSessionId={sessionId}
        sessionList={sessionList}
        onSelectSession={handleSelectSession}
        runtimeOptions={runtimeOptions}
        onRuntimeOptionsChange={setRuntimeOptions}
        currentAgentActivity={currentAgentActivity}
      />
    </>
  );
}

// Export root app component so app/page.tsx (Next.js App Router) can render it.
export default App;
