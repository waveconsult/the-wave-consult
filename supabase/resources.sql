-- =====================================================================
-- WaveHub — Resources (admin-uploaded PDFs / tools shown under Tools)
-- Run this in the Supabase SQL editor, then create the Storage bucket.
-- =====================================================================

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null,            -- path in the 'resources' storage bucket
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.resources enable row level security;

-- any authenticated user reads; only admins write
create policy "resources read"  on public.resources for select using (auth.role() = 'authenticated');
create policy "resources write" on public.resources for all    using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Storage: create a bucket named  resources  and mark it PUBLIC read
-- (PDFs are tournament info, not sensitive). Then the policies below let
-- only admins upload.
-- =====================================================================
create policy "resources admin upload"
  on storage.objects for insert
  with check (bucket_id = 'resources' and public.is_admin());
create policy "resources admin update"
  on storage.objects for update
  using (bucket_id = 'resources' and public.is_admin());
