import { logAppEvent } from '../observability';
import { isUnavailable, readApiError, throwNormalized, toStorageUnavailable } from './helpers';
import type { SessionApiResponse, SyncSessionInput } from './types';

export async function syncSession(input: SyncSessionInput): Promise<SessionApiResponse> {
  try {
    logAppEvent('persistence.syncSession', 'request_started', {
      hasSessionId: Boolean(input.sessionId),
      messageCount: input.messages.length,
      fileCount: input.fileNames?.length ?? 0,
    });

    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorMessage = await readApiError(response);
      if (isUnavailable(errorMessage, response.status)) {
        toStorageUnavailable('persistence.syncSession');
        return { session: null, storageAvailable: false };
      }

      throwNormalized('persistence.syncSession', errorMessage);
    }

    logAppEvent('persistence.syncSession', 'request_succeeded');
    return (await response.json()) as SessionApiResponse;
  } catch {
    toStorageUnavailable('persistence.syncSession');
    return { session: null, storageAvailable: false };
  }
}
