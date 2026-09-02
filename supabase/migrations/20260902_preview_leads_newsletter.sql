-- The /free page asks for two things at once, and they are not the same
-- consent. Asking for the Telegram invite is a request we act on; being added
-- to the mailing list is a separate choice, made with its own unticked box.
--
-- This column records the second one, so we can show later which people
-- actually opted in rather than inferring it from the fact that they signed up.
--
-- Nullable and defaulting to false: every other page that posts to /api/lead
-- sends no flag at all, and those rows must keep inserting exactly as before.

alter table public.preview_leads
  add column if not exists newsletter_opt_in boolean not null default false;

comment on column public.preview_leads.newsletter_opt_in is
  'True only where the person ticked the marketing-email box on /free. False for the invite-only sign-ups and for every other lead source. This is the record of consent — do not send marketing to rows where it is false.';

-- The list build reads "everyone who opted in", so keep that from scanning the
-- whole table once this grows. Partial index: the false rows are the majority
-- and are never the ones being selected.
create index if not exists preview_leads_newsletter_idx
  on public.preview_leads (created_at desc)
  where newsletter_opt_in;
