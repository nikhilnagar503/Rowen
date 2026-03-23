import type { Message } from '../../types/index';

export function getPhaseStyle(phase?: 'execution' | 'reflection'): string {
  if (phase === 'execution') {
    return 'border-blue-700/60 bg-blue-500/10 text-blue-200';
  }

  if (phase === 'reflection') {
    return 'border-emerald-700/60 bg-emerald-500/10 text-emerald-200';
  }

  return 'border-slate-700 bg-slate-800/70 text-slate-300';
}

export function isQualityDeltaMessage(msg: Message): boolean {
  return msg.kind === 'quality-delta' || (msg.role === 'system' && msg.content.startsWith('📊 Quality Delta after'));
}

export function getDeltaTone(label: string, deltaText: string): string {
  const normalized = deltaText.trim();
  const isNeutral = normalized === '0%' || normalized === '+0%' || normalized === '-0%' || normalized === '+0 pts' || normalized === '0 pts';

  if (isNeutral) {
    return 'text-slate-600 dark:text-slate-300';
  }

  if (label.toLowerCase() === 'score') {
    return normalized.startsWith('+')
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-rose-700 dark:text-rose-300';
  }

  return normalized.startsWith('-')
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-rose-700 dark:text-rose-300';
}
