-- Buying on the website and buying in the bot are two different situations.
--
-- In the bot we already know who the buyer is: the checkout carries their
-- telegram id. On the website we don't — Stripe only knows an email and a card.
-- So after a website purchase we mint a short one-time code, hand it to the
-- buyer as a deep link (t.me/<bot>?start=<code>), and the bot redeems it to
-- attach that subscription to whichever Telegram account opened it.
--
-- Rows are written by the thanks page (which has the Stripe session) and read
-- exactly once by the bot. No RLS policies: only the service-role client, i.e.
-- server code, ever touches this table.
create table if not exists public.telegram_link_codes (
  code text primary key,
  created_at timestamptz not null default now(),
  stripe_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  email text,
  plan text check (plan in ('3m','6m','1y')),
  current_period_end timestamptz,
  used_at timestamptz,
  used_by bigint
);

create index if not exists tg_link_codes_session_idx
  on public.telegram_link_codes (stripe_session_id);

alter table public.telegram_link_codes enable row level security;
