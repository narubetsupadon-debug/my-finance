const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const code=source.slice(source.indexOf('async function dismissStartupSplash(){'),source.indexOf('async function performLoad(){'));
function harness(now=0){
 const hidden=new Set(),timers=[];let clock=now,resolveData,rejectData,reads=0,subscriptions=0;
 const elements=Object.fromEntries(['authSplash','authScreen','app','userEmail'].map(id=>[id,{classList:{contains:name=>hidden.has(id+':'+name),add:name=>hidden.add(id+':'+name),remove:name=>hidden.delete(id+':'+name)}}]));
 elements.app.classList.add('hidden');elements.authScreen.classList.add('hidden');
 const data=new Promise((resolve,reject)=>{resolveData=resolve;rejectData=reject;});
 const context=vm.createContext({$:id=>elements[id],window:{financeSplashStartedAt:0},performance:{now:()=>clock},setTimeout:(fn,delay)=>{timers.push({fn,delay});},user:null,sessionRevision:0,
  loadAll:()=>{reads++;return data;},subscribe:()=>{subscriptions++;},handleNavigationRoute(){},readPushReceipt(){}});
 vm.runInContext(code,context);
 return {context,elements,timers,data,resolveData,rejectData,get reads(){return reads;},get subscriptions(){return subscriptions;},
  finish(){clock=800;for(const {fn} of timers.splice(0))fn();}};
}
(async()=>{
 const fast=harness(100),pending=fast.context.dismissStartupSplash();
 assert.equal(fast.timers[0].delay,700);assert.equal(fast.elements.authSplash.classList.contains('hidden'),false);
 fast.finish();await pending;assert.equal(fast.elements.authSplash.classList.contains('hidden'),true);
 const slow=harness(1200);await slow.context.dismissStartupSplash();assert.equal(slow.timers.length,0,'slow startup must not add another 800 ms');
 const hidden=harness();hidden.elements.authSplash.classList.add('hidden');await hidden.context.dismissStartupSplash();assert.equal(hidden.timers.length,0,'later sign-in must not wait for a hidden splash');
 const parallel=harness(100),boot=parallel.context.boot({id:'u',email:'u@example.invalid'});
 assert.equal(parallel.reads,1,'data must start before the splash timer finishes');assert.equal(parallel.timers[0].delay,700);
 parallel.resolveData(true);await Promise.resolve();assert.equal(parallel.elements.authSplash.classList.contains('hidden'),false);
 parallel.finish();await boot;assert.equal(parallel.subscriptions,1);
 const loading=harness(),loadingBoot=loading.context.boot({id:'u'});loading.finish();await Promise.resolve();
 assert.equal(loading.elements.authSplash.classList.contains('hidden'),true,'minimum display time must not wait for a slow data fetch');
 assert.equal(loading.subscriptions,0);loading.resolveData(true);await loadingBoot;
 const changed=harness(),changedBoot=changed.context.boot({id:'u'});changed.context.user=null;changed.context.sessionRevision++;
 changed.resolveData(true);changed.finish();await changedBoot;assert.equal(changed.subscriptions,0,'a session invalidated during the delay must not subscribe');
 const failed=harness(),failedBoot=failed.context.boot({id:'u'});failed.rejectData(Error('read failed'));await assert.rejects(failedBoot,/read failed/);failed.finish();
 console.log('PASS startup splash: 800 ms minimum, elapsed-time accounting, concurrent data, no repeat delay, session invalidation and read rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});
