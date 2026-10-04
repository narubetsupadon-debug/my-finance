-- Apply after salary_records.sql and car_installments.sql.
-- All functions run with the caller's RLS permissions.
create or replace function public.validate_finance_links() returns trigger
language plpgsql security invoker set search_path='' as $$
declare expected_type text;
begin
 if tg_table_name='transactions' then expected_type:=new.type;else expected_type:='expense';end if;
 if new.category_id is not null and not exists(
  select 1 from public.categories where id=new.category_id and user_id=new.user_id and type=expected_type
 ) then raise exception 'หมวดต้องเป็นของบัญชีนี้และตรงกับประเภทรายการ'; end if;
 if new.account_id is not null and not exists(
  select 1 from public.accounts where id=new.account_id and user_id=new.user_id
 ) then raise exception 'บัญชีที่เลือกไม่ถูกต้อง'; end if;
 return new;
end $$;
revoke all on function public.validate_finance_links() from public,anon;
create trigger validate_finance_links before insert or update on public.transactions
 for each row execute function public.validate_finance_links();
create trigger validate_finance_links before insert or update on public.bills
 for each row execute function public.validate_finance_links();

create or replace function public.sync_budget_category_name() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.type<>old.type and (
  exists(select 1 from public.transactions where category_id=old.id)
  or exists(select 1 from public.bills where category_id=old.id)
  or exists(select 1 from public.budgets where user_id=old.user_id and old.name=any(category_names))
 ) then raise exception 'หมวดนี้มีรายการหรืองบผูกอยู่แล้ว กรุณาสร้างหมวดใหม่แทนการเปลี่ยนประเภท'; end if;
 if new.name<>old.name and old.type='expense' then
  update public.budgets set category_names=array_replace(category_names,old.name,new.name)
  where user_id=old.user_id and old.name=any(category_names);
 end if;
 return new;
end $$;
revoke all on function public.sync_budget_category_name() from public,anon;
create trigger sync_budget_category_name before update on public.categories
 for each row execute function public.sync_budget_category_name();

-- Additive import: never deletes or overwrites existing financial records.
-- A matching date/type/description/note is treated conservatively as existing.
create or replace function public.import_r3_safe(payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); item jsonb; kind text; added integer:=0; skipped integer:=0;
        d date; cat uuid; n integer; amt numeric;
begin
 if uid is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid import'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,3104));
 foreach kind in array array['transactions','accounts','bills','debts'] loop
  if jsonb_typeof(payload->kind) is distinct from 'array' then raise exception 'Invalid import section'; end if;
  if jsonb_array_length(payload->kind)>10000 then raise exception 'นำเข้าได้ไม่เกิน 10,000 แถวต่อหมวด'; end if;
  for item in select value from jsonb_array_elements(payload->kind) loop
   if kind='transactions' then
    d:=(item->>'transaction_date')::date; cat:=nullif(item->>'category_id','')::uuid;
    amt:=(item->>'amount')::numeric;
    if d is null or amt is null or amt<=0 or amt::text in ('NaN','Infinity','-Infinity')
      or coalesce(trim(item->>'description'),'')='' or (item->>'type') is null
      or (item->>'type') not in ('income','expense') then raise exception 'รายการนำเข้าไม่ครบถ้วน'; end if;
    if cat is not null and not exists(select 1 from public.categories where id=cat and user_id=uid and type=item->>'type')
     then raise exception 'หมวดนำเข้าไม่ถูกต้อง'; end if;
    -- Dedicated car/salary pages own their linked transactions, even after edits.
    n:=substring(coalesce(item->>'note','') from 'ค่างวดรถงวดที่ ([0-9]+)')::integer;
    if (n is not null and exists(select 1 from public.car_installments where user_id=uid and installment_no=n))
     or ((item->>'type')='income' and (item->>'description')='เงินเดือนและรายได้' and exists(
      select 1 from public.salary_records where user_id=uid and (payment_date=d or salary_month=date_trunc('month',d)::date)))
     or exists(select 1 from public.transactions t where t.user_id=uid and (
      (t.transaction_date=d and t.type=item->>'type' and t.description=item->>'description' and coalesce(t.note,'')=coalesce(item->>'note',''))
      or (coalesce(item->>'note','') like 'นำเข้าจาก r3%งวดที่ %' and t.note=item->>'note' and t.type=item->>'type')
     )) then skipped:=skipped+1;continue;end if;
    insert into public.transactions(user_id,transaction_date,type,category_id,description,amount,status,note,source)
    values(uid,d,item->>'type',cat,item->>'description',amt,'paid',item->>'note','import_r3_v2');
   elsif kind='accounts' then
    if coalesce(trim(item->>'name'),'')='' then raise exception 'ชื่อบัญชีว่าง';end if;
    if exists(select 1 from public.accounts where user_id=uid and name=item->>'name') then skipped:=skipped+1;continue;end if;
    insert into public.accounts(user_id,name,account_type,opening_balance,is_active,note)
    values(uid,item->>'name','bank',0,true,'นำเข้าจาก r3');
   elsif kind='bills' then
    if coalesce(trim(item->>'name'),'')='' then raise exception 'ชื่อบิลว่าง';end if;
    if exists(select 1 from public.bills where user_id=uid and name=item->>'name') then skipped:=skipped+1;continue;end if;
    insert into public.bills(user_id,name,category_id,amount,due_day,frequency,is_active,note)
    values(uid,item->>'name',nullif(item->>'category_id','')::uuid,(item->>'amount')::numeric,nullif(item->>'due_day','')::integer,'monthly',true,item->>'note');
   else
    if coalesce(trim(item->>'name'),'')='' then raise exception 'ชื่อบัตรหรือสินเชื่อว่าง';end if;
    if exists(select 1 from public.debts where user_id=uid and name=item->>'name') then skipped:=skipped+1;continue;end if;
    insert into public.debts(user_id,name,debt_type,original_amount,outstanding_amount,installment_amount,due_day,is_active,note)
    values(uid,item->>'name',item->>'debt_type',(item->>'original_amount')::numeric,(item->>'outstanding_amount')::numeric,0,nullif(item->>'due_day','')::integer,true,'นำเข้าจาก r3');
   end if;
   added:=added+1;
  end loop;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;
revoke all on function public.import_r3_safe(jsonb) from public,anon;
grant execute on function public.import_r3_safe(jsonb) to authenticated;


-- Preserve historical meaning: categories/accounts that have been used cannot be deleted.
create or replace function public.protect_finance_dimension_delete() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or old.user_id<>auth.uid() then raise exception 'Unauthorized'; end if;
 if tg_table_name='categories' then
  if exists(select 1 from public.transactions where category_id=old.id)
   or exists(select 1 from public.bills where category_id=old.id)
   or exists(select 1 from public.salary_records where category_id=old.id)
   or exists(select 1 from public.car_installments where category_id=old.id)
   or exists(select 1 from public.budgets where user_id=old.user_id and old.name=any(category_names))
  then raise exception 'หมวดนี้มีประวัติใช้งานแล้ว กรุณาเก็บไว้เพื่อไม่ให้ข้อมูลย้อนหลังเสียหมวด'; end if;
 elsif tg_table_name='accounts' then
  if exists(select 1 from public.transactions where account_id=old.id)
   or exists(select 1 from public.bills where account_id=old.id)
   or exists(select 1 from public.salary_records where account_id=old.id)
   or exists(select 1 from public.car_installments where account_id=old.id)
  then raise exception 'บัญชีนี้มีประวัติใช้งานแล้ว กรุณาเก็บไว้เพื่อไม่ให้ข้อมูลย้อนหลังเสียบัญชี'; end if;
 end if;
 return old;
end $$;
revoke all on function public.protect_finance_dimension_delete() from public,anon;
drop trigger if exists protect_category_delete on public.categories;
create trigger protect_category_delete before delete on public.categories
 for each row execute function public.protect_finance_dimension_delete();
drop trigger if exists protect_account_delete on public.accounts;
create trigger protect_account_delete before delete on public.accounts
 for each row execute function public.protect_finance_dimension_delete();
