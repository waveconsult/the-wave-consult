-- =====================================================================
-- The Wave Consult — database schema (briefing §4)
-- Run this in the Supabase SQL editor after creating the project.
-- Includes tables, an is_admin() helper, RLS policies, a signup trigger,
-- and notes for the storage bucket.
-- =====================================================================

-- ===== extensions =====
create extension if not exists "pgcrypto";

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  role text not null default 'user' check (role in ('user','admin')),
  tier text not null default 'none' check (tier in ('none','core','private')),
  bankroll numeric not null default 0,
  staking_strategy text not null default 'conservative'
    check (staking_strategy in ('conservative','standard','aggressive')),
  max_stake_pct numeric not null default 3,
  unit_size numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ===== tournaments =====
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  location text,
  country_flag text,          -- emoji flag, e.g. '🇳🇱'
  category text,              -- 'ATP 250', 'WTA 500', etc.
  surface text not null default 'Grass',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ===== bets =====
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  tournament_name text,                 -- free-text event name (typed on the form)
  match text not null,
  round text,
  selection text not null,              -- includes the price, e.g. 'Sinner @1.62'
  market text not null,
  odds numeric,                         -- optional (price is written into selection)
  stake_pct numeric not null,           -- % of bankroll (recommended)
  min_odd numeric,                      -- optional discipline floor (nullable)
  status text not null default 'open' check (status in ('open','won','lost','void')),
  reasoning text,
  screenshot_path text,                 -- storage path in 'bet-shots' bucket
  clv numeric,                          -- filled after settlement; nullable
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ===== insights =====
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  tournament_name text,                 -- free-text event name (typed on the form)
  title text not null,                  -- e.g. 'Auger vs Majchrzak'
  body text not null,
  stats jsonb,                          -- optional: [{player,w,ue,tt,ratio}]
  screenshot_path text,                 -- optional image/PDF attachment in 'bet-shots'
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ===== applications (apply-first intake) =====
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  requested_tier text check (requested_tier in ('core','private')),
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

-- ===== admin helper =====
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin');
$$;

-- ===== signup trigger: auto-create profile =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== RLS =====
alter table public.profiles      enable row level security;
alter table public.tournaments   enable row level security;
alter table public.bets          enable row level security;
alter table public.insights      enable row level security;
alter table public.applications  enable row level security;

-- profiles: owner reads/updates own; admin reads all
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- content: any authenticated user reads; only admin writes
-- (tier-based gating can be tightened later when payments land)
create policy "tournaments read"  on public.tournaments for select using (auth.role() = 'authenticated');
create policy "tournaments write" on public.tournaments for all    using (public.is_admin()) with check (public.is_admin());

create policy "bets read"  on public.bets for select using (auth.role() = 'authenticated');
create policy "bets write" on public.bets for all    using (public.is_admin()) with check (public.is_admin());

create policy "insights read"  on public.insights for select using (auth.role() = 'authenticated');
create policy "insights write" on public.insights for all    using (public.is_admin()) with check (public.is_admin());

-- applications: anyone may submit; only admin reads/updates
create policy "applications insert" on public.applications for insert with check (true);
create policy "applications read"   on public.applications for select using (public.is_admin());
create policy "applications update" on public.applications for update using (public.is_admin());

-- =====================================================================
-- Storage bucket (bet-slip screenshots) — briefing §4
-- Create a bucket named `bet-shots`.
--   MVP option:  mark it PUBLIC read (analyst's own slips, no personal data).
--   Safer option: keep it PRIVATE and serve via short-lived signed URLs.
-- The app supports both — set NEXT_PUBLIC_BET_SHOTS_PUBLIC=true|false in .env.
--
-- Storage policies (private-bucket variant) — only admins upload:
-- =====================================================================
create policy "bet-shots admin upload"
  on storage.objects for insert
  with check (bucket_id = 'bet-shots' and public.is_admin());
create policy "bet-shots admin update"
  on storage.objects for update
  using (bucket_id = 'bet-shots' and public.is_admin());

-- =====================================================================
-- Make yourself admin (one-time, after first signup):
--   update public.profiles set role = 'admin'
--   where email = 'YOUR_EMAIL_HERE';
-- =====================================================================
