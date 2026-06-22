-- =====================================================================
-- Migration: odds is now optional on bets.
-- The analyst writes the price into the selection text (e.g. "Sinner @1.62"),
-- so the separate odds/min-odd fields were removed from the form.
-- Run this in the Supabase SQL editor (safe to run more than once).
-- =====================================================================

alter table public.bets alter column odds drop not null;
-- min_odd is already nullable.
