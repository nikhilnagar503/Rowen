import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadCSV, getCleanCSV } from '../../lib/pyodide';
import { generateRecommendedActions, generateOnboardingMessage } from '../../lib/ai';
import type { DataFrameInfo, Message } from '../../types/index';
import { newId, toDatasetTitle } from './utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseFileActionsArgs = {
  fileName: string | null;
  ensurePyodide: () => Promise<void>;
  ensureAnalysisReady: () => Promise<void>;
  setIsLoading: Setter<boolean>;
  setFileName: Setter<string | null>;
  setSessionTitle: Setter<string | null>;
  setFileNames: Setter<string[]>;
  setDfInfo: Setter<DataFrameInfo | null>;
  setRequiresFileReload: Setter<boolean>;
  setRecommendedActions: Setter<string[]>;
  setMessages: Setter<Message[]>;
};

export function useFileActions({
  fileName,
  ensurePyodide,
  ensureAnalysisReady,
  setIsLoading,
  setFileName,
  setSessionTitle,
  setFileNames,
  setDfInfo,
  setRequiresFileReload,
  setRecommendedActions,
  setMessages,
}: UseFileActionsArgs) {
  const handleFileLoad = useCallback(async (name: string, content: string) => {
    setIsLoading(true);

    try {
      await ensurePyodide();

      const info = await loadCSV(name, content);
      setFileName(name);
      setSessionTitle((prev) => {
        if (!prev || prev === 'Untitled session') {
          return toDatasetTitle(name);
        }
        return prev;
      });
      setFileNames((prev) => {
        if (prev.includes(name)) {
          return prev;
        }
        return [name, ...prev];
      });
      setDfInfo(info);
      setRequiresFileReload(false);
      const actions = await generateRecommendedActions(info);
      setRecommendedActions(actions);

      const systemMsg: Message = {
        id: newId(),
        role: 'system',
        content: `📁 Loaded **${name}** — ${info.shape[0].toLocaleString()} rows × ${info.shape[1]} columns`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMsg]);

      const onboarding = await generateOnboardingMessage(info);
      const onboardingMsg: Message = {
        id: newId(),
        role: 'assistant',
        phase: 'reflection',
        content: onboarding,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, onboardingMsg]);
    } catch (error: unknown) {
      const loadErrorMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: 'Failed to load the file.',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, loadErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [ensurePyodide, setDfInfo, setFileName, setFileNames, setIsLoading, setMessages, setRecommendedActions, setRequiresFileReload, setSessionTitle]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) {
      return;
    }

    for (const file of files) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
        const warningMsg: Message = {
          id: newId(),
          role: 'system',
          content: `⚠️ Skipped ${file.name}. Please upload CSV/TSV/TXT files only.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, warningMsg]);
        continue;
      }

      const content = await file.text();
      await handleFileLoad(file.name, content);
    }
  }, [handleFileLoad, setMessages]);

  const handleDownload = useCallback(async () => {
    try {
      await ensureAnalysisReady();
      const csv = await getCleanCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName?.replace('.csv', '') || 'dataset'}_clean.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [ensureAnalysisReady, fileName]);

  return {
    handleFileLoad,
    handleUploadFiles,
    handleDownload,
  };
}
