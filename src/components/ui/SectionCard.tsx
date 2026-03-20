import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, subtitle, children, className = '' }: SectionCardProps) {
  return (
    <section className={`rounded-xl bg-white/[0.02] px-4 py-3.5 ${className}`}>
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-white/8 pb-2">
        <h3 className="text-xs font-semibold tracking-[0.08em] text-slate-200">{title}</h3>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
