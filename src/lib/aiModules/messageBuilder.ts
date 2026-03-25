import type { ChatRuntimeOptions, DataFrameInfo, Message } from '../../types/index';
import { getDatasetCatalogContext, getDfContext, getRuntimeContext } from './context';
import { SYSTEM_PROMPT } from './prompts/analystPrompt';

export function buildMessages(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[],
  activeDatasetName: string | null,
  runtimeOptions: ChatRuntimeOptions
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (dfInfo) messages.push({ role: 'system', content: getDfContext(dfInfo) });
  messages.push({ role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) });
  messages.push({ role: 'system', content: getRuntimeContext(runtimeOptions) });

  for (const msg of history.slice(-10)) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
      continue;
    }

    if (msg.role === 'assistant') {
      let content = msg.content;
      if (msg.code) content += `\n\`\`\`python\n${msg.code}\n\`\`\``;
      if (msg.output) content += `\nOutput: ${msg.output}`;
      messages.push({ role: 'assistant', content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

export function extractCode(response: string): { explanation: string; code: string | null } {
  const codeMatch = response.match(/```python\n([\s\S]*?)```/);
  if (!codeMatch) return { explanation: response, code: null };

  const code = codeMatch[1].trim();
  const explanation = response.replace(/```python\n[\s\S]*?```/, '').trim();
  return { explanation, code };
}
