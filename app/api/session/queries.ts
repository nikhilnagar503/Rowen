import type { SessionPayload } from './types';
import { FULL_SELECT, LEGACY_SELECT } from './types';
import { isMissingColumnError } from './errors';
import type { GenericSupabase } from './dbClient';

function normalizeMessages(messages: SessionPayload['messages']) {
  return Array.isArray(messages) ? messages : [];
}

export async function fetchSessionRecords(supabase: GenericSupabase, userId: string) {
  const primaryResult = await supabase
    .from('analysis_sessions')
    .select(FULL_SELECT)
    .eq('clerk_user_id', userId)
    .order('updated_at', { ascending: false });

  let recordsData = primaryResult.data;
  let recordsError = primaryResult.error;

  if (recordsError && isMissingColumnError(recordsError)) {
    const fallback = await supabase
      .from('analysis_sessions')
      .select(LEGACY_SELECT)
      .eq('clerk_user_id', userId)
      .order('updated_at', { ascending: false });

    recordsData = fallback.data;
    recordsError = fallback.error;
  }

  if (recordsError) {
    throw recordsError;
  }

  return recordsData ?? [];
}

export async function saveSessionRecord(
  supabase: GenericSupabase,
  userId: string,
  body: SessionPayload,
) {
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
    messages: normalizeMessages(body.messages),
    latest_goal: body.latestGoal ?? null,
  };

  const legacyPayload = {
    clerk_user_id: userId,
    file_name: body.fileName ?? null,
    df_info: body.dfInfo ?? null,
    messages: normalizeMessages(body.messages),
    latest_goal: body.latestGoal ?? null,
  };

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

  return data;
}
