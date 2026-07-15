-- Quiz funnel — lead capture + drop-off tracking (2026-07-12).
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  dropped_at_step int not null default 1,   -- last step reached (drop-off point)
  email text,
  result text,                              -- 'membership' | 'guide'
  completed boolean not null default false
);

create index if not exists quiz_sessions_email_idx on public.quiz_sessions (email);
create index if not exists quiz_sessions_created_idx on public.quiz_sessions (created_at desc);

-- Writes happen ONLY via server actions using the service-role key (admin
-- client, which bypasses RLS). Enable RLS with no policies so nothing is
-- readable/writable directly by anon/authenticated clients.
alter table public.quiz_sessions enable row level security;
