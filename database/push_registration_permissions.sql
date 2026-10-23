-- Repair the missing table grants used by the user-JWT Edge Function client.
-- Keep RLS enabled and the existing owner-only USING/WITH CHECK policies.
begin;
do $$
begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='push_subscriptions' and c.relrowsecurity) then
  raise exception 'Owner RLS must be enabled before granting registration writes';
 end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname in ('push subscriptions select own','push subscriptions insert own','push subscriptions update own','push subscriptions delete own'))<>4 then
  raise exception 'Expected owner-only push registration policies';
 end if;
end $$;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
commit;
