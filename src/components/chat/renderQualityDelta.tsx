import { getDeltaTone } from './messageUtils';

export function renderQualityDelta(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const title = lines[0] ?? 'Quality Delta';
  const metricLines = lines.slice(1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <div className="mt-2 space-y-1.5">
        {metricLines.map((line) => {
          const match = line.match(/^([^:]+):\s*(.+)\s+\(([^)]+)\)$/);

          if (!match) {
            return <p key={line} className="text-[11px] text-slate-700 dark:text-slate-300">{line}</p>;
          }

          const label = match[1];
          const valueText = match[2];
          const deltaText = match[3];
          const toneClass = getDeltaTone(label, deltaText);

          return (
            <div key={line} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-[11px] text-slate-600 dark:text-slate-300">{label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-700 dark:text-slate-200">{valueText}</span>
                <span className={["text-[11px] font-semibold", toneClass].join(' ')}>({deltaText})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
