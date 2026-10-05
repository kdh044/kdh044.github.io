-- Run once in Supabase SQL Editor, after creating your password user.
-- Replace the UUID below with that user's Authentication > Users > UID.
begin;
create table if not exists public.app_owner (
  id boolean primary key default true check (id),
  owner_id uuid not null references auth.users(id) on delete cascade
);
alter table public.app_owner enable row level security;
revoke all on public.app_owner from anon, authenticated;
insert into public.app_owner(id,owner_id)
values (true,'00000000-0000-0000-0000-000000000000')
on conflict(id) do update set owner_id=excluded.owner_id;

create or replace function public.is_app_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.app_owner where owner_id=(select auth.uid())); $$;
revoke all on function public.is_app_owner() from public;
grant execute on function public.is_app_owner() to authenticated;

create table if not exists public.workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  revision bigint not null default 1
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from anon;
grant select,insert,update,delete on public.workspaces to authenticated;
drop policy if exists owner_workspace on public.workspaces;
create policy owner_workspace on public.workspaces for all to authenticated
using ((select auth.uid())=owner_id and (select public.is_app_owner()))
with check ((select auth.uid())=owner_id and (select public.is_app_owner()));

create table if not exists public.portfolio (
  id text primary key check(id='main'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb
);
alter table public.portfolio enable row level security;
grant select on public.portfolio to anon;
grant select,insert,update,delete on public.portfolio to authenticated;
drop policy if exists public_portfolio on public.portfolio;
create policy public_portfolio on public.portfolio for select to anon,authenticated using(true);
drop policy if exists owner_portfolio on public.portfolio;
create policy owner_portfolio on public.portfolio for all to authenticated
using ((select auth.uid())=owner_id and (select public.is_app_owner()))
with check ((select auth.uid())=owner_id and (select public.is_app_owner()));
commit;
