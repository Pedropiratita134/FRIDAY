# Prueba de humo de FRIDAY Móvil y FRIDAY Casa (la corre GitHub en cada cambio).
# Abre las dos apps en un Chromium sin internet y revisa que arranquen sin errores,
# que las versiones coincidan y que no se haya colado ninguna llave.
import asyncio, json, os, re, subprocess, sys, time
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO = 8765; BASE = f'http://localhost:{PUERTO}/'
mal = []
def ok(nombre, cond, extra=''):
    print(('ok   ' if cond else 'MAL  ') + nombre, '' if cond else str(extra)[:300], flush=True)
    if not cond: mal.append(nombre)

# archivos
vj = json.load(open(os.path.join(RAIZ, 'version.json'), encoding='utf-8'))
for m in ('manifest.json', 'manifest-panel.json'):
    j = json.load(open(os.path.join(RAIZ, m), encoding='utf-8'))
    ok(f'{m}: íconos presentes', all(os.path.exists(os.path.join(RAIZ, i['src'])) for i in j['icons']))
sw = open(os.path.join(RAIZ, 'sw.js'), encoding='utf-8').read()
ok('sw.js tiene nombre de caché', re.search(r"const CACHE='friday-movil-\d+'", sw))
PROHIBIDO = [r'gsk_[A-Za-z0-9]{40,}', r'AIza[0-9A-Za-z_\-]{35}', r'-----BEGIN [A-Z ]*PRIVATE KEY-----']
PUBLICOS = {'bufalabs.ar@gmail.com'}   # el contacto público de BufaLabs
for f in os.listdir(RAIZ):
    if f.endswith(('.html', '.js', '.json', '.txt', '.md')):
        s = open(os.path.join(RAIZ, f), encoding='utf-8', errors='replace').read()
        for r in PROHIBIDO:
            if re.search(r, s): ok(f'{f}: sin llaves', False, r)
        otros = set(re.findall(r'[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.com', s)) - PUBLICOS
        if otros: ok(f'{f}: sin mails personales', False, f'{len(otros)} mail(s)')
    if f in ('tv-pairing.json', '.env') or 'privad' in f.lower(): ok(f'{f} no se publica', False)

async def abrir(b, pagina, vista):
    c = await b.new_context(viewport=vista, service_workers='block'); p = await c.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    await p.route('**/*', lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
    await p.goto(BASE + pagina); await p.wait_for_timeout(3000)
    return c, p, errs

async def main():
    pw = await async_playwright().start(); b = await pw.chromium.launch()
    # el celu
    c, p, errs = await abrir(b, 'index.html', {'width': 390, 'height': 844})
    v = await p.evaluate('VERSION')
    ok(f'Móvil {v} arranca', await p.evaluate("!!document.getElementById('face')"))
    ok('Móvil: versión igual a version.json', v == vj['version'], (v, vj['version']))
    ok('Móvil: novedades de esta versión', await p.evaluate('NOVEDADES_M.version') == v)
    ok('Móvil: sin errores de JS', not errs, errs[:3])
    await c.close()
    # la tablet
    c, p, errs = await abrir(b, 'panel.html', {'width': 1280, 'height': 800})
    v = await p.evaluate('VERSION')
    ok(f'Casa {v} arranca', await p.evaluate("!!document.getElementById('dock')"))
    await p.evaluate("try{ document.getElementById('tap').click(); }catch(e){}"); await p.wait_for_timeout(2500)
    ok('Casa: escenas en el inicio', await p.evaluate("document.querySelectorAll('#ctl .esc').length") > 0)
    ok('Casa: sin errores de JS', not errs, errs[:3])
    await c.close(); await b.close(); await pw.stop()

web = subprocess.Popen([sys.executable, '-m', 'http.server', str(PUERTO), '-d', RAIZ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try: asyncio.run(main())
finally: web.kill()
print('\nTODO BIEN' if not mal else f'\n{len(mal)} problemas'); sys.exit(1 if mal else 0)
