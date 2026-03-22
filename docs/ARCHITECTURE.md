# CSVHero Architecture

## Overview

CSVHero is a client-heavy analysis app where UI state and orchestration live in React hooks, AI requests run through server API routes, and Python execution runs in-browser through Pyodide.

## Request and Execution Flow

1. User sends a prompt from `ChatPanel`.
2. `WorkspaceView` forwards actions from props to `useCsvHeroApp` handlers.
3. `useCsvHeroApp` delegates to `useChatActions`.
4. `useChatActions` calls `sendMessage` in `src/lib/ai.ts`.
5. `sendMessage` calls `POST /api/chat`.
6. Server route `app/api/chat/route.ts` forwards to OpenAI using `OPENAI_API_KEY`.
7. Returned Python code is executed by `executeCode` in `src/lib/pyodide.ts`.
8. Updated dataframe metadata and message output are pushed back into app state.

## Session and Persistence Flow

1. `useCloudSessionSync` restores latest session when signed in.
2. Session changes are debounced and synced via `syncSession` (`src/lib/persistence.ts`).
3. Sync calls `POST /api/session`, which upserts `analysis_sessions` in Supabase.
4. Session list/selection use `GET /api/session` and `GET /api/session?list=1`.
5. If Supabase is unavailable, responses indicate `storageAvailable: false` and the app stays local-only.

## Key Modules

- `src/hooks/useCsvHeroApp.ts`
  - central orchestration hook
  - composes sub-hooks for chat, files, sessions, and cloud sync

- `src/hooks/useCsvHeroApp/chatActions.ts`
  - user message flow
  - Python execution and assistant response creation

- `src/hooks/useCsvHeroApp/fileActions.ts`
  - file upload/load and CSV export actions

- `src/hooks/useCsvHeroApp/sessionActions.ts`
  - create/select/refresh/rename session actions

- `src/hooks/useCsvHeroApp/useCloudSessionSync.ts`
  - restore latest cloud session
  - auto-sync changed state to cloud with fingerprinting

- `src/lib/ai.ts`
  - prompt templates
  - response parsing and chat route calls

- `src/lib/pyodide.ts`
  - runtime bootstrapping
  - CSV loading and Python code execution

- `app/api/chat/route.ts`
  - OpenAI gateway route

- `app/api/session/route.ts`
  - Clerk-authenticated session persistence route

## Data and Storage

- Active dataframe state is kept in browser memory.
- Session snapshots are persisted as JSON in `public.analysis_sessions`.
- Table schema and trigger definitions live in `supabase/schema.sql`.

## Auth

- Clerk middleware is configured in `proxy.ts`.
- Auth pages exist under `app/(auth)/`.
- Session APIs require authenticated Clerk user IDs for cloud operations.

## Runtime Boundaries

- Browser-only: Pyodide execution (`src/lib/pyodide.ts`), chat UI, local state.
- Server-only: OpenAI API key usage (`/api/chat`), Supabase service-role writes (`/api/session`).
