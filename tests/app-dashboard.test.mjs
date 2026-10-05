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
  getDebts:()=>[],
  getUiSettings:()=>({dueReminder:true,budgetReminder:true,quickHidden:[]}),
  budgetTotals:()=>({daily:0,limit:0,spent:0,remain:0}),
  orderedQuickItems:()=>[],
  showPage(){},
  renderTxList(){},
  refreshDailyGreeting(){}
});

assert.doesNotThrow(()=>renderDashboard(),'dashboard module must render with isolated dependencies');
assert.equal(elements.get('nextBillName').textContent,'ยังไม่มีวันครบกำหนด');
console.log('PASS app-dashboard: isolated dependencies include bills');
