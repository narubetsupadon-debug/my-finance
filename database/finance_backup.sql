-- Complete financial snapshot, without credentials, push keys or server secrets.
create or replace function public.export_finance_backup() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select jsonb_build_object('format','my-finance-backup','version',1,'owner_id',auth.uid(),'exported_at',now(),
 'data',jsonb_build_object(
 'categories',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.categories r where user_id=auth.uid()),
 'accounts',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.accounts r where user_id=auth.uid()),
 'transactions',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.transactions r where user_id=auth.uid()),
 'bills',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.bills r where user_id=auth.uid()),
 'debts',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.debts r where user_id=auth.uid()),
 'budgets',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.budgets r where user_id=auth.uid()),
 'salary_records',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.salary_records r where user_id=auth.uid()),
 'car_installments',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.car_installments r where user_id=auth.uid()),
 'car_expenses',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.car_expenses r where user_id=auth.uid()),
 'rent_records',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.rent_records r where user_id=auth.uid())
 )) into result;
 return result;
end $$;
revoke all on function public.export_finance_backup() from public,anon;
grant execute on function public.export_finance_backup() to authenticated;
