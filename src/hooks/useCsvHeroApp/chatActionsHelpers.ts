import type { Dispatch, SetStateAction } from 'react';
import { executeCode } from '../../lib/pyodide';
import { sendMessage } from '../../lib/ai';
import type { DataFrameInfo, Message } from '../../types/index';
import { newId } from './utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

type RunAgentLoopArgs = {
  userText: string;
  initialDfInfo: DataFrameInfo | null;
  initialHistory: Message[];
  fileNames: string[];
  activeFileName: string | null;
  setMessages: Setter<Message[]>;
  setDfInfo: Setter<DataFrameInfo | null>;
};

export async function runAgentLoop({
  userText,
  initialDfInfo,
  initialHistory,
  fileNames,
  activeFileName,
  setMessages,
  setDfInfo,
}: RunAgentLoopArgs): Promise<void> {
  const { explanation, code } = await sendMessage(
    userText,
    initialDfInfo,
    initialHistory,
    fileNames,
    activeFileName
  );

  if (!code) {
    setMessages((prev) => [...prev, {
      id: newId(),
      role: 'assistant',
      content: explanation,
      timestamp: Date.now(),
    }]);
    return;
  }

  const result = await executeCode(code);
  if (result.updatedDfInfo) {
    setDfInfo(result.updatedDfInfo);
  }

  setMessages((prev) => [...prev, {
    id: newId(),
    role: 'assistant',
    phase: 'execution',
    content: explanation,
    code,
    output: result.output || undefined,
    error: result.error || undefined,
    timestamp: Date.now(),
  }]);
}

export function buildReminderMessage(): Message {
  return {
    id: newId(),
    role: 'system',
    content: '📎 Please re-upload your CSV from the chat bar clip icon to continue this saved session.',
    timestamp: Date.now(),
  };
}

export function buildAssistantErrorMessage(errorMessage: string): Message {
  return {
    id: newId(),
    role: 'assistant',
    content: 'Something went wrong.',
    error: errorMessage,
    timestamp: Date.now(),
  };
}
