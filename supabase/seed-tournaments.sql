-- =====================================================================
-- WaveHub — current grass-season tournaments (June 2026)
-- The Tournaments screen only SHOWS this week + next week, so adding more
-- (or future ones) is fine — they appear automatically when their week comes.
-- Optional: start clean first → uncomment the next line.
-- delete from public.tournaments;
-- =====================================================================

insert into public.tournaments (slug, name, location, country_flag, category, surface, start_date, end_date) values
  ('queens',      'HSBC Championships',   'London / Queen''s', '🇬🇧', 'ATP 500',      'Grass', '2026-06-15', '2026-06-21'),
  ('halle',       'Terra Wortmann Open',  'Halle',             '🇩🇪', 'ATP 500',      'Grass', '2026-06-15', '2026-06-21'),
  ('berlin',      'Berlin Tennis Open',   'Berlin',            '🇩🇪', 'WTA 500',      'Grass', '2026-06-15', '2026-06-21'),
  ('birmingham',  'Rothesay Classic',     'Birmingham',        '🇬🇧', 'WTA 250',      'Grass', '2026-06-15', '2026-06-21'),
  ('eastbourne',  'Rothesay International','Eastbourne',        '🇬🇧', 'ATP/WTA 250',  'Grass', '2026-06-22', '2026-06-28'),
  ('badhomburg',  'Bad Homburg Open',     'Bad Homburg',       '🇩🇪', 'WTA 500',      'Grass', '2026-06-22', '2026-06-28'),
  ('mallorca',    'Mallorca Championships','Mallorca',         '🇪🇸', 'ATP 250',      'Grass', '2026-06-22', '2026-06-28'),
  ('wimbledon',   'Wimbledon',            'London',            '🇬🇧', 'Grand Slam',   'Grass', '2026-06-29', '2026-07-12')
on conflict (slug) do update
  set name = excluded.name,
      location = excluded.location,
      country_flag = excluded.country_flag,
      category = excluded.category,
      surface = excluded.surface,
      start_date = excluded.start_date,
      end_date = excluded.end_date;
