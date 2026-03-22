# CSVHero

CSVHero is a Next.js application for conversational CSV analysis with an in-browser Python runtime.

The app combines:
- OpenAI-backed chat orchestration via server API routes
- Pyodide execution in the browser (`pandas`, `numpy`)
- Clerk authentication flows (sign-in, sign-up, sign-out)
- Supabase-backed cloud session persistence for signed-in users

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Clerk (`@clerk/nextjs`)
- Supabase (`@supabase/supabase-js`)
- Pyodide (runtime loaded from CDN)

## Project Structure

- `app/page.tsx`: Next.js page entrypoint; renders `src/App.tsx`
- `src/App.tsx`: app shell wiring `useCsvHeroApp` into `WorkspaceView`
- `src/hooks/useCsvHeroApp.ts`: state orchestration and action composition
- `src/hooks/useCsvHeroApp/*`: split modules for chat, file, session, and sync actions
- `src/components/layout/WorkspaceView.tsx`: sidebar + main workspace layout
- `src/components/ChatPanel.tsx`: conversation UI and message rendering
- `app/api/chat/route.ts`: server proxy for OpenAI chat completions
- `app/api/session/route.ts`: session read/write API (Clerk + Supabase)
- `supabase/schema.sql`: SQL for `analysis_sessions` schema and trigger

## Environment Variables

Create `.env.local` manually in the project root (there is no `.env.example` file in this repository).

Required by code:
- `OPENAI_API_KEY`: used by `app/api/chat/route.ts`
- `SUPABASE_SERVICE_ROLE_KEY`: used by `src/lib/supabase/server.ts`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: used by `src/lib/supabase/server.ts`

Required for Clerk auth setup:
- configure your standard Clerk environment variables for `@clerk/nextjs`

## Database Setup (Supabase)

Run `supabase/schema.sql` in your Supabase SQL editor.

The schema creates/updates:
- `public.analysis_sessions`
- index on `(clerk_user_id, updated_at desc)`
- trigger to auto-update `updated_at`

## Local Development

1. Install dependencies:
   - `npm install`
2. Set required environment variables in `.env.local`
3. Run development server:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

## Scripts

- `npm run dev`: start Next.js dev server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
- `npm run preview`: alias of `next start`

## Current Runtime Behavior

- The app starts directly in `WorkspaceView`.
- The sidebar `New` action triggers `handleCreateSession` from `useCsvHeroApp`.
- New session flow clears current in-memory state immediately and then syncs cloud state when signed in.
- Session list and selection are driven by `app/api/session/route.ts`.
- Dataset execution runs in browser via Pyodide; current runtime package load is `pandas` + `numpy`.

## API Endpoints

- `POST /api/chat`
  - validates incoming `messages`
  - calls OpenAI Chat Completions
  - returns `{ content }`

- `GET /api/session`
  - returns latest session + session summaries for current Clerk user

- `GET /api/session?list=1`
  - returns only session summaries

- `GET /api/session?sessionId=<id>`
  - returns selected session

- `POST /api/session`
  - upserts session payload for current Clerk user

## Notes

- API keys are server-side only; browser code does not call OpenAI directly.
- If Supabase is unavailable or not configured, session APIs return `storageAvailable: false` and app falls back to local-only behavior.
- Signed-out users do not get cloud persistence.
