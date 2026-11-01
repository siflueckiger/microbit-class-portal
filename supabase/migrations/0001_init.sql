-- Classroom app schema
-- Tutorials are stored as structured steps (JSON); the app renders them into
-- MakeCode tutorial Markdown on demand. Students access only their class via
-- security-definer functions, so they can never list other classes.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_tutorials (
  class_id uuid not null references public.classes(id) on delete cascade,
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  position integer not null default 0,
  primary key (class_id, tutorial_id)
);

create index if not exists class_tutorials_class_id_idx
  on public.class_tutorials (class_id);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tutorials_set_updated_at on public.tutorials;
create trigger tutorials_set_updated_at
  before update on public.tutorials
  for each row execute function public.set_updated_at();

-- Row level security -------------------------------------------------------
alter table public.classes enable row level security;
alter table public.tutorials enable row level security;
alter table public.class_tutorials enable row level security;

-- Only the signed-in teacher can read/write the tables directly.
drop policy if exists "teacher full access classes" on public.classes;
create policy "teacher full access classes" on public.classes
  for all to authenticated using (true) with check (true);

drop policy if exists "teacher full access tutorials" on public.tutorials;
create policy "teacher full access tutorials" on public.tutorials
  for all to authenticated using (true) with check (true);

drop policy if exists "teacher full access class_tutorials" on public.class_tutorials;
create policy "teacher full access class_tutorials" on public.class_tutorials
  for all to authenticated using (true) with check (true);

-- Anonymous (student) access is code-gated through these functions only. -----

create or replace function public.student_get_class(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'tutorials', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'title', t.title,
          'description', t.description,
          'position', ct.position
        ) order by ct.position, t.title
      )
      from public.class_tutorials ct
      join public.tutorials t on t.id = ct.tutorial_id
      where ct.class_id = c.id
    ), '[]'::jsonb)
  )
  from public.classes c
  where c.code = upper(trim(p_code));
$$;

create or replace function public.student_get_tutorial(p_code text, p_tutorial_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'steps', t.steps
  )
  from public.classes c
  join public.class_tutorials ct on ct.class_id = c.id
  join public.tutorials t on t.id = ct.tutorial_id
  where c.code = upper(trim(p_code)) and t.id = p_tutorial_id
  limit 1;
$$;

revoke all on function public.student_get_class(text) from public;
revoke all on function public.student_get_tutorial(text, uuid) from public;
grant execute on function public.student_get_class(text) to anon, authenticated;
grant execute on function public.student_get_tutorial(text, uuid) to anon, authenticated;
