-- Applications: payment / onboarding columns (added 2026-07-08).
-- Run this once in the Supabase SQL editor (or via the Supabase CLI).
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.

alter table public.applications
  add column if not exists granted_tier text
    check (granted_tier in ('core', 'private')),
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz;
