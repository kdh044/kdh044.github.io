-- Run once in Supabase SQL Editor. No planner data is shipped to GitHub.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_owner (
  id boolean primary key default true check (id),
  owner_id uuid not null unique references auth.users(id) on delete cascade
);
create table if not exists public.private_workspace (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.public_profile (
  id boolean primary key default true check (id),
  data jsonb not null default '{}'::jsonb
);
alter table public.app_owner enable row level security;
alter table public.private_workspace enable row level security;
alter table public.public_profile enable row level security;
revoke all on public.app_owner,public.private_workspace,public.public_profile from anon,authenticated;
grant select on public.app_owner to authenticated;
grant select,insert,update,delete on public.private_workspace to authenticated;
grant select on public.public_profile to anon,authenticated;
grant insert,update,delete on public.public_profile to authenticated;
create policy owner_self on public.app_owner for select to authenticated
using (owner_id = (select auth.uid()));
create policy workspace_owner on public.private_workspace for all to authenticated
using (owner_id = (select auth.uid()) and exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())))
with check (owner_id = (select auth.uid()) and exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())));
create policy profile_read on public.public_profile for select to anon,authenticated using (true);
create policy profile_insert on public.public_profile for insert to authenticated
with check (exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())));
create policy profile_update on public.public_profile for update to authenticated
using (exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())))
with check (exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())));
create policy profile_delete on public.public_profile for delete to authenticated
using (exists(select 1 from public.app_owner o where o.owner_id=(select auth.uid())));

-- PIN verifier exists only on the server. Five failures lock it until reset in SQL Editor.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table if not exists private.pin_guard (
  id boolean primary key default true check(id),
  pin_hash text not null,
  failures integer not null default 0,
  locked boolean not null default false
);
revoke all on private.pin_guard from public,anon,authenticated;

create or replace function public.set_private_pin(new_pin text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if length(new_pin)<4 or length(new_pin)>128 then raise exception 'PIN length invalid'; end if;
  insert into private.pin_guard(id,pin_hash,failures,locked)
  values(true,extensions.crypt(new_pin,extensions.gen_salt('bf',12)),0,false)
  on conflict(id) do update set pin_hash=excluded.pin_hash,failures=0,locked=false;
end; $$;
revoke all on function public.set_private_pin(text) from public,anon,authenticated;
grant execute on function public.set_private_pin(text) to service_role;

create or replace function public.check_private_pin(candidate text)
returns text language plpgsql security definer set search_path='' as $$
declare guard private.pin_guard%rowtype;
begin
  select * into guard from private.pin_guard where id=true for update;
  if not found then return 'unconfigured'; end if;
  if guard.locked then return 'locked'; end if;
  if length(candidate)>128 or extensions.crypt(candidate,guard.pin_hash)<>guard.pin_hash then
    update private.pin_guard set failures=failures+1,locked=(failures+1>=5) where id=true;
    return case when guard.failures+1>=5 then 'locked' else 'invalid' end;
  end if;
  update private.pin_guard set failures=0 where id=true;
  return 'ok';
end; $$;
revoke all on function public.check_private_pin(text) from public,anon,authenticated;
grant execute on function public.check_private_pin(text) to service_role;

-- After making your Supabase Auth user, register its UUID using the setup guide.
-- Then set the private PIN through the SQL Editor. Neither value belongs in config.js.
