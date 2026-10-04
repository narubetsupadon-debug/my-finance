-- My Finance Web Push infrastructure.
-- VAPID keys and cron secret are generated/stored in Supabase Vault; never commit them here.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

drop policy if exists "push subscriptions select own" on public.push_subscriptions;
create policy "push subscriptions select own" on public.push_subscriptions
 for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "push subscriptions insert own" on public.push_subscriptions;
create policy "push subscriptions insert own" on public.push_subscriptions
 for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "push subscriptions update own" on public.push_subscriptions;
create policy "push subscriptions update own" on public.push_subscriptions
 for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "push subscriptions delete own" on public.push_subscriptions;
create policy "push subscriptions delete own" on public.push_subscriptions
 for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.push_subscriptions to authenticated;

create table if not exists private.push_notification_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  sent_at timestamptz not null default now(),
  unique(user_id,notification_key)
);

create or replace function public.get_push_server_config() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object(
  'vapid_private',(select decrypted_secret from vault.decrypted_secrets where name='myfinance_vapid_private' limit 1),
  'vapid_public',(select decrypted_secret from vault.decrypted_secrets where name='myfinance_vapid_public' limit 1),
  'cron_secret',(select decrypted_secret from vault.decrypted_secrets where name='myfinance_push_cron_secret' limit 1)
 );
$$;
revoke all on function public.get_push_server_config() from public,anon,authenticated;
grant execute on function public.get_push_server_config() to service_role;

create or replace function public.store_push_server_config(p_vapid_private text,p_vapid_public text,p_cron_secret text)
returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 select id into v_id from vault.secrets where name='myfinance_vapid_private';
 if v_id is null then perform vault.create_secret(p_vapid_private,'myfinance_vapid_private','Web Push VAPID private key');
 else perform vault.update_secret(v_id,p_vapid_private,'myfinance_vapid_private','Web Push VAPID private key'); end if;
 select id into v_id from vault.secrets where name='myfinance_vapid_public';
 if v_id is null then perform vault.create_secret(p_vapid_public,'myfinance_vapid_public','Web Push VAPID public key');
 else perform vault.update_secret(v_id,p_vapid_public,'myfinance_vapid_public','Web Push VAPID public key'); end if;
 select id into v_id from vault.secrets where name='myfinance_push_cron_secret';
 if v_id is null then perform vault.create_secret(p_cron_secret,'myfinance_push_cron_secret','Push reminder cron authentication');
 else perform vault.update_secret(v_id,p_cron_secret,'myfinance_push_cron_secret','Push reminder cron authentication'); end if;
end $$;
revoke all on function public.store_push_server_config(text,text,text) from public,anon,authenticated;
grant execute on function public.store_push_server_config(text,text,text) to service_role;

create or replace function public.claim_push_notification(p_user_id uuid,p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare inserted_count integer;
begin
 insert into private.push_notification_log(user_id,notification_key) values(p_user_id,p_key)
 on conflict(user_id,notification_key) do nothing;
 get diagnostics inserted_count=row_count;
 return inserted_count=1;
end $$;
revoke all on function public.claim_push_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_push_notification(uuid,text) to service_role;

create or replace function public.release_push_notification(p_user_id uuid,p_key text) returns void
language sql security definer set search_path='' as $$
 delete from private.push_notification_log where user_id=p_user_id and notification_key=p_key;
$$;
revoke all on function public.release_push_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.release_push_notification(uuid,text) to service_role;

-- After the Edge Function has created myfinance_push_cron_secret in Vault,
-- schedule 08:00 Asia/Bangkok (= 01:00 UTC):
-- select cron.schedule('my-finance-push-reminders-0800-bkk','0 1 * * *',$$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-reminders',
--     headers := jsonb_build_object(
--       'Content-Type','application/json',
--       'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='myfinance_push_cron_secret' limit 1)
--     ),
--     body := '{"action":"run"}'::jsonb
--   );
-- $$);
