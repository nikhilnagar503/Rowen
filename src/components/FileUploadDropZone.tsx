import { Upload } from 'lucide-react';

interface FileUploadDropZoneProps {
  isLoading: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onSelectFile: (file: File | undefined) => void;
}

export function FileUploadDropZone({ isLoading, onDrop, onDragOver, onSelectFile }: FileUploadDropZoneProps) {
  const idleClass = 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-[#202020] dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20';
  const loadingClass = 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30';

  return (
    <label
      className={`glass relative flex h-64 w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-200 ${isLoading ? loadingClass : idleClass}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-400 border-t-transparent" />
          <p className="font-medium text-indigo-700 dark:text-indigo-300">Loading Python runtime...</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">This takes ~10 seconds on first load</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-slate-500 dark:text-slate-300" />
          <p className="font-medium text-slate-700 dark:text-slate-200">Drop your CSV file here</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
        </div>
      )}
      <input
        type="file"
        accept=".csv,.tsv,.txt"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => onSelectFile(e.target.files?.[0])}
        disabled={isLoading}
      />
    </label>
  );
}
