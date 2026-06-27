-- =====================================================================
-- ATP-only cleanup. Run in the Supabase SQL editor if any WTA / mixed
-- tournaments were seeded earlier (WaveHub is ATP men's tennis ONLY).
-- =====================================================================

-- Drop bets/insights tied to pure-WTA tournaments, then the tournaments.
delete from public.bets
  where tournament_id in (select id from public.tournaments where category ilike 'WTA%');
delete from public.insights
  where tournament_id in (select id from public.tournaments where category ilike 'WTA%');
delete from public.tournaments where category ilike 'WTA%';

-- Relabel any remaining mixed ATP/WTA events to ATP.
update public.tournaments
  set category = regexp_replace(category, 'ATP\s*/\s*WTA', 'ATP', 'gi')
  where category ilike '%WTA%';
