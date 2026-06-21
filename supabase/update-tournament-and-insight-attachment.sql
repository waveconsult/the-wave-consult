-- =====================================================================
-- Migration: free-text tournament name + insight attachments
-- Run this in the Supabase SQL editor (safe to run more than once).
-- =====================================================================

-- Tournament is now typed in freely on the admin forms (no more picker).
alter table public.bets     add column if not exists tournament_name text;
alter table public.insights add column if not exists tournament_name text;

-- Insights can now carry an image or PDF attachment, stored in the
-- 'bet-shots' bucket (same as bets).
alter table public.insights add column if not exists screenshot_path text;

-- NOTE: to allow PDF attachments, make sure the 'bet-shots' storage bucket
-- permits the 'application/pdf' MIME type (or leave its MIME list empty).
