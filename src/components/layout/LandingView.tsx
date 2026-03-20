/**
 * LandingView.tsx — Pre-Upload Landing Layout
 *
 * WHY THIS FILE EXISTS:
 * The app has two distinct full-page states: before a file is loaded (landing)
 * and after (workspace). Splitting them into separate layout components keeps
 * each screen clean and independent. LandingView owns the pre-upload layout.
 *
 * WHAT IT DOES:
 * - Wraps the screen in the app's dark background (`#0a0e1a`).
 * - Adds two decorative blurred radial glows (cyan top-left, violet bottom-right)
 *   for visual depth — they are `pointer-events-none` so they never block clicks.
 * - Renders `AppHeader` in compact mode (hides the product name/logo so the
 *   hero headline in FileUpload takes visual focus).
 * - Renders `FileUpload` and passes down:
 *   • `isPyodideLoading` — so FileUpload can show a spinner while Python boots.
 *   • `onFileLoad`       — callback that fires when user selects/drops a file.
 *
 * ROLE IN THE PRODUCT:
 * This is the first screen every user sees. It controls the visual framing of
 * the upload interaction and transitions the user into the workspace once a
 * file is ready.
 */
import FileUpload from '../FileUpload';
import AppHeader from './AppHeader';
import type { PersistedSessionSummary } from '../../types/index';

interface LandingViewProps {
  isPyodideLoading: boolean;
  onFileLoad: (fileName: string, content: string) => void;
  connectionLabel: string;
  storageLabel: string;
  activeSessionId: string | null;
  sessionList: PersistedSessionSummary[];
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRefreshSessions: () => void;
  onRenameSession: (sessionId: string, title: string) => void;
}

export default function LandingView({
  isPyodideLoading,
  onFileLoad,
  connectionLabel,
  storageLabel,
  activeSessionId,
  sessionList,
  onSelectSession,
  onCreateSession,
  onRefreshSessions,
  onRenameSession,
}: LandingViewProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#f7f7f5] text-slate-900 dark:bg-[#191919] dark:text-slate-100">
      {/* Subtle background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-16 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-700/20" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
      </div>
      <AppHeader
        compact
        connectionLabel={connectionLabel}
        storageLabel={storageLabel}
        activeSessionId={activeSessionId}
        sessionList={sessionList}
        onSelectSession={onSelectSession}
        onCreateSession={onCreateSession}
        onRefreshSessions={onRefreshSessions}
        onRenameSession={onRenameSession}
      />
      <FileUpload onFileLoad={onFileLoad} isLoading={isPyodideLoading} />
    </div>
  );
}
