// FRIDAY Móvil: abre aunque no haya internet y se actualiza sola cuando sí hay.
const CACHE='friday-movil-58';
const DATOS='friday-datos';   // lo que el celu le deja al service worker (qué avisar y a qué hora): no se borra al actualizar
const SHELL=['./','index.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE && k!==DATOS).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET' || u.origin!==location.origin) return;   // las llamadas a Groq, Spotify, etc. van directo
  // primero la red (para tener siempre la última versión); si no hay internet, lo guardado
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request, cp)); } return r; })
    .catch(()=>caches.match(e.request, {ignoreSearch:true}).then(r=>r||caches.match(/panel/.test(u.pathname)?'panel.html':'index.html'))));
});
// tocar una notificación abre FRIDAY (o la trae al frente)
self.addEventListener('notificationclick', e=>{ e.notification.close(); const url=(e.notification.data && e.notification.data.url) || (/panel/.test(self.registration.scope)?'./panel.html':'./');
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(cs=>{ for(const c of cs){ if('focus' in c){ if(url.includes('#') && 'navigate' in c) c.navigate(url).catch(()=>{}); return c.focus(); } } return self.clients.openWindow(url); })); });
// avisos con el celu bloqueado: el servidor de BufaLabs golpea la puerta (sin texto) y acá se lee qué había que avisar
async function leer(k, def){ try{ const r=await (await caches.open(DATOS)).match(k); return r ? await r.json() : def; }catch(e){ return def; } }
async function escribir(k, v){ try{ await (await caches.open(DATOS)).put(k, new Response(JSON.stringify(v), {headers:{'Content-Type':'application/json'}})); }catch(e){} }
self.addEventListener('push', e=>{ e.waitUntil((async()=>{
  const d=await leer('__avisos.json', {items:[]}), vistos=await leer('__vistos.json', {}), now=Date.now();
  const toca=(d.items||[]).filter(x=>x.at<=now+90000 && x.at>now-6*3600000 && !vistos[x.id+'@'+x.at]).slice(0,4);
  // si FRIDAY está abierta y a la vista, avisa ella misma (con su voz)
  const cs=await self.clients.matchAll({type:'window', includeUncontrolled:true});
  if(toca.length && cs.some(c=>c.visibilityState==='visible')) return;
  if(!toca.length){
    // el timbre: otro aparato (la tablet) dejó un aviso en el buzón de este celu (la guardia, por ejemplo)
    const yo=await leer('__yo.json', null); let avs=[];
    if(yo && yo.id && yo.tok){ try{ const r=await fetch('https://bufalabs.pedrobufager.workers.dev/push/buzon', {method:'POST', headers:{'Content-Type':'application/json', 'X-Friday':yo.id}, body:JSON.stringify({tok:yo.tok})}); const j=await r.json(); avs=(j && j.avisos)||[]; }catch(e){} }
    if(avs.length){ for(const a of avs.slice(-3)) await self.registration.showNotification(a.titulo||'FRIDAY', {body:a.texto||'', tag:'friday-timbre-'+a.at, icon:'icon-192.png', badge:'icon-192.png', vibrate:[500,150,500,150,500], requireInteraction:true, timestamp:a.at, data:{url:a.url||'./'}}); return; }
    return self.registration.showNotification('FRIDAY', {body:'Tenés un aviso. Tocá para verlo.', tag:'friday-aviso', icon:'icon-192.png', badge:'icon-192.png'}); }
  for(const x of toca){ vistos[x.id+'@'+x.at]=now;
    await self.registration.showNotification(x.titulo||'⏰ FRIDAY', {body:x.texto||'', tag:'friday-'+x.id, icon:'icon-192.png', badge:'icon-192.png', vibrate:[300,120,300], requireInteraction:!x.bd, timestamp:x.at, data:{url:x.url||'./'}}); }
  for(const k of Object.keys(vistos)) if(now-vistos[k]>3*864e5) delete vistos[k];
  await escribir('__vistos.json', vistos);
})()); });
