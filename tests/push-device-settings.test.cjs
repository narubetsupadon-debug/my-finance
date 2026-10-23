const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
 const source=fs.readFileSync('preview/push-device/settings-app.js','utf8');
 const html=fs.readFileSync('preview/push-device/index.html','utf8');
 const worker=fs.readFileSync('preview/push-device/sw.js','utf8');
 const manifest=JSON.parse(fs.readFileSync('preview/push-device/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'/my-finance/preview/push-device/');
 assert.equal(manifest.scope,'./');
 assert.match(html,/preview\/push-device\/settings-app\.js\?v=settings3/);
 assert.match(html,/id="reconnectPushBtn"/);
 assert.match(html,/id="testPushBtn"/);
 assert.match(html,/id="pushTestResult"/);
 assert.match(source,/scope:'\.\/preview\/push-device\/'/);
 assert(!source.includes('.unregister('));
 assert.match(source,/action==='subscribe'\|\|action==='unsubscribe'\)return \{ok:true\}/);
 assert.match(source,/action:'test_current',subscription:sub\.toJSON\(\)/);
 assert.match(source,/await clearPushReceipt\(\); \/\/ Do not confuse a previous delivery/);
 assert.match(source,/const received=r\.sent\?await readPushReceipt\(\):false/);
 assert.match(source,/handleNavigationRoute\(\);void readPushReceipt\(\)/);
 assert.match(source,/visibilitychange/);
 assert.match(worker,/my-finance-push-device-diagnostic-v1/);
 assert.match(worker,/await self\.registration\.showNotification/);

 const start=source.indexOf('function showPushReceipt(');
 const end=source.indexOf('function b64urlToUint8Array(',start);
 assert(start>0&&end>start);
 const status={textContent:''};
 let deleted=0,stored={type:'push-received',at:Date.UTC(2026,9,23,5,0),displayRequested:true};
 const cache={match:async()=>stored?{json:async()=>stored}:null,delete:async()=>{deleted++;stored=null;return true}};
 const context={
   $:()=>status,Number,Date,
   window:{caches:true},
   caches:{open:async name=>{assert.equal(name,'my-finance-push-device-diagnostic-v1');return cache}}
 };
 vm.runInNewContext("const PUSH_DIAGNOSTIC_CACHE='my-finance-push-device-diagnostic-v1';const PUSH_RECEIPT_URL='https://narubetsupadon-debug.github.io/my-finance/preview/push-device/last-receipt';\n"+
   source.slice(start,end)+"\nthis.receipt={read:readPushReceipt,clear:clearPushReceipt,show:showPushReceipt};",context);
 assert.equal(await context.receipt.read(),true,'reopening app restores actual receipt');
 assert.match(status.textContent,/เครื่องได้รับ Push ล่าสุด/);
 assert.match(status.textContent,/แสดงการแจ้งเตือนแล้ว/);
 assert.equal(context.receipt.show({type:'bad',at:stored.at}),false);
 await context.receipt.clear();
 assert.equal(deleted,1,'new attempt clears previous confirmation');
 assert.equal(await context.receipt.read(),false,'old receipt is not mistaken for current send');
 stored={type:'push-received',at:Date.now(),displayRequested:false};
 assert.equal(await context.receipt.read(),true);
 assert.match(status.textContent,/แสดงการแจ้งเตือนไม่สำเร็จ/);
 console.log('PASS installed Test: isolated current-device push, cache receipt on return, old receipt cleared and display failure shown');
})().catch(e=>{console.error(e);process.exitCode=1});
