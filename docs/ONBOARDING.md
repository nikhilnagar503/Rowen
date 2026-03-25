# New Engineer Onboarding

## Goal
Get productive in under 60 minutes and ship a safe first PR in a single ownership lane.

## First 60 Minutes
1. Install dependencies with `npm install`.
2. Configure `.env.local` using README environment variable list.
3. Run app with `npm run dev`.
4. Confirm app loads and you can open chat UI.
5. Read:
   - `README.md`
   - `docs/ARCHITECTURE.md`
   - this file

## Pick an Ownership Lane
Choose one lane before coding:
- Lane A: UI (`src/components/**`)
- Lane B: Orchestration (`src/hooks/useCsvHeroApp/**`)
- Lane C: AI gateway (`src/lib/ai.ts`, `app/api/chat/route.ts`)
- Lane D: Persistence (`src/lib/persistence.ts`, `app/api/session/route.ts`)
- Lane E: Runtime (`src/lib/pyodide.ts`)

## First Safe PR Checklist
1. Touch one lane only.
2. Keep behavior unchanged.
3. Add/update comments only where logic is non-obvious.
4. Run `npm run lint`.
5. Manually test one relevant user flow.

## Common Pitfalls
- Do not add side effects in UI components.
- Do not bypass `src/lib/errors.ts` and `src/lib/observability.ts` in async code.
- Do not change API response shape without updating all consumers.

## Debugging Tips
- Chat failures: inspect `app/api/chat/route.ts` and `src/lib/ai.ts`.
- Session restore/sync issues: inspect `src/hooks/useCsvHeroApp/useCloudSessionSync.ts` and `src/lib/persistence.ts`.
- Runtime execution issues: inspect `src/lib/pyodide.ts`.
