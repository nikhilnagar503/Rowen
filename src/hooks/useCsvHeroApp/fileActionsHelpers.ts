import type { Message } from '../../types/index';
import { newId } from './utils';

export function isSupportedTabularFile(fileName: string): boolean {
  return fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt');
}

export function prependUniqueFileName(prev: string[], next: string): string[] {
  if (prev.includes(next)) return prev;
  return [next, ...prev];
}

export function buildFileLoadedMessage(name: string, rows: number, columns: number): Message {
  return {
    id: newId(),
    role: 'system',
    content: `📁 Loaded **${name}** — ${rows.toLocaleString()} rows × ${columns} columns`,
    timestamp: Date.now(),
  };
}

export function buildOnboardingMessage(content: string): Message {
  return {
    id: newId(),
    role: 'assistant',
    phase: 'reflection',
    content,
    timestamp: Date.now(),
  };
}

export function buildUnsupportedFileMessage(fileName: string): Message {
  return {
    id: newId(),
    role: 'system',
    content: `⚠️ Skipped ${fileName}. Please upload CSV/TSV/TXT files only.`,
    timestamp: Date.now(),
  };
}

export function buildFileLoadErrorMessage(error: unknown): Message {
  return {
    id: newId(),
    role: 'assistant',
    content: 'Failed to load the file.',
    error: error instanceof Error ? error.message : String(error),
    timestamp: Date.now(),
  };
}
