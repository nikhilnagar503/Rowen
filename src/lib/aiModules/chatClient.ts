import { normalizeError } from '../errors';
import { createCorrelationId, logAppError, logAppEvent } from '../observability';
import type { ChatApiMessage } from './types';

type ChatModel = 'gpt-4o-mini' | 'gpt-4o';

export async function callChat(
  messages: ChatApiMessage[],
  model: ChatModel = 'gpt-4o-mini'
): Promise<string> {
  const correlationId = createCorrelationId('ai-chat');
  logAppEvent('ai.callChat', 'chat_request_started', { correlationId, model, messageCount: messages.length });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Chat API error: ${err}`);
    }

    const data = await response.json();
    logAppEvent('ai.callChat', 'chat_request_succeeded', { correlationId });
    return data.content;
  } catch (error) {
    const appError = normalizeError(error);
    logAppError('ai.callChat', correlationId, appError);
    throw new Error(appError.message);
  }
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
