// FRIDAY · servicio de la casa (Cloudflare Workers, plan gratis)
// Lo usa la tablet de FRIDAY para cosas que una página web no puede hacer sola:
//   1) prender y apagar tus luces de Smart Life (Tuya firma cada pedido con tu clave secreta)
//   2) buscar canciones en YouTube (para que suenen en la tablet o en la tele)
//   3) tu Google: agenda y mails (guarda la "llave larga" de Google sin que tu clave quede a la vista)
//   4) la voz de FRIDAY: Elena, la misma voz natural que usa en la compu (la de Microsoft Edge)
//   5) la tele: pone música en el YouTube de tu tele (vinculada con el código de la tele)
//
// Variables (Cloudflare → tu Worker → Settings → Variables and Secrets):
//   FRIDAY_KEY      una clave larga que inventás vos (la misma que ponés en el celu). Obligatoria.
//   TUYA_ID         (opcional) Access ID de tu proyecto en platform.tuya.com
//   TUYA_SECRET     (opcional) Access Secret de ese proyecto
//   GOOGLE_ID       (opcional) ID de cliente web de Google Cloud
//   GOOGLE_SECRET   (opcional) secreto de ese cliente
// Nadie más puede usarlo: todo pide FRIDAY_KEY.

const TUYA_HOSTS = ['https://openapi.tuyaus.com', 'https://openapi-ueaz.tuyaus.com', 'https://openapi.tuyaeu.com', 'https://openapi-weaz.tuyaeu.com', 'https://openapi.tuyain.com', 'https://openapi.tuyacn.com'];
const TUYA_OK = /^\/v(1\.0\/iot-01\/associated-users\/devices|1\.0\/iot-03\/devices\/[\w-]+\/(functions|status|commands)|2\.0\/cloud\/thing\/device)$/;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly';
let tuya = { host: null, tok: '', exp: 0 };

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Friday-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', 'Access-Control-Expose-Headers': 'X-Words' };
const VERSION = 2;
const form = o => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)]));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s)); }
async function hmac(key, s) { const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, enc.encode(s))); }
function same(a, b) { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

// ---------------------------------------------------------------- Tuya
async function tuyaRaw(env, host, token, method, path, q, body) {
  const keys = Object.keys(q || {}).sort();
  const pq = path + (keys.length ? '?' + keys.map(k => k + '=' + q[k]).join('&') : '');
  const b = body == null ? '' : JSON.stringify(body);
  const t = String(Date.now());
  const str = method + '\n' + (await sha256(b)) + '\n\n' + pq;
  const sign = (await hmac(env.TUYA_SECRET, env.TUYA_ID + token + t + str)).toUpperCase();
  const h = { client_id: env.TUYA_ID, t, sign_method: 'HMAC-SHA256', sign, lang: 'es' };
  if (token) h.access_token = token;
  if (b) h['Content-Type'] = 'application/json';
  const r = await fetch(host + pq, { method, headers: h, body: b || undefined });
  try { return await r.json(); } catch (e) { return { success: false, code: -1, msg: 'respuesta rara de Tuya' }; }
}
function crossRegion(r) { return /cross.?region|data center/i.test(r.msg || ''); }
async function tuyaToken(env, force) {
  if (!force && tuya.tok && Date.now() < tuya.exp) return null;
  const hosts = env.TUYA_HOSTS ? env.TUYA_HOSTS.split(',') : (tuya.host ? [tuya.host, ...TUYA_HOSTS.filter(h => h !== tuya.host)] : TUYA_HOSTS);
  let last = null;
  for (const h of hosts) {
    const r = await tuyaRaw(env, h, '', 'GET', '/v1.0/token', { grant_type: '1' }, null);
    if (r.success && r.result && r.result.access_token) { tuya = { host: h, tok: r.result.access_token, exp: Date.now() + ((r.result.expire_time || 7200) - 60) * 1000 }; return null; }
    last = r;
    if (!crossRegion(r) && r.code !== 1004 && r.code !== 1005) break;   // un error que no es "otra región": no sigue probando
  }
  return last || { success: false, msg: 'no pude conectar con Tuya' };
}
async function tuyaCall(env, p) {
  if (!env.TUYA_ID || !env.TUYA_SECRET) return { success: false, code: 'sin_tuya', msg: 'falta configurar TUYA_ID y TUYA_SECRET en el servicio' };
  const method = p.method === 'POST' ? 'POST' : 'GET';
  if (!TUYA_OK.test(String(p.path || ''))) return { success: false, code: 'no_permitido', msg: 'pedido no permitido' };
  const e = await tuyaToken(env, false); if (e) return e;
  let r = await tuyaRaw(env, tuya.host, tuya.tok, method, p.path, p.q || null, p.body == null ? null : p.body);
  if (!r.success && (r.code === 1010 || r.code === 1011)) {   // sesión vencida
    const e2 = await tuyaToken(env, true); if (e2) return e2;
    r = await tuyaRaw(env, tuya.host, tuya.tok, method, p.path, p.q || null, p.body == null ? null : p.body);
  }
  return r;
}

// ---------------------------------------------------------------- YouTube: los primeros videos de una búsqueda
function collectVideos(o, out, depth) {
  if (!o || typeof o !== 'object' || out.length >= 10 || depth > 40) return;
  if (o.videoRenderer && o.videoRenderer.videoId) {
    const v = o.videoRenderer;
    const title = (v.title && (v.title.runs || []).map(x => x.text).join('')) || (v.title && v.title.simpleText) || '';
    const len = (v.lengthText && v.lengthText.simpleText) || '';
    const by = (v.ownerText && (v.ownerText.runs || []).map(x => x.text).join('')) || '';
    if (len) out.push({ id: v.videoId, title, len, by });   // sin duración = transmisión en vivo: no sirve
    return;
  }
  for (const k in o) collectVideos(o[k], out, depth + 1);
}
async function ytSearch(env, q) {
  const base = env.YT_BASE || 'https://www.youtube.com';
  const r = await fetch(base + '/results?hl=es&gl=AR&search_query=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'es-AR,es;q=0.9', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' } });
  const html = await r.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/) || html.match(/ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/);
  const out = [];
  if (m) { try { collectVideos(JSON.parse(m[1]), out, 0); } catch (e) { } }
  if (!out.length) { const seen = new Set(); for (const x of html.matchAll(/"videoId":"([\w-]{11})"/g)) { if (!seen.has(x[1])) { seen.add(x[1]); out.push({ id: x[1], title: '', len: '', by: '' }); } if (out.length >= 8) break; } }
  return out;
}

// ---------------------------------------------------------------- la voz: Elena (la voz natural de Microsoft Edge, la misma de la compu)
const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_VER = '143.0.3650.75';
const VOCES = { elena: 'es-AR-ElenaNeural', tomas: 'es-AR-TomasNeural' };
let edgeSkew = 0;   // diferencia de reloj con Microsoft (si la hay, la corrige sola)
async function secMsGec() {
  let t = Math.floor(Date.now() / 1000 + edgeSkew) + 11644473600;
  t -= t % 300;
  return (await sha256((BigInt(t) * 10000000n).toString() + EDGE_TOKEN)).toUpperCase();
}
const xmlEsc = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const hex32 = () => [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
async function edgeOpen(env) {
  const base = env.EDGE_URL || 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
  const url = `${base}?TrustedClientToken=${EDGE_TOKEN}&ConnectionId=${hex32()}&Sec-MS-GEC=${await secMsGec()}&Sec-MS-GEC-Version=1-${EDGE_VER}`;
  const major = EDGE_VER.split('.')[0];
  const r = await fetch(url, { headers: {
    Upgrade: 'websocket', Pragma: 'no-cache', 'Cache-Control': 'no-cache', Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
    'Accept-Language': 'en-US,en;q=0.9', Cookie: 'muid=' + hex32().toUpperCase() + ';' } });
  if (!r.webSocket) {
    const d = r.headers && r.headers.get && r.headers.get('Date');
    if (d && r.status === 403) { const sk = (Date.parse(d) - Date.now()) / 1000; if (isFinite(sk)) edgeSkew = sk; }
    throw new Error('la voz no respondió (' + r.status + ')');
  }
  r.webSocket.accept();
  return r.webSocket;
}
async function edgeSpeak(env, text, voz, rate) {
  let ws;
  try { ws = await edgeOpen(env); } catch (e) { ws = await edgeOpen(env); }   // segundo intento (ya con el reloj corregido)
  const stamp = new Date().toString();
  const chunks = [], words = [];
  const done = new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('la voz tardó demasiado')), 20000);
    ws.addEventListener('message', ev => {
      const d = ev.data;
      if (typeof d === 'string') {
        if (d.includes('Path:turn.end')) { clearTimeout(to); res(); }
        else if (d.includes('Path:audio.metadata')) {
          try { const j = JSON.parse(d.slice(d.indexOf('\r\n\r\n') + 4)); for (const m of j.Metadata || []) if (m.Type === 'WordBoundary') words.push([Math.round(m.Data.Offset / 10000), Math.round(m.Data.Duration / 10000), m.Data.text.Text]); } catch (e) { }
        }
      } else {
        const b = new Uint8Array(d), hl = (b[0] << 8) | b[1];
        const head = new TextDecoder().decode(b.subarray(2, 2 + hl));
        if (head.includes('Path:audio') && b.length > 2 + hl) chunks.push(b.slice(2 + hl));
      }
    });
    ws.addEventListener('close', () => { clearTimeout(to); res(); });
    ws.addEventListener('error', () => { clearTimeout(to); rej(new Error('se cortó la voz')); });
  });
  ws.send(`X-Timestamp:${stamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
  const name = `Microsoft Server Speech Text to Speech Voice (${voz.slice(0, 5)}, ${voz.slice(6)})`;
  ws.send(`X-RequestId:${hex32()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp}Z\r\nPath:ssml\r\n\r\n` +
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-AR'><voice name='${name}'><prosody pitch='+0Hz' rate='${rate}' volume='+0%'>${xmlEsc(text)}</prosody></voice></speak>`);
  try { await done; } finally { try { ws.close(); } catch (e) { } }
  const n = chunks.reduce((a, c) => a + c.length, 0);
  if (!n) throw new Error('la voz vino vacía');
  const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return { audio: out, words };
}

// ---------------------------------------------------------------- la tele: el YouTube de la tele, vinculado con su código
// (en la tele: YouTube → Configuración → "Vincular con código de TV")
const loungeBase = env => env.YT_LOUNGE || 'https://www.youtube.com/api/lounge';
async function loungePost(env, path, q, body) {
  const r = await fetch(loungeBase(env) + path + (q ? '?' + form(q) : ''), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 FRIDAY' }, body: form(body) });
  return { status: r.status, text: await r.text() };
}
async function tvPair(env, code) {
  const r = await loungePost(env, '/pairing/get_screen', null, { pairing_code: code });
  let j = null; try { j = JSON.parse(r.text); } catch (e) { }
  if (!j || !j.screen || !j.screen.screenId) return { ok: false, error: r.status === 404 || r.status === 400 ? 'ese código no anda: fijate que sea el que muestra la tele ahora' : 'YouTube no respondió (' + r.status + ')' };
  return { ok: true, screenId: j.screen.screenId, name: j.screen.name || 'La tele' };
}
async function tvToken(env, screenId) {
  const r = await loungePost(env, '/pairing/get_lounge_token_batch', null, { screen_ids: screenId });
  let j = null; try { j = JSON.parse(r.text); } catch (e) { }
  const s = j && j.screens && j.screens[0];
  if (!s || !s.loungeToken) throw new Error('la tele se desvinculó: vinculala de nuevo');
  return s.loungeToken;
}
async function tvCmd(env, screenId, sc, args) {
  const tok = await tvToken(env, screenId), id = hex32(), name = 'FRIDAY';
  const b = await loungePost(env, '/bc/bind', { RID: 1, VER: 8, CVER: 1, auth_failure_option: 'send_error' },
    { app: 'web', 'mdx-version': 3, name, id, device: 'REMOTE_CONTROL', capabilities: 'que,dsdtr,atp', method: 'setPlaylist', magnaKey: 'cloudPairedDevice', ui: 'false',
      deviceContext: 'user_agent=dunno&window_width_points=&window_height_points=&os_name=android&ms=', theme: 'cl', loungeIdToken: tok });
  const sid = (b.text.match(/\["c","([^"]+)"/) || [])[1], gs = (b.text.match(/\["S","([^"]+)"/) || [])[1];
  if (!sid || !gs) return { ok: false, error: b.status === 401 || b.status === 410 ? 'la tele se desvinculó: vinculala de nuevo' : 'YouTube no aceptó la conexión (' + b.status + ')' };
  const on = /LOUNGE_SCREEN/.test(b.text);
  if (sc === 'estado') return { ok: true, on };
  let aid = 0; for (const m of b.text.matchAll(/\[(\d+),\[/g)) aid = Math.max(aid, +m[1]);
  const body = { count: 1, ofs: 0, req0__sc: sc };
  for (const [k, v] of Object.entries(args || {})) body['req0_' + k] = v;
  const c = await loungePost(env, '/bc/bind', { name, loungeIdToken: tok, SID: sid, AID: aid, gsessionid: gs, device: 'REMOTE_CONTROL', app: 'youtube-desktop', VER: 8, v: 2, RID: 2, CVER: 1 }, body);
  if (c.status >= 300) return { ok: false, on, error: 'la tele no tomó el pedido (' + c.status + ')' };
  return { ok: true, on };
}

// ---------------------------------------------------------------- Google (agenda y mails)
async function googleToken(env, form) {
  const r = await fetch(env.GOOGLE_TOKEN || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  return r.json();
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.FRIDAY_KEY) return json({ ok: false, error: 'falta la variable FRIDAY_KEY' }, 500);
    const key = req.headers.get('X-Friday-Key') || u.searchParams.get('k');
    const p = u.pathname.replace(/\/+$/, '') || '/';

    if (p === '/') return new Response('FRIDAY: el servicio de la casa está funcionando.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });

    // Google vuelve acá después de que aceptás (no lleva la clave: la verifica con la firma del "state")
    if (p === '/google/callback') {
      let st = null; try { st = JSON.parse(atob(u.searchParams.get('state') || '')); } catch (e) { }
      if (!st || !st.ret || !same(st.sig, await hmac(env.FRIDAY_KEY, 'ret:' + st.ret))) return new Response('Pedido inválido', { status: 400 });
      const back = (frag) => Response.redirect(st.ret.split('#')[0] + '#' + new URLSearchParams(frag), 302);
      if (u.searchParams.get('error')) return back({ gerr: u.searchParams.get('error') });
      const t = await googleToken(env, { code: u.searchParams.get('code') || '', client_id: env.GOOGLE_ID, client_secret: env.GOOGLE_SECRET, redirect_uri: u.origin + '/google/callback', grant_type: 'authorization_code' });
      if (!t.refresh_token) return back({ gerr: t.error_description || t.error || 'Google no dio el permiso largo' });
      return back({ grt: t.refresh_token });
    }

    if (!same(key, env.FRIDAY_KEY)) return json({ ok: false, error: 'clave incorrecta' }, 401);

    if (p === '/ping') return json({ ok: true, v: VERSION, tts: true, tele: true, tuya: !!(env.TUYA_ID && env.TUYA_SECRET), google: !!(env.GOOGLE_ID && env.GOOGLE_SECRET) });

    if (p === '/tuya' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      try { return json(await tuyaCall(env, b)); } catch (e) { return json({ success: false, msg: 'no pude hablar con Tuya: ' + e.message }); }
    }

    if (p === '/yt') {
      const q = (u.searchParams.get('q') || '').slice(0, 200);
      if (!q) return json({ ok: false, error: 'falta q' }, 400);
      try { return json({ ok: true, videos: await ytSearch(env, q) }); } catch (e) { return json({ ok: false, error: e.message }); }
    }

    // (se puede probar desde el navegador: /tts?k=TU_CLAVE&text=Hola — tiene que sonar Elena)
    if (p === '/tts') {
      let b = {};
      if (req.method === 'POST') { try { b = await req.json(); } catch (e) { } }
      else b = { text: u.searchParams.get('text') || 'Hola, soy FRIDAY. Así sueno.', voz: u.searchParams.get('voz') || 'elena', rate: u.searchParams.get('rate') || '' };
      const text = String(b.text || '').slice(0, 1200).trim(), voz = VOCES[b.voz] || VOCES.elena;
      const rate = /^[+-]\d{1,2}%$/.test(b.rate || '') ? b.rate : '+8%';
      if (!text) return json({ ok: false, error: 'falta el texto' }, 400);
      // las frases que se repiten ("Listo.", "¿Sí?") quedan guardadas: salen al instante
      const cache = typeof caches !== 'undefined' ? caches.default : null;
      const ck = cache && new Request('https://friday-tts.cache/' + (await sha256(voz + '|' + rate + '|' + text)));
      if (cache) { const hit = await cache.match(ck); if (hit) { const h = new Headers(hit.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v); return new Response(hit.body, { headers: h }); } }
      try {
        const { audio, words } = await edgeSpeak(env, text, voz, rate);
        const res = new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'X-Words': encodeURIComponent(JSON.stringify(words)), 'Cache-Control': 'public, max-age=2592000', ...CORS } });
        if (cache && text.length < 160) { try { await cache.put(ck, res.clone()); } catch (e) { } }
        return res;
      } catch (e) { return json({ ok: false, error: e.message }, 502); }
    }

    if (p === '/tv/pair' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      const code = String(b.code || '').replace(/\D/g, '');
      if (code.length < 8) return json({ ok: false, error: 'el código de la tele tiene 12 números' }, 400);
      try { return json(await tvPair(env, code)); } catch (e) { return json({ ok: false, error: 'no pude hablar con YouTube: ' + e.message }); }
    }

    if (p === '/tv/cmd' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      const ok = ['setPlaylist', 'play', 'pause', 'next', 'previous', 'setVolume', 'stopVideo', 'estado'];
      if (!b.screenId || !ok.includes(b.sc)) return json({ ok: false, error: 'pedido no permitido' }, 400);
      try { return json(await tvCmd(env, String(b.screenId), b.sc, b.args || {})); } catch (e) { return json({ ok: false, error: e.message }); }
    }

    if (p === '/google/start') {
      if (!env.GOOGLE_ID || !env.GOOGLE_SECRET) return new Response('Falta configurar GOOGLE_ID y GOOGLE_SECRET en el servicio.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      const ret = u.searchParams.get('ret') || '';
      if (!/^https?:\/\//.test(ret)) return new Response('Falta ret', { status: 400 });
      const state = btoa(JSON.stringify({ ret, sig: await hmac(env.FRIDAY_KEY, 'ret:' + ret) }));
      const q = new URLSearchParams({ client_id: env.GOOGLE_ID, redirect_uri: u.origin + '/google/callback', response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state });
      return Response.redirect((env.GOOGLE_AUTH || 'https://accounts.google.com/o/oauth2/v2/auth') + '?' + q, 302);
    }

    if (p === '/google/token' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      if (!b.rt) return json({ ok: false, error: 'falta rt' }, 400);
      const t = await googleToken(env, { refresh_token: b.rt, client_id: env.GOOGLE_ID, client_secret: env.GOOGLE_SECRET, grant_type: 'refresh_token' });
      if (!t.access_token) return json({ ok: false, error: t.error === 'invalid_grant' ? 'se venció el permiso de Google: conectalo de nuevo desde el celu' : (t.error_description || t.error || 'Google no respondió') });
      return json({ ok: true, access_token: t.access_token, expires_in: t.expires_in || 3600, scope: t.scope || '' });
    }

    return json({ ok: false, error: 'no existe' }, 404);
  }
};
