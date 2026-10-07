const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},cache=new Map(),origin='https://finance.test';let calls=0,offline=false;
const response=label=>({label,ok:true,clone(){return this;}});
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8'),{
 self:{addEventListener:(name,fn)=>handlers[name]=fn},URL,location:{origin},Response:{error:()=>response('error')},
 caches:{open:async()=>({match:async r=>cache.get(r.url),put:async(r,v)=>cache.set(r.url,v)}),match:async r=>cache.get(typeof r==='string'?r:r.url)},
 fetch:async()=>{calls++;if(offline)throw new Error('offline');return response('network');}
});
async function request(path,mode='cors'){let promise;handlers.fetch({request:{method:'GET',url:origin+path,mode},respondWith:p=>promise=p,waitUntil:()=>{}});return promise;}
(async()=>{
 cache.set(origin+'/car.js?v=current',response('cached'));
 assert.equal((await request('/car.js?v=current')).label,'cached');assert.equal(calls,0,'same-version assets must not wait for network');
 assert.equal((await request('/car.js?v=new')).label,'network');assert.equal(calls,1,'a release version must load its own asset');
 cache.set(origin+'/car.html',response('old-html'));
 assert.equal((await request('/car.html','navigate')).label,'network');assert.equal(calls,2,'HTML must check for the latest release');
 offline=true;cache.set('./index.html',response('offline-shell'));
 assert.equal((await request('/missing.html','navigate')).label,'offline-shell');
 let handled=false;handlers.fetch({request:{method:'GET',url:'https://database.test/rest/v1/transactions'},respondWith:()=>handled=true});assert.equal(handled,false,'private database requests must bypass the static cache');
})().then(()=>console.log('PASS SW: cached version assets, fresh release files, network-first HTML and offline shell')).catch(e=>{console.error(e);process.exit(1)});
