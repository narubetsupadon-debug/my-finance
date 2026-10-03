create table public.salary_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 salary_month date not null check(extract(day from salary_month)=1), payment_date date not null,
 base_salary numeric(14,2) not null default 0 check(base_salary>=0), overtime numeric(14,2) not null default 0 check(overtime>=0),
 allowance numeric(14,2) not null default 0 check(allowance>=0), bonus numeric(14,2) not null default 0 check(bonus>=0), other_income numeric(14,2) not null default 0 check(other_income>=0),
 social_security numeric(14,2) not null default 0 check(social_security>=0), tax numeric(14,2) not null default 0 check(tax>=0), provident_fund numeric(14,2) not null default 0 check(provident_fund>=0), other_deductions numeric(14,2) not null default 0 check(other_deductions>=0),
 net_amount numeric(14,2) generated always as (base_salary+overtime+allowance+bonus+other_income-social_security-tax-provident_fund-other_deductions) stored,
 category_id uuid not null references public.categories(id), account_id uuid not null references public.accounts(id),
 transaction_id uuid not null unique references public.transactions(id) on delete restrict,
 note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,salary_month), check(base_salary+overtime+allowance+bonus+other_income-social_security-tax-provident_fund-other_deductions>0)
);
alter table public.salary_records enable row level security;
revoke all on public.salary_records from anon, authenticated;
grant select,insert,update on public.salary_records to authenticated;
create policy salary_read on public.salary_records for select to authenticated using ((select auth.uid())=user_id);
create policy salary_insert on public.salary_records for insert to authenticated with check ((select auth.uid())=user_id);
create policy salary_update on public.salary_records for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function public.sync_salary_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare net numeric; tx uuid;
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Unauthorized'; end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.transaction_id<>old.transaction_id) then raise exception 'Cannot change linked transaction'; end if;
 if not exists(select 1 from public.categories where id=new.category_id and user_id=auth.uid() and type='income') then raise exception 'Invalid income category'; end if;
 if not exists(select 1 from public.accounts where id=new.account_id and user_id=auth.uid()) then raise exception 'Invalid account'; end if;
 net:=new.base_salary+new.overtime+new.allowance+new.bonus+new.other_income-new.social_security-new.tax-new.provident_fund-new.other_deductions;
 if net<=0 then raise exception 'Net salary must be positive'; end if;
 if new.transaction_id is null then
 insert into public.transactions(user_id,transaction_date,type,category_id,account_id,description,amount,status,source,note)
 values(new.user_id,new.payment_date,'income',new.category_id,new.account_id,'เงินเดือน '||to_char(new.salary_month,'YYYY-MM'),net,'paid','salary',new.note) returning id into tx;
 new.transaction_id:=tx;
 else
 if not exists(select 1 from public.transactions where id=new.transaction_id and user_id=auth.uid() and type='income' and status<>'cancelled') then raise exception 'Invalid existing income'; end if;
 if tg_op='INSERT' and exists(select 1 from public.salary_records where transaction_id=new.transaction_id) then raise exception 'Income already linked'; end if;
 update public.transactions set transaction_date=new.payment_date,category_id=new.category_id,account_id=new.account_id,description='เงินเดือน '||to_char(new.salary_month,'YYYY-MM'),amount=net,status='paid',source='salary',note=new.note where id=new.transaction_id and user_id=auth.uid();
 end if;
 new.updated_at:=now(); return new;
end $$;
revoke all on function public.sync_salary_record() from public,anon;
create trigger sync_salary before insert or update on public.salary_records for each row execute function public.sync_salary_record();
create function public.protect_salary_income() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if pg_trigger_depth()=1 and exists(select 1 from public.salary_records where transaction_id=old.id) then raise exception 'กรุณาแก้ไขรายการนี้ผ่านหน้าเงินเดือน'; end if;
 return new;
end $$;
revoke all on function public.protect_salary_income() from public,anon;
create trigger protect_salary_income before update on public.transactions for each row execute function public.protect_salary_income();
