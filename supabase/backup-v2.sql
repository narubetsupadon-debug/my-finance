-- Release 1.0.20: preserves the existing production backup function and all data.
create or replace function public.export_finance_backup_v2()
returns jsonb language plpgsql stable security invoker set search_path = ''
as $function$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 result := public.export_finance_backup();
 return jsonb_set(jsonb_set(result,'{version}','2'::jsonb),'{data,finance_subcategories}',
  (select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb)
   from public.finance_subcategories r where r.user_id=auth.uid()));
end;
$function$;
revoke all on function public.export_finance_backup_v2() from public, anon;
grant execute on function public.export_finance_backup_v2() to authenticated;
