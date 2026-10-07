const CACHE='my-finance-v45-payslip2';
const SHELL=['./','./index.html','./style.css?v=20261007-payslip2','./minimal-dark.css?v=20261007-payslip2','./theme.js?v=20261007-payslip2','./app.js?v=20261007-payslip2','./app-data.js?v=20261007-payslip2','./app-summary.js?v=20261007-payslip2','./app-dashboard.js?v=20261007-payslip2','./app-transactions.js?v=20261007-payslip2','./app-planning.js?v=20261007-payslip2','./app-safety.js?v=20261007-payslip2','./finance-core.js?v=20261007-payslip2','./app-nav.js?v=20261007-payslip2','./car.html','./car.css?v=20261007-payslip2','./car.js?v=20261007-payslip2','./salary.html','./salary.js?v=20261007-payslip2','./salary-payslip.js?v=20261007-payslip2','./import.html','./summary.html','./manifest.webmanifest','./app-icon.svg','./app-icon.svg?v=20261007-payslip2','./app-icon-192.png','./app-icon-512.png','./app-icon-maskable-512.png','./apple-touch-icon.png','./favicon-32.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-finance-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{
  if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
  return r;
 }).catch(async()=>{
  const cached=await caches.match(e.request);
  if(cached)return cached;
  if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
  return Response.error();
 }));
});


self.addEventListener('push',event=>{
 let data={title:'💙 My Finance',body:'มีรายการที่อยากเตือนมิว',url:'./',tag:'my-finance'};
 try{if(event.data)data={...data,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{
  body:data.body,icon:'./app-icon-192.png',badge:'./app-icon.svg',tag:data.tag||'my-finance',
  data:{url:data.url||'./'},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
  for(const c of list){if('focus' in c){c.navigate(target);return c.focus();}}
  return clients.openWindow?clients.openWindow(target):undefined;
 }));
});

