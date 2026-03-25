export type ChatApiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AgentPlan = {
  goal: string;
  steps: string[];
};
