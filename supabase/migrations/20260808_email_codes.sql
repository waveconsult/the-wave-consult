-- One verification mechanism, two doors.
--
-- The bot cannot take someone's word for which email they paid with: an email
-- address is not a secret, so "type the address you used" would hand a
-- membership to anyone who knows it. Possession of the mailbox has to be
-- proven, and the cheapest proof is a code sent to it.
--
-- The website needs exactly the same thing to let a member back in on a new
-- device without a password. So both use this table rather than growing two
-- half-implementations.
--
-- Codes are stored hashed. A leaked database row should not be a working
-- credential, and we never need the plaintext again — verification hashes the
-- typed code and compares.
--
-- No RLS policies: only the service-role client, i.e. server code, touches it.
create table if not exists public.email_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('telegram_link', 'web_login')),
  -- Which Telegram account asked. Lets the bot find the pending request from a
  -- bare six-digit message without holding conversation state anywhere else.
  telegram_id bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  consumed_at timestamptz
);

-- The bot's lookup: newest live request for this Telegram account.
create index if not exists email_codes_telegram_idx
  on public.email_codes (telegram_id, purpose, consumed_at, expires_at desc);

-- The website's lookup, and the rate limiter's "how many did this address ask
-- for recently" question.
create index if not exists email_codes_email_idx
  on public.email_codes (email, purpose, created_at desc);

alter table public.email_codes enable row level security;

-- telegram_link_codes.stripe_session_id is `not null unique` because a code was
-- always born from a checkout. Re-issuing a link from the member area has no
-- checkout to point at, so those rows carry a synthetic key instead
-- (`sub_<subscription_id>_<epoch>`). Nothing to change structurally — this
-- comment exists so the synthetic values are not read as corruption later.
comment on column public.telegram_link_codes.stripe_session_id is
  'Stripe checkout session id, or sub_<subscription_id>_<epoch> for links re-issued from the member area.';
