import assert from 'node:assert/strict';import {debtPaymentProgress as progress} from '../finance-core.js';
const d={id:'grab',name:'Grab PayLater',installment_amount:292};const tx=(o={})=>({id:'t',type:'expense',status:'paid',description:'ชำระบัตร Grab PayLater',source:'web',transaction_date:'2026-10-24',amount:292,...o});const p=(rows,all=[d],day='2026-10-29')=>progress(d,all,rows,day,'2026-10-29');
assert.equal(p([tx()]).state,'complete');assert.equal(p([tx()]).remainingCents,0);assert.equal(p([tx(),tx()]).paidCents,29200);
assert.equal(p([tx({amount:100})]).remainingCents,19200);assert.equal(p([tx({amount:100})]).state,'partial');
for(const o of [{status:'pending'},{status:'cancelled'},{type:'income'},{transaction_date:'2026-10-30'},{transaction_date:'2026-09-24'},{source:'bill_payment:grab'},{description:'ชำระบัตร Grab PayLater Extra'},{amount:-1}])assert.equal(p([tx(o)]).paidCents,0);
assert.equal(p([tx()],[d,{...d,id:'ambiguous'}]).paidCents,0);assert.equal(p([tx({source:'debt_payment:grab',description:'renamed'})]).state,'complete');assert.equal(p([tx()],undefined,'2026-11-01').paidCents,0);
assert.equal(progress({...d,installment_amount:0},[d],[tx()],'2026-10-29','2026-10-29').state,'recorded');
console.log('PASS payment progress: full/partial/unknown, exact matching, duplicate IDs, ambiguous names, future/cancelled/pending and month switching');
