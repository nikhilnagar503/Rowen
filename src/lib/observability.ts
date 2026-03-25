import type { AppError } from './errors';

export function createCorrelationId(scope: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${scope}_${Date.now()}_${randomPart}`;
}

export function logAppEvent(scope: string, event: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.info(`[${scope}] ${event}`, meta);
    return;
  }

  console.info(`[${scope}] ${event}`);
}

export function logAppError(scope: string, correlationId: string, error: AppError): void {
  console.error(`[${scope}] ${correlationId} ${error.code}: ${error.message}`, {
    retryable: error.retryable,
    cause: error.cause,
  });
}
