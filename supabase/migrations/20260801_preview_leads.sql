-- Preview-PDF lead magnet (tournament landing pages) — 2026-08-01.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.preview_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  tournament text not null,          -- slug, e.g. "canada"
  experience text,                   -- reserved: betting experience (not asked yet)
  source text,                       -- page / campaign the lead came from
  emailed_at timestamptz,            -- when the PDF mail actually went out
  list_synced boolean not null default false   -- added to the Resend audience
);

-- Did the visitor go through the "follow us on Instagram" step? Honour-system:
-- Instagram exposes no way to verify a follow, so this records that they
-- clicked through to the profile, not that they actually followed.
alter table public.preview_leads
  add column if not exists followed_ig boolean not null default false;

-- Contacts live in the Resend audience now (Mailchimp was dropped). Safe on a
-- table created before the rename.
alter table public.preview_leads
  add column if not exists list_synced boolean not null default false;

create index if not exists preview_leads_email_idx on public.preview_leads (email);
create index if not exists preview_leads_tournament_idx on public.preview_leads (tournament, created_at desc);

-- Writes happen ONLY through the service-role API route. RLS on, no policies,
-- so anon/authenticated clients can neither read nor write it directly.
alter table public.preview_leads enable row level security;
