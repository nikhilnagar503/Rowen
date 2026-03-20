import { createClient } from '@supabase/supabase-js';

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getSupabaseUrl() {
  const candidates = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  const url = candidates.find((item) => isValidHttpUrl(item));

  if (!url) {
    throw new Error('Missing valid Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to your project URL.');
  }

  return url;
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  return key;
}

export function isSupabaseConfigured() {
  try {
    getSupabaseUrl();
    getServiceRoleKey();
    return true;
  } catch {
    return false;
  }
}

export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured on the server.');
  }

  return createClient(
    getSupabaseUrl(),
    getServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
