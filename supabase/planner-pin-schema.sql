-- Server-only PIN verification. Set the PIN separately; never commit it here.
begin;
create table if not exists private.planner_pin (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failures integer not null default 0 check (failures between 0 and 5),
  window_started timestamptz not null default now(),
  locked_until timestamptz
);
alter table private.planner_pin enable row level security;
revoke all on private.planner_pin from public, anon, authenticated;
grant usage on schema private, extensions to service_role;
grant select, update on private.planner_pin to service_role;
grant select on private.app_owner to service_role;
create or replace function public.verify_planner_pin(pin text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  credential private.planner_pin%rowtype;
  attempt_at timestamptz := clock_timestamp();
  owner uuid;
  retry_after integer;
begin
  select owner_id into owner from private.app_owner where id=true;
  select * into credential from private.planner_pin where owner_id=owner for update;
  attempt_at := clock_timestamp();
  if not found then return jsonb_build_object('ok',false,'configured',false); end if;
  if credential.locked_until > attempt_at then
    retry_after := ceil(extract(epoch from credential.locked_until-attempt_at))::integer;
    return jsonb_build_object('ok',false,'retry_after',retry_after);
  end if;
  if credential.window_started <= attempt_at-interval '15 minutes' or credential.locked_until is not null then
    credential.failures := 0;
    credential.window_started := attempt_at;
    credential.locked_until := null;
  end if;
  if pin ~ '^[0-9]{4}$' and extensions.crypt(pin,credential.pin_hash)=credential.pin_hash then
    update private.planner_pin set failures=0,window_started=attempt_at,locked_until=null where owner_id=owner;
    return jsonb_build_object('ok',true,'owner_id',owner);
  end if;
  credential.failures := credential.failures+1;
  if credential.failures >= 5 then credential.locked_until := attempt_at+interval '15 minutes'; end if;
  update private.planner_pin set failures=credential.failures,window_started=credential.window_started,locked_until=credential.locked_until where owner_id=owner;
  return jsonb_build_object('ok',false,'retry_after',case when credential.failures>=5 then 900 else 0 end);
end;
$$;
revoke all on function public.verify_planner_pin(text) from public, anon, authenticated;
grant execute on function public.verify_planner_pin(text) to service_role;
comment on function public.verify_planner_pin(text) is 'Server-only, serialized PIN verification; five failures lock all PIN attempts for fifteen minutes.';
commit;
