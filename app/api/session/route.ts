import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, isSupabaseConfigured } from '../../../src/lib/supabase/server';
import type {
  DataFrameInfo,
  Message,
  PersistedSession,
  PersistedSessionSummary,
} from '../../../src/types/index';

type SessionRecord = {
  id: string;
  clerk_user_id: string;
  session_title?: string | null;
  file_name: string | null;
  file_names?: string[] | null;
  df_info: DataFrameInfo | null;
  messages: Message[];
  recommended_actions: string[];
  latest_goal: string | null;
  updated_at: string;
};

type SessionPayload = {
  sessionId?: string | null;
  sessionTitle?: string | null;
  fileName?: string | null;
  fileNames?: string[];
  dfInfo?: DataFrameInfo | null;
  messages?: Message[];
  recommendedActions?: string[];
  latestGoal?: string | null;
};

// New schema fields (session_title, file_names) are preferred when available.
const FULL_SELECT = 'id, clerk_user_id, session_title, file_name, file_names, df_info, messages, recommended_actions, latest_goal, updated_at';
// Backward-compatible select for older databases that do not yet have new columns.
const LEGACY_SELECT = 'id, clerk_user_id, file_name, df_info, messages, recommended_actions, latest_goal, updated_at';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    try {
      return JSON.stringify(candidate);
    } catch {
      return 'Unknown error object';
    }
  }

  return String(error);
}

function isMissingColumnError(error: unknown): boolean {
  // Supabase can report missing columns through different message shapes,
  // so we normalize the error text and match common indicators.
  const message = toErrorMessage(error).toLowerCase();
  return (
    (message.includes('session_title') || message.includes('file_names'))
    && (message.includes('column') || message.includes('schema cache'))
  );
}

function toSession(record: SessionRecord): PersistedSession {
  // Convert DB row naming into API response naming and normalize arrays.
  return {
    id: record.id,
    sessionTitle: record.session_title,
    fileName: record.file_name,
    fileNames: Array.isArray(record.file_names)
      ? record.file_names
      : record.file_name
        ? [record.file_name]
        : [],
    dfInfo: record.df_info,
    messages: Array.isArray(record.messages) ? record.messages : [],
    recommendedActions: Array.isArray(record.recommended_actions) ? record.recommended_actions : [],
    latestGoal: record.latest_goal,
    updatedAt: record.updated_at,
  };
}

function toSessionSummary(record: SessionRecord): PersistedSessionSummary {
  // Build a resilient title that still works for legacy rows.
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

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ session: null, storageAvailable: false }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ session: null, storageAvailable: false });
    }

    const supabase = createSupabaseServerClient();
    const url = new URL(request.url);
    const listOnly = url.searchParams.get('list') === '1';
    const requestedSessionId = url.searchParams.get('sessionId');

    // Read sessions ordered by last update, newest first.
    const primaryResult = await supabase
      .from('analysis_sessions')
      .select(FULL_SELECT)
      .eq('clerk_user_id', userId)
      .order('updated_at', { ascending: false });

    let recordsData = primaryResult.data as SessionRecord[] | null;
    let recordsError = primaryResult.error;

    // If the environment has an older table schema, retry with legacy fields.
    if (recordsError && isMissingColumnError(recordsError)) {
      const fallback = await supabase
        .from('analysis_sessions')
        .select(LEGACY_SELECT)
        .eq('clerk_user_id', userId)
        .order('updated_at', { ascending: false });

      recordsData = fallback.data as SessionRecord[] | null;
      recordsError = fallback.error;
    }

    if (recordsError) {
      throw recordsError;
    }

    const records = recordsData ?? [];
    const summaries = records.map(toSessionSummary);

    // Fast path for the sidebar/session picker.
    if (listOnly) {
      return NextResponse.json({ sessions: summaries, storageAvailable: true });
    }

    const record = requestedSessionId
      ? records.find((entry) => entry.id === requestedSessionId)
      : records[0];

    return NextResponse.json({
      session: record ? toSession(record) : null,
      sessions: summaries,
      storageAvailable: true,
    });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ session: null, storageAvailable: false });
    }

    const body = (await request.json()) as SessionPayload;
    const supabase = createSupabaseServerClient();

    // Preferred payload for current schema.
    const payload = {
      clerk_user_id: userId,
      session_title: body.sessionTitle ?? null,
      file_name: body.fileName ?? null,
      file_names: Array.isArray(body.fileNames)
        ? body.fileNames
        : body.fileName
          ? [body.fileName]
          : [],
      df_info: body.dfInfo ?? null,
      messages: Array.isArray(body.messages) ? body.messages : [],
      recommended_actions: Array.isArray(body.recommendedActions) ? body.recommendedActions : [],
      latest_goal: body.latestGoal ?? null,
    };

    // Legacy payload for environments that haven't applied new columns yet.
    const legacyPayload = {
      clerk_user_id: userId,
      file_name: body.fileName ?? null,
      df_info: body.dfInfo ?? null,
      messages: Array.isArray(body.messages) ? body.messages : [],
      recommended_actions: Array.isArray(body.recommendedActions) ? body.recommendedActions : [],
      latest_goal: body.latestGoal ?? null,
    };

    // Shared path for update-vs-insert so fallback can reuse identical logic.
    const runUpsert = (currentPayload: typeof payload | typeof legacyPayload, selectFields: string) => (
      body.sessionId
        ? supabase
            .from('analysis_sessions')
            .update(currentPayload)
            .eq('id', body.sessionId)
            .eq('clerk_user_id', userId)
            .select(selectFields)
            .single()
        : supabase
            .from('analysis_sessions')
            .insert(currentPayload)
            .select(selectFields)
            .single()
    );

    let { data, error } = await runUpsert(payload, FULL_SELECT);

    // Retry once with legacy schema if new columns are unavailable.
    if (error && isMissingColumnError(error)) {
      const fallback = await runUpsert(legacyPayload, LEGACY_SELECT);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Session save returned no data.');
    }

    return NextResponse.json({ session: toSession(data as unknown as SessionRecord), storageAvailable: true });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
