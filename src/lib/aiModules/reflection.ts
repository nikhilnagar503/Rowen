import type { DataFrameInfo, Message } from '../../types/index';
import { callChat } from './chatClient';
import { getDatasetCatalogContext, getDfContext } from './context';
import { REFLECTION_PROMPT } from './prompts/reflectionPrompt';
import type { ChatApiMessage } from './types';

export async function sendReflection(
  userMessage: string,
  runExplanation: string,
  code: string | null,
  output: string,
  error: string | null,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null
): Promise<string> {
  const reflectionMessages: ChatApiMessage[] = [
    { role: 'system', content: REFLECTION_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) },
  ];

  for (const msg of history.slice(-6)) {
    if (msg.role === 'user' || msg.role === 'assistant') reflectionMessages.push({ role: msg.role, content: msg.content });
  }

  reflectionMessages.push({ role: 'user', content: `USER REQUEST:\n${userMessage}` });
  reflectionMessages.push({ role: 'assistant', content: `EXECUTION PLAN + CODE RESPONSE:\n${runExplanation}${code ? `\n\n\`\`\`python\n${code}\n\`\`\`` : ''}` });
  reflectionMessages.push({ role: 'user', content: `EXECUTION RESULT:\n${output || 'No textual output produced.'}\n\nEXECUTION ERROR:\n${error || 'No error reported.'}` });
  return callChat(reflectionMessages);
}
