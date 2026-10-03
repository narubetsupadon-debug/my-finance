const CACHE='my-finance-v4-nav2';
const SHELL=['./','./index.html','./style.css?v=20261003-nav2','./app.js','./app-nav.js?v=20261003-nav2','./manifest.webmanifest','./app-icon.svg'];
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
