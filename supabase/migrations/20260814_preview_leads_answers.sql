-- The /start funnel on the marketing site asks four questions before it takes
-- an email. The answers are the useful part of that lead — what people stake,
-- how often they bet, and how they pick — so they get stored alongside it.
--
-- Nullable on purpose: every other page that posts to /api/lead sends no
-- answers at all, and those rows must keep inserting exactly as before.

alter table public.preview_leads
  add column if not exists answers jsonb;

comment on column public.preview_leads.answers is
  'Answers from the /start funnel: stake, bets_per_week, method, method_label. Null for the tournament preview pages.';

-- Reading "everyone who stakes 250 or more" should not mean a full table scan
-- once this list grows.
create index if not exists preview_leads_answers_idx
  on public.preview_leads using gin (answers);
