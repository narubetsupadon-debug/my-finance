create table public.car_installments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),installment_no integer not null check(installment_no>0),
 due_date date not null,scheduled_amount numeric(14,2) not null check(scheduled_amount>0),
 status text not null default 'pending' check(status in ('paid','pending')),partner_amount numeric(14,2) check(partner_amount>=0),my_amount numeric(14,2) check(my_amount>=0),payment_date date,
 transaction_id uuid unique references public.transactions(id) on delete restrict,category_id uuid references public.categories(id),account_id uuid references public.accounts(id),note text,
 updated_at timestamptz not null default now(),unique(user_id,installment_no),
 check(status<>'paid' or (my_amount is not null and partner_amount is not null and payment_date is not null))
);
alter table public.car_installments enable row level security;
revoke all on public.car_installments from anon,authenticated;
grant select,insert,update on public.car_installments to authenticated;
create policy car_read on public.car_installments for select to authenticated using((select auth.uid())=user_id);
create policy car_insert on public.car_installments for insert to authenticated with check((select auth.uid())=user_id);
create policy car_update on public.car_installments for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.sync_car_installment() returns trigger language plpgsql security invoker set search_path='' as $$
declare tid uuid;
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Unauthorized'; end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.installment_no<>old.installment_no or new.transaction_id is distinct from old.transaction_id) then raise exception 'Cannot change installment identity'; end if;
 if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=auth.uid() and type='expense') then raise exception 'Invalid expense category'; end if;
 if new.account_id is not null and not exists(select 1 from public.accounts where id=new.account_id and user_id=auth.uid()) then raise exception 'Invalid account'; end if;
 if new.status='paid' then
 if new.my_amount is null or new.partner_amount is null or new.payment_date is null then raise exception 'Payment details required'; end if;
 if new.my_amount>0 then
 if new.category_id is null then raise exception 'Expense category required'; end if;
 if new.transaction_id is null then
 insert into public.transactions(user_id,transaction_date,type,category_id,account_id,description,amount,status,source,note) values(new.user_id,new.payment_date,'expense',new.category_id,new.account_id,'ค่างวดรถ – มิว · งวดที่ '||new.installment_no,new.my_amount,'paid','car_installment',new.note) returning id into tid;new.transaction_id:=tid;
 else
 if not exists(select 1 from public.transactions where id=new.transaction_id and user_id=auth.uid() and type='expense') then raise exception 'Invalid linked expense'; end if;
 update public.transactions set transaction_date=new.payment_date,category_id=new.category_id,account_id=new.account_id,amount=new.my_amount,status='paid',source='car_installment',description='ค่างวดรถ – มิว · งวดที่ '||new.installment_no,note=new.note where id=new.transaction_id and user_id=auth.uid();
 end if;
 elsif new.transaction_id is not null then update public.transactions set status='cancelled' where id=new.transaction_id and user_id=auth.uid(); end if;
 elsif new.transaction_id is not null then update public.transactions set status='cancelled' where id=new.transaction_id and user_id=auth.uid(); end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function public.sync_car_installment() from public,anon;
create trigger sync_car before insert or update on public.car_installments for each row execute function public.sync_car_installment();
create function public.protect_car_expense() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if pg_trigger_depth()=1 and exists(select 1 from public.car_installments where transaction_id=old.id) then raise exception 'กรุณาแก้ไขรายการนี้ผ่านหน้าผ่อนรถ'; end if;return new;
end $$;
revoke all on function public.protect_car_expense() from public,anon;
create trigger protect_car_expense before update on public.transactions for each row execute function public.protect_car_expense();
