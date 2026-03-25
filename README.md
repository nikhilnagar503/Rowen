# CSVHero

CSVHero is a Next.js app for conversational CSV analysis with in-browser Python (Pyodide).

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Clerk auth
- Supabase persistence
- Pyodide (`pandas`, `numpy`)

## Key Paths

- `app/page.tsx`: app entrypoint
- `src/App.tsx`: top-level UI shell wiring
- `src/hooks/useCsvHeroApp.ts`: app orchestration facade
- `src/hooks/useCsvHeroApp/*`: split chat/file/session/sync modules
- `src/components/layout/WorkspaceView.tsx`: main workspace layout
- `app/api/chat/route.ts`: AI gateway route
- `app/api/session/route.ts`: session read/write route
- `supabase/schema.sql`: DB schema

## Setup

1. Install dependencies.
   - `npm install`
2. Create `.env.local`.
3. Run dev server.
   - `npm run dev`
4. Open `http://localhost:3000`.

## Required Environment Variables

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- Clerk environment variables for `@clerk/nextjs`

## Database

Run `supabase/schema.sql` in Supabase SQL editor.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run preview`

## API Endpoints

- `POST /api/chat`
- `GET /api/session`
- `GET /api/session?list=1`
- `GET /api/session?sessionId=<id>`
- `POST /api/session`

## Engineering Rules

- Keep side effects out of `src/components/**`.
- Preserve route request/response contracts.
- Prefer small, lane-scoped PRs.
- Use shared error + observability utilities in async paths.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/ONBOARDING.md`
- `docs/API_CONTRACTS.md`
- `docs/RUNBOOK.md`
