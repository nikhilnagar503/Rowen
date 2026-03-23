import { useEffect, useState } from 'react';
import type { Message } from '../../types/index';
import { isQualityDeltaMessage } from './messageUtils';

export function useStreamingMessage(messages: Message[]) {
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && !isQualityDeltaMessage(msg));

    if (!lastAssistantMessage) {
      setStreamingMessageId(null);
      setVisibleChars(0);
      return;
    }

    if (lastAssistantMessage.id !== streamingMessageId) {
      setStreamingMessageId(lastAssistantMessage.id);
      setVisibleChars(0);
      return;
    }

    setVisibleChars((prev) => Math.min(prev, lastAssistantMessage.content.length));
  }, [messages, streamingMessageId]);

  useEffect(() => {
    if (!streamingMessageId) {
      return;
    }

    const activeMessage = messages.find((msg) => msg.id === streamingMessageId);

    if (!activeMessage || visibleChars >= activeMessage.content.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      const remaining = activeMessage.content.length - visibleChars;
      const step = Math.max(1, Math.ceil(remaining / 24));
      setVisibleChars((prev) => Math.min(prev + step, activeMessage.content.length));
    }, 16);

    return () => window.clearTimeout(timer);
  }, [messages, streamingMessageId, visibleChars]);

  return {
    streamingMessageId,
    visibleChars,
  };
}
