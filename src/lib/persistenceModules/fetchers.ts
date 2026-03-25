import { createCorrelationId, logAppEvent } from '../observability';
import { isUnavailable, readApiError, throwNormalized, toStorageUnavailable } from './helpers';
import type { SessionApiResponse, SessionListResponse } from './types';

async function requestSessionGet(path: string, scope: string, meta?: Record<string, unknown>): Promise<Response | null> {
  const correlationId = createCorrelationId(scope);

  try {
    logAppEvent(scope, 'request_started', { correlationId, ...(meta ?? {}) });
    const response = await fetch(path, { method: 'GET', cache: 'no-store' });

    if (response.status === 401) {
      toStorageUnavailable(scope, correlationId);
      return null;
    }

    if (!response.ok) {
      const errorMessage = await readApiError(response);
      if (isUnavailable(errorMessage, response.status)) {
        toStorageUnavailable(scope, correlationId);
        return null;
      }

      throwNormalized(scope, correlationId, errorMessage);
    }

    logAppEvent(scope, 'request_succeeded', { correlationId, ...(meta ?? {}) });
    return response;
  } catch {
    toStorageUnavailable(scope, correlationId);
    return null;
  }
}

export async function fetchLatestSession(): Promise<SessionApiResponse> {
  const response = await requestSessionGet('/api/session', 'persistence.fetchLatestSession');
  if (!response) return { session: null, sessions: [], storageAvailable: false };
  return (await response.json()) as SessionApiResponse;
}

export async function fetchSessionById(sessionId: string): Promise<SessionApiResponse> {
  const response = await requestSessionGet(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, 'persistence.fetchSessionById', { sessionId });
  if (!response) return { session: null, sessions: [], storageAvailable: false };
  return (await response.json()) as SessionApiResponse;
}

export async function fetchSessionList(): Promise<SessionListResponse> {
  const response = await requestSessionGet('/api/session?list=1', 'persistence.fetchSessionList');
  if (!response) return { sessions: [], storageAvailable: false };
  return (await response.json()) as SessionListResponse;
}
