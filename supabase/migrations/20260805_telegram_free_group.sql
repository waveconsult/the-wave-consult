-- The free group has its own door: before we let anyone in, the bot asks them
-- to follow on Instagram. Instagram exposes no way to verify a follow, so this
-- is a confirmation, not a check — we record when they said yes.
alter table public.telegram_members
  add column if not exists ig_follow_confirmed_at timestamptz,
  add column if not exists in_free_group boolean not null default false;
