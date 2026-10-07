-- Additive safeguards; financial records and original amounts are preserved.
create index if not exists rent_records_account_idx on public.rent_records(account_id);
create index if not exists rent_records_category_idx on public.rent_records(category_id);
create unique index if not exists bill_payment_user_month_unique on public.transactions(user_id,source,date_trunc('month',transaction_date::timestamp)) where source like 'bill_payment:%' and status<>'cancelled';
revoke execute on function public.import_r3_safe(jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.validate_finance_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare expected_type text;
begin
 if tg_table_name='transactions' then expected_type:=new.type;else expected_type:='expense';end if;
 if new.category_id is not null and not exists(
  select 1 from public.categories where id=new.category_id and user_id=new.user_id and type=expected_type
 ) then raise exception 'หมวดต้องเป็นของบัญชีนี้และตรงกับประเภทรายการ'; end if;
 if new.account_id is not null and not exists(
  select 1 from public.accounts where id=new.account_id and user_id=new.user_id
 ) then raise exception 'บัญชีที่เลือกไม่ถูกต้อง'; end if;
 if tg_table_name='bills' then
  if new.debt_id is not null and not exists(select 1 from public.debts where id=new.debt_id and user_id=new.user_id) then raise exception 'บัตรหรือสินเชื่อต้องเป็นของบัญชีนี้'; end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.protect_finance_dimension_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or old.user_id <> auth.uid() then
    raise exception 'Unauthorized';
  end if;

  if tg_table_name='categories' then
    if exists(select 1 from public.transactions where category_id=old.id)
       or exists(select 1 from public.bills where category_id=old.id)
       or exists(select 1 from public.rent_records where category_id=old.id)
       or exists(select 1 from public.car_expenses where category_id=old.id)
       or exists(select 1 from public.salary_records where category_id=old.id)
       or exists(select 1 from public.car_installments where category_id=old.id)
       or exists(select 1 from public.budgets where user_id=old.user_id and old.name=any(category_names))
    then
      raise exception 'หมวดนี้มีประวัติใช้งานแล้ว กรุณาเก็บไว้เพื่อไม่ให้ข้อมูลย้อนหลังเสียหมวด';
    end if;
  elsif tg_table_name='accounts' then
    if exists(select 1 from public.transactions where account_id=old.id)
       or exists(select 1 from public.bills where account_id=old.id)
       or exists(select 1 from public.rent_records where account_id=old.id)
       or exists(select 1 from public.car_expenses where account_id=old.id)
       or exists(select 1 from public.salary_records where account_id=old.id)
       or exists(select 1 from public.car_installments where account_id=old.id)
    then
      raise exception 'บัญชีนี้มีประวัติใช้งานแล้ว กรุณาเก็บไว้เพื่อไม่ให้ข้อมูลย้อนหลังเสียบัญชี';
    end if;
  elsif tg_table_name='bills' then
    if exists(select 1 from public.transactions where user_id=old.user_id and source='bill_payment:'||old.id::text) then raise exception 'บิลนี้มีประวัติชำระแล้ว กรุณาปิดใช้งานแทนการลบ'; end if;
  elsif tg_table_name='debts' then
    if exists(select 1 from public.bills where debt_id=old.id) then raise exception 'บัตรนี้ผูกกับบิลอยู่ กรุณาปิดใช้งานหรือแก้บิลก่อน'; end if;
  end if;

  return old;
end $function$;


create or replace function public.guard_system_transaction() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if pg_trigger_depth()=1 then
  if tg_op<>'INSERT' and old.source like 'bill_payment:%' then raise exception 'รายการนี้มาจากบิลประจำ กรุณาจัดการผ่านระบบบิล'; end if;
  if tg_op<>'DELETE' and new.source in ('salary','car_installment','car_expense','rent') then raise exception 'กรุณาบันทึกหรือแก้ไขผ่านหน้าเฉพาะเรื่อง'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_system_transaction() from public,anon;
create trigger guard_system_transaction before insert or update or delete on public.transactions for each row execute function public.guard_system_transaction();

create or replace function public.guard_car_installment_link() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.transaction_id is not null then raise exception 'งวดใหม่ต้องสร้างรายการจ่ายผ่านหน้ารถของฉัน'; end if;
 return new;
end $$;
revoke all on function public.guard_car_installment_link() from public,anon;
create trigger guard_car_installment_link before insert on public.car_installments for each row execute function public.guard_car_installment_link();

create or replace function public.guard_used_category_type() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.type is distinct from old.type and (
  exists(select 1 from public.rent_records where category_id=old.id)
  or exists(select 1 from public.car_expenses where category_id=old.id)
  or exists(select 1 from public.car_installments where category_id=old.id)
  or exists(select 1 from public.salary_records where category_id=old.id)
 ) then raise exception 'หมวดนี้มีประวัติใช้งานแล้ว กรุณาสร้างหมวดใหม่แทนการเปลี่ยนประเภท'; end if;
 return new;
end $$;
revoke all on function public.guard_used_category_type() from public,anon;
create trigger guard_used_category_type before update on public.categories for each row execute function public.guard_used_category_type();
create trigger protect_bill_delete before delete on public.bills for each row execute function public.protect_finance_dimension_delete();
create trigger protect_debt_delete before delete on public.debts for each row execute function public.protect_finance_dimension_delete();
