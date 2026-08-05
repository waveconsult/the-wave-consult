-- Telegram membership — paid access to the private group (2026-08-04).
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.telegram_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  telegram_id bigint not null unique,     -- the Telegram user id
  username text,                          -- @handle, may be null
  first_name text,

  email text,
  stripe_customer_id text,
  stripe_subscription_id text,

  plan text check (plan in ('3m','6m','1y')),
  status text not null default 'none',    -- none | active | past_due | canceled
  current_period_end timestamptz,

  in_group boolean not null default false,
  joined_at timestamptz,
  removed_at timestamptz
);

create index if not exists tg_members_status_idx on public.telegram_members (status, current_period_end);
create index if not exists tg_members_sub_idx on public.telegram_members (stripe_subscription_id);
create index if not exists tg_members_customer_idx on public.telegram_members (stripe_customer_id);

-- Written only by the service-role API routes (bot webhook, Stripe webhook,
-- sweep cron). RLS on with no policies: anon/authenticated cannot touch it.
alter table public.telegram_members enable row level security;
