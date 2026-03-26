import type { DataFrameInfo } from '../../types/index';
import { callChat } from './chatClient';
import { getDfContext } from './context';
import { ONBOARDING_PROMPT } from './prompts/onboardingPrompt';

function buildShapeLine(dfInfo: DataFrameInfo | null): string {
  if (!dfInfo || !Array.isArray(dfInfo.shape) || dfInfo.shape.length < 2) {
    return 'Dataset shape: unavailable.';
  }

  const [rows, cols] = dfInfo.shape;
  return `Dataset shape: ${rows} rows x ${cols} columns.`;
}

function buildColumnPreviewLine(dfInfo: DataFrameInfo | null): string {
  if (!dfInfo || !Array.isArray(dfInfo.columns) || dfInfo.columns.length === 0) {
    return 'Columns preview: unavailable.';
  }

  const preview = dfInfo.columns.slice(0, 6);
  const suffix = dfInfo.columns.length > 6 ? ', ...' : '';
  return `Columns preview: ${preview.join(', ')}${suffix}.`;
}

function buildMissingHintLine(dfInfo: DataFrameInfo | null): string {
  if (!dfInfo || !dfInfo.missing) {
    return 'Top missing columns: none detected.';
  }

  const topMissing = Object.entries(dfInfo.missing)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([column, count]) => `${column} (${count})`);

  if (topMissing.length === 0) {
    return 'Top missing columns: none detected.';
  }

  return `Top missing columns: ${topMissing.join(', ')}.`;
}

function buildDuplicateHintLine(dfInfo: DataFrameInfo | null): string {
  const duplicates = dfInfo?.duplicates ?? 0;
  if (duplicates > 0) {
    return `Duplicate rows: ${duplicates}.`;
  }
  return 'Duplicate rows: none detected.';
}

function buildDeterministicIntro(dfInfo: DataFrameInfo | null): string {
  return [
    'Quick dataset snapshot:',
    buildShapeLine(dfInfo),
    buildColumnPreviewLine(dfInfo),
    '',
    'Quality hints:',
    buildMissingHintLine(dfInfo),
    buildDuplicateHintLine(dfInfo),
    '',
    'Choose a starting goal:',
    '1. Trends over time',
    '2. Segment comparison',
    '3. Outlier detection',
    '4. Data quality check',
  ].join('\n');
}

function buildDefaultQuestionBlock(): string {
  return [
    'Follow-up questions:',
    '- Which column should define success for this analysis?',
    '- Do you want to focus on a specific date range or segment first?',
    '- Should we begin with trends, segments, outliers, or quality checks?',
  ].join('\n');
}

async function generateFollowUpQuestions(dfInfo: DataFrameInfo | null): Promise<string> {
  try {
    const response = await callChat([
      { role: 'system', content: ONBOARDING_PROMPT },
      { role: 'system', content: getDfContext(dfInfo) },
      {
        role: 'user',
        content:
          'Return only 2-3 concise bullet follow-up questions. No code. No markdown headings. Keep it short and user-friendly.',
      },
    ]);

    const text = response.trim();
    if (!text) {
      return buildDefaultQuestionBlock();
    }

    return ['Follow-up questions:', text].join('\n');
  } catch {
    return buildDefaultQuestionBlock();
  }
}

export async function generateOnboardingMessage(dfInfo: DataFrameInfo | null): Promise<string> {
  const deterministicIntro = buildDeterministicIntro(dfInfo);
  const followUpQuestions = await generateFollowUpQuestions(dfInfo);
  return [deterministicIntro, '', followUpQuestions].join('\n');
}
