const CACHE='my-finance-rent-navigation-safe02';
const SHELL=['./summary-proportion.css?v=20261023-quality02','./summary-proportion.js?v=20261023-quality02','./summary-highest.js?v=20261023-quality02','./','./index.html','./style.css?v=20261023-quality02','./minimal-dark.css?v=20261023-quality02','./theme.js?v=20261023-quality02','./app.js?v=20261023-quality02','./app-data.js?v=20261023-quality02','./app-summary.js?v=20261023-quality02','./app-dashboard.js?v=20261023-quality02','./app-transactions.js?v=20261023-quality02','./app-planning.js?v=20261023-quality02','./app-safety.js?v=20261023-quality02','./finance-core.js?v=20261023-quality02','./finance-backup.js?v=20261023-quality02','./app-nav.js?v=20261023-quality02','./rent.html','./rent.css?v=20261023-quality02','./rent.js?v=20261023-quality02','./rent-core.js?v=20261023-quality02','./car.html','./car.css?v=20261023-quality02','./car.js?v=20261023-quality02','./salary.html','./salary.js?v=20261023-quality02','./salary-payslip.js?v=20261023-quality02','./summary.html','./manifest.webmanifest','./app-icon.svg','./app-icon.svg?v=20261023-quality02','./app-icon-192.png','./app-icon-512.png','./app-icon-maskable-512.png','./apple-touch-icon.png','./favicon-32.png'];
SHELL.push('./ui-polish.css?v=20261023-quality02','./dashboard-design.css?v=20261023-quality02','./push-settings.css?v=20261023-quality02');
SHELL.push('./app-storage.js?v=20261023-quality02');
SHELL.push('./expense-analysis.js?v=20261023-quality02');
SHELL.push('./total-details.js?v=20261023-quality02');
SHELL.push('./slip-reader.js?v=20261023-quality02');
SHELL.push('./summary-pdf.js?v=20261023-quality02','./fonts/Sarabun-Regular.ttf?v=20261023-release101','./vendor/jspdf-4.2.1.umd.min.js?v=20261023-quality02','./vendor/chart-4.4.7.umd.js?v=20261023-quality02');
SHELL.push('./preview/logos/grab.png','./preview/logos/lazada.ico','./preview/logos/shopee.png','./preview/logos/kbank.png','./preview/logos/ttb.svg','./preview/logos/firstchoice.svg');
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-finance-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 const versioned=new URL(e.request.url).searchParams.has('v')&&/\.(js|css|svg|ttf|woff2)$/.test(new URL(e.request.url).pathname);
 const network=()=>fetch(e.request,{cache:'no-cache'}).then(r=>{
  if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
  return r;
 }).catch(async()=>{
  const cached=await caches.match(e.request);
  if(cached)return cached;
  if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
  return Response.error();
 });
 e.respondWith(versioned?caches.open(CACHE).then(c=>c.match(e.request)).then(cached=>cached||network()):network());
});


self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data={title:'💙 My Finance',body:'มีรายการที่อยากเตือนมิว',url:'./',tag:'my-finance'};
 try{if(event.data)data={...data,...event.data.json()}}catch{}
 let displayed=false;
 try{
  await self.registration.showNotification(data.title,{body:data.body,icon:'./app-icon-192.png',badge:'./app-icon.svg',tag:data.tag||'my-finance',data:{url:data.url||'./'},renotify:false});
  displayed=true;
 }finally{
  try{
   const receipt={type:'push-received',at:Date.now(),displayRequested:displayed};
   const cache=await caches.open('finance-push-receipt-v1');
   await cache.put(new Request(new URL('last-receipt',self.registration.scope)),new Response(JSON.stringify(receipt),{headers:{'Content-Type':'application/json'}}));
   const windows=await self.clients.matchAll({type:'window'});for(const client of windows)client.postMessage(receipt);
  }catch{}
 }
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
  for(const c of list){if('focus' in c){c.navigate(target);return c.focus();}}
  return clients.openWindow?clients.openWindow(target):undefined;
 }));
});


