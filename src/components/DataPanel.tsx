/**
 * DataPanel.tsx — Live Data Dashboard / Right-Side Panel
 *
 * WHY THIS FILE EXISTS:
 * Chat alone doesn't give enough visibility into the dataset or agent progress.
 * This panel provides a persistent data-side view: schema info, quality KPIs,
 * a chart gallery, and a run history so users can see WHAT the agent did and
 * WHAT the data looks like — without scrolling back through the chat.
 *
 * WHAT IT DOES:
 * - Shows a "no file yet" empty state before any upload.
 * - Once a DataFrame is loaded it renders multiple tabbed/stacked sections:
 *     • KPI badges: total rows, columns, missing values, duplicate rows.
 *     • Column schema table: name, dtype color-coded tag, missing count.
 *     • Chart gallery: every matplotlib chart the agent produced, in order.
 *     • Latest AI reasoning block (most recent reflection-phase message).
 *     • Agent Run History: the last 3 plan→execute→reflect cycles, with a
 *       mini-selector so users can review any past run's steps and outcome.
 * - Download button calls `onDownload()` to export the current `df` as CSV.
 * - Reset button calls `onReset()` to clear session and return to landing.
 *
 * ROLE IN THE PRODUCT:
 * This is the "co-pilot dashboard" — always visible during a session, giving
 * users a ground-truth view of the dataset state without re-reading the chat.
 * It also surfaces all generated charts in one gallery, making it easy to share
 * or review visualizations produced during a session.
 */
import { useMemo, useState } from 'react';
import {
  FileSpreadsheet, Download, Trash2, Database,
  AlertTriangle, TrendingUp, CheckCircle2, ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { DataFrameInfo, Message } from '../types/index';

type RunSummary = {
  key: string;
  startedAt: number;
  planLines: string[];
  completedSteps: number;
  stopSummary: string | null;
};

type DashboardTab = 'overview' | 'schema' | 'preview' | 'runs';

interface DataPanelProps {
  dfInfo: DataFrameInfo | null;
  fileName: string | null;
  messages: Message[];
  onDownload: () => void;
  onReset: () => void;
}

// ── small helpers ──────────────────────────────────────────────────────────────
function Tag({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    cyan:    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    amber:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    rose:    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    violet:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    slate:   'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${cls[color] ?? cls.slate}`}>
      {children}
    </span>
  );
}

function PanelHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
      {Icon && (
        <div className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <Icon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </div>
      )}
      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      {subtitle && <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
    </div>
  );
}

export default function DataPanel({
  dfInfo,
  fileName,
  messages,
  onDownload,
  onReset,
}: DataPanelProps) {
  // Collect every message that produced a chart, in chronological order.
  const allCharts = messages.filter(m => m.chartUrl) as (typeof messages[number] & { chartUrl: string })[];
  const latestReasoning = [...messages].reverse().find((m) => m.role === 'assistant' && m.phase === 'reflection');

  const recentRuns = useMemo<RunSummary[]>(() => {
    const runs: RunSummary[] = [];
    const stopIndexes = messages
      .map((m, index) => ({ index, content: m.content }))
      .filter((entry) => entry.content.startsWith('✅ Agent stopped'))
      .map((entry) => entry.index);

    for (let pointer = stopIndexes.length - 1; pointer >= 0 && runs.length < 3; pointer -= 1) {
      const stopIndex = stopIndexes[pointer];
      const planIndex = messages
        .slice(0, stopIndex + 1)
        .map((m) => m.content)
        .findLastIndex((content) => content.startsWith('🧭 Agent Plan'));

      if (planIndex < 0 || planIndex > stopIndex) {
        continue;
      }

      const runMessages = messages.slice(planIndex, stopIndex + 1);
      const planMessage = runMessages.find((m) => m.content.startsWith('🧭 Agent Plan'));
      const stopMessage = runMessages.findLast((m) => m.content.startsWith('✅ Agent stopped'));
      if (!planMessage) {
        continue;
      }

      const planLines = planMessage.content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^\d+\.\s/.test(line));

      const completedSteps = runMessages.filter((m) => m.content.startsWith('▶️ Running Step')).length;
      const stopSummary = stopMessage
        ? stopMessage.content.replace(/^✅\s*Agent stopped after step\s*\d+\/\d+\.\s*/, '')
        : null;

      runs.push({
        key: `${planMessage.timestamp}-${stopIndex}`,
        startedAt: planMessage.timestamp,
        planLines,
        completedSteps,
        stopSummary,
      });
    }

    return runs;
  }, [messages]);

  const [selectedRunKey, setSelectedRunKey] = useState<string | null>(null);

  const selectedRun = useMemo(() => {
    if (recentRuns.length === 0) {
      return null;
    }

    if (selectedRunKey) {
      return recentRuns.find((run) => run.key === selectedRunKey) || recentRuns[0];
    }

    return recentRuns[0];
  }, [recentRuns, selectedRunKey]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Aggregate total missing values across all columns for quick KPI badge.
  const totalMissing = dfInfo ? Object.values(dfInfo.missing).reduce((a, b) => a + b, 0) : 0;

  // Guard state before any file is loaded/analyzed.
  if (!dfInfo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500 dark:text-slate-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
          <LayoutDashboard className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <p className="text-sm">
          {fileName ? 'Use upload in the chat bar to re-attach datasets for this session' : 'Upload datasets from the chat bar to see your dashboard'}
        </p>
      </div>
    );
  }

  // dtype color classifier
  const dtypeColor = (dtype: string): string => {
    if (dtype.startsWith('int') || dtype.startsWith('float')) return 'cyan';
    if (dtype === 'object' || dtype === 'string') return 'violet';
    if (dtype.startsWith('datetime')) return 'emerald';
    if (dtype === 'bool') return 'amber';
    return 'slate';
  };

  return (
    <div className="flex h-full flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 dark:border-slate-700 dark:bg-[#202020]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </div>
          <span className="max-w-[240px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{fileName}</span>
          <Tag color="slate">{dfInfo.shape[0].toLocaleString()} × {dfInfo.shape[1]}</Tag>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2 dark:border-slate-700 dark:bg-[#202020]">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'schema', label: 'Schema' },
          { key: 'preview', label: 'Preview' },
          { key: 'runs', label: 'Runs' },
        ] as { key: DashboardTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              activeTab === tab.key
                ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#202020] dark:text-slate-300 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── KPI row ── */}
        {activeTab === 'overview' && (
        <div className="grid grid-cols-4 gap-px border-b border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
          {[
            { label: 'Rows', value: dfInfo.shape[0].toLocaleString(), icon: Database, accent: 'cyan' },
            { label: 'Columns', value: dfInfo.shape[1].toString(), icon: LayoutDashboard, accent: 'violet' },
            { label: 'Missing', value: totalMissing.toLocaleString(), icon: AlertTriangle, accent: totalMissing > 0 ? 'amber' : 'emerald' },
            { label: 'Duplicates', value: dfInfo.duplicates.toLocaleString(), icon: CheckCircle2, accent: dfInfo.duplicates > 0 ? 'rose' : 'emerald' },
          ].map(({ label, value, icon: Icon, accent }) => {
            const colors: Record<string, string> = {
              cyan:    'text-sky-700 bg-sky-50 border-sky-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
              violet:  'text-violet-700 bg-violet-50 border-violet-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
              amber:   'text-amber-700 bg-amber-50 border-amber-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
              rose:    'text-rose-700 bg-rose-50 border-rose-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
              emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700',
            };
            const valColor: Record<string, string> = {
              cyan: 'text-sky-700 dark:text-slate-100', violet: 'text-violet-700 dark:text-slate-100',
              amber: 'text-amber-700 dark:text-slate-100', rose: 'text-rose-700 dark:text-slate-100', emerald: 'text-emerald-700 dark:text-slate-100',
            };
            return (
              <div key={label} className="flex flex-col gap-1.5 bg-white px-5 py-4 dark:bg-[#262626]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${colors[accent]}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                </div>
                  <span className={`text-2xl font-semibold tabular-nums tracking-tight ${valColor[accent] ?? 'text-slate-900 dark:text-slate-100'}`}>{value}</span>
              </div>
            );
          })}
        </div>
        )}

        {/* ── All charts (newest first) ── */}
        {activeTab === 'overview' && allCharts.length > 0 && (
          <div className="mx-5 mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
            <PanelHeader
              title="Visualizations"
              subtitle={allCharts.length > 1 ? `${allCharts.length} charts` : undefined}
              icon={TrendingUp}
            />
            <div className="space-y-3 p-4">
              {[...allCharts].reverse().map((m, i) => (
                <div key={m.id} className="space-y-1">
                  {allCharts.length > 1 && (
                    <div className="text-[10px] font-medium text-slate-600">
                      Chart {allCharts.length - i}
                    </div>
                  )}
                  <img
                    src={m.chartUrl}
                    alt={`Chart ${allCharts.length - i}`}
                    className="max-h-[400px] w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Agent insight ── */}
        {activeTab === 'overview' && latestReasoning && (
          <div className="mx-5 mt-4 overflow-hidden rounded-xl border border-violet-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
            <PanelHeader title="Agent Insight" subtitle="latest reasoning" icon={TrendingUp} />
            <div className="chat-markdown px-5 py-4 text-[13px] leading-6 text-slate-700 dark:text-slate-200">
              <ReactMarkdown>{latestReasoning.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── Agent run summary ── */}
        {(activeTab === 'overview' || activeTab === 'runs') && selectedRun && (
          <div className="mx-5 mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
            <PanelHeader title="Agent Run" subtitle={activeTab === 'runs' ? 'run explorer' : 'latest autonomous run'} icon={CheckCircle2} />
            <div className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-200">
              {recentRuns.length > 1 && (
                <select
                  value={selectedRun.key}
                  onChange={(e) => setSelectedRunKey(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {recentRuns.map((run, i) => (
                    <option key={run.key} value={run.key}>
                      {i === 0 ? 'Newest' : i === 1 ? 'Previous' : 'Older'} · {run.completedSteps} steps
                    </option>
                  ))}
                </select>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[10px] text-slate-500 mb-1 dark:text-slate-400">Steps done</div>
                  <div className="text-lg font-bold text-indigo-700 dark:text-slate-100">{selectedRun.completedSteps}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[10px] text-slate-500 mb-1 dark:text-slate-400">Status</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-slate-100">Done</div>
                </div>
              </div>
              {selectedRun.planLines.length > 0 && (
                <ul className="space-y-1">
                  {selectedRun.planLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                      <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-indigo-500 dark:text-slate-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {selectedRun.stopSummary && (
                <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5 text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {selectedRun.stopSummary}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'runs' && !selectedRun && (
          <div className="mx-5 mt-4 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-[#262626] dark:text-slate-300">
            No completed agent run yet. Start with Autopilot or a prompt in chat.
          </div>
        )}

        {/* ── Column schema table ── */}
        {(activeTab === 'overview' || activeTab === 'schema') && (
        <div className="mx-5 mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
          <PanelHeader title="Schema" subtitle={`${dfInfo.columns.length} columns`} icon={Database} />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500">Column</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500">Missing</th>
                </tr>
              </thead>
              <tbody>
                {dfInfo.columns.map((col, i) => (
                  <tr
                    key={col}
                    className={`border-b border-slate-200 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/60'} dark:border-slate-700 dark:hover:bg-slate-900 dark:bg-transparent`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{col}</td>
                    <td className="px-4 py-2.5">
                      <Tag color={dtypeColor(dfInfo.dtypes[col])}>{dfInfo.dtypes[col]}</Tag>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {dfInfo.missing[col] > 0 ? (
                        <span className="font-semibold text-amber-700 dark:text-slate-200">{dfInfo.missing[col]}</span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* ── Data preview ── */}
        {(activeTab === 'overview' || activeTab === 'preview') && (
        <div className="mx-5 mt-4 mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#262626]">
          <PanelHeader title="Data Preview" subtitle="first 5 rows" icon={FileSpreadsheet} />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  {dfInfo.columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dfInfo.sample.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-200 transition-colors hover:bg-indigo-50/50 ${i % 2 === 0 ? '' : 'bg-slate-50/60'} dark:border-slate-700 dark:hover:bg-slate-800 dark:bg-transparent`}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`whitespace-nowrap px-4 py-2 ${
                          cell === 'NaN' ? 'italic text-amber-700/80 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
