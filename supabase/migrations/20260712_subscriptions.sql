-- Recurring memberships (Stripe subscriptions) — 2026-07-12.
-- Run once in the Supabase SQL editor / CLI. Safe to re-run.

-- Subscription tracking on the member profile. `tier` stays the access flag
-- ('none' | 'core' | 'private'); these columns tell us WHY / until when.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

-- Carry the Stripe link on the application too, so an admin-invited member who
-- pays BEFORE creating an account can have it attached to their profile at
-- signup (see app/(auth)/actions.ts).
alter table public.applications
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- SECURITY: access is decided by `tier`, which must ONLY ever be set by the
-- Stripe webhook (service-role). Stop normal users from granting themselves a
-- paid tier or editing subscription state. (service_role bypasses this.)
revoke update (tier, stripe_customer_id, stripe_subscription_id,
               subscription_status, current_period_end)
  on public.profiles from authenticated, anon;
