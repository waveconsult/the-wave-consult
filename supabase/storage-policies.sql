-- =====================================================================
-- Storage RLS for the private 'bet-shots' bucket — it holds bet slips,
-- insight attachments AND tool/resource PDFs. Without these policies the
-- regular client gets "row violates row-level security policy" on upload.
-- Run this once in the Supabase SQL editor. Idempotent (drop + recreate).
--
-- Prereq: the bucket 'bet-shots' must exist (Storage → New bucket, keep it
-- private). No separate 'resources' bucket is needed anymore.
-- =====================================================================

drop policy if exists "bet-shots admin upload" on storage.objects;
drop policy if exists "bet-shots admin update" on storage.objects;
drop policy if exists "bet-shots admin delete" on storage.objects;
drop policy if exists "bet-shots read"         on storage.objects;

-- Only admins (the analyst) may write.
create policy "bet-shots admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bet-shots' and public.is_admin());

create policy "bet-shots admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'bet-shots' and public.is_admin())
  with check (bucket_id = 'bet-shots' and public.is_admin());

create policy "bet-shots admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bet-shots' and public.is_admin());

-- Any signed-in member may read, so the app can sign attachment URLs.
-- (Free-member gating is enforced in the app, not here.)
create policy "bet-shots read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bet-shots');
