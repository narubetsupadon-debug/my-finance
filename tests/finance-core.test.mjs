import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const core=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../finance-core.js',import.meta.url))).toString('base64'));
assert.equal(core.bangkokDay(new Date('2026-10-03T18:00:00Z')),'2026-10-04');
assert.equal(core.bangkokDay(new Date('2026-12-31T18:00:00Z')),'2027-01-01');
const budgets=[{is_active:true,monthly_limit:1000,category_names:['food']},{is_active:true,monthly_limit:200,category_names:['food']}];
const tx=[{type:'expense',status:'paid',transaction_date:'2026-10-04',amount:200,categories:{name:'food'}},{type:'expense',status:'cancelled',transaction_date:'2026-10-04',amount:999,categories:{name:'food'}}];
const b=core.budgetSummary(budgets,tx,'2026-10-04');
assert.equal(b.spent,200);assert.equal(b.remain,1000);assert.equal(b.daily,1000/28);
assert.equal(core.budgetSummary([],tx,'2026-10-31').daily,0);
assert.equal(core.monthlyDue(null,'2026-10-04'),null);
assert.equal(core.monthlyDue(31,'2026-02-02').getDate(),28);
assert.equal(core.monthlyDue(1,'2026-12-31').getFullYear(),2027);
assert.equal(core.billDue({frequency:'yearly',due_day:5}),null);
assert.equal(core.billDue({frequency:'monthly',due_day:15,next_due_date:'2026-09-15'},'2026-10-04').toISOString().slice(0,10),'2026-10-15'); // stale monthly next_due_date rolls forward
assert.equal(core.billDue({frequency:'once',due_day:15,next_due_date:'2026-09-15'},'2026-10-04').toISOString().slice(0,10),'2026-09-15');
assert.equal(core.excelDay(1),'1899-12-31');
assert.equal(core.excelDay('2026-10-04'),'2026-10-04');
assert.equal(core.excelDay('04/10/2026'),'2026-10-04');
assert.equal(core.excelDay('04/10/2569'),'2026-10-04');
assert.equal(core.excelDay('31/02/2026'),null);
const input=Array.from({length:1201},(_,id)=>({id}));
assert.equal((await core.readAll(()=>({range:async(a,b)=>({data:input.slice(a,b+1)})}))).length,1201);
let calls=0;
await assert.rejects(core.readAll(()=>({range:async()=>++calls===1?{data:input.slice(0,500)}:{error:new Error('offline')}})),/offline/);
console.log('PASS core: Thai dates, year boundary, overlapping budgets, cancelled expenses, daily allowance, month-end due dates, >1000 rows, failed page');


const monthlyBill={id:'b1',due_day:31};
const billTx=(status,date,extra={})=>({type:'expense',source:'bill_payment:b1',status,transaction_date:date,...extra});
assert.equal(core.recurringBillMonthStatus(monthlyBill,[],'2026-02-28').state,'unrecorded');assert.equal(core.recurringBillMonthStatus(monthlyBill,[],'2026-02-28').due,true);
assert.equal(core.recurringBillMonthStatus(monthlyBill,[billTx('pending','2026-10-02')],'2026-10-14').state,'pending');
assert.equal(core.recurringBillMonthStatus(monthlyBill,[billTx('paid','2026-10-20')],'2026-10-14').state,'pending');
assert.equal(core.recurringBillMonthStatus(monthlyBill,[billTx('paid','2026-10-02')],'2026-10-14').state,'paid');
for(const row of [billTx('cancelled','2026-10-02'),billTx('paid','2026-09-02'),billTx('paid','2026-10-02',{source:'web'}),billTx('paid','2026-10-02',{source:'bill_payment:other'}),billTx('paid','2026-10-02',{type:'income'})])assert.equal(core.recurringBillMonthStatus(monthlyBill,[row],'2026-10-14').state,'unrecorded');
console.log('PASS recurring bill status: owner-loaded exact bill links, pending/future not paid, cancelled/manual/other-month excluded, clamped due dates');
