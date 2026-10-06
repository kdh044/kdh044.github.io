-- Google credentials are encrypted in Vault and accessible only to the backend.
create schema if not exists planner_private;
create table if not exists planner_private.google_connection (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  refresh_secret_id uuid references vault.secrets(id),
  email text not null,
  sync_records jsonb not null default '{}'::jsonb
);
alter table planner_private.google_connection enable row level security;
revoke all on planner_private.google_connection from public, anon, authenticated;

create or replace function public.planner_google_connection(action text, owner_id uuid, token text default null, records jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c planner_private.google_connection; secret_id uuid; client_secret text; refresh_token text;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Forbidden'; end if;
  if owner_id <> 'e63815c9-ff91-4c68-a3ec-846603083849'::uuid then raise exception 'Forbidden'; end if;
  select * into c from planner_private.google_connection g where g.owner_id = planner_google_connection.owner_id;
  if action = 'store' then
    if token is null or length(token) > 8192 then raise exception 'Invalid token'; end if;
    if c.refresh_secret_id is null then
      select vault.create_secret(token, 'planner_google_refresh_' || owner_id::text) into secret_id;
      insert into planner_private.google_connection values(owner_id, secret_id, 'danny1321@jbnu.ac.kr', '{}');
    else perform vault.update_secret(c.refresh_secret_id, token); end if;
    return jsonb_build_object('connected', true);
  elsif action = 'disconnect' then
    delete from planner_private.google_connection g where g.owner_id = planner_google_connection.owner_id;
    delete from vault.secrets where id = c.refresh_secret_id;
    return jsonb_build_object('connected', false);
  elsif action = 'records' then
    update planner_private.google_connection g set sync_records = records where g.owner_id = planner_google_connection.owner_id;
    return '{}'::jsonb;
  elsif action = 'read' then
    select decrypted_secret into client_secret from vault.decrypted_secrets where name = 'planner_google_client_secret';
    select decrypted_secret into refresh_token from vault.decrypted_secrets where id = c.refresh_secret_id;
    return jsonb_build_object('client_secret', client_secret, 'refresh_token', refresh_token, 'records', coalesce(c.sync_records, '{}'::jsonb));
  end if;
  raise exception 'Invalid action';
end $$;
revoke all on function public.planner_google_connection(text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.planner_google_connection(text, uuid, text, jsonb) to service_role;
