-- Verification only. Success intentionally raises AUDIT_PASS_ROLLBACK to roll back all fixture rows.
-- Requires a database admin connection; no existing financial rows are modified.
DO $audit$
DECLARE uid uuid; cat uuid; inc uuid; acct uuid; expense uuid; tx uuid; sal uuid; saltx uuid; rejected boolean;
BEGIN
 SELECT user_id INTO uid FROM public.car_expenses LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'No fixture owner'; END IF;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 INSERT INTO public.categories(user_id,name,type,icon) VALUES(uid,'__rollback_audit_'||gen_random_uuid(),'expense','test') RETURNING id INTO cat;
 INSERT INTO public.categories(user_id,name,type,icon) VALUES(uid,'__rollback_audit_'||gen_random_uuid(),'income','test') RETURNING id INTO inc;
 INSERT INTO public.accounts(user_id,name,account_type,opening_balance) VALUES(uid,'__rollback_audit_'||gen_random_uuid(),'bank',0) RETURNING id INTO acct;
 INSERT INTO public.car_expenses(user_id,expense_date,expense_type,amount,category_id) VALUES(uid,current_date,'other',1,cat) RETURNING id,transaction_id INTO expense,tx;
 UPDATE public.car_expenses SET amount=2 WHERE id=expense;
 IF (SELECT amount FROM public.transactions WHERE id=tx)<>2 THEN RAISE EXCEPTION 'Car update did not sync'; END IF;
 rejected:=false;
 BEGIN UPDATE public.transactions SET amount=3 WHERE id=tx; EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Direct linked transaction update was allowed'; END IF;
 rejected:=false;
 BEGIN UPDATE public.car_expenses SET transaction_id=null WHERE id=expense; EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Car relink was allowed'; END IF;
 DELETE FROM public.car_expenses WHERE id=expense;
 IF EXISTS(SELECT 1 FROM public.transactions WHERE id=tx) THEN RAISE EXCEPTION 'Car delete left transaction behind'; END IF;
 INSERT INTO public.salary_records(user_id,salary_month,payment_date,account_id,category_id,base_salary) VALUES(uid,'1800-01-01',current_date,acct,inc,1) RETURNING id,transaction_id INTO sal,saltx;
 rejected:=false;
 BEGIN UPDATE public.salary_records SET transaction_id=null WHERE id=sal; EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Salary null relink was allowed'; END IF;
 UPDATE public.salary_records SET base_salary=2 WHERE id=sal;
 IF (SELECT amount FROM public.transactions WHERE id=saltx)<>2 THEN RAISE EXCEPTION 'Salary update did not sync'; END IF;
 RAISE EXCEPTION 'AUDIT_PASS_ROLLBACK: car create/update/delete, direct edit protection, immutable links and salary sync all passed';
END $audit$;
