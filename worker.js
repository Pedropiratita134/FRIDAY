// FRIDAY · servicio de la casa (Cloudflare Workers, plan gratis)
// Lo usa la tablet de FRIDAY para tres cosas que una página web no puede hacer sola:
//   1) prender y apagar tus luces de Smart Life (Tuya firma cada pedido con tu clave secreta)
//   2) buscar canciones en YouTube (para que suenen en la tablet)
//   3) tu Google: agenda y mails (guarda la "llave larga" de Google sin que tu clave quede a la vista)
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

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Friday-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400' };
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

    if (p === '/ping') return json({ ok: true, v: 1, tuya: !!(env.TUYA_ID && env.TUYA_SECRET), google: !!(env.GOOGLE_ID && env.GOOGLE_SECRET) });

    if (p === '/tuya' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      try { return json(await tuyaCall(env, b)); } catch (e) { return json({ success: false, msg: 'no pude hablar con Tuya: ' + e.message }); }
    }

    if (p === '/yt') {
      const q = (u.searchParams.get('q') || '').slice(0, 200);
      if (!q) return json({ ok: false, error: 'falta q' }, 400);
      try { return json({ ok: true, videos: await ytSearch(env, q) }); } catch (e) { return json({ ok: false, error: e.message }); }
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
