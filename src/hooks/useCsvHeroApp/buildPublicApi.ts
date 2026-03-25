import type { Dispatch, SetStateAction } from 'react';
import type { ChatRuntimeOptions, DataFrameInfo, Message, PersistedSessionSummary } from '../../types/index';

type StateShape = {
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  isLoading: boolean;
  isPyodideLoading: boolean;
  sessionId: string | null;
  sessionTitle: string | null;
  sessionList: PersistedSessionSummary[];
  fileNames: string[];
  runtimeOptions: ChatRuntimeOptions;
  setRuntimeOptions: Dispatch<SetStateAction<ChatRuntimeOptions>>;
  qualitySummary: {
    rows: number;
    columns: number;
    missingTotal: number;
    duplicates: number;
    score: number;
  } | null;
};

type HandlersShape = {
  handleSendMessage: (message: string, options?: ChatRuntimeOptions) => Promise<void>;
  handleRunAutopilot: () => Promise<void>;
  handleFileLoad: (name: string, content: string) => Promise<void>;
  handleUploadFiles: (files: File[]) => Promise<void>;
  handleDownload: () => Promise<void>;
  handleReset: () => void;
  handleCreateSession: () => Promise<void>;
  handleSelectSession: (id: string) => Promise<void>;
};

export function buildPublicApi(state: StateShape, handlers: HandlersShape) {
  return {
    dfInfo: state.dfInfo,
    messages: state.messages,
    isLoading: state.isLoading,
    isPyodideLoading: state.isPyodideLoading,
    sessionId: state.sessionId,
    sessionTitle: state.sessionTitle,
    sessionList: state.sessionList,
    fileNames: state.fileNames,
    runtimeOptions: state.runtimeOptions,
    setRuntimeOptions: state.setRuntimeOptions,
    handleSendMessage: handlers.handleSendMessage,
    handleRunAutopilot: handlers.handleRunAutopilot,
    handleFileLoad: handlers.handleFileLoad,
    handleUploadFiles: handlers.handleUploadFiles,
    handleDownload: handlers.handleDownload,
    handleReset: handlers.handleReset,
    handleCreateSession: handlers.handleCreateSession,
    handleSelectSession: handlers.handleSelectSession,
    qualitySummary: state.qualitySummary,
  };
}
