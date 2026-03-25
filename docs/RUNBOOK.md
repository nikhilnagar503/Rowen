# Runtime and Reliability Runbook

## Pyodide Fails to Initialize
Symptoms:
- User sees Python engine load failure.

Check:
1. Browser console logs from `src/lib/pyodide.ts`.
2. Network access to Pyodide CDN.

Action:
1. Refresh and retry.
2. If CDN blocked, treat as degraded mode and communicate limitation.

## Session Sync Failures
Symptoms:
- Session status moves to `error` or `disabled`.

Check:
1. Console logs from `src/lib/persistence.ts` and `src/hooks/useCsvHeroApp/useCloudSessionSync.ts`.
2. API response from `/api/session`.

Action:
1. Verify Supabase credentials and connectivity.
2. Confirm app falls back to local-only (`storageAvailable: false`).

## Chat API Failures
Symptoms:
- Message send returns error bubble.

Check:
1. `/api/chat` response body and status.
2. `OPENAI_API_KEY` availability in server env.

Action:
1. Fix server-side key/config.
2. Retry message send.

## Incident Notes Template
- Time window:
- Scope:
- User impact:
- Root cause:
- Mitigation applied:
- Follow-up tasks:
