import type { DataFrameInfo, Message, PersistedSession, PersistedSessionSummary } from '../types/index';

type SessionApiResponse = {
  session: PersistedSession | null;
  sessions?: PersistedSessionSummary[];
  storageAvailable?: boolean;
};

type SessionListResponse = {
  sessions: PersistedSessionSummary[];
  storageAvailable?: boolean;
};

type SyncSessionInput = {
  sessionId?: string | null;
  sessionTitle?: string | null;
  fileName: string | null;
  fileNames?: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  recommendedActions: string[];
  latestGoal?: string | null;
};

function isStorageUnavailableError(message: string, status?: number): boolean {
  if (typeof status === 'number' && status >= 500) {
    return true;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes('fetch failed')
    || normalized.includes('connect timeout')
    || normalized.includes('und_err_connect_timeout')
    || normalized.includes('network')
    || normalized.includes('supabase')
  );
}

async function readApiError(response: Response): Promise<string> {
  const raw = await response.text();

  if (!raw) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    return raw;
  }

  return raw;
}

export async function fetchLatestSession(): Promise<SessionApiResponse> {
  let response: Response;

  try {
    response = await fetch('/api/session', {
      method: 'GET',
      cache: 'no-store',
    });
  } catch {
    return { session: null, sessions: [], storageAvailable: false };
  }

  if (response.status === 401) {
    return { session: null, storageAvailable: false };
  }

  if (!response.ok) {
    const errorMessage = await readApiError(response);

    if (isStorageUnavailableError(errorMessage, response.status)) {
      return { session: null, sessions: [], storageAvailable: false };
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as SessionApiResponse;
}

export async function fetchSessionById(sessionId: string): Promise<SessionApiResponse> {
  let response: Response;

  try {
    response = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      cache: 'no-store',
    });
  } catch {
    return { session: null, sessions: [], storageAvailable: false };
  }

  if (response.status === 401) {
    return { session: null, sessions: [], storageAvailable: false };
  }

  if (!response.ok) {
    const errorMessage = await readApiError(response);

    if (isStorageUnavailableError(errorMessage, response.status)) {
      return { session: null, sessions: [], storageAvailable: false };
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as SessionApiResponse;
}

export async function fetchSessionList(): Promise<SessionListResponse> {
  let response: Response;

  try {
    response = await fetch('/api/session?list=1', {
      method: 'GET',
      cache: 'no-store',
    });
  } catch {
    return { sessions: [], storageAvailable: false };
  }

  if (response.status === 401) {
    return { sessions: [], storageAvailable: false };
  }

  if (!response.ok) {
    const errorMessage = await readApiError(response);

    if (isStorageUnavailableError(errorMessage, response.status)) {
      return { sessions: [], storageAvailable: false };
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as SessionListResponse;
}

export async function syncSession(input: SyncSessionInput): Promise<SessionApiResponse> {
  let response: Response;

  try {
    response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    return { session: null, storageAvailable: false };
  }

  if (!response.ok) {
    const errorMessage = await readApiError(response);

    if (isStorageUnavailableError(errorMessage, response.status)) {
      return { session: null, storageAvailable: false };
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as SessionApiResponse;
}
