-- Rent bills track the service month separately from the real payment date.
create table public.rent_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 bill_month date not null check (extract(day from bill_month)=1),
 payment_date date,
 full_amount numeric(14,2) not null check(full_amount>0),
 my_amount numeric(14,2) not null check(my_amount>=0 and my_amount<=full_amount),
 status text not null default 'paid' check(status in ('paid','pending')),
 category_id uuid not null references public.categories(id),
 account_id uuid references public.accounts(id),
 transaction_id uuid unique references public.transactions(id) on delete restrict,
 note text check(length(note)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,bill_month), check(status<>'paid' or payment_date is not null)
);
alter table public.rent_records enable row level security;
revoke all on public.rent_records from public,anon,authenticated;
grant select,insert,update on public.rent_records to authenticated;
create policy rent_read on public.rent_records for select to authenticated using((select auth.uid())=user_id);
create policy rent_insert on public.rent_records for insert to authenticated with check((select auth.uid())=user_id);
create policy rent_update on public.rent_records for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.sync_rent_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare linked public.transactions; tx uuid;
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Unauthorized'; end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or (old.transaction_id is not null and new.transaction_id is distinct from old.transaction_id)) then raise exception 'Cannot change linked payment'; end if;
 if not exists(select 1 from public.categories where id=new.category_id and user_id=auth.uid() and type='expense' and name in ('ห้องเช่า','ค่าห้องเช่า','ค่าเช่า','ค่าห้อง','ที่พัก','บ้าน')) then raise exception 'กรุณาเลือกหมวดค่าห้องเช่า'; end if;
 if new.account_id is not null and not exists(select 1 from public.accounts where id=new.account_id and user_id=auth.uid()) then raise exception 'Invalid account'; end if;
 if new.status='paid' and new.transaction_id is null then
  if exists(select 1 from public.transactions where user_id=new.user_id and type='expense' and status='paid' and category_id=new.category_id and transaction_date=new.payment_date and amount=new.full_amount) then raise exception 'มีรายจ่ายยอดนี้ในวันที่เดียวกันแล้ว กรุณาเลือกเชื่อมรายการเดิม'; end if;
  insert into public.transactions(user_id,transaction_date,type,category_id,account_id,description,amount,status,source,note)
  values(new.user_id,new.payment_date,'expense',new.category_id,new.account_id,'ค่าห้องเช่า '||to_char(new.bill_month,'YYYY-MM'),new.full_amount,'paid','rent',new.note) returning id into tx;
  new.transaction_id:=tx;
 elsif new.transaction_id is not null then
  select * into linked from public.transactions where id=new.transaction_id and user_id=auth.uid() for update;
  if not found or linked.type<>'expense' then raise exception 'Invalid payment'; end if;
  if tg_op='INSERT' or old.transaction_id is null then
   if new.status<>'paid' or linked.status<>'paid' or linked.source not in ('web','app') or linked.amount<>new.full_amount or linked.transaction_date<>new.payment_date or linked.category_id<>new.category_id or linked.account_id is distinct from new.account_id then raise exception 'เลือกยอดจ่ายเต็ม วันจ่าย บัญชี และหมวดให้ตรงกับรายการเดิม'; end if;
   if exists(select 1 from public.rent_records where transaction_id=new.transaction_id) or exists(select 1 from public.car_expenses where transaction_id=new.transaction_id) or exists(select 1 from public.car_installments where transaction_id=new.transaction_id) then raise exception 'Payment already linked'; end if;
  end if;
  update public.transactions set transaction_date=case when new.status='paid' then new.payment_date else transaction_date end,category_id=new.category_id,account_id=new.account_id,description='ค่าห้องเช่า '||to_char(new.bill_month,'YYYY-MM'),amount=new.full_amount,status=case when new.status='paid' then 'paid' else 'cancelled' end,source='rent',note=new.note where id=new.transaction_id and user_id=auth.uid();
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function public.sync_rent_record() from public,anon;
create trigger sync_rent before insert or update on public.rent_records for each row execute function public.sync_rent_record();
create function public.protect_rent_payment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if pg_trigger_depth()=1 and exists(select 1 from public.rent_records where transaction_id=old.id) then raise exception 'กรุณาแก้ไขรายการนี้ผ่านหน้าค่าห้องเช่า'; end if;
 return new;
end $$;
revoke all on function public.protect_rent_payment() from public,anon;
create trigger protect_rent_payment before update on public.transactions for each row execute function public.protect_rent_payment();
