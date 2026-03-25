export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    try {
      return JSON.stringify(candidate);
    } catch {
      return 'Unknown error object';
    }
  }

  return String(error);
}

export function isMissingColumnError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    (message.includes('session_title') || message.includes('file_names'))
    && (message.includes('column') || message.includes('schema cache'))
  );
}
