-- Rocket STL allowlist (run against your existing Supabase project).
-- Only rows in this table may use the app after email/password login.
-- Do not grant INSERT/UPDATE/DELETE to anon or authenticated; add emails in the dashboard.

create table if not exists public.rocket_stl_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists rocket_stl_allowlist_email_idx
  on public.rocket_stl_allowlist (email);

alter table public.rocket_stl_allowlist enable row level security;

drop policy if exists "rocket_stl_allowlist_select_own" on public.rocket_stl_allowlist;
create policy "rocket_stl_allowlist_select_own"
  on public.rocket_stl_allowlist
  for select
  to authenticated
  using (email = lower((auth.jwt() ->> 'email')));

-- Keep emails lowercase.
create or replace function public.rocket_stl_allowlist_lower_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists rocket_stl_allowlist_lower_email on public.rocket_stl_allowlist;
create trigger rocket_stl_allowlist_lower_email
before insert or update on public.rocket_stl_allowlist
for each row execute procedure public.rocket_stl_allowlist_lower_email();

grant select on public.rocket_stl_allowlist to authenticated;
revoke insert, update, delete on public.rocket_stl_allowlist from authenticated, anon;

-- Insert your account, then create the Auth user (email + password) in Authentication > Users.
-- insert into public.rocket_stl_allowlist (email, notes) values ('you@example.com', 'owner');
