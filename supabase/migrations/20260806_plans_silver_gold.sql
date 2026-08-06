-- Pricing moved from three durations (3m/6m/1y) to two yearly tiers.
--
-- The old check constraints would reject every new row, so they are replaced
-- rather than extended: nobody bought under the old scheme, so there is no
-- historic data to keep valid. If that ever stops being true, add the old
-- values back to the IN list instead of dropping them.
alter table public.telegram_members
  drop constraint if exists telegram_members_plan_check;
alter table public.telegram_members
  add constraint telegram_members_plan_check
  check (plan in ('silver','gold'));

alter table public.telegram_link_codes
  drop constraint if exists telegram_link_codes_plan_check;
alter table public.telegram_link_codes
  add constraint telegram_link_codes_plan_check
  check (plan in ('silver','gold'));

-- profiles.plan carries the same values. It may or may not have a constraint
-- depending on how the table was created, so only replace one if it exists.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles drop constraint profiles_plan_check;
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('silver','gold'));
  end if;
end $$;
