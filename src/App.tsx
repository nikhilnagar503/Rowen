/**
 * App.tsx — Root Component / Screen Router
 *
 * WHY THIS FILE EXISTS:
 * This is the top-level React component that `app/page.tsx` (Next.js App Router)
 * renders into the DOM. It acts as a simple router: it decides
 * which full-page layout to show based on whether the user has uploaded a file.
 *
 * WHAT IT DOES:
 * - Calls `useCsvHeroApp()` to get ALL application state and action handlers
 *   from a single centralized hook. This keeps App.tsx thin — it only decides
 *   WHICH screen to render, not HOW things work.
 * - Shows `LandingView` (upload screen) when no file is loaded.
 * - Shows `WorkspaceView` (chat + data dashboard) once a file is loaded.
 *
 * ROLE IN THE PRODUCT:
 * This is the entry point users see after the app boots. It is the only place
 * in the app that makes the Landing ↔ Workspace transition decision. Every
 * other component is a pure UI piece that receives props from here.
 */
'use client';

import WorkspaceView from './components/layout/WorkspaceView';

// Custom hook that contains the core app logic/state/actions.
import { useCsvHeroApp } from './hooks/useCsvHeroApp';

// Root UI component for the app.

function App() {
  // Pull all state + handlers from one centralized hook.
  // This keeps App.tsx focused on *which screen to show*.
  const {

    fileName,
    // DataFrame summary/info from Pyodide.
    dfInfo,
    // Chat timeline messages.
    messages,
    // Global loading state for AI / code execution.
    isLoading,
    // Loading state specifically for Pyodide engine startup.
    isPyodideLoading,
    runtimeOptions,
    setRuntimeOptions,
    // Active cloud session id.
    sessionId,
    // Saved sessions list.
    sessionList,
    // Uploaded dataset names in current session.
    fileNames,
    // Handler for sending a user chat message.
    handleSendMessage,
    // Handler called when file is uploaded.
    handleFileLoad,
    // Handler for chat-bar file uploads.
    handleUploadFiles,
    // Handler for downloading cleaned CSV.
    handleDownload,
    // Create a new session.
    handleCreateSession,
    // Switch to a selected session.
    handleSelectSession,
    // Refresh session history list.
    handleRefreshSessions,
    // Rename a session title.
    handleRenameSession,
    qualitySummary,
    // Human-readable current processing activity.
    currentAgentActivity,
  } = useCsvHeroApp();

  return (
    <>
      <WorkspaceView
        fileName={fileName}
        dfInfo={dfInfo}
        fileNames={fileNames}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onUploadFiles={handleUploadFiles}
        isPyodideLoading={isPyodideLoading}
        activeSessionId={sessionId}
        runtimeOptions={runtimeOptions}
        onRuntimeOptionsChange={setRuntimeOptions}
        qualitySummary={qualitySummary}
        currentAgentActivity={currentAgentActivity}
      />
    </>
  );
}

// Export root app component so app/page.tsx (Next.js App Router) can render it.
export default App;
