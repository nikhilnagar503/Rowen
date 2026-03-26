import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { normalizeError } from '../../lib/errors';
import { createCorrelationId, logAppError } from '../../lib/observability';
import type { DataFrameInfo, Message } from '../../types/index';
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
  defaultAutopilotGoal,
  ensureAnalysisReady,
  setIsLoading,
  setMessages,
  setDfInfo,
}: UseChatActionsArgs) {
  const handleSendMessage = useCallback(async (userText: string) => {
    const correlationId = createCorrelationId('chat-send');
    setIsLoading(true);

    try {
      await ensureAnalysisReady();
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
  }, [activeFileName, dfInfo, ensureAnalysisReady, fileNames, messages, setDfInfo, setIsLoading, setMessages]);

  const runGoal = useCallback(async (goal: string) => {
    await handleSendMessage(goal);
  }, [handleSendMessage]);

  const handleRunAutopilot = useCallback(async () => {
    await runGoal(defaultAutopilotGoal);
  }, [defaultAutopilotGoal, runGoal]);

  return {
    handleSendMessage,
    handleRunAutopilot,
  };
}

