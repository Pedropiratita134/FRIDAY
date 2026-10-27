// FRIDAY · servicio de la casa (Cloudflare Workers, plan gratis)
// Lo usa la tablet de FRIDAY para cosas que una página web no puede hacer sola:
//   1) prender y apagar tus luces de Smart Life (Tuya firma cada pedido con tu clave secreta)
//   2) buscar canciones en YouTube (para que suenen en la tablet o en la tele)
//   3) tu Google: agenda y mails (guarda la "llave larga" de Google sin que tu clave quede a la vista)
//   4) la voz de FRIDAY: Elena, la misma voz natural que usa en la compu (la de Microsoft Edge / Translator)
//   5) la tele: pone música en el YouTube de tu tele (vinculada con el código de la tele)
//   7) un cerebro más para FRIDAY (Workers AI, gratis: 10.000 «neuronas» por día). Hace falta el enlace
//      Settings → Bindings → Add → Workers AI, con el nombre AI.
//   6) videollamadas: el "puente" de Cloudflare para cuando dos aparatos no se pueden ver directo (opcional:
//      TURN_KEY_ID y TURN_KEY_TOKEN, de Cloudflare → Realtime → TURN Server; gratis hasta 1000 GB por mes)
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

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Friday-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400', 'Access-Control-Expose-Headers': 'X-Words, X-Voz-Via' };
const VERSION = 8;
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
  if (!o || typeof o !== 'object' || out.length >= 10 || depth > 45) return;
  const v = o.videoRenderer || o.compactVideoRenderer;
  if (v && v.videoId) {
    const title = (v.title && (v.title.runs || []).map(x => x.text).join('')) || (v.title && v.title.simpleText) || '';
    const len = (v.lengthText && (v.lengthText.simpleText || (v.lengthText.runs || []).map(x => x.text).join(''))) || '';
    const by = ((v.ownerText || v.longBylineText || v.shortBylineText) && ((v.ownerText || v.longBylineText || v.shortBylineText).runs || []).map(x => x.text).join('')) || '';
    if (len && title && !out.some(x => x.id === v.videoId)) out.push({ id: v.videoId, title, len, by });   // sin duración = transmisión en vivo: no sirve
    return;
  }
  const l = o.lockupViewModel;
  if (l && l.contentId && /VIDEO/.test(l.contentType || 'VIDEO')) {
    const md = l.metadata && l.metadata.lockupMetadataViewModel; const title = md && md.title && md.title.content || '';
    const rows = JSON.stringify(md && md.metadata || {}); const by = (rows.match(/"content":"([^"]+)"/) || [])[1] || '';
    const len = (JSON.stringify(l.contentImage || {}).match(/"text":"(\d+:\d{2}(?::\d{2})?)"/) || [])[1] || '';
    if (title && len && !out.some(x => x.id === l.contentId)) out.push({ id: l.contentId, title, len, by });
    return;
  }
  for (const k in o) collectVideos(o[k], out, depth + 1);
}
// YouTube desde los servidores de Cloudflare a veces devuelve la página de "aceptar cookies" o la de inicio
// (con videos que no tienen nada que ver). Por eso: 1) la búsqueda por la API interna (JSON), con el
// permiso de cookies ya aceptado; 2) la página de resultados; y NUNCA "cualquier video que aparezca".
const YT_CLIENT = '2.20250925.01.00';
const YT_COOKIE = 'CONSENT=YES+cb.20240101-00-p0.es+FX+000; SOCS=CAI; PREF=hl=es&gl=AR';
const NEWS_TOPICS = { argentina: 'NATION', mundo: 'WORLD', economia: 'BUSINESS', deportes: 'SPORTS', tecnologia: 'TECHNOLOGY', espectaculos: 'ENTERTAINMENT', ciencia: 'SCIENCE', salud: 'HEALTH' };
// los diarios traen foto y resumen (como el noticiero de la compu); Google Noticias completa lo que falte
const NEWS_DIARIOS = {
  portada: [['https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml', 'Infobae'], ['https://www.clarin.com/rss/lo-ultimo/', 'Clarín'], ['https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', 'La Nación'], ['https://feeds.bbci.co.uk/mundo/rss.xml', 'BBC Mundo']],
  argentina: [['https://www.clarin.com/rss/politica/', 'Clarín'], ['https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/?outputType=xml', 'La Nación']],
  mundo: [['https://feeds.bbci.co.uk/mundo/rss.xml', 'BBC Mundo'], ['https://www.clarin.com/rss/mundo/', 'Clarín']],
  deportes: [['https://www.clarin.com/rss/deportes/', 'Clarín'], ['https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/?outputType=xml', 'La Nación']],
  economia: [['https://www.clarin.com/rss/economia/', 'Clarín'], ['https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml', 'La Nación']],
  tecnologia: [['https://www.clarin.com/rss/tecnologia/', 'Clarín'], ['https://feeds.bbci.co.uk/mundo/temas/tecnologia/rss.xml', 'BBC Mundo']],
  espectaculos: [['https://www.clarin.com/rss/espectaculos/', 'Clarín'], ['https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/espectaculos/?outputType=xml', 'La Nación']],
};
const NEWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
async function feedText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': NEWS_UA, 'Accept-Language': 'es-AR,es;q=0.9' }, cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) throw new Error('respondió ' + r.status);
  return r.text();
}
const newsKey = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48);
async function newsFetch(env, cat, q) {
  const base = env.NEWS_BASE || 'https://news.google.com', tail = 'hl=es-419&gl=AR&ceid=AR:es-419';
  const gUrl = q ? `${base}/rss/search?q=${encodeURIComponent(q + ' when:3d')}&${tail}`
    : NEWS_TOPICS[cat] ? `${base}/rss/headlines/section/topic/${NEWS_TOPICS[cat]}?${tail}` : `${base}/rss?${tail}`;
  const dia = q ? [] : (NEWS_DIARIOS[cat] || (cat && cat !== 'portada' ? [] : NEWS_DIARIOS.portada));
  const dBase = env.NEWS_DIARIOS_BASE || '';   // (para las pruebas)
  const res = await Promise.all([feedText(gUrl).then(x => parseRss(x, '')).catch(() => []),
    ...dia.map(([u, src]) => feedText(dBase ? dBase + '/' + encodeURIComponent(u) : u).then(x => parseRss(x, src).slice(0, 8)).catch(() => []))]);
  const out = [], seen = new Set(), add = it => { const k = newsKey(it.t); if (!k || seen.has(k)) return; seen.add(k); out.push(it); };
  // los diarios intercalados (uno de cada uno), y después Google
  const ds = res.slice(1);
  for (let i = 0; i < 8; i++) for (const l of ds) if (l[i]) add(l[i]);
  for (const it of res[0]) add(it);
  if (!out.length) throw new Error('no llegaron noticias');
  return out.slice(0, 25);
}
function xmlDec(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
}
function parseRss(x, srcDef) {
  const out = [];
  for (const m of String(x).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1], g = t => { const mm = it.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + t + '>')); return mm ? xmlDec(mm[1]).trim() : ''; };
    let t = g('title'), src = g('source') || srcDef || '';
    if (src && t.endsWith(' - ' + src)) t = t.slice(0, -(src.length + 3));
    else if (!src) { const k = t.lastIndexOf(' - '); if (k > 20) { src = t.slice(k + 3); t = t.slice(0, k); } }
    const desc = xmlDec(g('description')), link = g('link');
    // la foto: media:content, media:thumbnail, enclosure o la primera <img> del texto
    let img = '';
    for (const re of [/<media:content[^>]*url="([^"]+)"[^>]*>/, /<media:thumbnail[^>]*url="([^"]+)"/, /<enclosure[^>]*url="([^"]+)"[^>]*type="image/, /<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/]) { const mm = it.match(re); if (mm) { img = xmlDec(mm[1]); break; } }
    if (!img) { const mm = (desc + xmlDec(g('content:encoded'))).match(/<img[^>]+src=["']([^"']+)/i); if (mm) img = mm[1]; }
    if (img && !/^https?:\/\//.test(img)) img = '';
    const google = /news\.google\.com/.test(link);
    // en Google, la descripción trae otros titulares del mismo tema; en los diarios, el resumen
    const rel = google ? [...desc.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map(a => a[1].replace(/<[^>]+>/g, '').trim()).filter(z => z && z !== t).slice(0, 3) : [];
    let d = google ? '' : desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (d.length > 230) d = d.slice(0, 230).replace(/\s+\S*$/, '') + '…';
    if (d && newsKey(d).startsWith(newsKey(t).slice(0, 30))) d = '';
    if (t) out.push({ t, src, at: Date.parse(g('pubDate')) || 0, link, rel, d, img });
    if (out.length >= 30) break;
  }
  return out;
}

async function ytSearch(env, q) {
  const base = env.YT_BASE || 'https://www.youtube.com';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
  const out = [];
  try {
    const r = await fetch(base + '/youtubei/v1/search?prettyPrint=false', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9', Cookie: YT_COOKIE, 'X-Youtube-Client-Name': '1', 'X-Youtube-Client-Version': YT_CLIENT, Origin: 'https://www.youtube.com' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: YT_CLIENT, hl: 'es', gl: 'AR' } }, query: q, params: 'EgIQAQ%3D%3D' }) });
    if (r.ok) collectVideos(await r.json(), out, 0);
  } catch (e) { }
  if (!out.length) {
    try {
      const r = await fetch(base + '/results?hl=es&gl=AR&search_query=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'es-AR,es;q=0.9', 'User-Agent': UA, Cookie: YT_COOKIE } });
      const html = await r.text();
      const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/) || html.match(/ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/);
      if (m) { try { collectVideos(JSON.parse(m[1]), out, 0); } catch (e) { } }
    } catch (e) { }
  }
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

// Segunda forma de pedir la misma voz (la que usa la app de Microsoft Translator): si la de Edge da 403, se usa esta.
const MS_KEY = 'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==';
let msTok = { t: '', r: '', exp: 0 };
const b64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function msSign(urlStr) {
  const enc8 = encodeURIComponent(urlStr.split('://')[1]);
  const id = hex32(), date = (new Date().toUTCString().replace(/GMT/, '').trim() + ' GMT').toLowerCase();
  const key = await crypto.subtle.importKey('raw', unb64(MS_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64(await crypto.subtle.sign('HMAC', key, enc.encode(('MSTranslatorAndroidApp' + enc8 + date + id).toLowerCase())));
  return `MSTranslatorAndroidApp::${sig}::${date}::${id}`;
}
async function msToken(env) {
  if (msTok.t && Date.now() < msTok.exp) return msTok;
  const url = env.MS_ENDPOINT || 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
  const r = await fetch(url, { method: 'POST', headers: { 'Accept-Language': 'es-AR', 'X-ClientVersion': '4.0.530a 5fe1dc6c', 'X-UserId': hex32().slice(0, 16), 'X-HomeGeographicRegion': 'es-AR',
    'X-ClientTraceId': hex32(), 'X-MT-Signature': await msSign(url), 'User-Agent': 'okhttp/4.5.0', 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': '0' } });
  if (!r.ok) throw new Error('Microsoft Translator respondió ' + r.status);
  const j = await r.json();
  if (!j.t || !j.r) throw new Error('Microsoft Translator no dio permiso');
  msTok = { t: j.t, r: j.r, exp: Date.now() + 8 * 60000 };
  return msTok;
}
async function msSpeak(env, text, voz, rate) {
  const tk = await msToken(env);
  const url = env.MS_TTS ? env.MS_TTS : `https://${tk.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="es-AR"><voice name="${voz}"><prosody rate="${rate}" pitch="+0%">${xmlEsc(text)}</prosody></voice></speak>`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: tk.t, 'Content-Type': 'application/ssml+xml', 'User-Agent': 'okhttp/4.5.0', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' }, body: ssml });
  if (r.status === 401) msTok.exp = 0;
  if (!r.ok) throw new Error('Microsoft respondió ' + r.status);
  const audio = new Uint8Array(await r.arrayBuffer());
  if (!audio.length) throw new Error('la voz vino vacía');
  return { audio, words: [] };
}
let viaOk = '';   // la forma que anduvo la última vez va primero
async function speakAny(env, text, voz, rate, via) {
  const order = via === 'edge' ? ['edge'] : via === 'ms' ? ['ms'] : viaOk === 'ms' ? ['ms', 'edge'] : ['edge', 'ms'];
  const errs = [];
  for (const w of order) {
    try { const out = w === 'edge' ? await edgeSpeak(env, text, voz, rate) : await msSpeak(env, text, voz, rate); viaOk = w; out.via = w; return out; }
    catch (e) { errs.push((w === 'edge' ? 'Edge: ' : 'Translator: ') + e.message); }
  }
  throw new Error(errs.join(' · '));
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

    if (p === '/ping') return json({ ok: true, v: VERSION, tts: true, tele: true, ia: !!env.AI, turn: !!(env.TURN_KEY_ID && env.TURN_KEY_TOKEN), tuya: !!(env.TUYA_ID && env.TUYA_SECRET), google: !!(env.GOOGLE_ID && env.GOOGLE_SECRET) });

    // BUFIA: un cerebro de respaldo (Workers AI). Recibe la charla como OpenAI y contesta de a pedacitos
    if (p === '/ia' && req.method === 'POST') {
      if (!env.AI) return json({ ok: false, error: 'falta el enlace de Workers AI (Settings → Bindings → Workers AI, nombre AI)' }, 501);
      let b = {}; try { b = await req.json(); } catch (e) { }
      const permitidos = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/openai/gpt-oss-120b', '@cf/qwen/qwen3-30b-a3b-fp8'];
      const model = permitidos.includes(b.model) ? b.model : permitidos[0];
      const messages = (Array.isArray(b.messages) ? b.messages : []).slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user', content: String(m.content || '').slice(0, 12000) }));
      try {
        const out = await env.AI.run(model, { messages, stream: true, max_tokens: Math.min(+b.max_tokens || 900, 2000) });
        return new Response(out, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', ...CORS } });
      } catch (e) { return json({ ok: false, error: 'Workers AI: ' + e.message }, 502); }
    }

    if (p === '/tuya' && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (e) { }
      try { return json(await tuyaCall(env, b)); } catch (e) { return json({ success: false, msg: 'no pude hablar con Tuya: ' + e.message }); }
    }

    // noticias: Google Noticias (Argentina), por sección o por tema; las lee la tablet en voz alta
    if (p === '/news') {
      const q = (u.searchParams.get('q') || '').slice(0, 120), cat = (u.searchParams.get('cat') || '').slice(0, 20);
      try { return json({ ok: true, items: await newsFetch(env, cat, q) }); } catch (e) { return json({ ok: false, error: e.message }); }
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
      else b = { text: u.searchParams.get('text') || 'Hola, soy FRIDAY. Así sueno.', voz: u.searchParams.get('voz') || 'elena', rate: u.searchParams.get('rate') || '', via: u.searchParams.get('via') || '' };
      const text = String(b.text || '').slice(0, 1200).trim(), voz = VOCES[b.voz] || VOCES.elena;
      const rate = /^[+-]\d{1,2}%$/.test(b.rate || '') ? b.rate : '+8%';
      if (!text) return json({ ok: false, error: 'falta el texto' }, 400);
      // las frases que se repiten ("Listo.", "¿Sí?") quedan guardadas: salen al instante
      const cache = typeof caches !== 'undefined' ? caches.default : null;
      const ck = cache && new Request('https://friday-tts.cache/' + (await sha256(voz + '|' + rate + '|' + text)));
      if (cache) { const hit = await cache.match(ck); if (hit) { const h = new Headers(hit.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v); return new Response(hit.body, { headers: h }); } }
      try {
        const { audio, words, via } = await speakAny(env, text, voz, rate, b.via);
        const res = new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'X-Words': encodeURIComponent(JSON.stringify(words)), 'X-Voz-Via': via, 'Cache-Control': 'public, max-age=2592000', ...CORS } });
        if (cache && text.length < 160) { try { await cache.put(ck, res.clone()); } catch (e) { } }
        return res;
      } catch (e) { return json({ ok: false, error: e.message }, 502); }
    }

    if (p === '/turn') {
      if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return json({ ok: false, error: 'sin_turn' });
      try {
        const r = await fetch((env.TURN_API || 'https://rtc.live.cloudflare.com/v1/turn/keys/') + env.TURN_KEY_ID + '/credentials/generate-ice-servers', { method: 'POST', headers: { Authorization: 'Bearer ' + env.TURN_KEY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
        const j = await r.json(); let ice = j.iceServers;
        if (ice && !Array.isArray(ice)) ice = [ice];
        if (!ice || !ice.length) return json({ ok: false, error: 'Cloudflare no dio el puente (' + r.status + ')' });
        return json({ ok: true, iceServers: ice });
      } catch (e) { return json({ ok: false, error: e.message }); }
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
