// Run: node --experimental-default-type=module --test tests/quality.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {findDuplicateCandidates,runDataHealthCheck} from '../app-safety.js';
import {createRefreshCoordinator} from '../app-data.js';
import {compareExpensesByMonth} from '../finance-trends.js';

test('duplicate candidate requires matching type, date, amount, and meaningful description/category',()=>{
 const old={id:'a',type:'expense',transaction_date:'2026-10-23',amount:120,description:'Lunch',status:'paid'};
 const row={type:'expense',transaction_date:'2026-10-23',amount:120,description:' lunch '};
 assert.equal(findDuplicateCandidates(row,[old]).length,1);
 assert.equal(findDuplicateCandidates({...row,amount:0},[old]).length,0);
 assert.equal(findDuplicateCandidates({...row,transaction_date:''},[old]).length,0);
 assert.equal(findDuplicateCandidates({...row,type:'income'},[old]).length,0);
 assert.equal(findDuplicateCandidates(row,[{...old,status:'cancelled'}]).length,0);
});
test('health check rejects incomplete RPC results',async()=>{
 await assert.rejects(()=>runDataHealthCheck({db:{rpc:async()=>({data:{},error:null})}}),/ผลตรวจระบบไม่ครบ/);
});
test('refresh coordinator coalesces scheduled refresh calls',async()=>{
 let count=0;
 const coord=createRefreshCoordinator({refresh:async()=>{count++;return true;},getDelay:()=>5});
 coord.schedule();coord.schedule();coord.schedule();
 await new Promise(resolve=>setTimeout(resolve,45));
 assert.equal(count,1);
 coord.dispose();
});
test('blocked refresh waits until flush',async()=>{
 let count=0,blocked=true;
 const coord=createRefreshCoordinator({refresh:async()=>{count++;return true;},isBlocked:()=>blocked,getDelay:()=>0});
 coord.schedule();
 assert.equal(coord.pending,true);
 blocked=false;coord.flush();
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(count,1);
 coord.dispose();
});

test('month comparison excludes pending, cancelled and invalid amounts',()=>{
 const tx=[
  {type:'expense',status:'paid',amount:100,transaction_date:'2026-10-03',categories:{name:'อาหาร'}},
  {type:'expense',status:'pending',amount:500,transaction_date:'2026-10-04'},
  {type:'expense',status:'cancelled',amount:300,transaction_date:'2026-10-05'},
  {type:'expense',status:'paid',amount:60,transaction_date:'2026-09-01',categories:{name:'อาหาร'}}
 ];
 const result=compareExpensesByMonth(tx,'2026-10','2026-09');
 assert.equal(result.current,100);
 assert.equal(result.previous,60);
 assert.equal(result.delta,40);
 assert.equal(result.byCategory[0].delta,40);
});
