import assert from 'node:assert/strict';
import {createDashboardRenderer} from '../app-dashboard.js';

function fakeEl(){
  return {
    textContent:'',innerHTML:'',onclick:null,style:{width:'',setProperty(){}},
    classList:{toggle(){},add(){},remove(){}},
    closest(){return fakeEl()},
    replaceChildren(){},
    append(){},
    setAttribute(){}
  };
}
const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,fakeEl());return elements.get(id)};
globalThis.document={
  body:{classList:{contains(){return false}}},
  querySelector(){return fakeEl()},
  createElement(){return fakeEl()}
};

const dueDebts=[];
const renderDashboard=createDashboardRenderer({
  $,
  money:n=>'฿'+Number(n||0).toFixed(2),
  fmtDate:s=>s||'',
  esc:s=>String(s??''),
  bangkokDate:()=>new Date(2026,9,5),
  bangkokDay:()=>'2026-10-05',
  billDue:()=>new Date(2026,9,10),
  nextDueDate:()=>new Date(2026,9,15),
  getTransactions:()=>[],
  getBills:()=>[],
  getDebts:()=>dueDebts,
  getUiSettings:()=>({dueReminder:true,budgetReminder:true,quickHidden:[]}),
  budgetTotals:()=>({daily:0,limit:0,spent:0,remain:0}),
  orderedQuickItems:()=>[],
  showPage(){},
  renderTxList(){},
  refreshDailyGreeting(){}
});

assert.doesNotThrow(()=>renderDashboard(),'dashboard module must render with isolated dependencies');
assert.equal(elements.get('nextBillName').textContent,'ยังไม่มีวันครบกำหนด');
dueDebts.push({name:'KBank Credit Card (K PLUS)',is_active:true,outstanding_amount:100,installment_amount:0,due_day:10},{name:'Shopee SEasyCash',is_active:true,outstanding_amount:100,installment_amount:1784,due_day:24});
renderDashboard();
assert.match(elements.get('upcomingList').innerHTML,/upcoming-item has-no-amount/);
assert.match(elements.get('upcomingList').innerHTML,/upcoming-amount is-unset">ยังไม่ระบุยอดรอบนี้/);
assert.match(elements.get('upcomingList').innerHTML,/upcoming-amount money">฿1784.00/);
assert.equal(elements.get('nextBillAmount').textContent,'ยังไม่ระบุยอด');
console.log('PASS app-dashboard: isolated dependencies include bills');
