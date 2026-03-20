/**
 * AppHeader.tsx — Top Navigation / Status Bar
 
 *
 * WHAT IT DOES:
 * - Renders a frosted-glass header bar (backdrop-blur) on both the landing and
 *   workspace screens.
 * - `compact` prop (default false):
 *   • false (workspace) — shows the full CSVHero logo + "Data Copilot" badge on
 *     the left, and the connection status pill on the right.
 *   • true  (landing)  — hides the logo entirely so the landing hero text takes
 *     focus; only shows the connection pill aligned right.
 * - The connection pill shows:
 *   • An animated live dot (CSS class `agent-live-dot`).
 *   • A Sparkles icon.
 *   • The `connectionLabel` string (e.g. "ChatGPT Connected").
 *
 * ROLE IN THE PRODUCT:
 * Provides persistent visual trust signals (the AI is connected and live) and
 * brand presence across the entire app without taking up vertical space or
 * adding interactive complexity.
 */
'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';
import { BarChart3, Moon, Pencil, Plus, RefreshCcw, Sun } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PersistedSessionSummary } from '../../types/index';
import { NICHE } from '../../config/niche';

interface AppHeaderProps {
  compact?: boolean;
  connectionLabel: string;
  storageLabel: string;
  activeSessionId?: string | null;
  sessionList?: PersistedSessionSummary[];
  onSelectSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onRefreshSessions?: () => void;
  onRenameSession?: (sessionId: string, title: string) => void;
}

type ThemeMode = 'light' | 'dark';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  localStorage.setItem('csvhero-theme', mode);
}

function ThemeToggle() {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const stored = localStorage.getItem('csvhero-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    applyTheme(theme);
  }, [isHydrated, theme]);

  const handleToggle = () => {
    if (!isHydrated) {
      return;
    }

    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      aria-label="Toggle theme"
      title={isHydrated ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
    >
      {!isHydrated ? <Moon className="h-3.5 w-3.5" /> : theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span>{isHydrated ? (theme === 'dark' ? 'Light' : 'Dark') : 'Theme'}</span>
    </button>
  );
}

function AuthButtons() {
  const { userId } = useAuth();

  if (userId) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <UserButton />
        </div>
        <Link
          href="/sign-out"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Sign out
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/sign-in"
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Create account
      </Link>
    </div>
  );
}

export default function AppHeader({
  compact = false,
  connectionLabel,
  storageLabel,
  activeSessionId,
  sessionList,
  onSelectSession,
  onCreateSession,
  onRefreshSessions,
  onRenameSession,
}: AppHeaderProps) {
  const { userId } = useAuth();
  const showSessionControls = Boolean(userId && sessionList && onSelectSession && onCreateSession);
  const activeSession = sessionList?.find((session) => session.id === activeSessionId) ?? null;

  const handleRenameClick = () => {
    if (!onRenameSession || !activeSessionId) {
      return;
    }

    const currentTitle = activeSession?.title ?? 'Untitled session';
    const nextTitle = window.prompt('Rename session', currentTitle);
    if (!nextTitle || nextTitle.trim() === '' || nextTitle.trim() === currentTitle) {
      return;
    }

    onRenameSession(activeSessionId, nextTitle);
  };

  return (
    <header
      className={[
        'flex items-center border-b px-5',
        'border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-[#191919]/95',
        compact ? 'justify-end py-3' : 'justify-between py-3',
      ].join(' ')}
      style={{ minHeight: 56 }}
    >
      {!compact && (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700">
            <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Data Agent <span className="text-slate-900 dark:text-slate-100">Hero</span>
            </span>
            <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {NICHE.shortLabel}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {showSessionControls && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <select
                value={activeSessionId ?? ''}
                onChange={(event) => onSelectSession?.(event.target.value)}
                className="max-w-[220px] bg-transparent text-xs text-slate-700 focus:outline-none dark:text-slate-200"
                aria-label="Select session"
              >
                {sessionList?.length ? (
                  sessionList.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))
                ) : (
                  <option value="">No saved sessions</option>
                )}
              </select>
              {onRefreshSessions && (
                <button
                  type="button"
                  onClick={onRefreshSessions}
                  className="rounded border border-slate-300 bg-white p-1 text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  aria-label="Refresh sessions"
                  title="Refresh sessions"
                >
                  <RefreshCcw className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onCreateSession}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New session
            </button>

            {onRenameSession && activeSessionId && (
              <button
                type="button"
                onClick={handleRenameClick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Rename session"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
            )}
          </div>
        )}

        <div className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <span className="agent-live-dot" />
          <span>{connectionLabel}</span>
        </div>
        <div className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {storageLabel}
        </div>
        <ThemeToggle />

        <AuthButtons />
      </div>
    </header>
  );
}
