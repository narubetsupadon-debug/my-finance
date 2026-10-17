import {createTotalDetails} from './total-details.js?v=20261017-quotes61';
import {recurringBillMonthStatus} from './finance-core.js?v=20261017-quotes61';

// Fixed provider assets: never interpolate user-controlled image URLs.
export const debtLogoBrands={
 grab:{label:'Grab',file:'grab.png'},lazada:{label:'Lazada',file:'lazada.ico'},
 shopee:{label:'Shopee',file:'shopee.png'},kbank:{label:'KBank',file:'kbank.png'},
 ttb:{label:'ttb',file:'ttb.svg'},firstchoice:{label:'Krungsri First Choice',file:'firstchoice.svg'}
};
export function resolveDebtLogo(debt){
 if(debt.logo_key==='none')return null;
 if(Object.hasOwn(debtLogoBrands,debt.logo_key||''))return debt.logo_key;
 const n=String(debt.name||'').toLowerCase().replace(/[\s_()-]+/g,'');
 for(const [key,re] of [['firstchoice',/firstchoice|เฟิร์สช้อยส์|เฟิร์สช้อย/],['kbank',/kbank|kplus|kasikorn|กสิกร/],['ttb',/ttb|ทีทีบี|ทหารไทยธนชาต/],['shopee',/shopee|spaylater|seasycash|ช้อปปี้/],['lazada',/lazada|ลาซาด้า/],['grab',/grab|แกร็บ/]])if(re.test(n))return key;
 return null;
}
export function debtLogoMarkup(debt){
 const key=resolveDebtLogo(debt),brand=key&&debtLogoBrands[key];
 return brand?'<span class="wallet-symbol wallet-brand" data-brand="'+key+'"><img src="./preview/logos/'+brand.file+'" alt="โลโก้ '+brand.label+'" width="80" height="44" loading="lazy" decoding="async"></span>':'<span class="wallet-symbol" aria-hidden="true">'+(debt.debt_type==='credit_card'?'▤':'↗')+'</span>';
}
export function debtLogoOptions(value){
 const entries=[['','อัตโนมัติจากชื่อ'],...Object.entries(debtLogoBrands).map(([key,b])=>[key,b.label]),['none','ไอคอนทั่วไป']];
 return entries.map(([key,label])=>'<option value="'+key+'" '+((value||'')===key?'selected':'')+'>'+label+'</option>').join('');
}
export function bindDebtLogoPicker(root){
 const name=root.querySelector('[name=name]'),select=root.querySelector('[name=logo_key]'),preview=root.querySelector('[data-debt-logo-preview]');
 if(!select||!preview)return;
 const update=()=>{preview.innerHTML=debtLogoMarkup({name:name.value,logo_key:select.value,debt_type:root.querySelector('[name=debt_type]')?.value});};
 name.addEventListener('input',update);select.addEventListener('change',update);root.querySelector('[name=debt_type]')?.addEventListener('change',update);update();
}

// Bills, debts, and budget rendering extracted from app.js.
export function createPlanningRenderer({$,money,esc,bangkokDay,budgetSummary,getBills,getDebts,getBudgets,getTransactions}){
const openDetails=createTotalDetails({$,money,fmtDate:date=>date});
$('debtList').addEventListener('error',event=>{const tile=event.target?.closest?.('.wallet-brand');if(tile&&event.target.tagName==='IMG'){tile.classList.remove('wallet-brand');tile.textContent='▤';}},{capture:true});
function billPriority(b){if(b.is_active===false)return 4;const s=recurringBillMonthStatus(b,getTransactions(),bangkokDay());return s.state==='paid'?3:s.state==='pending'?2:s.due?0:1;}
function renderBills(){
 const bills=getBills(),transactions=getTransactions(),debts=getDebts(),ym=bangkokDay().slice(0,7);
 const active=bills.filter(b=>b.is_active&&(b.frequency==='monthly'||!b.frequency)),states=active.map(b=>recurringBillMonthStatus(b,transactions,bangkokDay()));
 if($('billMonthStatus'))$('billMonthStatus').textContent='เดือนนี้ · จ่ายแล้ว '+states.filter(s=>s.state==='paid').length+' · รอจ่าย '+states.filter(s=>s.state==='pending').length+' · ยังไม่บันทึกผ่านบิล '+states.filter(s=>s.state==='unrecorded').length+' จากบิลรายเดือนที่เปิดใช้ '+active.length+' บิล';
 $('billList').innerHTML=bills.length?[...bills].sort((a,b)=>billPriority(a)-billPriority(b)||Number(a.due_day||32)-Number(b.due_day||32)||String(a.name).localeCompare(String(b.name),'th')).map(b=>{
 
  const monthStatus=recurringBillMonthStatus(b,transactions,bangkokDay()),paid=monthStatus.state==='paid',pending=monthStatus.state==='pending';
  const statusLabel=!b.is_active?'ปิดใช้งาน':paid?'จ่ายแล้วเดือนนี้':pending?'รอจ่าย / วันที่อนาคต':'ยังไม่บันทึกผ่านบิล'+(monthStatus.due?' · ถึงกำหนดแล้ว':'');
  const amount=Number(b.amount||0),debt=debts.find(d=>d.id===b.debt_id);
  const paymentLabel=debt?'💳 '+debt.name:(b.accounts?.name?'🏦 '+b.accounts.name:'ยังไม่ระบุช่องทาง');
  const payAction=b.is_active===false?'<button class="btn small soft" type="button" disabled>ปิดใช้งาน</button>':paid
   ?'<button class="btn small soft bill-paid-btn" type="button" disabled>✓ จ่ายแล้วเดือนนี้</button>'
   :pending?'<button class="btn small soft" type="button" disabled>มีรายการรอจ่ายแล้ว</button>'
   :amount>0
    ?'<button class="btn small primary" type="button" data-pay-bill="'+b.id+'">✓ จ่ายแล้ว</button>'
    :'<button class="btn small soft" type="button" data-edit="bill" data-id="'+b.id+'">ใส่ยอดก่อน</button>';
  return '<div class="item bill-item"><div><b>📅 '+esc(b.name)+'</b><span class="muted">ทุกวันที่ '+(b.due_day||'-')+' · '+esc(b.categories?.name||'ไม่ระบุหมวด')+' · '+esc(paymentLabel)+' · '+esc(statusLabel)+'</span></div><span class="amount expense">'+money(b.amount)+'</span><div class="actions">'+payAction+'<button type="button" class="btn small soft" data-bill-history="'+esc(b.id)+'">รายการเดือนนี้</button><button class="btn small soft" data-edit="bill" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="bills" data-id="'+b.id+'">ลบ</button></div></div>';
 }).join(''):'<div class="empty">ยังไม่มีบิล</div>'
}
function renderDebts(){
 const debts=getDebts(),active=debts.filter(d=>d.is_active!==false),cards=active.filter(d=>d.debt_type==='credit_card'),loans=active.filter(d=>d.debt_type!=='credit_card');
 const total=xs=>xs.reduce((sum,d)=>sum+Math.round(Number(d.outstanding_amount||0)*100),0)/100;
 const cardMarkup=d=>{
  const isCard=d.debt_type==='credit_card',limit=Number(d.original_amount||0),used=Number(d.outstanding_amount||0),available=Math.max(0,limit-used),pct=limit>0?Math.max(0,Math.min(100,used/limit*100)):0;
  return '<article class="wallet-card '+(isCard?'wallet-credit':'wallet-loan')+'"><div class="wallet-head"><div class="wallet-identity">'+debtLogoMarkup(d)+'<h3>'+esc(d.name)+'</h3></div><span class="wallet-tag">'+(d.is_active===false?'ปิดใช้งาน':isCard?'CREDIT':'LOAN')+'</span></div><div class="wallet-amount"><span>'+(isCard?'ยอดใช้ไป':'ยอดหนี้คงเหลือ')+'</span><b class="money">'+money(used)+'</b></div>'+
  (isCard?'<div class="wallet-available"><span>วงเงินคงเหลือ</span><b class="money">'+(limit>0?money(available):'ยังไม่ระบุวงเงิน')+'</b></div><div class="wallet-bar"><div class="'+(used>limit&&limit>0?'over':'')+'" style="width:'+pct+'%"></div></div><div class="wallet-caption"><span>'+(limit>0?'ใช้ไป '+Math.round(used/limit*100)+'%':'ยังไม่ระบุวงเงิน')+'</span><span>'+(limit>0?'วงเงิน '+money(limit):'—')+'</span></div>'+(used>limit&&limit>0?'<p class="wallet-alert">เกินวงเงิน '+money(used-limit)+'</p>':''):'<div class="wallet-available"><span>ค่างวด / รอบ</span><b class="money">'+(Number(d.installment_amount)>0?money(d.installment_amount):'ยังไม่ระบุ')+'</b></div>')+
  '<div class="wallet-footer"><span>'+(Number(d.due_day)>0?'ครบกำหนดทุกวันที่ '+Number(d.due_day):'ยังไม่ระบุวันครบกำหนด')+'</span><details class="wallet-more"><summary aria-label="จัดการ '+esc(d.name)+'">⋯</summary><div class="wallet-detail"><div>'+(Number(d.installment_amount)>0?'ยอดชำระต่อรอบ '+money(d.installment_amount):'ยังไม่ระบุยอดชำระต่อรอบ')+'</div><div class="actions"><button type="button" class="btn small soft" data-edit="debt" data-id="'+esc(d.id)+'">แก้ไข</button><button type="button" class="btn small danger" data-del="debts" data-id="'+esc(d.id)+'">ลบ</button></div></div></details></div></article>';
 };
 const section=(title,items)=>'<div class="wallet-section"><h3>'+title+'</h3><span>'+items.length+' รายการ</span></div><div class="wallet-grid">'+(items.length?[...items].sort((a,b)=>Number(b.outstanding_amount||0)-Number(a.outstanding_amount||0)).map(cardMarkup).join(''):'<div class="wallet-empty">ยังไม่มี'+title+'ที่เปิดใช้งาน</div>')+'</div>';
 $('debtList').innerHTML='<div class="wallet-overview"><div><span>ยอดใช้บัตรรวม</span><b class="money">'+money(total(cards))+'</b></div><div><span>หนี้สินเชื่อคงเหลือ</span><b class="money">'+money(total(loans))+'</b></div></div>'+section('บัตรเครดิต',cards)+section('สินเชื่อและผ่อนชำระ',loans)+(debts.some(d=>d.is_active===false)?'<details class="wallet-inactive"><summary>ปิดใช้งานแล้ว</summary><div class="wallet-grid">'+debts.filter(d=>d.is_active===false).map(cardMarkup).join('')+'</div></details>':'')+'<p class="wallet-footnote">ยอดคงเหลือปัจจุบัน · ไม่เปลี่ยนตามเดือนที่เลือก</p>';
}
function budgetSpent(b){
 const transactions=getTransactions();
 const ym=bangkokDay().slice(0,7),names=b.category_names||[]
 return transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===ym&&names.includes(x.categories?.name||'')).reduce((s,x)=>s+Number(x.amount||0),0)
}
function budgetTotals(){return budgetSummary(getBudgets(),getTransactions())}
function renderBudget(){
 const budgets=getBudgets();
 const t=budgetTotals();$('budgetLimitTotal').textContent=money(t.limit);$('budgetSpentTotal').textContent=money(t.spent);$('budgetRemainTotal').textContent=money(t.remain);$('budgetDailyTotal').textContent='ใช้ได้วันละ '+money(t.daily)+' จนจบเดือน'
 $('budgetList').innerHTML=budgets.length?budgets.map(b=>{const spent=budgetSpent(b),limit=Number(b.monthly_limit||0),remain=Math.max(0,limit-spent),pct=limit?Math.min(100,spent/limit*100):0,status=spent>limit?'เกินงบ '+money(spent-limit):'เหลือ '+money(remain);return '<div class="card budget-card"><div class="row"><div><h3 style="margin:0">'+esc(b.name)+'</h3><div class="muted">'+esc((b.category_names||[]).join(' · '))+'</div></div><div class="actions"><button class="btn small soft" data-edit="budget" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="budgets" data-id="'+b.id+'">ลบ</button></div></div><div class="budget-numbers"><b>'+money(spent)+'</b><span>/ '+money(limit)+'</span></div><div class="budget-progress"><div class="budget-progress-fill '+(spent>limit?'over':'')+'" style="width:'+pct+'%"></div></div><div class="budget-status '+(spent>limit?'expense budget-over':'income')+'" style="font-weight:800;margin-top:8px">'+status+'</div><button type="button" class="btn small soft section" data-budget-history="'+esc(b.id)+'">ดูรายการในงบ →</button></div>'}).join(''):'<div class="card empty">ยังไม่มีงบประมาณ</div>'
}

 function openBillHistory(id){const bill=getBills().find(b=>b.id===id);if(!bill)return;const rows=getTransactions().filter(t=>t.source==='bill_payment:'+id&&t.status!=='cancelled'&&String(t.transaction_date).slice(0,7)===bangkokDay().slice(0,7));openDetails('บิล '+bill.name,[{label:'รายการเดือนนี้',rows}],'ตามวันบันทึกชำระ · รวมรายการรอดำเนินการและวันที่อนาคต · ไม่รวมยกเลิก');}
 function openBudgetHistory(id){const b=getBudgets().find(b=>b.id===id);if(!b)return;const rows=getTransactions().filter(t=>t.type==='expense'&&t.status!=='cancelled'&&String(t.transaction_date).slice(0,7)===bangkokDay().slice(0,7)&&(b.category_names||[]).includes(t.categories?.name||''));openDetails('งบ '+b.name,[{label:'รายจ่ายในงบเดือนนี้',rows}],'งบ '+money(b.monthly_limit)+' · รวมรายการรอดำเนินการและวันที่อนาคต · ไม่รวมยกเลิก');}
 return {renderBills,renderDebts,renderBudget,budgetTotals,openBillHistory,openBudgetHistory};
}

