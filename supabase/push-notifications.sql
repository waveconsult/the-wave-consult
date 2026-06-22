-- =====================================================================
-- Web Push: store each browser's push subscription. Run in the SQL editor.
-- =====================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- A signed-in user manages only their own subscriptions; admins can read all.
create policy "push self insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push self delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
create policy "push read self or admin" on public.push_subscriptions
  for select using (auth.uid() = user_id or public.is_admin());
