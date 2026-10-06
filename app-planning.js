// Bills, debts, and budget rendering extracted from app.js.
export function createPlanningRenderer({$,money,esc,bangkokDay,budgetSummary,getBills,getDebts,getBudgets,getTransactions}){
function renderBills(){
 const bills=getBills(),transactions=getTransactions(),debts=getDebts(),ym=bangkokDay().slice(0,7);
 $('billList').innerHTML=bills.length?bills.map(b=>{
  const source='bill_payment:'+b.id;
  const paid=transactions.some(x=>x.status!=='cancelled'&&x.source===source&&String(x.transaction_date).slice(0,7)===ym);
  const amount=Number(b.amount||0),debt=debts.find(d=>d.id===b.debt_id);
  const paymentLabel=debt?'💳 '+debt.name:(b.accounts?.name?'🏦 '+b.accounts.name:'ยังไม่ระบุช่องทาง');
  const payAction=paid
   ?'<button class="btn small soft bill-paid-btn" type="button" disabled>✓ จ่ายแล้วเดือนนี้</button>'
   :amount>0
    ?'<button class="btn small primary" type="button" data-pay-bill="'+b.id+'">✓ จ่ายแล้ว</button>'
    :'<button class="btn small soft" type="button" data-edit="bill" data-id="'+b.id+'">ใส่ยอดก่อน</button>';
  return '<div class="item bill-item"><div><b>📅 '+esc(b.name)+'</b><span class="muted">ทุกวันที่ '+(b.due_day||'-')+' · '+esc(b.categories?.name||'ไม่ระบุหมวด')+' · '+esc(paymentLabel)+(paid?' · จ่ายแล้ว ✓':'')+'</span></div><span class="amount expense">'+money(b.amount)+'</span><div class="actions">'+payAction+'<button class="btn small soft" data-edit="bill" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="bills" data-id="'+b.id+'">ลบ</button></div></div>';
 }).join(''):'<div class="empty">ยังไม่มีบิล</div>'
}
function renderDebts(){const debts=getDebts();$('debtList').innerHTML=debts.length?debts.map(d=>{const limit=Number(d.original_amount||0),used=Number(d.outstanding_amount||0),available=Math.max(0,limit-used),pct=limit?Math.min(100,used/limit*100):0;return '<div class="card credit-card"><div class="row"><div><b>💳 '+esc(d.name)+'</b><div class="muted">ครบกำหนดวันที่ '+(d.due_day||'-')+(Number(d.installment_amount||0)>0?' · จ่ายรอบนี้ '+money(d.installment_amount):'')+'</div></div><div class="actions"><button class="btn small soft" data-edit="debt" data-id="'+d.id+'">แก้ไข</button><button class="btn small danger" data-del="debts" data-id="'+d.id+'">ลบ</button></div></div><div class="credit-stats"><div><span>ยอดคงเหลือบัตร</span><b class="expense">'+money(used)+'</b></div><div><span>วงเงิน</span><b>'+money(limit)+'</b></div><div><span>วงเงินเหลือใช้</span><b class="income">'+money(available)+'</b></div></div><div class="budget-progress"><div class="credit-used" style="width:'+pct+'%"></div></div><div class="muted" style="margin-top:7px">ใช้วงเงินไป '+pct.toFixed(0)+'%</div></div>'}).join(''):'<div class="empty">ยังไม่มีบัตรหรือสินเชื่อ</div>'}
function budgetSpent(b){
 const transactions=getTransactions();
 const ym=bangkokDay().slice(0,7),names=b.category_names||[]
 return transactions.filter(x=>x.type==='expense'&&x.status!=='cancelled'&&String(x.transaction_date).slice(0,7)===ym&&names.includes(x.categories?.name||'')).reduce((s,x)=>s+Number(x.amount||0),0)
}
function budgetTotals(){return budgetSummary(getBudgets(),getTransactions())}
function renderBudget(){
 const budgets=getBudgets();
 const t=budgetTotals();$('budgetLimitTotal').textContent=money(t.limit);$('budgetSpentTotal').textContent=money(t.spent);$('budgetRemainTotal').textContent=money(t.remain);$('budgetDailyTotal').textContent='ใช้ได้วันละ '+money(t.daily)+' จนจบเดือน'
 $('budgetList').innerHTML=budgets.length?budgets.map(b=>{const spent=budgetSpent(b),limit=Number(b.monthly_limit||0),remain=Math.max(0,limit-spent),pct=limit?Math.min(100,spent/limit*100):0,status=spent>limit?'เกินงบ '+money(spent-limit):'เหลือ '+money(remain);return '<div class="card budget-card"><div class="row"><div><h3 style="margin:0">'+esc(b.name)+'</h3><div class="muted">'+esc((b.category_names||[]).join(' · '))+'</div></div><div class="actions"><button class="btn small soft" data-edit="budget" data-id="'+b.id+'">แก้ไข</button><button class="btn small danger" data-del="budgets" data-id="'+b.id+'">ลบ</button></div></div><div class="budget-numbers"><b>'+money(spent)+'</b><span>/ '+money(limit)+'</span></div><div class="budget-progress"><div class="budget-progress-fill '+(spent>limit?'over':'')+'" style="width:'+pct+'%"></div></div><div class="'+(spent>limit?'expense':'income')+'" style="font-weight:800;margin-top:8px">'+status+'</div></div>'}).join(''):'<div class="card empty">ยังไม่มีงบประมาณ</div>'
}

 return {renderBills,renderDebts,renderBudget,budgetTotals};
}
