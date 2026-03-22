import type {
  DataFrameInfo,
  Message,
  PersistedSession,
  PersistedSessionSummary,
} from '../../types/index';

export const OMIT_DATASET_FROM_CLOUD = true;

export const newId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function getLatestGoal(messages: Message[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
}

export function toDatasetTitle(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '') || fileName;
}

export function summarizeSession(session: PersistedSession): PersistedSessionSummary {
  const title = session.sessionTitle?.trim() || session.fileName?.trim() || session.latestGoal?.trim() || 'Untitled session';

  return {
    id: session.id,
    title,
    sessionTitle: session.sessionTitle,
    fileName: session.fileName,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
  };
}

export function getQualitySnapshot(info: DataFrameInfo) {
  const rows = info.shape[0];
  const columns = info.shape[1];
  const missingTotal = Object.values(info.missing).reduce((acc, count) => acc + count, 0);
  const duplicates = info.duplicates;
  const totalCells = Math.max(rows * columns, 1);
  const missingRatio = missingTotal / totalCells;
  const duplicateRatio = rows > 0 ? duplicates / rows : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - (missingRatio * 65 + duplicateRatio * 35) * 100)));

  return {
    rows,
    columns,
    missingTotal,
    duplicates,
    score,
  };
}
