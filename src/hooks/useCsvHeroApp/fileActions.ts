import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadCSV, getCleanCSV } from '../../lib/pyodide';
import { generateOnboardingMessage } from '../../lib/ai';
import type { DataFrameInfo, Message } from '../../types/index';
import { toDatasetTitle } from './utils';
import {
  buildFileLoadedMessage,
  buildFileLoadErrorMessage,
  buildOnboardingMessage,
  buildUnsupportedFileMessage,
  isSupportedTabularFile,
  prependUniqueFileName,
} from './fileActionsHelpers';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseFileActionsArgs = {
  activeFileName: string | null;
  ensurePyodide: () => Promise<void>;
  ensureAnalysisReady: () => Promise<void>;
  setIsLoading: Setter<boolean>;
  setSessionTitle: Setter<string | null>;
  setFileNames: Setter<string[]>;
  setDfInfo: Setter<DataFrameInfo | null>;
  setRequiresFileReload: Setter<boolean>;
  setMessages: Setter<Message[]>;
};

export function useFileActions({
  activeFileName,
  ensurePyodide,
  ensureAnalysisReady,
  setIsLoading,
  setSessionTitle,
  setFileNames,
  setDfInfo,
  setRequiresFileReload,
  setMessages,
}: UseFileActionsArgs) {
  const handleFileLoad = useCallback(async (name: string, content: string) => {
    setIsLoading(true);

    try {
      await ensurePyodide();
      const info = await loadCSV(name, content);
      setSessionTitle((prev) => (!prev || prev === 'Untitled session' ? toDatasetTitle(name) : prev));
      setFileNames((prev) => prependUniqueFileName(prev, name));
      setDfInfo(info);
      setRequiresFileReload(false);

      setMessages((prev) => [...prev, buildFileLoadedMessage(name, info.shape[0], info.shape[1])]);
      const onboarding = await generateOnboardingMessage(info);
      setMessages((prev) => [...prev, buildOnboardingMessage(onboarding)]);
    } catch (error: unknown) {
      setMessages((prev) => [...prev, buildFileLoadErrorMessage(error)]);
    } finally {
      setIsLoading(false);
    }
  }, [ensurePyodide, setDfInfo, setFileNames, setIsLoading, setMessages, setRequiresFileReload, setSessionTitle]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    for (const file of files) {
      if (!isSupportedTabularFile(file.name)) {
        setMessages((prev) => [...prev, buildUnsupportedFileMessage(file.name)]);
        continue;
      }

      await handleFileLoad(file.name, await file.text());
    }
  }, [handleFileLoad, setMessages]);

  const handleDownload = useCallback(async () => {
    try {
      await ensureAnalysisReady();
      const blob = new Blob([await getCleanCSV()], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeFileName?.replace('.csv', '') || 'dataset'}_clean.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [activeFileName, ensureAnalysisReady]);

  return { handleFileLoad, handleUploadFiles, handleDownload };
}
