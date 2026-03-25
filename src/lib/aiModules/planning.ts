import type { DataFrameInfo, Message } from '../../types/index';
import { callChat, safeJsonParse } from './chatClient';
import { getDatasetCatalogContext, getDfContext } from './context';
import { CONTINUATION_PROMPT } from './prompts/continuationPrompt';
import { PLANNER_PROMPT } from './prompts/plannerPrompt';
import type { AgentPlan, ChatApiMessage } from './types';

export async function createAgentPlan(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null
): Promise<AgentPlan> {
  const planningMessages: ChatApiMessage[] = [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) },
  ];

  for (const msg of history.slice(-6)) {
    if (msg.role === 'user' || msg.role === 'assistant') planningMessages.push({ role: msg.role, content: msg.content });
  }

  planningMessages.push({ role: 'user', content: userMessage });
  const raw = await callChat(planningMessages);
  const parsed = safeJsonParse<AgentPlan>(raw);

  if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    return {
      goal: userMessage,
      steps: [
        'Inspect key data quality and schema issues relevant to the request.',
        'Run targeted analysis actions that directly answer the request.',
        'Summarize findings and identify highest-value follow-up insight.',
      ],
    };
  }

  return { goal: parsed.goal || userMessage, steps: parsed.steps.slice(0, 3) };
}

export async function shouldContinueAgent(
  userMessage: string,
  latestReflection: string,
  currentStep: number,
  totalSteps: number
): Promise<{ continue: boolean; reason: string }> {
  const raw = await callChat([
    { role: 'system', content: CONTINUATION_PROMPT },
    { role: 'user', content: `User request: ${userMessage}\nCurrent step: ${currentStep}/${totalSteps}\nLatest reflection:\n${latestReflection}` },
  ]);

  const parsed = safeJsonParse<{ continue: boolean; reason: string }>(raw);
  if (!parsed || typeof parsed.continue !== 'boolean') {
    return { continue: currentStep < totalSteps, reason: 'Fallback decision: continue while steps remain.' };
  }

  return parsed;
}
