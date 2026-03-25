import type {
  PersistedSession,
  PersistedSessionSummary,
} from '../../../src/types/index';
import type { SessionRecord } from './types';

export function toSession(record: SessionRecord): PersistedSession {
  return {
    id: record.id,
    sessionTitle: record.session_title,
    fileNames: Array.isArray(record.file_names)
      ? record.file_names
      : record.file_name
        ? [record.file_name]
        : [],
    dfInfo: record.df_info,
    messages: Array.isArray(record.messages) ? record.messages : [],
    latestGoal: record.latest_goal,
    updatedAt: record.updated_at,
  };
}

export function toSessionSummary(record: SessionRecord): PersistedSessionSummary {
  const messageCount = Array.isArray(record.messages) ? record.messages.length : 0;
  const latestFileName = Array.isArray(record.file_names) && record.file_names.length > 0
    ? record.file_names[0]
    : record.file_name;
  const baseTitle = record.session_title?.trim() || latestFileName?.trim() || record.latest_goal?.trim() || '';

  return {
    id: record.id,
    title: baseTitle || 'Untitled session',
    sessionTitle: record.session_title,
    fileName: latestFileName ?? null,
    updatedAt: record.updated_at,
    messageCount,
  };
}
