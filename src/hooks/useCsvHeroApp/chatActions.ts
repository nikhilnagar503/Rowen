import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { normalizeError } from '../../lib/errors';
import { createCorrelationId, logAppError } from '../../lib/observability';
import type { ChatRuntimeOptions, DataFrameInfo, Message } from '../../types/index';
import { newId } from './utils';
import {
  buildAssistantErrorMessage,
  buildReminderMessage,
  runAgentLoop,
} from './chatActionsHelpers';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseChatActionsArgs = {
  activeFileName: string | null;
  fileNames: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  runtimeOptions: ChatRuntimeOptions;
  defaultAutopilotGoal: string;
  ensureAnalysisReady: () => Promise<void>;
  setIsLoading: Setter<boolean>;
  setMessages: Setter<Message[]>;
  setDfInfo: Setter<DataFrameInfo | null>;
};

export function useChatActions({
  activeFileName,
  fileNames,
  dfInfo,
  messages,
  runtimeOptions,
  defaultAutopilotGoal,
  ensureAnalysisReady,
  setIsLoading,
  setMessages,
  setDfInfo,
}: UseChatActionsArgs) {
  const handleSendMessage = useCallback(async (userText: string, options?: ChatRuntimeOptions) => {
    const correlationId = createCorrelationId('chat-send');
    setIsLoading(true);

    try {
      await ensureAnalysisReady();
      const effectiveOptions = options ?? runtimeOptions;
      const userMsg: Message = {
        id: newId(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      await runAgentLoop({
        userText,
        initialDfInfo: dfInfo,
        initialHistory: [...messages, userMsg],
        options: effectiveOptions,
        fileNames,
        activeFileName,
        setMessages,
        setDfInfo,
      });
    } catch (error: unknown) {
      const appError = normalizeError(error);
      logAppError('useChatActions.handleSendMessage', correlationId, appError);
      if (appError.message.includes('re-upload your CSV')) {
        setMessages((prev) => [...prev, buildReminderMessage()]);
        return;
      }
      setMessages((prev) => [...prev, buildAssistantErrorMessage(appError.message)]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFileName, dfInfo, ensureAnalysisReady, fileNames, messages, runtimeOptions, setDfInfo, setIsLoading, setMessages]);

  const runGoal = useCallback(async (goal: string, options?: ChatRuntimeOptions) => {
    await handleSendMessage(goal, options);
  }, [handleSendMessage]);

  const handleRunAutopilot = useCallback(async () => {
    await runGoal(defaultAutopilotGoal);
  }, [defaultAutopilotGoal, runGoal]);

  return {
    handleSendMessage,
    handleRunAutopilot,
  };
}

