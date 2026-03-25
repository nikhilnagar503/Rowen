import type { ChatRuntimeOptions, DataFrameInfo, Message } from '../../types/index';
import { DEFAULT_RUNTIME_OPTIONS } from './defaultRuntime';
import { callChat } from './chatClient';
import { buildMessages, extractCode } from './messageBuilder';

export async function sendMessage(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null,
  runtimeOptions: ChatRuntimeOptions = DEFAULT_RUNTIME_OPTIONS
): Promise<{ explanation: string; code: string | null }> {
  const messages = buildMessages(userMessage, dfInfo, history, datasetNames, activeDatasetName, runtimeOptions);
  const text = await callChat(messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })), runtimeOptions);
  return extractCode(text);
}
