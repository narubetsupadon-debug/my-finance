import assert from 'node:assert/strict';
import http from 'node:http';
import {createFinanceFetch} from '../finance-core.js';
let writes=0;
const server=http.createServer((req,res)=>{
 if(req.url==='/hang')return;
 if(req.url==='/body'){res.writeHead(200,{'Content-Type':'application/json'});res.write('{"pending":');return;}
 if(req.url==='/write'){writes++;req.resume();return;}
 if(req.url==='/error'){res.writeHead(503);res.end('busy');return;}
 res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const request=createFinanceFetch(fetch,200);
try{
 assert.deepEqual(await (await request(base+'/ok')).json(),{ok:true});
 await assert.rejects(request(base+'/hang'),{name:'TimeoutError'});
 const stalledBody=await request(base+'/body');await assert.rejects(stalledBody.text());
 await assert.rejects(request(base+'/write',{method:'POST',body:'fixture'}),{name:'TimeoutError'});
 assert.equal(writes,1,'Ambiguous POST must never be automatically replayed');
 const caller=new AbortController();const pending=request(base+'/hang',{signal:caller.signal});caller.abort();await assert.rejects(pending,{name:'AbortError'});
 const already=new AbortController();already.abort();await assert.rejects(request(new Request(base+'/hang',{signal:already.signal})),{name:'AbortError'});
 const failed=await request(base+'/error');assert.equal(failed.status,503);assert.equal(await failed.text(),'busy');
 assert.deepEqual(await (await request(base+'/ok')).json(),{ok:true},'Next request remains usable after a timeout');
 assert.throws(()=>createFinanceFetch(fetch,0));
 console.log('PASS transport: header/body timeouts, caller abort, Request signal, no POST replay, HTTP status preserved and recovery');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
