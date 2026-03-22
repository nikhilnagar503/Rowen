import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { executeCode } from '../../lib/pyodide';
import { sendMessage } from '../../lib/ai';
import type { ChatRuntimeOptions, DataFrameInfo, Message } from '../../types/index';
import { newId } from './utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type UseChatActionsArgs = {
  fileName: string | null;
  fileNames: string[];
  dfInfo: DataFrameInfo | null;
  messages: Message[];
  runtimeOptions: ChatRuntimeOptions;
  defaultAutopilotGoal: string;
  ensureAnalysisReady: () => Promise<void>;
  setIsLoading: Setter<boolean>;
  setMessages: Setter<Message[]>;
  setDfInfo: Setter<DataFrameInfo | null>;
  setCurrentAgentActivity: Setter<string | null>;
};

export function useChatActions({
  fileName,
  fileNames,
  dfInfo,
  messages,
  runtimeOptions,
  defaultAutopilotGoal,
  ensureAnalysisReady,
  setIsLoading,
  setMessages,
  setDfInfo,
  setCurrentAgentActivity,
}: UseChatActionsArgs) {
  const runAgentLoop = useCallback(async (
    userText: string,
    initialDfInfo: DataFrameInfo | null,
    initialHistory: Message[],
    options: ChatRuntimeOptions
  ) => {
    const { explanation, code } = await sendMessage(
      userText,
      initialDfInfo,
      initialHistory,
      fileNames,
      fileName,
      options
    );

    if (!code) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: explanation,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setCurrentAgentActivity('Running Python analysis...');
    const result = await executeCode(code);
    setCurrentAgentActivity(null);

    if (result.updatedDfInfo) {
      setDfInfo(result.updatedDfInfo);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: 'assistant',
        phase: 'execution',
        content: explanation,
        code,
        output: result.output || undefined,
        error: result.error || undefined,
        timestamp: Date.now(),
      },
    ]);
  }, [fileName, fileNames, setCurrentAgentActivity, setDfInfo, setMessages]);

  const handleSendMessage = useCallback(async (userText: string, options?: ChatRuntimeOptions) => {
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
      await runAgentLoop(userText, dfInfo, [...messages, userMsg], effectiveOptions);
    } catch (error: unknown) {
      setCurrentAgentActivity(null);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('re-upload your CSV')) {
        const reminderMsg: Message = {
          id: newId(),
          role: 'system',
          content: '📎 Please re-upload your CSV from the chat bar clip icon to continue this saved session.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, reminderMsg]);
        return;
      }

      const assistantErrorMsg: Message = {
        id: newId(),
        role: 'assistant',
        content: 'Something went wrong.',
        error: errorMessage,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [dfInfo, ensureAnalysisReady, messages, runAgentLoop, runtimeOptions, setCurrentAgentActivity, setIsLoading, setMessages]);

  const runGoal = useCallback(async (goal: string, options?: ChatRuntimeOptions) => {
    await handleSendMessage(goal, options);
  }, [handleSendMessage]);

  const handleRunRecommendedAction = useCallback(async (action: string) => {
    await runGoal(action);
  }, [runGoal]);

  const handleRunAutopilot = useCallback(async () => {
    await runGoal(defaultAutopilotGoal);
  }, [defaultAutopilotGoal, runGoal]);

  return {
    handleSendMessage,
    handleRunRecommendedAction,
    handleRunAutopilot,
  };
}
