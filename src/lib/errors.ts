export type AppErrorCode =
  | 'UNEXPECTED'
  | 'NETWORK'
  | 'STORAGE_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'PYODIDE_INIT_FAILED'
  | 'PYODIDE_EXECUTION_FAILED'
  | 'CHAT_API_FAILED';

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
};

function inferCode(message: string): AppErrorCode {
  const normalized = message.toLowerCase();

  if (normalized.includes('chat api error')) {
    return 'CHAT_API_FAILED';
  }

  if (
    normalized.includes('network')
    || normalized.includes('fetch failed')
    || normalized.includes('connect timeout')
  ) {
    return 'NETWORK';
  }

  if (
    normalized.includes('supabase')
    || normalized.includes('storageavailable')
    || normalized.includes('storage unavailable')
  ) {
    return 'STORAGE_UNAVAILABLE';
  }

  if (normalized.includes('not authenticated') || normalized.includes('unauthorized')) {
    return 'AUTH_REQUIRED';
  }

  if (normalized.includes('load python engine') || normalized.includes('init pyodide')) {
    return 'PYODIDE_INIT_FAILED';
  }

  if (normalized.includes('pyodide not initialized') || normalized.includes('python')) {
    return 'PYODIDE_EXECUTION_FAILED';
  }

  return 'UNEXPECTED';
}

export function normalizeError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  const code = inferCode(message);

  return {
    code,
    message,
    retryable: code === 'NETWORK' || code === 'STORAGE_UNAVAILABLE' || code === 'CHAT_API_FAILED',
    cause: error,
  };
}
