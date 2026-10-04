import {bangkokDay,readAll} from './finance-core.js?v=20261004-carfix2';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const db=createClient('https://mmvdhopogchcxwlstflk.supabase.co','sb_publishable_PYkDjHN3ULlFW9BavMvAVQ_d77eZZ5W');const $=id=>document.getElementById(id),money=n=>document.body?.classList.contains('privacy-mode')?'฿ ••••':new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(Number(n||0)),date=s=>new Date(s+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});let user,rows=[],expenseRows=[],editing,editingExpense=null,accounts=[],categories=[];
function msg(s){$('carMessage').textContent=s;if($('carDialog').open)$('carFormMessage').textContent=s;}
function option(el,id,name){const o=document.createElement('option');o.value=id;o.textContent=name;el.append(o);}
async function load(){
 const [installments,expenses]=await Promise.all([
  readAll(()=>db.from('car_installments').select('*').eq('user_id',user.id).order('installment_no').order('id')),
  readAll(()=>db.from('car_expenses').select('*').eq('user_id',user.id).order('expense_date',{ascending:false}).order('created_at',{ascending:false}).order('id'))
 ]);
 rows=installments;expenseRows=expenses;render();renderExpenses();
}
function render(){const paid=rows.filter(r=>r.status==='paid'),pending=rows.filter(r=>r.status==='pending');$('paidCount').textContent=paid.length+' / '+rows.length+' งวด';$('lastDue').textContent=rows.length?'งวดสุดท้าย '+date(rows.at(-1).due_date):'';$('myTotal').textContent=money(paid.reduce((s,r)=>s+Number(r.my_amount||0),0));$('remainingTotal').textContent=money(pending.reduce((s,r)=>s+Number(r.scheduled_amount),0));$('carProgress').style.width=(rows.length?paid.length/rows.length*100:0)+'%';const next=pending[0];$('nextNo').textContent=next?'งวดที่ '+next.installment_no:(rows.length?'ครบแล้ว':'ยังไม่มีตารางผ่อน');$('nextDue').textContent=next?date(next.due_date)+' · ค่างวดทั้งคู่ '+money(next.scheduled_amount)+' · ส่วนมิวกรอกตามยอดจ่ายจริง':(rows.length?'ไม่มีงวดค้างชำระในตาราง':'ยังไม่มีข้อมูลงวดรถ');const body=$('carRows');body.replaceChildren();const filter=$('carFilter').value;for(const r of rows.filter(r=>filter==='all'||r.status===filter)){const tr=document.createElement('tr');const vals=[r.installment_no,date(r.due_date),money(r.scheduled_amount),money(Number(r.scheduled_amount)/2),r.partner_amount===null?'—':money(r.partner_amount),r.my_amount===null?'—':money(r.my_amount),r.status==='paid'?money(Number(r.my_amount)+Number(r.partner_amount)):'—',r.status==='paid'?'จ่ายแล้ว':'ยังไม่จ่าย'];const labels=['งวด','กำหนดชำระ','ค่างวดตามสัญญา','หาร 2 (อ้างอิง)','บุ๋มบิ๋ม','มิว','รวมจ่ายจริง','สถานะ'];for(const [i,v] of vals.entries()){const td=document.createElement('td');td.dataset.label=labels[i];if(i===7){const badge=document.createElement('span');badge.className='tx-status status-'+r.status;badge.textContent=v;td.append(badge);}else td.textContent=v;tr.append(td);}const td=document.createElement('td');td.dataset.label='จัดการ';const b=document.createElement('button');b.className='btn small soft';b.textContent=r.status==='paid'?'ดู / แก้ไข':'บันทึกจ่าย';b.onclick=()=>open(r);td.append(b);tr.append(td);body.append(tr);}}

const expenseMeta={
 fuel:['⛽','น้ำมัน'],repair:['🔧','ซ่อม / อะไหล่'],maintenance:['🛠️','เช็กระยะ'],insurance:['🛡️','ประกันรถ'],act:['📄','พ.ร.บ.'],tax:['🧾','ภาษีรถ'],wash:['🧽','ล้างรถ'],parking:['🅿️','ที่จอดรถ'],toll:['🛣️','ทางด่วน'],installment:['🚘','ค่างวดรถ'],other:['➕','อื่น ๆ']
};
function renderExpenses(){
 const today=bangkokDay(),ym=today.slice(0,7),year=today.slice(0,4);
 const month=expenseRows.filter(x=>String(x.expense_date).slice(0,7)===ym);
 $('carMonthExpense').textContent=money(month.reduce((s,x)=>s+Number(x.amount||0),0));
 $('carYearExpense').textContent=money(expenseRows.filter(x=>String(x.expense_date).slice(0,4)===year).reduce((s,x)=>s+Number(x.amount||0),0));
 $('carFuelExpense').textContent=money(month.filter(x=>x.expense_type==='fuel').reduce((s,x)=>s+Number(x.amount||0),0));
 const odo=expenseRows.map(x=>Number(x.odometer_km)).filter(Number.isFinite).filter(x=>x>0);
 $('carLatestOdo').textContent=odo.length?new Intl.NumberFormat('th-TH').format(Math.max(...odo))+' km':'—';
 const filter=$('carExpenseFilter').value;
 const list=expenseRows.filter(x=>filter==='all'||x.expense_type===filter);
 const root=$('carExpenseList');root.replaceChildren();
 if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent='ยังไม่มีค่าใช้จ่ายรถ';root.append(e);return;}
 for(const x of list){
  const [icon,label]=expenseMeta[x.expense_type]||expenseMeta.other;
  const b=document.createElement('button');b.type='button';b.className='car-expense-item';
  const left=document.createElement('div');left.className='car-expense-main';
  const ico=document.createElement('span');ico.className='car-expense-icon';ico.textContent=icon;
  const info=document.createElement('div');const title=document.createElement('b');title.textContent=label+(x.vendor?' · '+x.vendor:'');
  const meta=document.createElement('small');meta.textContent=date(x.expense_date)+(x.odometer_km?' · '+new Intl.NumberFormat('th-TH').format(x.odometer_km)+' km':'')+(x.liters?' · '+x.liters+' L':'');
  info.append(title,meta);left.append(ico,info);
  const amount=document.createElement('strong');amount.className='expense';amount.textContent=money(x.amount);
  b.append(left,amount);b.onclick=()=>openExpense(x);root.append(b);
 }
}
function fillExpenseSelectors(){
 const ac=$('carExpenseAccount'),cat=$('carExpenseCategory');ac.replaceChildren();cat.replaceChildren();
 option(ac,'','ไม่ระบุบัญชี');accounts.forEach(x=>option(ac,x.id,x.name));
 categories.forEach(x=>option(cat,x.id,x.name));
}
function defaultCarCategory(){
 return categories.find(x=>x.name==='รถยนต์')?.id||categories.find(x=>x.name==='อื่นๆ')?.id||categories[0]?.id||'';
}
function openExpense(row=null){
 editingExpense=row;$('carExpenseMessage').textContent='';$('carExpenseTitle').textContent=row?'แก้ไขค่าใช้จ่ายรถ':'เพิ่มค่าใช้จ่ายรถ';
 $('carExpenseType').value=row?.expense_type||'fuel';$('carExpenseAmount').value=row?.amount??'';$('carExpenseDate').value=row?.expense_date||bangkokDay();
 $('carExpenseOdo').value=row?.odometer_km??'';$('carExpenseLiters').value=row?.liters??'';$('carExpenseVendor').value=row?.vendor||'';$('carExpenseNote').value=row?.note||'';
 fillExpenseSelectors();$('carExpenseAccount').value=row?.account_id||'';$('carExpenseCategory').value=row?.category_id||defaultCarCategory();
 $('deleteCarExpense').classList.toggle('hidden',!row);syncExpenseFields();$('carExpenseDialog').showModal();requestAnimationFrame(()=>{$('carExpenseForm').scrollTop=0});
}
function syncExpenseFields(){$('carLitersField').classList.toggle('hidden',$('carExpenseType').value!=='fuel');}

function requirements(){const paid=$('carStatus').value==='paid';for(const id of ['carPaymentDate','carMy','carPartner'])$(id).required=paid;}
function open(r){editing=r;$('carFormMessage').textContent='';$('carTitle').textContent='ค่างวดรถ · งวดที่ '+r.installment_no;$('carStatus').value='paid';$('carPaymentDate').value=r.payment_date||bangkokDay();$('carMy').value=r.my_amount??'';$('carPartner').value=r.partner_amount??'';$('carAccount').value=r.account_id||'';$('carCategory').value=r.category_id||[...$('carCategory').options].find(o=>o.textContent==='รถยนต์')?.value||'';$('carNote').value=r.note||'';requirements();$('carDialog').showModal();}
$('carFilter').onchange=render;$('carExpenseFilter').onchange=renderExpenses;$('addCarExpense').onclick=()=>openExpense();$('closeCarExpense').onclick=$('cancelCarExpense').onclick=()=>$('carExpenseDialog').close();$('carExpenseType').onchange=syncExpenseFields;$('carStatus').onchange=requirements;$('closeCar').onclick=()=>$('carDialog').close();
$('carForm').onsubmit=async e=>{e.preventDefault();const b=$('saveCar');if(b.disabled)return;b.disabled=true;let committed=false;try{const row={status:$('carStatus').value,payment_date:$('carPaymentDate').value||null,my_amount:$('carMy').value===''?null:Math.round(Number($('carMy').value)*100)/100,partner_amount:$('carPartner').value===''?null:Math.round(Number($('carPartner').value)*100)/100,account_id:$('carAccount').value||null,category_id:$('carCategory').value,note:$('carNote').value.trim()||null};const r=await db.from('car_installments').update(row).eq('id',editing.id).eq('user_id',user.id).select('id').single();if(r.error)throw r.error;committed=true;$('carDialog').close();await load();msg('บันทึกแล้ว ✅ รายจ่ายส่วนมิวอัปเดตตามกัน');}catch(e){if(committed){$('carApp').classList.add('hidden');msg('บันทึกสำเร็จแล้ว แต่โหลดข้อมูลล่าสุดไม่ได้ กรุณารีเฟรชก่อนทำรายการต่อ');}else msg('บันทึกไม่ได้: '+e.message);}finally{b.disabled=false;}};

$('carExpenseForm').onsubmit=async e=>{
 e.preventDefault();const b=$('saveCarExpense');if(b.disabled)return;b.disabled=true;$('carExpenseMessage').textContent='';
 try{
  const row={user_id:user.id,expense_date:$('carExpenseDate').value,expense_type:$('carExpenseType').value,amount:Math.round(Number($('carExpenseAmount').value)*100)/100,
   odometer_km:$('carExpenseOdo').value===''?null:Number($('carExpenseOdo').value),liters:$('carExpenseType').value==='fuel'&&$('carExpenseLiters').value!==''?Number($('carExpenseLiters').value):null,
   vendor:$('carExpenseVendor').value.trim()||null,account_id:$('carExpenseAccount').value||null,category_id:$('carExpenseCategory').value||null,note:$('carExpenseNote').value.trim()||null};
  if(!row.category_id)throw new Error('กรุณาเลือกหมวดรายจ่าย');
  const q=editingExpense?db.from('car_expenses').update(row).eq('id',editingExpense.id).eq('user_id',user.id):db.from('car_expenses').insert(row);
  const r=await q.select('id').single();if(r.error)throw r.error;
  $('carExpenseDialog').close();await load();msg(editingExpense?'แก้ไขค่าใช้จ่ายรถแล้ว ✅':'เพิ่มค่าใช้จ่ายรถแล้ว ✅');
 }catch(err){$('carExpenseMessage').textContent='บันทึกไม่ได้: '+err.message;}finally{b.disabled=false;}
};
$('deleteCarExpense').onclick=async()=>{
 if(!editingExpense||!confirm('ลบค่าใช้จ่ายรถรายการนี้? รายการรายจ่ายที่เชื่อมจะถูกลบด้วย'))return;
 const b=$('deleteCarExpense');b.disabled=true;
 try{const r=await db.from('car_expenses').delete().eq('id',editingExpense.id).eq('user_id',user.id);if(r.error)throw r.error;$('carExpenseDialog').close();await load();msg('ลบค่าใช้จ่ายรถแล้ว');}
 catch(err){$('carExpenseMessage').textContent='ลบไม่ได้: '+err.message;}finally{b.disabled=false;}
};

$('exportCar').onclick=()=>{if(!window.XLSX)return msg('โหลด Excel ไม่สำเร็จ กรุณารีเฟรช');if(!rows.length)return msg('ยังไม่มีข้อมูล');const data=rows.map(r=>({'งวด':r.installment_no,'กำหนดชำระ':r.due_date,'ค่างวดตามสัญญา':Number(r.scheduled_amount),'หาร 2 (อ้างอิง)':Number(r.scheduled_amount)/2,'บุ๋มบิ๋ม':r.partner_amount===null?null:Number(r.partner_amount),'มิว':r.my_amount===null?null:Number(r.my_amount),'สถานะ':r.status==='paid'?'จ่ายแล้ว':'ยังไม่จ่าย','วันที่จ่ายจริง':r.payment_date||'','หมายเหตุ':r.note||''}));const w=XLSX.utils.book_new(),s=XLSX.utils.json_to_sheet(data);s['!cols']=Object.keys(data[0]).map(()=>({wch:22}));XLSX.utils.book_append_sheet(w,s,'ผ่อนรถ');XLSX.writeFile(w,'My_Finance_Car.xlsx');};
try{const u=await db.auth.getUser();if(u.error||!u.data.user){msg('กรุณาเข้าสู่ระบบที่หน้าหลัก แล้วกลับมาหน้าผ่อนรถ');}else{user=u.data.user;const [a,c]=await Promise.all([readAll(()=>db.from('accounts').select('id,name').eq('user_id',user.id).order('name').order('id')),readAll(()=>db.from('categories').select('id,name').eq('user_id',user.id).eq('type','expense').order('name').order('id'))]);accounts=a;categories=c;option($('carAccount'),'','ไม่ระบุบัญชี');a.forEach(x=>option($('carAccount'),x.id,x.name));c.forEach(x=>option($('carCategory'),x.id,x.name));await load();$('carApp').classList.remove('hidden');msg('ข้อมูลเฉพาะบัญชี '+user.email);}}catch(e){msg('โหลดไม่ได้: '+e.message);}

