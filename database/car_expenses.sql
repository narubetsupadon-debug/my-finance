-- Car expenses source schema.
-- Mirrors the production table, RLS model, indexes, and transaction-sync trigger.
-- Intended for rebuilding a clean environment; production data is not modified by this file.

create table if not exists public.car_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null,
  expense_type text not null check (expense_type in ('fuel','repair','maintenance','insurance','act','tax','wash','parking','toll','installment','other')),
  amount numeric(14,2) not null check (amount > 0),
  odometer_km numeric(12,1) check (odometer_km is null or odometer_km >= 0),
  liters numeric(10,3) check (liters is null or liters > 0),
  vendor text,
  account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  note text,
  transaction_id uuid unique references public.transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists car_expenses_user_date_idx on public.car_expenses(user_id, expense_date desc);
create index if not exists car_expenses_account_idx on public.car_expenses(account_id);
create index if not exists car_expenses_category_idx on public.car_expenses(category_id);

alter table public.car_expenses enable row level security;

grant select,insert,update,delete on public.car_expenses to authenticated;

drop policy if exists "car expenses select own" on public.car_expenses;
create policy "car expenses select own" on public.car_expenses
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "car expenses insert own" on public.car_expenses;
create policy "car expenses insert own" on public.car_expenses
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "car expenses update own" on public.car_expenses;
create policy "car expenses update own" on public.car_expenses
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "car expenses delete own" on public.car_expenses;
create policy "car expenses delete own" on public.car_expenses
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_car_expense_transaction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  tx_id uuid;
  type_label text;
  tx_desc text;
begin
  if tg_op <> 'DELETE' then
    if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Unauthorized'; end if;
    if new.account_id is not null and not exists(
      select 1 from public.accounts where id=new.account_id and user_id=new.user_id
    ) then raise exception 'บัญชีที่เลือกไม่ถูกต้อง'; end if;
    if new.category_id is null or not exists(
      select 1 from public.categories where id=new.category_id and user_id=new.user_id and type='expense'
    ) then raise exception 'กรุณาเลือกหมวดรายจ่ายที่ถูกต้อง'; end if;

    type_label:=case new.expense_type
      when 'fuel' then 'น้ำมัน'
      when 'repair' then 'ซ่อม/อะไหล่'
      when 'maintenance' then 'เช็กระยะ'
      when 'insurance' then 'ประกันรถ'
      when 'act' then 'พ.ร.บ.'
      when 'tax' then 'ภาษีรถ'
      when 'wash' then 'ล้างรถ'
      when 'parking' then 'ที่จอดรถ'
      when 'toll' then 'ทางด่วน'
      when 'installment' then 'ค่างวดรถ'
      else 'ค่าใช้จ่ายรถอื่น ๆ'
    end;
    tx_desc:=type_label || case when coalesce(trim(new.vendor),'')<>'' then ' · '||trim(new.vendor) else '' end;
  end if;

  if tg_op='INSERT' then
    insert into public.transactions(
      user_id,transaction_date,type,category_id,account_id,description,amount,status,note,source
    ) values(
      new.user_id,new.expense_date,'expense',new.category_id,new.account_id,tx_desc,new.amount,'paid',
      concat_ws(' · ',nullif(trim(new.note),''),case when new.odometer_km is not null then 'เลขไมล์ '||new.odometer_km||' km' end,case when new.liters is not null then 'น้ำมัน '||new.liters||' L' end),
      'car_expense'
    ) returning id into tx_id;
    new.transaction_id:=tx_id;
    new.updated_at:=now();
    return new;
  elsif tg_op='UPDATE' then
    if new.transaction_id is null then raise exception 'รายการรถไม่มี Transaction ที่เชื่อมอยู่'; end if;
    update public.transactions set
      transaction_date=new.expense_date,
      category_id=new.category_id,
      account_id=new.account_id,
      description=tx_desc,
      amount=new.amount,
      status='paid',
      note=concat_ws(' · ',nullif(trim(new.note),''),case when new.odometer_km is not null then 'เลขไมล์ '||new.odometer_km||' km' end,case when new.liters is not null then 'น้ำมัน '||new.liters||' L' end),
      source='car_expense'
    where id=new.transaction_id and user_id=new.user_id;
    if not found then raise exception 'ไม่พบ Transaction ที่เชื่อมกับค่าใช้จ่ายรถ'; end if;
    new.updated_at:=now();
    return new;
  else
    if auth.uid() is null or old.user_id <> auth.uid() then raise exception 'Unauthorized'; end if;
    if old.transaction_id is not null then
      delete from public.transactions where id=old.transaction_id and user_id=old.user_id;
    end if;
    return old;
  end if;
end
$function$;

revoke all on function public.sync_car_expense_transaction() from public, anon;

drop trigger if exists sync_car_expense_transaction on public.car_expenses;
create trigger sync_car_expense_transaction
before insert or update or delete on public.car_expenses
for each row execute function public.sync_car_expense_transaction();
