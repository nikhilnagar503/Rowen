import type { DataFrameInfo } from '../../types/index';
import { callChat } from './chatClient';
import { getDfContext } from './context';
import { ONBOARDING_PROMPT } from './prompts/onboardingPrompt';

export async function generateOnboardingMessage(dfInfo: DataFrameInfo | null): Promise<string> {
  return callChat([
    { role: 'system', content: ONBOARDING_PROMPT },
    { role: 'system', content: getDfContext(dfInfo) },
    { role: 'user', content: 'A dataset was just uploaded. Start with a broad understanding and ask what the user wants next.' },
  ]);
}
