import type { ChatRuntimeOptions } from '../../types/index';

export const DEFAULT_RUNTIME_OPTIONS: ChatRuntimeOptions = {
  model: 'gpt-4o-mini',
  toolsEnabled: true,
  connectorsEnabled: true,
  advancedReasoning: false,
};
