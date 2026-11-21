-- Apply before enabling installment entry. Existing payment rows keep a NULL starting balance.
begin;
alter table public.transactions add column if not exists bill_prior_paid numeric;
create unique index if not exists bill_payment_stage_unique on public.transactions
 (user_id,source,date_trunc('month',transaction_date::timestamp),coalesce(bill_prior_paid,0))
 where source like 'bill_payment:%' and status<>'cancelled';
drop index if exists public.bill_payment_user_month_unique;

create or replace function public.pay_bill_installment(
 p_bill_id uuid, p_paid_date date, p_amount numeric, p_expected_paid numeric, p_request_id uuid
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 owner_id uuid := auth.uid();
 bill public.bills%rowtype;
 linked_source text := 'bill_payment:' || p_bill_id::text;
 existing public.transactions%rowtype;
 total_paid numeric;
 has_unconfirmed boolean;
begin
 if owner_id is null or p_request_id is null or p_paid_date is null then
  raise exception 'ต้องระบุผู้ใช้ วันที่ และเลขอ้างอิง';
 end if;
 select * into strict bill from public.bills where user_id=owner_id and id=p_bill_id and is_active for update;
 select * into existing from public.transactions where user_id=owner_id and id=p_request_id;
 if found then
  if existing.source=linked_source and existing.transaction_date=p_paid_date and existing.status='paid'
    and existing.amount=p_amount and existing.bill_prior_paid=p_expected_paid then return existing.id; end if;
  raise exception 'เลขอ้างอิงนี้ถูกใช้แล้ว';
 end if;
 if p_paid_date<>(now() at time zone 'Asia/Bangkok')::date then raise exception 'วันที่เปลี่ยนแล้ว กรุณาเปิดบิลใหม่'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_expected_paid is null then
  raise exception 'จำนวนเงินไม่ถูกต้อง';
 end if;
 select coalesce(sum(amount),0),coalesce(bool_or(status is distinct from 'paid' or type<>'expense' or transaction_date>p_paid_date),false)
 into total_paid,has_unconfirmed from public.transactions
 where user_id=owner_id and source=linked_source and status<>'cancelled'
 and date_trunc('month',transaction_date::timestamp)=date_trunc('month',p_paid_date::timestamp);
 if has_unconfirmed or total_paid<>p_expected_paid then raise exception 'ยอดบิลเปลี่ยนแล้ว กรุณาตรวจรายการล่าสุด'; end if;
 if bill.amount is null or p_amount>bill.amount-total_paid then raise exception 'ชำระเกินยอดคงเหลือ'; end if;
 if bill.debt_id is not null then
  update public.debts set outstanding_amount=outstanding_amount+p_amount,updated_at=now()
   where id=bill.debt_id and user_id=owner_id and is_active;
  if not found then raise exception 'ไม่พบบัตรของบิลนี้'; end if;
 end if;
 insert into public.transactions(id,user_id,transaction_date,type,category_id,account_id,description,
  amount,payment_method,status,source,bill_prior_paid)
 values(p_request_id,owner_id,p_paid_date,'expense',bill.category_id,
  case when bill.debt_id is null then bill.account_id end,bill.name,p_amount,
  case when bill.debt_id is not null then 'credit_card' end,'paid',linked_source,total_paid);
 return p_request_id;
end $$;
revoke all on function public.pay_bill_installment(uuid,date,numeric,numeric,uuid) from public,anon;
grant execute on function public.pay_bill_installment(uuid,date,numeric,numeric,uuid) to authenticated;
commit;
