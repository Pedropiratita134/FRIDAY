// FRIDAY Móvil: abre aunque no haya internet y se actualiza sola cuando sí hay.
const CACHE='friday-movil-21';
const SHELL=['./','index.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET' || u.origin!==location.origin) return;   // las llamadas a Groq, Spotify, etc. van directo
  // primero la red (para tener siempre la última versión); si no hay internet, lo guardado
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request, cp)); } return r; })
    .catch(()=>caches.match(e.request, {ignoreSearch:true}).then(r=>r||caches.match(/panel/.test(u.pathname)?'panel.html':'index.html'))));
});
// tocar una notificación abre FRIDAY
self.addEventListener('notificationclick', e=>{ e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>{ for(const c of cs){ if('focus' in c) return c.focus(); } return self.clients.openWindow(/panel/.test(self.registration.scope)?'./panel.html':'./'); })); });
