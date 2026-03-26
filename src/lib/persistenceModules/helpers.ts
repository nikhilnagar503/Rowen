import { normalizeError } from '../errors';
import { logAppError, logAppEvent } from '../observability';

function isStorageUnavailableError(message: string, status?: number): boolean {
  if (typeof status === 'number' && status >= 500) return true;

  const normalized = message.toLowerCase();
  return normalized.includes('fetch failed')
    || normalized.includes('connect timeout')
    || normalized.includes('und_err_connect_timeout')
    || normalized.includes('network')
    || normalized.includes('supabase');
}

export async function readApiError(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) return `Request failed with status ${response.status}`;

  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
  } catch {
    return raw;
  }

  return raw;
}

export function toStorageUnavailable(scope: string) {
  logAppEvent(scope, 'storage_unavailable');
}

export function throwNormalized(scope: string, message: string): never {
  const appError = normalizeError(new Error(message));
  logAppError(scope, `${scope}.error`, appError);
  throw new Error(appError.message);
}

export function isUnavailable(message: string, status?: number): boolean {
  return isStorageUnavailableError(message, status);
}
