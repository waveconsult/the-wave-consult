-- FastSpring (Merchant of Record) memberships — 2026-07-26.
-- Runs PARALLEL to the Stripe columns (20260712_subscriptions.sql): the app can
-- use either processor, chosen by NEXT_PUBLIC_PAYMENTS_PROVIDER. Access is still
-- decided solely by `tier`, and `tier` is still only ever written by a webhook
-- (service-role). Run once in the Supabase SQL editor / CLI. Safe to re-run.

-- FastSpring identifiers on the member profile. `subscription_status` and
-- `current_period_end` already exist (added for Stripe) and are reused here.
alter table public.profiles
  add column if not exists fastspring_account_id text,
  add column if not exists fastspring_subscription_id text;

create index if not exists profiles_fastspring_account_idx
  on public.profiles (fastspring_account_id);

-- Carry the FastSpring link on the application too (admin-invite flow: a member
-- may pay BEFORE the account exists, so we can attach it at signup).
-- `fastspring_session_id` mirrors `stripe_session_id`: the invite checkout we
-- emailed; the account/subscription ids are filled in by the webhook on payment.
alter table public.applications
  add column if not exists fastspring_session_id text,
  add column if not exists fastspring_account_id text,
  add column if not exists fastspring_subscription_id text;

-- SECURITY: same boundary as the Stripe columns — normal users must never write
-- their own subscription state. Only the webhook (service_role) may. service_role
-- bypasses this revoke.
revoke update (fastspring_account_id, fastspring_subscription_id)
  on public.profiles from authenticated, anon;
