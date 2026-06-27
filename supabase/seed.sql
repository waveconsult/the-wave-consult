-- =====================================================================
-- The Wave Consult — OPTIONAL demo seed (mirrors the clickable prototype).
-- Run AFTER schema.sql to populate the feed so it matches the prototype 1:1.
-- This is illustrative sample content — clear it before real publishing:
--   delete from public.bets; delete from public.insights; delete from public.tournaments;
-- (CLV/track-record numbers in Profile remain placeholders — not seeded.)
-- =====================================================================

-- ATP only — never WTA.
insert into public.tournaments (slug, name, location, country_flag, category, surface, start_date, end_date) values
  ('libema',     'Libéma Open',         '''s-Hertogenbosch', '🇳🇱', 'ATP 250', 'Grass', '2026-06-08', '2026-06-14'),
  ('stuttgart',  'BOSS Open',           'Stuttgart',         '🇩🇪', 'ATP 250', 'Grass', '2026-06-08', '2026-06-14'),
  ('queens',     'HSBC Championships',  'London / Queen''s', '🇬🇧', 'ATP 500', 'Grass', '2026-06-15', '2026-06-21'),
  ('halle',      'Terra Wortmann Open', 'Halle',             '🇩🇪', 'ATP 500', 'Grass', '2026-06-15', '2026-06-21')
on conflict (slug) do nothing;

-- Bets
insert into public.bets (tournament_id, match, round, selection, market, odds, stake_pct, min_odd, status, reasoning, clv)
select id, 'Mannarino — Zhang', 'R2', 'Mannarino (Sets)', 'Money Line · Match', 1.68, 0.75, 1.60, 'open',
  'Zhang served well but against a weak opponent — we don''t have a fully tested Zhang. Mannarino''s grass profile fits this match-up better. Play disciplined at min. 1.60, otherwise no value.', null
from public.tournaments where slug = 'libema';

insert into public.bets (tournament_id, match, round, selection, market, odds, stake_pct, min_odd, status, reasoning, clv)
select id, 'Majchrzak — Auger', 'R2', 'Majchrzak +1.5 sets', 'Set Handicap', 1.72, 0.5, 1.65, 'open',
  'Auger is the favourite, but the last round tells us little (opponent looked injured). Majchrzak is 5–1 on grass. The price overstates Auger''s edge — the value sits in the handicap, not the winner.', null
from public.tournaments where slug = 'libema';

insert into public.bets (tournament_id, match, round, selection, market, odds, stake_pct, min_odd, status, reasoning, clv)
select id, 'Zverev — Bublik', 'R1', 'Over 22.5 games', 'Total Games', 1.85, 0.5, 1.80, 'open',
  'Two strong servers who hold comfortably on grass. A hold-heavy match argues for long sets. No entry below 1.80.', null
from public.tournaments where slug = 'halle';

-- Insights
insert into public.insights (tournament_id, title, body, stats)
select id, 'Auger-Aliassime — Majchrzak',
  'Read: Auger won 2–0 without facing a break point and is the clear favourite, but the last round tells us little — Fucsovics looked injured. Majchrzak is 5–1 on grass. The price on Majchrzak is higher than the matchup warrants — that''s where the value is, not in the headline.',
  '[{"player":"Auger","w":16,"ue":22,"tt":116,"ratio":0.73},{"player":"Majchrzak","w":18,"ue":10,"tt":84,"ratio":1.80}]'::jsonb
from public.tournaments where slug = 'libema';

insert into public.insights (tournament_id, title, body, stats)
select id, 'Zhang — Mannarino',
  'Read: Zhang served well but against a weak opponent — not a fully tested Zhang. Mannarino''s grass profile fits the matchup better. We play the market, not the name.',
  '[{"player":"Zhang","w":21,"ue":15,"tt":141,"ratio":1.40},{"player":"Mannarino","w":36,"ue":32,"tt":205,"ratio":1.13}]'::jsonb
from public.tournaments where slug = 'libema';
