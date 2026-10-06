-- Recurring bill payment support, including credit-card charges.
alter table public.bills
  add column if not exists debt_id uuid null references public.debts(id) on delete set null;

create index if not exists bills_debt_id_idx on public.bills(debt_id);

create or replace function public.pay_recurring_bill(
  p_bill_id uuid,
  p_paid_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_bill public.bills%rowtype;
  v_tx_id uuid;
  v_source text;
  v_debt_name text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_bill
  from public.bills
  where id=p_bill_id and user_id=v_uid and is_active=true
  for update;

  if not found then raise exception 'bill not found'; end if;
  if coalesce(v_bill.amount,0)<=0 then raise exception 'bill amount must be greater than zero'; end if;

  v_source := 'bill_payment:' || v_bill.id::text;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||v_bill.id::text||':'||to_char(p_paid_date,'YYYY-MM'),0));

  select id into v_tx_id
  from public.transactions
  where user_id=v_uid
    and source=v_source
    and status<>'cancelled'
    and date_trunc('month',transaction_date::timestamp)=date_trunc('month',p_paid_date::timestamp)
  limit 1;

  if v_tx_id is not null then return v_tx_id; end if;

  if v_bill.debt_id is not null then
    select name into v_debt_name
    from public.debts
    where id=v_bill.debt_id and user_id=v_uid and is_active=true
    for update;
    if not found then raise exception 'credit card or debt not found'; end if;

    update public.debts
    set outstanding_amount=outstanding_amount+v_bill.amount, updated_at=now()
    where id=v_bill.debt_id and user_id=v_uid;
  end if;

  insert into public.transactions(
    user_id,transaction_date,type,category_id,account_id,description,amount,payment_method,status,note,source
  ) values(
    v_uid,p_paid_date,'expense',v_bill.category_id,
    case when v_bill.debt_id is null then v_bill.account_id else null end,
    v_bill.name,v_bill.amount,
    case when v_bill.debt_id is not null then 'credit_card' else null end,
    'paid',
    case when v_bill.debt_id is not null then 'ตัดผ่านบัตร '||coalesce(v_debt_name,'') else 'ชำระจากบิลประจำ' end,
    v_source
  ) returning id into v_tx_id;

  return v_tx_id;
end;
$$;

revoke execute on function public.pay_recurring_bill(uuid,date) from public;
revoke execute on function public.pay_recurring_bill(uuid,date) from anon;
grant execute on function public.pay_recurring_bill(uuid,date) to authenticated;
