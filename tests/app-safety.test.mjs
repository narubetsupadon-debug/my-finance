import assert from 'node:assert/strict';
import {findDuplicateCandidates} from '../app-safety.js';

const existing=[
 {id:'a',transaction_date:'2026-10-05',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food',status:'paid'},
 {id:'b',transaction_date:'2026-10-05',type:'expense',amount:85,description:'กาแฟ',category_id:'coffee',status:'paid'},
 {id:'c',transaction_date:'2026-10-04',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food',status:'paid'}
];
const exact=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:85,description:'อาหารกลางวัน',category_id:'food'},existing);
assert.equal(exact.length,1);
assert.equal(exact[0].id,'a');

const sameCategory=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:85,description:'ข้าวกลางวัน',category_id:'food'},existing);
assert.equal(sameCategory.length,1);
assert.equal(sameCategory[0].id,'a');

const none=findDuplicateCandidates({transaction_date:'2026-10-05',type:'expense',amount:90,description:'อาหารกลางวัน',category_id:'food'},existing);
assert.equal(none.length,0);

console.log('PASS app-safety: duplicate candidates are high-confidence and non-blocking');


const {runDataHealthCheck}=await import('../app-safety.js');
const counts=Object.fromEntries(['duplicateGroups','orphanCar','orphanSalary','orphanInstallments','orphanRent','mismatchCar','mismatchSalary','mismatchInstallments','mismatchRent','brokenSourceLinks','invalidDimensions','billDuplicateGroups','orphanBills'].map(k=>[k,0]));
const calls=[];
const db={rpc:async name=>{calls.push(name);return {data:counts,error:null};}};
assert.equal((await runDataHealthCheck({db})).ok,true);assert.deepEqual(calls,['finance_health_check']);
counts.mismatchRent=1;assert.equal((await runDataHealthCheck({db})).ok,false);counts.mismatchRent=0;
counts.orphanInstallments=1;assert.equal((await runDataHealthCheck({db})).orphanInstallments,1);
await assert.rejects(runDataHealthCheck({db:{rpc:async()=>({error:new Error('offline')})}}),/offline/);
await assert.rejects(runDataHealthCheck({db:{rpc:async()=>({data:{}})}}),/ไม่ครบ/);
console.log('PASS health check: one atomic RPC, linked amount/status issues, failed calls and incomplete results cannot report healthy');
