const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
let serve,configCalls=0,configError=false,writes=[],clients=[];
const cfg={vapid_public:'fixture-public',vapid_private:'fixture-private',cron_secret:'fixture-cron'};
function createClient(url,key,options){clients.push({key,options});return {
 auth:{getUser:async token=>token==='valid'?{data:{user:{id:'owner'}},error:null}:{data:{user:null},error:{message:'invalid'}}},
 rpc:async()=>{configCalls++;return configError?{error:new Error('sensitive database detail')}:{data:cfg,error:null};},
 from:table=>({upsert:async row=>{writes.push({key,table,row});return {error:null};},delete(){return this;},eq(){return this;},then(resolve){writes.push({key,table,delete:true});return Promise.resolve({error:null}).then(resolve);}})
};}
const context={Deno:{env:{get:name=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',SUPABASE_ANON_KEY:'anon-fixture'})[name]},serve:fn=>serve=fn},createClient,webpush:{},Response,URL,Date,Intl,Map,Uint8Array,crypto,btoa,console:{error(){}}};
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/push-reminders/index.ts'),'utf8').replace(/^import .*$/gm,'');
vm.runInNewContext(source,context);
function req(action,token,extra={}){return {method:'POST',headers:new Headers(token?{authorization:'Bearer '+token}:{}),json:async()=>({action,...extra})};}
(async()=>{
 assert.equal((await serve(req('config'))).status,401);assert.equal(configCalls,0,'unauthenticated requests must not access server configuration');
 assert.equal((await serve(req('unknown'))).status,400);assert.equal(configCalls,0);
 const conf=await serve(req('config','valid'));assert.deepEqual(await conf.json(),{publicKey:'fixture-public'});
 const subscribe=await serve(req('subscribe','valid',{user_id:'attacker',subscription:{endpoint:'https://fixture.invalid/push',keys:{p256dh:'fixture',auth:'fixture'}}}));assert.equal(subscribe.status,200);assert.equal(writes.at(-1).key,'anon-fixture');assert.equal(writes.at(-1).row.user_id,'owner');assert.equal(clients.at(-1).options.global.headers.Authorization,'Bearer valid');
 assert.equal((await serve(req('unsubscribe','valid',{endpoint:'https://fixture.invalid/push'}))).status,200);assert.equal(writes.at(-1).key,'anon-fixture');
 assert.equal((await serve(req('run'))).status,401,'cron must require its separate server secret');
 configError=true;const error=await serve(req('config','valid'));assert.equal(error.status,500);assert.deepEqual(await error.json(),{error:'server_error'});
 let legacy;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../supabase/functions/my-finance/index.ts'),'utf8'),{Deno:{serve:fn=>legacy=fn},Response});const redirect=legacy();assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'https://narubetsupadon-debug.github.io/my-finance/');
 console.log('PASS edge services: authentication before configuration, owner-scoped push writes, cron guard, private errors and legacy redirect; no notifications sent');
})().catch(e=>{console.error(e);process.exit(1)});
