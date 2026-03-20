# CSVHero

CSVHero is a CSV analysis app powered by Pyodide (in-browser Python) and ChatGPT.

It now includes:
- Clerk authentication for sign-in and account management
- Supabase persistence for cloud-synced analysis sessions per user

## Setup

1. Install dependencies:
   - `npm install`
2. Create your environment file:
   - `cp .env.example .env.local`
3. Add these keys to `.env.local`:
   - `OPENAI_API_KEY=...`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...`
   - `CLERK_SECRET_KEY=...`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
4. In Supabase, run the SQL in `supabase/schema.sql` from the SQL editor.
5. Run the app:
   - `npm run dev`
6. Open:
   - `http://localhost:3000`

## Notes

- Users do **not** need to enter API keys in the UI.
- API calls go through `app/api/chat/route.ts`.
- Session persistence goes through `app/api/session/route.ts`.
- For now, the app uses OpenAI Chat Completions (`gpt-4o`).
- Guests can still use the app locally, but only signed-in users get cloud sync.
