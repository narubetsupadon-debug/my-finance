const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const origin='https://finance.test',scope=origin+'/my-finance/';
const source=fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8');
const current=source.match(/const CACHE='([^']+)'/)[1],previous='my-finance-direct-payment-v1.0.12';
const key=r=>new URL(typeof r==='string'?r:r.url,scope).href;
class ScopedRequest extends Request{constructor(url,options){super(new URL(url,scope),options);}}
function harness(){
 const stores=new Map(),handlers={},requests=[];
 const state={offline:false,failPath:null,skip:0,claim:0};
 function open(name){
  if(!stores.has(name))stores.set(name,new Map());
  const entries=stores.get(name);
  return {match:async r=>entries.get(key(r))?.clone(),put:async(r,v)=>{entries.set(key(r),v.clone());},
   async addAll(list){
    // Cache.addAll commits only when every response succeeds.
    const responses=await Promise.all(list.map(async request=>{const response=await network(request);if(!response.ok)throw Error('precache '+response.status);return response;}));
    list.forEach((request,i)=>entries.set(key(request),responses[i].clone()));
   }};
 }
 async function network(request){
  requests.push(request);
  if(state.offline)throw Error('offline');
  return new Response('network:'+key(request),{status:state.failPath&&key(request).includes(state.failPath)?404:200});
 }
 const caches={open:async name=>open(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),
  async match(request){for(const name of stores.keys()){const hit=await open(name).match(request);if(hit)return hit;}}};
 vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{state.skip++;},clients:{claim:async()=>{state.claim++;}}},caches,
  Request:ScopedRequest,Response,URL,location:{origin},fetch:network});
 async function lifecycle(name){let promise;handlers[name]({waitUntil:p=>promise=p});await promise;}
 async function request(path){let response;const pending=[];handlers.fetch({request:new ScopedRequest(path),respondWith:p=>response=p,waitUntil:p=>pending.push(p)});const result=await response;await Promise.all(pending);return result;}
 return {state,stores,requests,caches,lifecycle,request};
}
(async()=>{
 const h=harness();
 await (await h.caches.open(previous)).put('./app.js?v=20261023-quality02&payments=12',new Response('old module'));
 await (await h.caches.open('finance-push-receipt-v1')).put('./last-receipt',new Response('receipt'));
 await (await h.caches.open('unrelated-app')).put('./other',new Response('unrelated'));
 await h.lifecycle('install');
 assert.equal(h.state.skip,1);assert.ok(h.stores.has(previous),'install must retain the serving worker cache');
 assert.ok(h.requests.length>0);assert.ok(h.requests.every(r=>r.cache==='reload'),'precache must bypass stale HTTP cache');
 await h.lifecycle('activate');
 assert.equal(h.state.claim,1);assert.equal(h.stores.has(previous),false);assert.ok(h.stores.has(current));
 assert.ok(h.stores.has('finance-push-receipt-v1'));assert.ok(h.stores.has('unrelated-app'));
 h.state.offline=true;
 for(const file of ['./app.js?v=20261023-quality02&payments=14','./app-planning.js?v=20261023-quality02&payments=14','./index.html']){
  assert.equal(await (await h.request(file)).text(),'network:'+key(file),'upgraded shell must work offline: '+file);
 }
 assert.equal(h.requests.filter(r=>key(r).includes('payments=12')).length,0,'new shell must not request the old payment module');
 for(const failure of ['404','offline']){
  const f=harness();await (await f.caches.open(previous)).put('./index.html',new Response('working old shell'));
  if(failure==='404')f.state.failPath='app-planning.js';else f.state.offline=true;
  await assert.rejects(f.lifecycle('install'));
  assert.equal(f.state.skip,0);assert.equal(f.state.claim,0);
  assert.equal(await (await (await f.caches.open(previous)).match('./index.html')).text(),'working old shell');
  assert.equal(f.stores.get(current).size,0,'failed addAll must not leave a partial shell');
  f.state.failPath=null;f.state.offline=false;
  await f.lifecycle('install');await f.lifecycle('activate');
  assert.equal(f.state.skip,1);assert.equal(f.state.claim,1);assert.equal(f.stores.has(previous),false);
 }
 console.log('PASS SW upgrade: versioned offline shell, reload precache, activation cleanup, unrelated cache preservation, failed install and retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
