/**
 * FileUpload.tsx - CSV File Drop Zone & Picker
 *
 * WHAT IT DOES:
 * - Renders a full-screen centered drop-zone card with drag-and-drop support.
 * - Also exposes a hidden <input type="file"> so users can click to browse.
 * - Validates that only CSV/TSV/TXT files are accepted (shows alert otherwise).
 * - Uses the browser-native FileReader API to read the file as plain text.
 * - Once read, calls onFileLoad(fileName, content) to pass the raw text up
 *   to the parent (App -> useCsvHeroApp) where pandas parses it.
 * - Shows a spinning loader while the Pyodide Python runtime is booting up.
 *
 * ROLE IN THE PRODUCT:
 * This is the first real interaction in the app. Everything else (AI chat,
 * analysis workflow) depends on a file being loaded here first.
 */
import { useCallback } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { NICHE } from '../config/niche';

interface FileUploadProps {
  onFileLoad: (fileName: string, content: string) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileLoad, isLoading }: FileUploadProps) {
  // Reads the selected file and forwards plain text content to parent.
  // Parent (hook) is responsible for loading it into pandas/Pyodide.
  const handleFile = useCallback((file: File) => {
    // Keep accepted input intentionally narrow to text-like tabular files.
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
      alert('Please upload a CSV file');
      return;
    }

    // Browser-native file reader: async read then callback with text content.
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(file.name, content);
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  // Drag-and-drop support: intercept browser default and process first dropped file.
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Needed so drop event can fire (browser requires preventing default drag behavior).
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center px-8 py-10">
      <div className="mb-10 text-center">

        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 dark:border-indigo-700 dark:bg-indigo-900/40">
            <FileSpreadsheet className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            CSV<span className="text-indigo-600 dark:text-indigo-300">Hero</span>
          </h1>
        </div>

        <p className="mx-auto max-w-lg text-lg text-slate-600 dark:text-slate-300">
          {NICHE.landingHeadline}
          <br />
          {NICHE.landingSubheadline}
        </p>
      </div>

      <label
        className={`
          glass relative flex h-64 w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-200
          ${isLoading
            ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30'
            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-[#202020] dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Loading state shown while Pyodide runtime boots on first use */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-400 border-t-transparent" />
            <p className="font-medium text-indigo-700 dark:text-indigo-300">Loading Python runtime...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">This takes ~10 seconds on first load</p>
          </div>
        ) : (
          // Idle state shown before user selects/drops a file.
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-slate-500 dark:text-slate-300" />
            <p className="font-medium text-slate-700 dark:text-slate-200">
              Drop your CSV file here
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
          </div>
        )}
        <input
          type="file"
          accept=".csv,.tsv,.txt"
          className="absolute inset-0 opacity-0 cursor-pointer"
          // Hidden native input overlays the card so click anywhere opens picker.
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={isLoading}
        />
      </label>

      {/* Feature summary cards are informational only (no interaction state). */}
      <div className="mt-10 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: '📈', title: 'Trend Analysis', desc: 'Track change over time across key metrics' },
          { icon: '🧹', title: 'Data Quality', desc: 'Find missing values, duplicates, and anomalies' },
          { icon: '🧠', title: 'Insight Summary', desc: 'Get concise findings and next-step recommendations' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-[#202020]">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.title}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}





