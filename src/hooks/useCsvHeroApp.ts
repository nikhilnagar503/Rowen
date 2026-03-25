import { useUser } from '@clerk/nextjs';
import { NICHE } from '../config/niche';
import { useCloudSessionSync } from './useCsvHeroApp/useCloudSessionSync';
import { useChatActions } from './useCsvHeroApp/chatActions';
import { useFileActions } from './useCsvHeroApp/fileActions';
import { useSessionActions } from './useCsvHeroApp/sessionActions';
import { useAppState } from './useCsvHeroApp/useAppState';
import { usePyodideGuards } from './useCsvHeroApp/usePyodideGuards';
import { useResetHandler } from './useCsvHeroApp/useResetHandler';
import { buildPublicApi } from './useCsvHeroApp/buildPublicApi';

export function useCsvHeroApp() {
  const { isLoaded, isSignedIn, user } = useUser();
  const state = useAppState();

  const { ensurePyodide, ensureAnalysisReady } = usePyodideGuards({
    isPyodideReady: state.isPyodideReady,
    setIsPyodideReady: state.setIsPyodideReady,
    setIsPyodideLoading: state.setIsPyodideLoading,
    requiresFileReload: state.requiresFileReload,
  });

  const { applySessionState, resetCloudSyncTracking } = useCloudSessionSync({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id,
    fileName: state.activeFileName,
    dfInfo: state.dfInfo,
    messages: state.messages,
    fileNames: state.fileNames,
    sessionTitle: state.sessionTitle,
    sessionId: state.sessionId,
    persistedDfInfo: state.persistedDfInfo,
    latestGoal: state.latestGoal,
    syncFingerprint: state.syncFingerprint,
    setDfInfo: state.setDfInfo,
    setMessages: state.setMessages,
    setFileNames: state.setFileNames,
    setSessionTitle: state.setSessionTitle,
    setSessionId: state.setSessionId,
    setSessionList: state.setSessionList,
    setSyncStatus: state.setSyncStatus,
    setRequiresFileReload: state.setRequiresFileReload,
  });

  const { handleSendMessage, handleRunAutopilot } = useChatActions({
    activeFileName: state.activeFileName,
    fileNames: state.fileNames,
    dfInfo: state.dfInfo,
    messages: state.messages,
    runtimeOptions: state.runtimeOptions,
    defaultAutopilotGoal: NICHE.defaultAutopilotGoal,
    ensureAnalysisReady,
    setIsLoading: state.setIsLoading,
    setMessages: state.setMessages,
    setDfInfo: state.setDfInfo,
  });

  const { handleFileLoad, handleUploadFiles, handleDownload } = useFileActions({
    activeFileName: state.activeFileName,
    ensurePyodide,
    ensureAnalysisReady,
    setIsLoading: state.setIsLoading,
    setSessionTitle: state.setSessionTitle,
    setFileNames: state.setFileNames,
    setDfInfo: state.setDfInfo,
    setRequiresFileReload: state.setRequiresFileReload,
    setMessages: state.setMessages,
  });

  const handleReset = useResetHandler({
    isSignedIn,
    resetCloudSyncTracking,
    setDfInfo: state.setDfInfo,
    setMessages: state.setMessages,
    setFileNames: state.setFileNames,
    setSessionTitle: state.setSessionTitle,
    setSessionId: state.setSessionId,
    setRequiresFileReload: state.setRequiresFileReload,
    setSyncStatus: state.setSyncStatus,
  });

  const { handleCreateSession, handleSelectSession } = useSessionActions({
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id,
    sessionId: state.sessionId,
    applySessionState,
    handleReset,
    setSessionList: state.setSessionList,
    setSessionTitle: state.setSessionTitle,
    setSyncStatus: state.setSyncStatus,
  });

  return buildPublicApi(state, { handleSendMessage, handleRunAutopilot, handleFileLoad, handleUploadFiles, handleDownload, handleReset, handleCreateSession, handleSelectSession });
}
