const HOME=new URL('./',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function report(data){
 const cache=await caches.open('my-finance-settings-push-test-receipt-v1');
 await cache.put(new Request(new URL('last-receipt',HOME)),new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));
 const clients=await self.clients.matchAll({type:'window'});for(const client of clients)client.postMessage(data);
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 // Always display: never depend on a network request to show a push.
 try{await self.registration.showNotification(payload.title||'My Finance · TEST',{body:payload.body||'ข้อความทดสอบถึงเครื่องแล้ว',tag:'my-finance-device-test',data:{url:HOME}});await report({type:'push-received',at:Date.now(),displayRequested:true});}
 catch{await report({type:'push-received',at:Date.now(),displayRequested:false});}
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window'});const client=clients.find(c=>c.url.startsWith(HOME));if(client)return client.focus();return self.clients.openWindow(HOME);})());});
