const CACHE='my-finance-v24-stable-v1';
const SHELL=['./','./index.html','./style.css?v=20261004-stable-v1','./minimal-dark.css?v=20261004-stable-v1','./theme.js?v=20261004-stable-v1','./app.js?v=20261004-stable-v1','./finance-core.js?v=20261004-stable-v1','./app-nav.js?v=20261004-stable-v1','./car.html','./car.js?v=20261004-stable-v1','./salary.html','./salary.js?v=20261004-stable-v1','./import.html','./summary.html','./manifest.webmanifest','./app-icon.svg'];
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
  body:data.body,icon:'./app-icon.svg',badge:'./app-icon.svg',tag:data.tag||'my-finance',
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
