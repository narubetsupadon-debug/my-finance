-- Project-level capacity is restricted to the existing finance owner.
-- Private configuration contains no credentials and is not exposed by the API.
create schema if not exists private;
create table if not exists private.finance_capacity_viewers (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.finance_capacity_viewers enable row level security;
revoke all on private.finance_capacity_viewers from public, anon, authenticated;
do $$ begin
 if not exists(select 1 from private.finance_capacity_viewers) then
  if (select count(distinct user_id) from public.transactions) <> 1 then
   raise exception 'A single existing finance owner must be configured';
  end if;
  insert into private.finance_capacity_viewers(user_id) select distinct user_id from public.transactions;
 end if;
end $$;

create or replace function private.finance_capacity_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=auth.uid(); result jsonb;
begin
 if caller is null or not exists(select 1 from private.finance_capacity_viewers where user_id=caller) then
  raise exception 'capacity access denied' using errcode='42501';
 end if;
 select jsonb_build_object(
  'databaseBytes',pg_catalog.pg_database_size(pg_catalog.current_database()),
  'databaseLimitBytes',500000000,
  'appTableBytes',(select coalesce(sum(pg_catalog.pg_total_relation_size(c.oid)),0) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','m')),
  'fileBytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric else 0 end),0) from storage.objects),
  'fileLimitBytes',1000000000,
  'fileCount',(select count(*) from storage.objects),
  'unknownFileSizes',(select count(*) from storage.objects where metadata->>'size' is null or not (metadata->>'size' ~ '^[0-9]+$')),
  'transactionCount',(select count(*) from public.transactions where user_id=caller),
  'checkedAt',pg_catalog.now(), 'quotaPlan','Free'
 ) into result;
 return result;
end $$;
revoke all on function private.finance_capacity_snapshot() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.finance_capacity_snapshot() to authenticated;
create or replace function public.finance_capacity() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.finance_capacity_snapshot() $$;
revoke all on function public.finance_capacity() from public,anon;
grant execute on function public.finance_capacity() to authenticated;
