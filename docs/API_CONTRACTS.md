# API Contracts

## POST /api/chat

Request body:
- `messages`: array of `{ role, content }`
- `model`: string
- `runtimeOptions`: `{ toolsEnabled, connectorsEnabled, advancedReasoning }`

Success response:
- `{ content: string }`

Failure behavior:
- HTTP error with body containing `error` or plain text.

Consumer:
- `src/lib/ai.ts`

## GET /api/session

Modes:
- latest session + summaries: `/api/session`
- list only: `/api/session?list=1`
- by id: `/api/session?sessionId=<id>`

Success response (latest/by-id):
- `{ session, sessions?, storageAvailable? }`

Success response (list):
- `{ sessions, storageAvailable? }`

Fallback behavior:
- If storage/auth unavailable, consumers interpret `storageAvailable: false` and continue local-only.

Consumer:
- `src/lib/persistence.ts`

## POST /api/session

Request body:
- `sessionId?`
- `sessionTitle?`
- `fileName`
- `fileNames?`
- `dfInfo`
- `messages`
- `latestGoal?`

Success response:
- `{ session, sessions?, storageAvailable? }`

Consumer:
- `src/lib/persistence.ts`
