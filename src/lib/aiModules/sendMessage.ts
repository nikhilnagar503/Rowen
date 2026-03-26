import type { DataFrameInfo, Message } from '../../types/index';
import { callChat } from './chatClient';
import { buildMessages, extractCode } from './messageBuilder';

export async function sendMessage(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null
): Promise<{ explanation: string; code: string | null }> {
  const messages = buildMessages(userMessage, dfInfo, history, datasetNames, activeDatasetName);
  const text = await callChat(messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })));
  return extractCode(text);
}
