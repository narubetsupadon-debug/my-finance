const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root='preview/push-device/',source=fs.readFileSync(root+'app.js','utf8').replace(/^import .*$/gm,''),html=fs.readFileSync(root+'index.html','utf8');
const sub={endpoint:'https://web.push.apple.com/current-device-only',keys:{p256dh:'B'+'a'.repeat(86),auth:'a'.repeat(22)}};
const wait=()=>new Promise(r=>setTimeout(r,0));
async function page({ios=false,standalone=false,signedIn=true}={}){
 const dom=new JSDOM(html,{url:'https://narubetsupadon-debug.github.io/my-finance/preview/push-device/',runScripts:'outside-only'}),w=dom.window,calls=[],events=[];let receivedListener,visibleListener;
 Object.defineProperty(w.navigator,'userAgent',{value:ios?'iPhone':'Desktop'});w.navigator.standalone=standalone;w.matchMedia=()=>({matches:false});w.PushManager=function(){};w.Notification={permission:'granted',requestPermission:()=>{events.push('permission');return Promise.resolve('granted')}};
 const subscription={toJSON:()=>sub},reg={scope:w.location.href,active:true,pushManager:{getSubscription:async()=>null,subscribe:async()=>{events.push('subscribe');return subscription}},showNotification:async()=>events.push('display')};
 Object.defineProperty(w.navigator,'serviceWorker',{value:{getRegistration:async()=>({scope:'https://narubetsupadon-debug.github.io/my-finance/'}),register:async(url,opts)=>{assert.equal(url,'./sw.js');assert.equal(opts.scope,'./');events.push('register');return reg},addEventListener:(name,cb)=>receivedListener=cb}});
 w.caches={open:async()=>({match:async()=>null,delete:async()=>true})};
 w.createClient=(url,key,opts)=>{assert.equal(opts.auth.storageKey,'my-finance-push-device-test-auth');return {auth:{getUser:async()=>({data:{user:signedIn?{id:'fixture'}:null}}),getSession:async()=>({data:{session:{access_token:'fixture'}}})}}};
 w.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);calls.push(body);return {ok:true,json:async()=>body.action==='diagnose'?{publicKey:'B'+'a'.repeat(86),devices:[]}:{sent:1}}};
 w.eval(source);await wait();const $=id=>w.document.getElementById(id);
 assert(!events.includes('permission'));assert(!events.includes('register'));assert(!calls.some(x=>x.action==='test_current'));
 if(!signedIn){assert.equal(calls.length,0);assert.equal($('enable').disabled,true);assert.equal($('loginCard').hidden,false);dom.window.close();return;}
 if(ios&&!standalone){assert.equal($('install').hidden,false);assert.equal($('enable').disabled,true);dom.window.close();return;}
 $('enable').click();assert.equal(events[0],'permission');await wait();assert(events.includes('subscribe'));assert.equal($('remote').disabled,false);
 $('local').click();await wait();assert(events.includes('display'));assert(!calls.some(x=>x.action==='test_current'));
 $('remote').click();$('remote').click();await wait();assert.equal(calls.filter(x=>x.action==='test_current').length,1);assert.deepEqual(calls.at(-1).subscription,sub);assert.match($('result').textContent,/ตอบรับ/);assert.equal($('receipt').textContent,'');
 receivedListener({data:{type:'push-received',at:Date.now(),displayRequested:true}});assert.match($('receipt').textContent,/เครื่องรับข้อความแล้ว/);assert.equal($('remote').disabled,true);dom.window.close();
}
async function worker(){const handlers={},order=[],saved=new Map();let shouldFail=false,notification;
 const self={location:{href:'https://narubetsupadon-debug.github.io/my-finance/preview/push-device/sw.js'},addEventListener:(name,cb)=>handlers[name]=cb,registration:{showNotification:async(title,opts)=>{order.push('display');notification=opts;if(shouldFail)throw Error('fixture')}},clients:{matchAll:async()=>[{postMessage:data=>order.push(data)}]}};
 const caches={open:async name=>{assert.equal(name,'my-finance-push-device-diagnostic-v1');order.push('storage');return {put:async(req,response)=>saved.set(req.url,await response.json())}}};
 vm.runInNewContext(fs.readFileSync(root+'sw.js','utf8'),{self,caches,URL,Request,Response,Date});
 let promise;handlers.push({data:{json:()=>({title:'fixture',url:'https://evil.test'})},waitUntil:p=>promise=p});await promise;assert.equal(order[0],'display');assert.equal(notification.data.url,'https://narubetsupadon-debug.github.io/my-finance/preview/push-device/');assert.equal([...saved.values()][0].displayRequested,true);
 shouldFail=true;handlers.push({data:{json:()=>{throw Error('malformed')}},waitUntil:p=>promise=p});await promise;assert.equal([...saved.values()][0].displayRequested,false);
 const manifest=JSON.parse(fs.readFileSync(root+'manifest.webmanifest','utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.id,'/my-finance/preview/push-device/');assert(!handlers.fetch);assert(!/caches\.delete|unregister|\.unsubscribe/.test(source));
}
(async()=>{await page({signedIn:false});await page({ios:true});await page({ios:true,standalone:true});await worker();console.log('PASS current-device TEST: auth/install gates, gesture permission, scoped registration, local versus remote, current subscription only, cooldown, receipt and display-before-storage; no live sends');})().catch(e=>{console.error(e);process.exit(1)});
