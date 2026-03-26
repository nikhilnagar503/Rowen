import type { DataFrameInfo, Message } from '../../types/index';
import { callChat, safeJsonParse } from './chatClient';
import { getDatasetCatalogContext, getDfContext } from './context';
import { CONTINUATION_PROMPT } from './prompts/continuationPrompt';
import { PLANNER_PROMPT } from './prompts/plannerPrompt';
import type { AgentPlan, ChatApiMessage } from './types';

const MAX_HISTORY_FOR_PLANNING = 6;
const MAX_PLAN_STEPS = 3;
const STRICT_JSON_RETRY_INSTRUCTION =
  'Return ONLY valid JSON with this exact shape: {"goal":"string","steps":["step 1","step 2","step 3"]}. Do not include markdown or extra text.';

function normalizeAgentPlan(parsed: AgentPlan | null, fallbackGoal: string): AgentPlan | null {
  if (!parsed || !Array.isArray(parsed.steps)) return null;

  const steps = parsed.steps
    .filter((step): step is string => typeof step === 'string')
    .map((step) => step.trim())
    .filter((step) => step.length > 0)
    .slice(0, MAX_PLAN_STEPS);

  if (steps.length === 0) return null;

  return {
    goal: typeof parsed.goal === 'string' && parsed.goal.trim().length > 0 ? parsed.goal.trim() : fallbackGoal,
    steps,
  };
}

function buildPlanningMessages(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[],
  activeDatasetName: string | null
): ChatApiMessage[] {
  const planningMessages: ChatApiMessage[] = [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) },
  ];

  for (const msg of history.slice(-MAX_HISTORY_FOR_PLANNING)) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      planningMessages.push({ role: msg.role, content: msg.content });
    }
  }

  planningMessages.push({ role: 'user', content: userMessage });
  return planningMessages;
}

async function fetchAndNormalizePlan(messages: ChatApiMessage[], fallbackGoal: string): Promise<AgentPlan | null> {
  const raw = await callChat(messages);
  const parsed = safeJsonParse<AgentPlan>(raw);
  return normalizeAgentPlan(parsed, fallbackGoal);
}

function buildFallbackPlan(userMessage: string): AgentPlan {
  const normalizedGoal = userMessage.trim() || 'Answer the user request.';
  return {
    goal: normalizedGoal,
    steps: [
      `Clarify the request scope and assumptions for: ${normalizedGoal}`,
      `Run focused analysis actions needed to answer: ${normalizedGoal}`,
      `Summarize the answer and recommended next check for: ${normalizedGoal}`,
    ],
  };
}

export async function createAgentPlan(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null
): Promise<AgentPlan> {
  const planningMessages = buildPlanningMessages(userMessage, dfInfo, history, datasetNames, activeDatasetName);

  const normalizedPlan = await fetchAndNormalizePlan(planningMessages, userMessage);
  if (normalizedPlan) return normalizedPlan;

  const retryMessages: ChatApiMessage[] = [
    ...planningMessages,
    { role: 'user', content: STRICT_JSON_RETRY_INSTRUCTION },
  ];
  const normalizedRetryPlan = await fetchAndNormalizePlan(retryMessages, userMessage);
  if (normalizedRetryPlan) return normalizedRetryPlan;

  return buildFallbackPlan(userMessage);
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
