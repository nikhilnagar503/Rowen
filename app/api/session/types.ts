import type {
  DataFrameInfo,
  Message,
} from '../../../src/types/index';

export type SessionRecord = {
  id: string;
  clerk_user_id: string;
  session_title?: string | null;
  file_name: string | null;
  file_names?: string[] | null;
  df_info: DataFrameInfo | null;
  messages: Message[];
  latest_goal: string | null;
  updated_at: string;
};

export type SessionPayload = {
  sessionId?: string | null;
  sessionTitle?: string | null;
  fileName?: string | null;
  fileNames?: string[];
  dfInfo?: DataFrameInfo | null;
  messages?: Message[];
  latestGoal?: string | null;
};

export const FULL_SELECT = 'id, clerk_user_id, session_title, file_name, file_names, df_info, messages, latest_goal, updated_at';
export const LEGACY_SELECT = 'id, clerk_user_id, file_name, df_info, messages, latest_goal, updated_at';
