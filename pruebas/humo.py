# Prueba de humo de FRIDAY Móvil y FRIDAY Casa (la corre GitHub en cada cambio).
# Abre las dos apps en un Chromium sin internet y revisa que arranquen sin errores,
# que las versiones coincidan y que no se haya colado ninguna llave.
import asyncio, json, os, re, subprocess, sys, time
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO = 8771; BASE = f'http://localhost:{PUERTO}/'
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
PUBLICOS = {'nombre@gmail.com', 'bufalabs.ar@gmail.com'}   # el contacto público de BufaLabs
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
    # la plata: anotar hablando, lo de todos los meses y las cuentas
    r = await p.evaluate("""()=>{
      localStorage.removeItem('fm.plata'); localStorage.removeItem('fm.gastos');
      plata={entradas:[], fijos:[]};
      const out={};
      out.gasto = plDeTexto('gasté 3 mil en el súper', false);
      out.farmacia = plDeTexto('pagué 12.500 en la farmacia', false);
      out.fijo = !!plFijoNuevo('Jubilación 280 mil el 10');
      out.cobre = plDeTexto('cobré la jubilación', false);
      const r = plResumen(0);
      out.entro=r.entro; out.gasto_total=r.gasto; out.queda=r.queda;
      out.rubro = plRubro('farmacia san juan')[0];
      out.queda_txt = gastoDeVoz('¿cuánto me queda?');
      out.en_remedios = gastoDeVoz('cuánto gasté en remedios');
      out.nada = plDeTexto('qué lindo día', false);
      return out;
    }""")
    ok('Plata: anota un gasto hablando', '3.000' in (r['gasto'] or ''), r['gasto'])
    ok('Plata: entiende 12.500', r['gasto_total'] == 15500, r['gasto_total'])
    ok('Plata: carga lo de todos los meses', r['fijo'])
    ok('Plata: «cobré la jubilación» usa el monto de siempre', r['entro'] == 280000, r['cobre'])
    ok('Plata: saca la cuenta de lo que queda', r['queda'] == 264500, r['queda'])
    ok('Plata: ordena por rubro', r['rubro'] == 'remedios', r['rubro'])
    ok('Plata: contesta cuánto queda', '264.500' in (r['queda_txt'] or ''), r['queda_txt'])
    ok('Plata: contesta por rubro', '12.500' in (r['en_remedios'] or ''), r['en_remedios'])
    ok('Plata: no anota cualquier cosa', r['nada'] == '', r['nada'])
    await p.evaluate("showSheet('plata')"); await p.wait_for_timeout(600)
    ok('Plata: la hoja se abre y muestra el mes', await p.evaluate("document.querySelectorAll('#plLista .pl-mov').length") == 3)
    r2 = await p.evaluate("""()=>{
      const o=syncLocal(); const g=Object.keys(o).filter(k=>k[0]==='g');
      const antesG=gastos().length, antesF=(plata.fijos||[]).length;
      syncApply([{id:'g:abc123', v:{t:'gasto', m:5000, q:'el kiosco', at:Date.now()}},
                 {id:'g:fZZ9', v:{fijo:1, t:'entra', q:'Sueldo', m:500000, dia:5, ultimo:''}}]);
      return {g:g.length, fijo:g.some(k=>k.startsWith('g:f')), entra:g.some(k=>o[k].t==='entra'),
              gastoNuevo:gastos().length-antesG, fijoNuevo:(plata.fijos||[]).length-antesF,
              queda:plResumen(0).queda};
    }""")
    ok('Plata: la manda a los otros aparatos', r2['g'] >= 4 and r2['fijo'] and r2['entra'], r2)
    ok('Plata: recibe lo que anotaron en la compu', r2['gastoNuevo'] == 1 and r2['fijoNuevo'] == 1, r2)
    ok('Plata: la cuenta sigue cerrando', r2['queda'] == 259500, r2['queda'])
    r3 = await p.evaluate("""async()=>{
      const out={};
      out.sinCandado = Candado.abierto();                       // sin candado, todo abierto
      await Candado.ponerPin('2468');                           // como si el celu no tuviera huella
      out.puesto = Candado.puesto();
      out.guardaPin = (LS.get('candado',{}).pin||'').length>20 && !JSON.stringify(LS.get('candado',{})).includes('2468');
      Candado.cerrar();
      out.cerrado = !Candado.abierto();
      renderPlata();
      out.tapa = !document.getElementById('plCandado').hidden && document.getElementById('plCuerpo').hidden;
      out.menuMudo = (document.getElementById('plMenuTxt')||{}).textContent;
      out.vozMuda = gastoDeVoz('¿cuánto me queda?');
      out.anota = gastoDeVoz('gasté 2 mil en el kiosco');
      out.cerebroMudo = gastosPrompt().includes('candado') && !gastosPrompt().includes('$');
      out.malPin = await Candado.abrirConPin('1111');
      out.buenPin = await Candado.abrirConPin('2468');
      renderPlata();
      out.abierta = document.getElementById('plCandado').hidden;
      Candado.sacar(); renderPlata();
      return out;
    }""")
    ok('Candado: sin candado, la plata se ve', r3['sinCandado'])
    ok('Candado: guarda una huella del PIN, no el PIN', r3['guardaPin'], r3['guardaPin'])
    ok('Candado: con candado tapa la hoja', r3['tapa'] and r3['cerrado'])
    ok('Candado: el menú no muestra el saldo', r3['menuMudo'] == 'Con candado', r3['menuMudo'])
    ok('Candado: por voz no dice números', 'candado' in (r3['vozMuda'] or '').lower(), r3['vozMuda'])
    ok('Candado: igual te anota el gasto, sin montos', r3['anota'] == 'Listo, lo anoté.', r3['anota'])
    ok('Candado: el cerebro tampoco los ve', r3['cerebroMudo'])
    ok('Candado: un PIN equivocado no abre', r3['malPin'] is False)
    ok('Candado: el PIN correcto abre', r3['buenPin'] and r3['abierta'])
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
