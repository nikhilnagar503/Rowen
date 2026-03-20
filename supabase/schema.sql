create extension if not exists pgcrypto;

create table if not exists public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text generated always as (id::text) stored,
  clerk_user_id text not null,
  session_title text,
  file_name text,
  file_names jsonb not null default '[]'::jsonb,
  df_info jsonb,
  messages jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  latest_goal text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.analysis_sessions
  add column if not exists file_names jsonb not null default '[]'::jsonb;

alter table public.analysis_sessions
  add column if not exists session_title text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_sessions'
      and column_name = 'session_id'
  ) then
    alter table public.analysis_sessions
      add column session_id text generated always as (id::text) stored;
  end if;
end
$$;

create index if not exists analysis_sessions_clerk_user_id_idx
  on public.analysis_sessions (clerk_user_id, updated_at desc);

create or replace function public.set_analysis_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists analysis_sessions_set_updated_at on public.analysis_sessions;
create trigger analysis_sessions_set_updated_at
before update on public.analysis_sessions
for each row
execute function public.set_analysis_sessions_updated_at();
