import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, isSupabaseConfigured } from '../../../src/lib/supabase/server';
import { toErrorMessage } from './errors';
import { toSession, toSessionSummary } from './mappers';
import { fetchSessionRecords, saveSessionRecord } from './queries';
import type { SessionPayload } from './types';

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

    const records = await fetchSessionRecords(supabase as never, userId);
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
    const saved = await saveSessionRecord(supabase as never, userId, body);
    return NextResponse.json({ session: toSession(saved), storageAvailable: true });
  } catch (error: unknown) {
    const message = toErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


