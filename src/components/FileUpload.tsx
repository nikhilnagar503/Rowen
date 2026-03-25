import { useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { NICHE } from '../config/niche';
import { FileUploadDropZone } from './FileUploadDropZone';
import { FileUploadFeatureCards } from './FileUploadFeatureCards';

interface FileUploadProps {
  onFileLoad: (fileName: string, content: string) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileLoad, isLoading }: FileUploadProps) {
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
      alert('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(file.name, content);
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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

      <FileUploadDropZone
        isLoading={isLoading}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onSelectFile={handleFile}
      />
      <FileUploadFeatureCards />
    </div>
  );
}





