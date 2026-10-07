-- One database snapshot; returns counts only for the authenticated owner.
create or replace function public.finance_health_check() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 with
 tx as materialized(select * from public.transactions where user_id=auth.uid()),
 salaries as materialized(select * from public.salary_records where user_id=auth.uid()),
 cars as materialized(select * from public.car_expenses where user_id=auth.uid()),
 installments as materialized(select * from public.car_installments where user_id=auth.uid()),
 rents as materialized(select * from public.rent_records where user_id=auth.uid()),
 links as (select transaction_id from salaries union all select transaction_id from cars union all select transaction_id from installments union all select transaction_id from rents)
 select jsonb_build_object(
 'duplicateGroups',(select count(*) from (select transaction_date,type,category_id,account_id,lower(regexp_replace(trim(description),'\s+',' ','g')),amount from tx where status<>'cancelled' group by 1,2,3,4,5,6 having count(*)>1) d),
 'orphanSalary',(select count(*) from salaries r where not exists(select 1 from tx t where t.id=r.transaction_id)),
 'orphanCar',(select count(*) from cars r where not exists(select 1 from tx t where t.id=r.transaction_id)),
 'orphanInstallments',(select count(*) from installments r where status='paid' and my_amount>0 and not exists(select 1 from tx t where t.id=r.transaction_id)),
 'orphanRent',(select count(*) from rents r where status='paid' and not exists(select 1 from tx t where t.id=r.transaction_id)),
 'mismatchSalary',(select count(*) from salaries r join tx t on t.id=r.transaction_id where t.type<>'income' or t.amount<>r.net_amount or t.transaction_date<>r.payment_date or t.status<>'paid' or t.source<>'salary' or t.category_id is distinct from r.category_id or t.account_id is distinct from r.account_id),
 'mismatchCar',(select count(*) from cars r join tx t on t.id=r.transaction_id where t.type<>'expense' or t.amount<>r.amount or t.transaction_date<>r.expense_date or t.status<>'paid' or t.source not in ('car_expense','import_r3_v2') or t.category_id is distinct from r.category_id or t.account_id is distinct from r.account_id),
 'mismatchInstallments',(select count(*) from installments r join tx t on t.id=r.transaction_id where t.type<>'expense' or t.source<>'car_installment' or (r.status='paid' and r.my_amount>0 and (t.amount<>r.my_amount or t.transaction_date<>r.payment_date or t.status<>'paid' or t.category_id is distinct from r.category_id or t.account_id is distinct from r.account_id)) or ((r.status<>'paid' or coalesce(r.my_amount,0)=0) and t.status<>'cancelled')),
 'mismatchRent',(select count(*) from rents r join tx t on t.id=r.transaction_id where t.type<>'expense' or t.source<>'rent' or t.amount<>r.full_amount or t.category_id is distinct from r.category_id or t.account_id is distinct from r.account_id or (r.status='paid' and (t.transaction_date<>r.payment_date or t.status<>'paid')) or (r.status='pending' and t.status<>'cancelled')),
 'brokenSourceLinks',(select count(*) from tx t where (t.source='salary' and not exists(select 1 from salaries r where r.transaction_id=t.id)) or (t.source='car_expense' and not exists(select 1 from cars r where r.transaction_id=t.id)) or (t.source='car_installment' and not exists(select 1 from installments r where r.transaction_id=t.id)) or (t.source='rent' and not exists(select 1 from rents r where r.transaction_id=t.id)))+(select count(*) from (select transaction_id from links where transaction_id is not null group by transaction_id having count(*)>1) d),
 'invalidDimensions',(select count(*) from tx t where (t.category_id is not null and not exists(select 1 from public.categories c where c.id=t.category_id and c.user_id=auth.uid() and c.type=t.type)) or (t.account_id is not null and not exists(select 1 from public.accounts a where a.id=t.account_id and a.user_id=auth.uid()))),
 'billDuplicateGroups',(select count(*) from (select source,date_trunc('month',transaction_date::timestamp) from tx where source like 'bill_payment:%' and status<>'cancelled' group by 1,2 having count(*)>1) d),
 'orphanBills',(select count(*) from tx t where t.source like 'bill_payment:%' and not exists(select 1 from public.bills b where b.id::text=substring(t.source from 14) and b.user_id=auth.uid()))
 ) into result;
 return result;
end $$;
revoke all on function public.finance_health_check() from public,anon;
grant execute on function public.finance_health_check() to authenticated;
