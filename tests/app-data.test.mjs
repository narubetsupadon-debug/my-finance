import assert from 'node:assert/strict';
import {createRefreshCoordinator} from '../app-data.js';

let blocked=true,runs=0;
const coordinator=createRefreshCoordinator({
  refresh:async()=>{runs++;return true},
  isBlocked:()=>blocked,
  getDelay:()=>0
});

coordinator.schedule();
assert.equal(coordinator.pending,true,'blocked refresh should be deferred');
assert.equal(runs,0);

blocked=false;
coordinator.flush();
await new Promise(r=>setTimeout(r,10));
assert.equal(runs,1,'deferred refresh should run once after unblock');

let release;
let concurrentRuns=0;
const gate=new Promise(r=>{release=r});
const coalesced=createRefreshCoordinator({
  refresh:async()=>{concurrentRuns++;if(concurrentRuns===1)await gate;return true},
  getDelay:()=>0
});
const first=coalesced.run();
const second=coalesced.run();
release();
await Promise.all([first,second]);
assert.equal(concurrentRuns,2,'overlapping refresh requests should coalesce into one follow-up run');
coordinator.dispose();coalesced.dispose();
console.log('PASS app-data: deferred realtime refresh and overlapping refresh coalescing');
