export const NICHE = {
  id: 'general-analytics',
  name: 'General Analytics Copilot',
  shortLabel: 'General Copilot',
  description:
    'General-purpose analyst for tabular datasets across operations, product, finance, and marketing.',
  domainFocus:
    'general business and operational analytics across tabular datasets',
  defaultAutopilotGoal:
    'Run a full analysis: check data quality, profile key patterns, surface trends and drivers, and finish with prioritized actions.',
  fallbackQuickActions: [
    'Run a complete data quality check',
    'Find the most important trends and patterns',
    'Identify strongest drivers and segments',
    'Create an executive summary with clear actions',
  ],
  landingHeadline: 'Upload your data. Get clear insights in plain English.',
  landingSubheadline:
    'Analyze trends, quality issues, and key drivers with an AI analyst tuned for tabular data.',
} as const;
