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

## Ownership Lanes and Contracts

To support concurrent feature work by multiple engineers, ownership is split by layer.

1. Lane A: UI Experience (`src/components/**`, `src/components/layout/**`)
- Allowed: rendering, local input state, presentational refactors
- Not allowed: direct API calls, direct Pyodide calls, direct persistence writes

2. Lane B: Orchestration and App State (`src/hooks/useCsvHeroApp.ts`, `src/hooks/useCsvHeroApp/**`)
- Allowed: state transitions, handler composition, side-effect orchestration
- Contract: expose stable handler + state interface to UI

3. Lane C: AI Gateway (`src/lib/ai.ts`, `app/api/chat/route.ts`)
- Allowed: prompt changes, response parsing, model/runtime options mapping
- Contract: keep response envelope stable for orchestration hooks

4. Lane D: Persistence and Auth (`src/lib/persistence.ts`, `app/api/session/route.ts`, `src/lib/supabase/server.ts`, `supabase/schema.sql`)
- Allowed: session persistence logic and schema evolution
- Contract: preserve `storageAvailable` fallback semantics

5. Lane E: Runtime Execution (`src/lib/pyodide.ts` + execution paths in hooks)
- Allowed: runtime initialization, code execution safeguards, dataset execution flow
- Contract: deterministic `CodeExecutionResult` shape

## Contribution Safety Rules

- Prefer lane-local PRs. If a change spans lanes, mark as cross-lane.
- Keep UI files side-effect free.
- Normalize async errors through shared helper (`src/lib/errors.ts`).
- Use correlation-id logging for async boundaries (`src/lib/observability.ts`).
- Preserve behavior unless PR explicitly states product change.

## Critical Flows to Smoke Test After Changes

1. Upload CSV -> dataset message appears -> onboarding message appears.
2. Send user message -> AI response appears -> code execution output appears.
3. Create new session -> state resets immediately.
4. Reload while signed in -> latest session restore behaves correctly.
5. Supabase unavailable -> app remains usable in local-only mode.
