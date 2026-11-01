-- Restrict teacher access to explicitly listed admins.
-- This is defence-in-depth: even if public sign-ups were enabled, a random
-- account could not read or write any data.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies: only the service role / security-definer functions can read it.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

drop policy if exists "teacher full access classes" on public.classes;
create policy "admin full access classes" on public.classes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "teacher full access tutorials" on public.tutorials;
create policy "admin full access tutorials" on public.tutorials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "teacher full access class_tutorials" on public.class_tutorials;
create policy "admin full access class_tutorials" on public.class_tutorials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
