import {budgetSummary} from './finance-core.js?v=20261023-quality02';

// Use the same monthly scope and status rules as the aggregate budget card.
export function renderBudgetBreakdown({root,budgets,transactions,day,money,onOpen}){
 if(!root)return;
 root.replaceChildren();
 const active=budgets.filter(b=>b.is_active);
 root.hidden=!active.length;
 for(const budget of active){
  const totals=budgetSummary([budget],transactions,day);
  const card=document.createElement('button');card.type='button';card.className='home-budget-pocket';
  card.classList.toggle('is-over',totals.spent>totals.limit);
  const title=document.createElement('strong');title.className='home-budget-name';title.textContent=budget.name;
  const allowance=document.createElement('small');allowance.textContent='งบ '+money(totals.limit)+' / เดือน';
  const label=document.createElement('span');label.className='home-budget-label';label.textContent=totals.spent>totals.limit?'เกินงบ':'คงเหลือ';
  const amount=document.createElement('b');amount.className='home-budget-amount money';amount.textContent=money(totals.spent>totals.limit?totals.spent-totals.limit:totals.remain);
  const meter=document.createElement('span');meter.className='home-budget-meter';
  meter.setAttribute('aria-hidden','true');
  const fill=document.createElement('span');fill.style.width=Math.max(0,Math.min(100,totals.limit?totals.spent/totals.limit*100:totals.spent>0?100:0))+'%';meter.append(fill);
  const spent=document.createElement('small');spent.textContent='ใช้แล้ว '+money(totals.spent);
  card.append(title,allowance,label,amount,meter,spent);
  card.onclick=()=>onOpen(budget,totals);
  root.append(card);
 }
}
