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
    r3 = await p.evaluate("""async()=>{
      // candado con PIN puesto, tapando también las compras
      await Candado.ponerPin('123456'); const cfg=Candado.cfg(); cfg.que='todo'; Candado.guardar(cfg); Candado.cerrar();
      showSheet('compras'); const tapadaC = !$('cmCandado').hidden && $('cmCuerpo').hidden;
      // «solo la plata»: las compras se abren igual
      const c2=Candado.cfg(); c2.que='plata'; Candado.guardar(c2); cmCandadoUI();
      const abiertaC = $('cmCandado').hidden && !$('cmCuerpo').hidden;
      const plataIgual = Candado.protege('plata');
      const ok = await Candado.abrirConPin('123456');
      Candado.sacar();
      return {tapadaC, abiertaC, plataIgual, ok};
    }""")
    ok('Candado: puede tapar también las compras', r3['tapadaC'], r3)
    ok('Candado: si elegís solo la plata, las compras se abren', r3['abiertaC'], r3)
    ok('Candado: la plata siempre queda tapada', r3['plataIgual'], r3)
    ok('Candado: el PIN abre', r3['ok'], r3)
    r4 = await p.evaluate("""()=>{
      plata={entradas:[], fijos:[]}; LS.set('gastos',[]); LS.set('plata',plata);
      plDeTexto('cobré 300 mil de la jubilación', false); plDeTexto('gasté 20 mil en el súper', false);
      LS.set('compras',[{id:'1',t:'leche',h:false},{id:'2',t:'pan',h:true}]);
      const abierto=diaPlataTxt().join(' | ');
      Candado.cerrar();
      const out={abierto, dispara:DIA_RE.test('como venimos') && DIA_RE.test('que tengo hoy') && !DIA_RE.test('como estas')};
      return out;
    }""")
    ok('El día: junta la plata y el changuito', '$280.000' in r4['abierto'] and 'changuito' in r4['abierto'], r4['abierto'])
    ok('El día: entiende «¿cómo venimos?»', r4['dispara'])
    r5 = await p.evaluate("""async()=>{
      await Candado.ponerPin('123456'); Candado.cerrar();
      const t=diaPlataTxt().join(' | '); Candado.sacar();
      return {t, mudo: t.includes('candado') && !t.includes('280.000')};
    }""")
    ok('El día: con candado no dice la plata', r5['mudo'], r5['t'])
    ok('Móvil: sin errores de JS', not errs, errs[:3])
    await c.close()
    # la tablet
    c, p, errs = await abrir(b, 'panel.html', {'width': 1280, 'height': 800})
    v = await p.evaluate('VERSION')
    ok(f'Casa {v} arranca', await p.evaluate("!!document.getElementById('dock')"))
    await p.evaluate("try{ document.getElementById('tap').click(); }catch(e){}"); await p.wait_for_timeout(2500)
    ok('Casa: escenas en el inicio', await p.evaluate("document.querySelectorAll('#ctl .esc').length") > 0)
    # las tareas de la casa (6.9): de quién es cada una, las secciones y la fichita
    t = await p.evaluate("""()=>{
      const out={};
      S.familia={apellido:'Bufalo', miembros:['Pedro','Sofi','Mamá']}; saveS();
      tareas=[]; LS.set('tareas',[]);
      // dictada con el dueño adentro del texto, que es como habla la gente
      tareaNueva('juntar la caca del perro la hace Sofi', 'diaria', '', '', 10);
      const t1=tareas[0];
      out.saca = t1.t==='Juntar la caca del perro' && (t1.rota||[]).join()==='Sofi';
      // y con el campo de siempre, turnándose
      tareaNueva('lavar los platos', 'diaria', '21', 'Pedro, Sofi', 20);
      const t2=tareaBuscar('lavar los platos');
      out.turnan = (t2.rota||[]).join()==='Pedro,Sofi' && t2.hora==='21:00' && t2.pts===20;
      // «cualquiera» se respeta
      tareaNueva('regar las plantas', 'semanal', '', 'cualquiera', 10);
      out.cualquiera = (tareaBuscar('regar las plantas').rota||[]).length===0;
      // el dibujito sale solo de lo que dice la tarea
      out.ico = tareaIco(t1)==='🐶' && tareaIco(t2)==='🍽️' && tareaIco({t:'cualquier cosa'})==='🧽';
      // la pantalla, con sus secciones
      osOpen('tareas'); renderTareas();
      const h=document.getElementById('pTar').textContent;
      out.secciones = h.includes('Hoy') && h.includes('Todas') && h.includes('Sofi');
      out.sinInterrogante = !h.includes('?');
      // marcar y deshacer
      const antes=tareas.find(x=>x.id===t1.id).hechos.length;
      tareaMarcar(t1, 'Sofi'); const medio=t1.hechos.length;
      tareaDesmarcar(t1);
      out.deshacer = antes===0 && medio===1 && t1.hechos.length===0 && t1.turno===0;
      // la fichita
      tedShow(t1.id);
      out.ficha = !!document.getElementById('tedT') && document.getElementById('tedT').value==='Juntar la caca del perro'
        && document.querySelectorAll('#tedQ button').length===4;
      ted.rota=['Mamá']; ted.pts=25; tedGuardar();
      const t1b=tareas.find(x=>x.id===t1.id);
      out.guarda = (t1b.rota||[]).join()==='Mamá' && t1b.pts===25 && !document.getElementById('ted');
      return out;
    }""")
    ok('Casa: saca de quién es del texto dictado', t['saca'])
    ok('Casa: anota turnos, hora y puntos', t['turnan'])
    ok('Casa: respeta «cualquiera»', t['cualquiera'])
    ok('Casa: cada tarea con su dibujito', t['ico'])
    ok('Casa: las tareas van por secciones', t['secciones'])
    ok('Casa: ya no quedan con «?»', t['sinInterrogante'])
    ok('Casa: se puede deshacer una tarea marcada', t['deshacer'])
    ok('Casa: la fichita abre con lo que había', t['ficha'])
    ok('Casa: y guarda de quién es y los puntos', t['guarda'])
    ok('Casa: sin errores de JS', not errs, errs[:3])
    await c.close(); await b.close(); await pw.stop()

web = subprocess.Popen([sys.executable, '-m', 'http.server', str(PUERTO), '-d', RAIZ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try: asyncio.run(main())
finally: web.kill()
print('\nTODO BIEN' if not mal else f'\n{len(mal)} problemas'); sys.exit(1 if mal else 0)
