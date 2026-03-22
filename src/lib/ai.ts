/**
 * ai.ts — AI Service Layer
 *
 * WHY THIS FILE EXISTS:
 * All communication with the LLM (OpenAI GPT-4o) is isolated here. This keeps
 * every other file free from knowing about prompts, API shape, or retry logic.
 * It also means switching to a different AI provider only requires changes here.
 *
 * WHAT IT DOES:
 *
 * 1. SYSTEM PROMPTS (constants at the top) — Five specialized prompts define the
 *    AI's personality and output format for different roles:
 *    • SYSTEM_PROMPT      → Main analyst agent. Generates Python code + explanations.
 *    • REFLECTION_PROMPT  → Reasoning layer. No code. Summarizes findings and suggests
 *                           next analyses in plain business language.
 *    • PLANNER_PROMPT     → Planning layer. Returns a strict JSON plan ({goal, steps[]})
 *                           for the autonomous multi-step agent.
 *    • CONTINUATION_PROMPT→ Gate-keeper. Returns JSON {continue, reason} deciding
 *                           whether another agent iteration would add value.
 *    • ONBOARDING_PROMPT  → First-touch message after file upload. Gives a quick
 *                           data snapshot and asks the user what they want to do.
 *    • RECOMMENDED_ACTIONS→ Returns JSON {actions[]} — 4 one-click goal suggestions
 *                           tailored to the specific dataset.
 *
 * 2. `getDfContext(dfInfo)` — Serializes the DataFrameInfo object into a plain-text
 *    block that is injected as a system message so the AI knows the current state
 *    of the DataFrame (shape, columns, dtypes, missing values, head, describe).
 *
 * 3. `callChat(messages)` — The single HTTP call to `/api/chat` (the Next.js
 *    server route). The server holds the OpenAI key, so it never appears in the
 *    browser bundle.
 *
 * 4. `buildMessages(userMessage, dfInfo, history)` — Assembles the full message
 *    array sent to the API: system prompt → DataFrame context → last 10 history
 *    messages → current user message. Keeps token usage bounded.
 *
 * 5. `extractCode(response)` — Splits the AI response into `explanation` (all text
 *    outside the code block) and `code` (the Python inside ```python ... ```).
 *
 * EXPORTED FUNCTIONS (consumed by useCsvHeroApp):
 * • `sendMessage`              → Analyst turn: get explanation + Python code.
 * • `sendReflection`           → Reflection turn: reason over execution output.
 * • `createAgentPlan`          → Planning turn: return JSON {goal, steps[]}.
 * • `shouldContinueAgent`      → Gate turn: return JSON {continue, reason}.
 * • `generateOnboardingMessage`→ Welcome message after upload.
 * • `generateRecommendedActions`→ 4 one-click dataset-specific action suggestions.
 *
 * ROLE IN THE PRODUCT:
 * This file is the brain's language centre. Every AI call in the app passes
 * through here, with carefully engineered prompts that keep the agent focused,
 * code-correct, and safe (no file reads, no package installs).
 */
// AI Service — Sends messages to Claude/OpenAI and gets Python code back

import type { Message, DataFrameInfo, ChatRuntimeOptions } from '../types/index';
import { NICHE } from '../config/niche';

const DEFAULT_RUNTIME_OPTIONS: ChatRuntimeOptions = {
  model: 'gpt-4o-mini',
  toolsEnabled: true,
  connectorsEnabled: true,
  advancedReasoning: false,
};

const SYSTEM_PROMPT = `You are CSVHero, an expert ${NICHE.domainFocus} AI agent. The user may upload one or many datasets.

You always have an active pandas DataFrame in \`df\` and may also have multiple DataFrames in \`datasets\` dict keyed by original filename.

ANALYSIS PRIORITY:
- Start from the user's explicit goal and dataset context.
- If required fields are missing, clearly state assumptions and propose the minimum additional columns needed.

You have access to: pandas (pd), numpy (np).

YOUR BEHAVIOR:
1. When the user asks about their data, write Python code to answer.
2. If the user's intent is broad or ambiguous, ask 2-4 clarifying questions first and DO NOT write code yet.
3. Never clean or transform data unless the user explicitly asks for cleaning/transformation.
4. Use print() to output text results.
5. Focus on tabular analysis outputs and actionable findings.
6. When modifying data (cleaning, fixing, etc.), modify \`df\` in-place or reassign to \`df\`.
7. Always explain what you're doing in plain English BEFORE the code.
8. After modifying data, print a summary of what changed.
9. Be proactive — suggest next steps the user might want to take.
10. Keep code deterministic and easy to debug.

RESPONSE FORMAT:
- If clarification is needed, ask questions only (no code block).
- Otherwise, write a brief explanation, then provide Python code in a \`\`\`python code block.
- Only ONE code block per response. Keep code concise and clean.

WRITING STYLE (important):
- Never return one dense paragraph for conversational replies.
- For no-code replies, use this exact rhythm:
  1) One short acknowledgment line.
  2) Blank line.
  3) One concise help line with what you can do.
  4) Blank line.
  5) 1-2 focused follow-up questions.
- Keep sentences short and natural.
- Use simple markdown line breaks/paragraphs so UI renders a well-structured response.

IMPORTANT RULES:
- Do NOT try to read files — the data is already in \`df\`
- Do NOT install packages — only use pd, np
- Use print() for any text output you want the user to see
- For large outputs, limit to head/tail/sample, don't dump entire dataframes`;

const REFLECTION_PROMPT = `You are CSVHero's reasoning layer.

Your job is to reason about the execution results and guide the user like a senior ${NICHE.domainFocus} analyst.

RULES:
1. Do NOT output Python code.
2. Summarize what the run discovered in clear business language.
3. Flag any caveats (nulls, outliers, data quality limits, failed assumptions).
4. Recommend 2-4 high-impact next analyses tailored to what was just observed.
5. If execution failed, explain likely cause and suggest the best corrective next step.
6. Keep it short: max 6 bullets total, each bullet one line.
7. Prefer plain words over technical jargon.

RESPONSE FORMAT:
- ## What We Learned
- ## Reasoning Notes
- ## Suggested Next Actions
Use concise bullet points and keep total response under 120 words.`;

const PLANNER_PROMPT = `You are CSVHero's planning layer.

Given the user's request and dataframe context, produce a short analysis plan for an autonomous ${NICHE.domainFocus} data agent.

RULES:
1. Return ONLY valid JSON.
2. Use this schema exactly:
{
  "goal": "string",
  "steps": ["string", "string", "string"]
}
3. steps must contain 1 to 3 concrete, execution-ready steps.
4. Prioritize steps that create the biggest analytical value first.
5. Keep each step concise (<= 18 words).`;

const CONTINUATION_PROMPT = `You decide if CSVHero should continue to another analysis iteration.

Return ONLY valid JSON using this schema:
{
  "continue": boolean,
  "reason": "string"
}

Decision rule:
- continue=false if the user request is already answered with high confidence.
- continue=true only when another step is likely to provide meaningful new insight.`;

const ONBOARDING_PROMPT = `You are CSVHero's onboarding assistant.

Goal: after dataset upload, give a broad understanding of the dataset and ask focused questions before any cleaning/analysis code is run.

RULES:
1. Do NOT output Python code.
2. Keep response concise and interactive.
3. Mention a brief dataset snapshot (shape, key columns, likely analysis directions).
4. Ask the user to choose one path: trends, segmentation, outlier detection, or data quality.
5. Ask 2-4 clarifying questions that help choose the best next step.
6. Keep the full response under 100 words.

FORMAT:
- ## First Read
- ## Choose Your Goal
- ## Quick Questions`;

const RECOMMENDED_ACTIONS_PROMPT = `You generate recommended one-click actions for CSVHero.

RULES:
1. Return ONLY valid JSON.
2. Schema:
{
  "actions": ["string", "string", "string", "string"]
}
3. Provide exactly 4 short, high-value actions.
4. Actions should be user-friendly, outcome-focused, and broadly applicable.
5. Avoid duplicate meaning across actions.`;

type AgentPlan = {
  goal: string;
  steps: string[];
};

function getDfContext(dfInfo: DataFrameInfo | null): string {
  if (!dfInfo) {
    return 'No dataframe context available.';
  }

  return `CURRENT DATAFRAME STATE:
- Shape: ${dfInfo.shape[0]} rows × ${dfInfo.shape[1]} columns
- Columns: ${dfInfo.columns.join(', ')}
- Data types: ${Object.entries(dfInfo.dtypes).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Missing values: ${Object.entries(dfInfo.missing).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}
- Duplicate rows: ${dfInfo.duplicates}
- Sample (first 10 rows):
${dfInfo.head}

- Statistics:
${dfInfo.describe}`;
}

function getDatasetCatalogContext(datasetNames: string[], activeDatasetName: string | null): string {
  if (datasetNames.length === 0) {
    return 'No uploaded dataset catalog is available yet.';
  }

  return `UPLOADED DATASETS:
- Active dataset (df): ${activeDatasetName ?? datasetNames[0]}
- Available dataset names: ${datasetNames.join(', ')}

MULTI-DATASET RULES:
- In Python, all datasets are available as pandas DataFrames in \`datasets\` dict.
- Use \`datasets["name.csv"]\` to reference a specific uploaded dataset.
- \`df\` always points to the active/latest uploaded dataset.`;
}

async function callChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  runtimeOptions: ChatRuntimeOptions = DEFAULT_RUNTIME_OPTIONS
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: runtimeOptions.model,
      runtimeOptions: {
        toolsEnabled: runtimeOptions.toolsEnabled,
        connectorsEnabled: runtimeOptions.connectorsEnabled,
        advancedReasoning: runtimeOptions.advancedReasoning,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Chat API error: ${err}`);
  }

  const data = await response.json();
  return data.content;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getRuntimeContext(options: ChatRuntimeOptions): string {
  return [
    'RUNTIME CONTROLS:',
    `- Tools enabled: ${options.toolsEnabled ? 'yes' : 'no'}`,
    `- External connectors enabled: ${options.connectorsEnabled ? 'yes' : 'no'}`,
    `- Advanced reasoning mode: ${options.advancedReasoning ? 'yes' : 'no'}`,
    options.toolsEnabled
      ? '- You may include one Python code block when needed.'
      : '- Do not produce Python code. Provide reasoning-only answer.',
    options.connectorsEnabled
      ? '- You may suggest connector-based follow-ups if relevant.'
      : '- Do not suggest Slack/Postgres/warehouse connector actions.',
    options.advancedReasoning
      ? '- Provide a deeper and more thorough explanation with explicit assumptions.'
      : '- Keep explanations concise and direct.',
  ].join('\n');
}

/**
 * Build the prompt with conversation history and DataFrame context
 */
function buildMessages(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[],
  activeDatasetName: string | null,
  runtimeOptions: ChatRuntimeOptions
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add DataFrame context
  if (dfInfo) {
    messages.push({
      role: 'system',
      content: getDfContext(dfInfo),
    });
  }

  messages.push({
    role: 'system',
    content: getDatasetCatalogContext(datasetNames, activeDatasetName),
  });

  messages.push({
    role: 'system',
    content: getRuntimeContext(runtimeOptions),
  });

  // Add conversation history (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      let content = msg.content;
      if (msg.code) {
        content += `\n\`\`\`python\n${msg.code}\n\`\`\``;
      }
      if (msg.output) {
        content += `\nOutput: ${msg.output}`;
      }
      messages.push({ role: 'assistant', content });
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Extract Python code from AI response
 */
function extractCode(response: string): { explanation: string; code: string | null } {
  const codeMatch = response.match(/```python\n([\s\S]*?)```/);
  if (codeMatch) {
    const code = codeMatch[1].trim();
    const explanation = response.replace(/```python\n[\s\S]*?```/, '').trim();
    return { explanation, code };
  }
  return { explanation: response, code: null };
}

/**
 * Send a message to the AI and get a response with Python code.
 * Uses the server-side /api/chat route so API keys never live in the browser.
 */
export async function sendMessage(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null,
  runtimeOptions: ChatRuntimeOptions = DEFAULT_RUNTIME_OPTIONS
): Promise<{ explanation: string; code: string | null }> {
  const messages = buildMessages(userMessage, dfInfo, history, datasetNames, activeDatasetName, runtimeOptions);

  const text = await callChat(
    messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    runtimeOptions
  );

  return extractCode(text);
}

/**
 * Agent reflection pass: reason over code execution outcome and suggest next insights.
 */
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
  const reflectionMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: REFLECTION_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) },
  ];

  for (const msg of history.slice(-6)) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      reflectionMessages.push({ role: msg.role, content: msg.content });
    }
  }

  reflectionMessages.push({
    role: 'user',
    content: `USER REQUEST:\n${userMessage}`,
  });

  reflectionMessages.push({
    role: 'assistant',
    content: `EXECUTION PLAN + CODE RESPONSE:\n${runExplanation}${code ? `\n\n\`\`\`python\n${code}\n\`\`\`` : ''}`,
  });

  reflectionMessages.push({
    role: 'user',
    content: `EXECUTION RESULT:\n${output || 'No textual output produced.'}\n\nEXECUTION ERROR:\n${error || 'No error reported.'}`,
  });

  return callChat(reflectionMessages);
}

/**
 * Build a short multi-step plan (1-3 steps) for iterative autonomous analysis.
 */
export async function createAgentPlan(
  userMessage: string,
  dfInfo: DataFrameInfo | null,
  history: Message[],
  datasetNames: string[] = [],
  activeDatasetName: string | null = null
): Promise<AgentPlan> {
  const planningMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: PLANNER_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'system', content: getDatasetCatalogContext(datasetNames, activeDatasetName) },
  ];

  for (const msg of history.slice(-6)) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      planningMessages.push({ role: msg.role, content: msg.content });
    }
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

  return {
    goal: parsed.goal || userMessage,
    steps: parsed.steps.slice(0, 3),
  };
}

/**
 * Decide whether to continue to another iterative step.
 */
export async function shouldContinueAgent(
  userMessage: string,
  latestReflection: string,
  currentStep: number,
  totalSteps: number
): Promise<{ continue: boolean; reason: string }> {
  const raw = await callChat([
    { role: 'system', content: CONTINUATION_PROMPT },
    {
      role: 'user',
      content: `User request: ${userMessage}\nCurrent step: ${currentStep}/${totalSteps}\nLatest reflection:\n${latestReflection}`,
    },
  ]);

  const parsed = safeJsonParse<{ continue: boolean; reason: string }>(raw);
  if (!parsed || typeof parsed.continue !== 'boolean') {
    return {
      continue: currentStep < totalSteps,
      reason: 'Fallback decision: continue while steps remain.',
    };
  }

  return parsed;
}

/**
 * Generate an onboarding message after upload: broad understanding + user-choice questions.
 */
export async function generateOnboardingMessage(dfInfo: DataFrameInfo | null): Promise<string> {
  return callChat([
    { role: 'system', content: ONBOARDING_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    {
      role: 'user',
      content: 'A dataset was just uploaded. Start with a broad understanding and ask what the user wants next.',
    },
  ]);
}

/**
 * Generate one-click suggested goals so user doesn't need to craft prompts.
 */
export async function generateRecommendedActions(dfInfo: DataFrameInfo | null): Promise<string[]> {
  const raw = await callChat([
    { role: 'system', content: RECOMMENDED_ACTIONS_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'user', content: 'Generate recommended actions now.' },
  ]);

  const parsed = safeJsonParse<{ actions?: string[] }>(raw);
  if (!parsed?.actions || !Array.isArray(parsed.actions) || parsed.actions.length === 0) {
    return [
      'Scan dataset and propose a cleaning plan',
      'Fix missing values, duplicates, and data types',
      'Run cleaning and print a validation summary',
      'Create a plain-English data quality report',
    ];
  }

  return parsed.actions.slice(0, 4);
}

/**
 * Generate the initial analysis message when a file is first uploaded
 */
export function getAutoAnalysisPrompt(): string {
  return `The user just uploaded a new CSV file. Analyze it and provide:
1. A brief overview of what this dataset appears to be about
2. Key statistics (rows, columns, data types)
3. Data quality issues found (missing values, duplicates, inconsistent formats, outliers)
4. Suggest 3-4 things the user might want to do next

Write Python code that:
- Prints a summary of the dataset
- Identifies and prints data quality issues`;
}
