interface StatBadgeProps {
  label: string;
  value: string;
  tone?: 'default' | 'cyan' | 'indigo' | 'amber' | 'rose' | 'emerald';
}

const toneMap: Record<NonNullable<StatBadgeProps['tone']>, string> = {
  default: 'text-slate-200 border-white/10 bg-white/[0.03]',
  cyan: 'text-cyan-200 border-cyan-400/30 bg-cyan-400/10',
  indigo: 'text-indigo-200 border-indigo-400/30 bg-indigo-400/10',
  amber: 'text-amber-200 border-amber-400/30 bg-amber-400/10',
  rose: 'text-rose-200 border-rose-400/30 bg-rose-400/10',
  emerald: 'text-emerald-200 border-emerald-400/30 bg-emerald-400/10',
};

export default function StatBadge({ label, value, tone = 'default' }: StatBadgeProps) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneMap[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
