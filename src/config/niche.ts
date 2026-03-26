type NicheConfig = {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  domainFocus: string;
  defaultAutopilotGoal: string;
  fallbackQuickActions: readonly string[];
  landingHeadline: string;
  landingSubheadline: string;
};

const FALLBACK_QUICK_ACTIONS = [
  'Run a complete data quality check',
  'Find the most important trends and patterns',
  'Identify strongest drivers and segments',
  'Create an executive summary with clear actions',
] as const;

export const NICHE: NicheConfig = {
  id: 'general-analytics',
  name: 'General Analytics Copilot',
  shortLabel: 'Analytics Copilot',
  description: 'Cross-functional analyst for operations, product, finance, and marketing tabular datasets.',
  domainFocus: 'cross-functional business analytics for operations, product, finance, and marketing tabular data',
  defaultAutopilotGoal:
    'Run an end-to-end analysis: audit data quality, profile patterns, surface trends and key drivers, then provide prioritized actions.',
  fallbackQuickActions: FALLBACK_QUICK_ACTIONS,
  landingHeadline: 'Upload your data. Get clear insights in plain English.',
  landingSubheadline:
    'Analyze data quality, trends, and drivers with an AI analyst built for tabular business data.',
};
