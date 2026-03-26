import { useMemo, useState } from 'react';
import type { DataFrameInfo, Message, PersistedSessionSummary, SyncStatus } from '../../types/index';
import { getLatestGoal, getQualitySnapshot, OMIT_DATASET_FROM_CLOUD } from './utils';

export function useAppState() {
  const [dfInfo, setDfInfo] = useState<DataFrameInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionList, setSessionList] = useState<PersistedSessionSummary[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');
  const [requiresFileReload, setRequiresFileReload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);

  const activeFileName = fileNames[0] ?? null;
  const latestGoal = useMemo(() => getLatestGoal(messages), [messages]);
  const persistedDfInfo = useMemo(() => (OMIT_DATASET_FROM_CLOUD ? null : dfInfo), [dfInfo]);
  const syncFingerprint = useMemo(() => JSON.stringify({
    sessionTitle,
    fileName: activeFileName,
    fileNames,
    dfInfo: persistedDfInfo,
    messages,
    latestGoal,
  }), [activeFileName, fileNames, latestGoal, messages, persistedDfInfo, sessionTitle]);
  const qualitySummary = useMemo(() => (dfInfo ? getQualitySnapshot(dfInfo) : null), [dfInfo]);

  return {
    dfInfo,
    setDfInfo,
    messages,
    setMessages,
    fileNames,
    setFileNames,
    sessionTitle,
    setSessionTitle,
    sessionId,
    setSessionId,
    sessionList,
    setSessionList,
    syncStatus,
    setSyncStatus,
    requiresFileReload,
    setRequiresFileReload,
    isLoading,
    setIsLoading,
    isPyodideReady,
    setIsPyodideReady,
    isPyodideLoading,
    setIsPyodideLoading,
    activeFileName,
    latestGoal,
    persistedDfInfo,
    syncFingerprint,
    qualitySummary,
  };
}
