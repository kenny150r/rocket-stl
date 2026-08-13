-- Named designs for Rocket STL (run against the same project as allowlist.sql).
-- Each authenticated user can CRUD only their own rows.

create table if not exists public.rocket_stl_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  spec jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rocket_stl_designs_name_not_blank check (char_length(trim(name)) > 0),
  constraint rocket_stl_designs_user_name_key unique (user_id, name)
);

create index if not exists rocket_stl_designs_user_updated_idx
  on public.rocket_stl_designs (user_id, updated_at desc);

alter table public.rocket_stl_designs enable row level security;

drop policy if exists "rocket_stl_designs_select_own" on public.rocket_stl_designs;
create policy "rocket_stl_designs_select_own"
  on public.rocket_stl_designs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "rocket_stl_designs_insert_own" on public.rocket_stl_designs;
create policy "rocket_stl_designs_insert_own"
  on public.rocket_stl_designs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "rocket_stl_designs_update_own" on public.rocket_stl_designs;
create policy "rocket_stl_designs_update_own"
  on public.rocket_stl_designs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rocket_stl_designs_delete_own" on public.rocket_stl_designs;
create policy "rocket_stl_designs_delete_own"
  on public.rocket_stl_designs for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.rocket_stl_designs_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rocket_stl_designs_touch on public.rocket_stl_designs;
create trigger rocket_stl_designs_touch
before update on public.rocket_stl_designs
for each row execute function public.rocket_stl_designs_touch();

grant select, insert, update, delete on public.rocket_stl_designs to authenticated;
revoke all on public.rocket_stl_designs from anon;
