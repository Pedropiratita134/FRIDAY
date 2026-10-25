FRIDAY.exe 3.1  -  FRIDAY versión 80
====================================

QUÉ CAMBIA
- FRIDAY.exe reemplaza al servidor de PowerShell (friday-server.ps1 y friday-manos.ps1).
- La cara de FRIDAY es la misma de siempre: friday.html en Edge, con la voz Elena y todas sus funciones.
- Ya no se abre ningún PowerShell (ni oculto) para el mouse, el teclado, las capturas o traer ventanas al frente.
- "Mirá mi pantalla" ya no muestra el cartel de "compartir pantalla" de Edge.
- Al lado del reloj de Windows aparece el ícono de FRIDAY. Con clic derecho podés:
    Abrir FRIDAY · Configuración · Celular · Ver registro · Abrir la carpeta · Apagar FRIDAY
- Si abrís FRIDAY cuando ya está abierta, la trae al frente y no abre otra ventana.

CÓMO ACTUALIZAR
- Desde la 1.5.1, si abrís un FRIDAY.exe más nuevo y había uno viejo prendido, el nuevo cierra al viejo solo.
- Para verificar: Ajustes -> General, abajo de todo dice "FRIDAY versión 80 · FRIDAY.exe 3.1".

CÓMO INSTALARLA (una sola vez)
1. Copiá todos los archivos a tu carpeta de FRIDAY (idealmente C:\FRIDAY) y reemplazá los viejos.
   Si tenés la carpeta "voz" (Daniela), dejala donde está.
2. Doble clic en INSTALAR-FRIDAY.bat. Esto actualiza el ícono del escritorio y el arranque automático
   para que usen FRIDAY.exe, con el logo de BufaLabs.
3. Abrí FRIDAY desde el ícono del escritorio.

SI WINDOWS LA FRENA
- "Windows protegió su PC": tocá "Más información" y después "Ejecutar de todas formas".
  Pasa porque FRIDAY.exe es un programa nuevo sin firma digital. Aparece una sola vez.
- Si Defender borra FRIDAY.exe, ejecutá de nuevo INSTALAR-FRIDAY.bat: el ícono vuelve a usar
  el servidor de antes y FRIDAY sigue andando como siempre. Avisale a Claude y lo resolvemos.

ARCHIVOS
- FRIDAY.exe ............ el programa nuevo
- friday.html ........... FRIDAY (versión 80)
- friday-server.ps1, friday-manos.ps1, friday-oculto.vbs ... respaldo por si el .exe no anda
- codigo-exe\ ........... el código de FRIDAY.exe (no hace falta tocarlo)

NUEVO EN LA 62: FRIDAY EN EL CELULAR
1. En FRIDAY: Ajustes -> Celular -> "Vincular celular". Aparece un código QR.
2. Con el celu en el MISMO wifi de casa, abrí la cámara y apuntá al QR. Tocá el link: se vincula solo.
3. En el celu, menú del navegador -> "Agregar a la pantalla principal". Queda como una app.
- La primera vez Windows puede preguntar por el firewall: tocá "Permitir".
  Si el celu no conecta, tocá "No conecta: permitir en el firewall" (pide permiso de administrador una vez).
- Abajo elegís dónde contesta: "Celu con voz", "Solo texto" o "En la compu" (lo dice por los parlantes).
- Botones: Música, Tele, Pantalla (foto o en vivo), Estado, Abrir programas, Recordatorios, Compu (bloquear/apagar), Avisos.
- Apagar o cerrar cosas siempre te pide confirmación en el celu.
- Si FRIDAY está cerrada en la compu y le escribís, FRIDAY.exe la abre sola.

AVISOS AL CELU (ntfy, gratis)
1. Ajustes -> Celular -> tildá "Mandarme avisos al celu".
2. En el celu instalá la app "ntfy" (Play Store) y en la FRIDAY del celu tocá Avisos -> "Suscribirme en ntfy".
3. Tocá "Probar aviso".
Te avisa: recordatorios (aunque FRIDAY esté cerrada), cuando terminan los informes de la noche, si el disco C
se llena, y lo que le pidas ("mandame la lista al celu"). Los avisos pasan por ntfy.sh con un tema secreto.

NUEVO EN LA 63
- La voz en el celu: ahora se destraba sola con tu primer toque (Android no deja hablar si no).
  Si la voz del celu no anda, prueba otras; en el celu, menú ☰ -> "Probar la voz".
  Si en la compu tenés instalada la voz de Daniela, la podés elegir para el celu.
- FRIDAY fuera de casa: Ajustes -> Celular -> "Usarla fuera de casa" (Tailscale, gratis).
  Con Tailscale en la compu y en el celu (misma cuenta), el QR nuevo anda en casa y en la calle.
- Tele: si la tele rechaza la clave guardada, FRIDAY la borra y pide permiso de nuevo (sale el cartel
  "LG Remote App" en la tele). Si igual no deja, te muestra lo que dijo la tele y qué tocar.
  "Olvidar tele" ahora borra también la clave que guarda FRIDAY.exe.

NUEVO EN LA 64
- El celu con Tailscale no entraba: Windows bloquea las conexiones que vienen por Tailscale si la primera vez
  se permitió solo "redes privadas". Ajustes -> Celular muestra el aviso "Falta un permiso de Windows" y al
  vincular lo arregla solo (pide permiso de administrador una vez: tocá "Sí").
- La app del celu tiene la misma cara (núcleo o avatar), los mismos colores (JARVIS azul o FRIDAY ámbar),
  la hora y el estilo de la compu. Si cambiás la cara o los colores en la compu, el celu cambia solo.

NUEVO EN LA 65
- Noticias: lo que dice FRIDAY es lo mismo que se ve en el noticiero. "Las noticias de hoy" cuenta justo las de la
  pantalla, en orden. "Noticias de River / de Colapinto" busca ese tema y el noticiero muestra ESAS notas.
- Celu: los botones (música, tele, pantalla, estado, abrir, agenda, compu, avisos) quedaron juntos en el
  "Panel de control" (botón de cuadraditos arriba, o "Panel de control" abajo de la hora). Diseño más prolijo.

NUEVO EN LA 66
- Menú nuevo al hacer clic derecho en el ícono de FRIDAY (al lado del reloj): panel oscuro con tu nombre,
  el estado (en línea, celular, remoto, avisos) y: Abrir FRIDAY, Ventanita, Configuración, Celular y avisos,
  Ver registro, Abrir la carpeta, Reiniciar FRIDAY y Apagar FRIDAY. Se maneja con el mouse o con flechas y Enter.

NUEVO EN LA 67
- Todos los menús de la compu con el estilo nuevo: Ajustes y Encargos como paneles flotantes redondeados,
  tu cuenta arriba de Ajustes (nombre, estado, cerebro, tele, celular, avisos), pestañas con íconos,
  botones, casillas y listas más modernos, el cartel de confirmar y la barra de escribir renovados.

NUEVO EN LA 68: CUENTAS Y TUTORIAL
- Cada persona tiene su perfil (memoria, recordatorios, ajustes y claves propias).
- Tu FRIDAY de siempre pasa sola a ser tu perfil: no se pierde nada.
- Iniciar sesión con Google: tus cosas se guardan en TU Google Drive (carpeta privada de FRIDAY) y en
  cualquier compu donde inicies sesión, FRIDAY te reconoce. Hace falta configurarlo UNA vez:
  en la pantalla de inicio tocá "Ver cómo" (o Ajustes -> tu cuenta -> Conectar con Google) y seguí los pasos.
  El archivo google-cliente.json va en esta carpeta; copiá la carpeta entera a las otras compus.
- Perfiles sin cuenta: quedan solo en esa compu.
- Cambiar de usuario: Ajustes -> tu cuenta -> "Cambiar de usuario", o clic derecho en el ícono de FRIDAY.
- La primera vez de cada perfil hay un tutorial: nombre, clave gratis de Groq (con prueba), micrófono y voz,
  y todo lo que FRIDAY sabe hacer. Se puede ver de nuevo en Ajustes -> General.

NUEVO EN LA 69
- Arreglado: en el tutorial y el inicio de sesión ya se puede escribir (antes saltaba a la barra de FRIDAY).
- Tutorial más corto: 3 pasos (nombre, cerebro, listo). La clave de Groq se pega con un botón y se prueba sola.
- Configurar Google: de a un paso, cada botón abre la página exacta, y la llave descargada FRIDAY la
  encuentra sola en Descargas (no hay que renombrar ni mover nada).

NUEVO EN LA 70: ISLA FLOTANTE, MÚSICA EN EL DEMO Y EN REPOSO
- La vista flotante ahora es una "isla": cuando estás usando otra cosa y FRIDAY te escucha, piensa o habla,
  brota desde arriba al medio de la pantalla (como Siri / la isla del iPhone), con su cara grande y un
  brillo de colores que late con la voz. Cuando termina, se achica y se vuelve a meter.
  - Tocala: te escucha sin decir "Friday" (si está hablando, la pausa; otro toque y sigue).
  - Doble clic: abre FRIDAY.  Clic derecho: la esconde hasta la próxima vez que hable.
  - Llevá el mouse arriba al medio de la pantalla y asoma una pastillita.
  - No aparece si FRIDAY ya está al frente, y no molesta en juegos o videos en pantalla completa.
  - Se prende y apaga con el botón "Flotante", en Ajustes -> General -> Isla flotante (tamaño chica/normal/
    grande, y si queda una pastillita cuando está tranquila) o con clic derecho en el ícono de FRIDAY.
  - La dibuja FRIDAY.exe (no abre otra ventana de Edge): no gasta casi nada cuando está escondida.
- Modo demo: si suena música (Spotify o YouTube), aparece la tapa del disco con un vinilo girando, el tema,
  el artista y unas ondas; el fondo se tiñe con los colores del disco. Cambia sola con cada tema.
  Más cosas en el demo: el próximo recordatorio con su hora, un titular de las noticias y el clima del día.
- En reposo (modo JARVIS), debajo del reloj: lo que está sonando, el clima y tu próximo recordatorio.
- Para que la isla responda al instante aunque FRIDAY quede atrás de otras ventanas, Edge ya no le frena
  los relojes cuando está en segundo plano (se aplica la próxima vez que se abra FRIDAY).

NUEVO EN LA 71: PUNTERO, ISLA MÁS FINA Y MEJOR OÍDO
- Puntero de FRIDAY: cuando le decís "mirá mi pantalla" (o "¿dónde está el error?", "¿qué tengo que tocar?"),
  aparece SU flechita (con el color de FRIDAY) que viaja hasta lo que te está explicando, con una onda y un
  cartelito ("Falta cerrar el paréntesis"). Va señalando cada cosa justo cuando la nombra.
  No mueve tu mouse ni tapa los clics. Necesita la clave de Gemini (la que ya usa para ver la pantalla).
  - Cuando FRIDAY maneja la compu sola, antes de cada clic te muestra con el puntero dónde va a tocar.
  - Se apaga en Ajustes -> Voz y oído -> "Cuando mira tu pantalla, que te señale las cosas con su puntero".
  - Ni la isla ni el puntero salen en las capturas (FRIDAY no se ve a sí misma).
- Isla más chica y menos tosca: vidrio oscuro con la cara hecha de luz (sin el cuadrado celeste) y abajo una
  onda de colores que se mueve con TU voz mientras te escucha, y con la de ella cuando habla.
  Ya no salta cuando habla la tele o alguien cerca: solo cuando le dijiste "Friday" o recién te habló.
- Oído: usa el Whisper más preciso (si se satura, vuelve solo al rápido), le cuenta de qué venían hablando y
  los nombres que conoce de vos, y si hablás bajito o lejos sube tu voz antes de entenderla.

NUEVO EN LA 72: LA BARRITA DE COLORES
- La isla está SIEMPRE prendida (se fue el botón "Flotante" y la opción de apagarla). Antes, tocar "Flotante"
  la apagaba y la prendía, por eso parecía que solo salía al tocarlo.
- Arriba al medio de la pantalla queda una barrita finita con los colores de FRIDAY. Cuando oye una voz,
  la barrita se enciende con tu voz; cuando le decís "Friday" (o te habla) la isla BROTA de esa barra,
  te escucha, piensa y habla, y después se vuelve a meter en la barra.
  Si no querés la barrita: Ajustes -> General -> Isla flotante -> "No mostrar nada".
- No tapa nada: los clics pasan de largo y si pasás el mouse por encima se vuelve casi transparente.
- Cara nueva: dos ojos grandes de luz (estilo robotito), que parpadean, miran para los costados, se
  agrandan cuando te escuchan y se van para arriba cuando piensa; cuando habla aparece una boquita.
- Si FRIDAY está al frente en pantalla completa no sale (ya la estás viendo). En juegos o videos a
  pantalla completa no hay barrita, pero si te habla la isla sale igual.
- Si Edge frena la ventana de FRIDAY cuando queda atrás, la isla igual se entera (usa la misma conexión
  que el celu) y ya no desaparece en medio de una respuesta.

NUEVO EN LA 73: LA ISLA CAMBIA DE FORMA
- Apenas decís "Friday" la isla brota (antes esperaba a que terminaras toda la frase y salía recién
  cuando contestaba). Mientras hablás, FRIDAY escucha el primer pedacito y si es "Friday" ya te atiende.
- Si te habla del CLIMA, la isla se estira y muestra un tablero: ícono animado (sol, nubes, lluvia,
  tormenta...), la temperatura grande, el estado, mínima y máxima, y las próximas horas.
- Si te cuenta las NOTICIAS, muestra la foto, el diario y el titular de la que está contando, y va
  pasando de una a otra (con fundido) a medida que habla. Los puntitos de abajo dicen cuál es.
- La carita se corre a la izquierda y sigue viva (parpadea, mira, habla). Cuando le volvés a hablar,
  la isla vuelve a su forma. Todo se mueve con resortes, sin saltos.

NUEVO EN LA 74: TELES LG CON FIRMWARE NUEVO
- Las LG actualizadas (webOS 2025/26) rechazaban a FRIDAY con "403 Pairing rejected: blacklisted
  certificate detected": LG bloqueó la firma de prueba que usan todas las apps de control remoto.
  Ahora, si la tele dice eso, FRIDAY se registra sin esa firma y te sale el cartel para aceptar.
  Tocá "Buscar y conectar mi tele" y aceptá el cartel con el control.

NUEVO EN LA 75
- Los avisos en la tele ahora salen con la carita de FRIDAY a la izquierda (el cartel en sí lo dibuja la
  tele LG y no se le puede cambiar el estilo). Se sacaron los emojis, que la tele no muestra bien.

NUEVO EN LA 76: FRIDAY EN LA TELE (PANTALLA COMPLETA)
- Decile, por ejemplo:
    "Friday, poné el modo demo en la tele"   → reloj grande, clima, lo que suena con la tapa del disco,
                                                tu próximo recordatorio y titulares que van pasando.
    "Friday, mostrame las noticias en la tele" → cada noticia con su foto; si te las cuenta, la tele
                                                va mostrando la que está diciendo.
    "Friday, pasá el clima a la tele"          → el clima en grande con las próximas horas.
    "Friday, poné lo que está sonando en la tele" → la tapa del disco gigante con el vinilo girando.
    "Friday, sacá FRIDAY de la tele"           → se despide y cierra (o apretá Atrás en el control).
- Mientras está en la tele, cuando FRIDAY habla aparecen subtítulos con lo que dice.
- También hay un botón en Ajustes -> Tele -> "Mostrar FRIDAY en la tele".
- Cómo funciona: la tele abre su navegador en una página que sirve FRIDAY.exe por el wifi de casa
  (con una clave, nadie de afuera la ve). Si la tele dice que no encuentra la página, en Ajustes ->
  Celular tocá "No conecta: permitir en el firewall" (es el mismo permiso que usa el celu).

NUEVO EN LA 77: TU CASA, SPOTIFY Y WHATSAPP
Hay tres pestañas nuevas en Ajustes: Casa, Música y WhatsApp. Cada una trae los pasos para
conectarla (una sola vez). Todo es gratis.

CASA (luces y aspiradora de Smart Life)
- Ajustes -> Casa: seguí los 4 pasos (cuenta de desarrollador en platform.tuya.com, proyecto
  con Data Center "Western America", escanear el QR con la app Smart Life y pegar las 2 claves).
- Decile: "Friday, prendé la luz del living", "poné la luz en azul", "brillo al cuarenta",
  "luz cálida", "apagá las luces", "aspiradora, limpiá", "mandá la aspiradora a la base".
- Las órdenes cortas van al toque, sin pensar. Si tenés varias luces y decís "la luz", te
  pregunta cuál.
- La parte gratis de Tuya se renueva: si un día no responden, en platform.tuya.com ->
  Cloud -> Cloud Services -> IoT Core -> "Extend Trial Period".

SPOTIFY (con tu Premium)
- Ajustes -> Música: creá una app en developer.spotify.com/dashboard, pegá la dirección que
  te muestra FRIDAY en "Redirect URIs", copiá el Client ID y tocá "Conectar Spotify".
- Ahora FRIDAY pone la música DE VERDAD (antes abría la búsqueda y tenías que tocar play):
  "Friday, poné Soda Stereo", "poné De Música Ligera en Spotify", "poné mis me gusta",
  "poné mi playlist del asado", "subí el volumen de Spotify", "agregá Crimen a la cola",
  "pasá la música al celu", "traé la música a la compu".
- Si Spotify no está abierto en ningún lado, lo abre en la compu solo.

WHATSAPP
- Como vos: "Friday, mandale a mamá que llego en diez". Lo escribe en el WhatsApp de la compu
  (WhatsApp Desktop) y te pregunta antes de mandarlo. Los contactos se agregan en
  Ajustes -> WhatsApp, o diciéndole "Friday, guardá el número de mamá: 341 555 1234".
- (El WhatsApp con número propio de FRIDAY se sacó en la 78: ahora eso lo hace la app del celu.)

NUEVO EN LA 78: LA APP DE FRIDAY EN EL CELU, COMPLETA
Es la misma FRIDAY del celu que ya tenés (la del QR), con mucho más. Si ya la vinculaste, no hay que
hacer nada: se actualiza sola al abrir FRIDAY.exe nuevo. Con Tailscale anda también fuera de casa.
- AUDIOS: mantené apretado el 🎤, hablá y soltá (como en WhatsApp). Deslizá a la izquierda para
  cancelar. FRIDAY te contesta con voz y en el chat se ve lo que entendió.
  En iPhone hace falta la "versión segura" (☰ -> Activar el micrófono propio), una sola vez.
  Tocar el 🎤 sin mantener sigue siendo el dictado de siempre.
- CASA: Panel de control -> Casa. Cada luz con su llave, el brillo con una barrita, colores y
  luz cálida/fría; la aspiradora con Limpiar / Pausa / A la base y la batería. "Prender las luces"
  y "Apagar las luces" de un toque. Anda directo con FRIDAY.exe, aunque la ventana esté cerrada.
- SPOTIFY: Panel de control -> Música. Tapa grande, play/pausa, pasar, aleatorio, repetir,
  volumen, buscar y tocar para poner, tus playlists y tus Me gusta, y "Escuchar en": pasás la
  música a la compu, al celu o a cualquier parlante con Spotify abierto.
- RUTINAS: botones abajo de todo ("Llegué a casa", "Me voy a dormir", "Modo peli"). Un toque y
  FRIDAY hace todo junto. Las armás vos: Panel de control -> Rutinas -> Nueva rutina, con un
  nombre, un emoji y lo que le dirías ("prendé las luces", "poné mis me gusta"). En la compu
  también las conoce: "Friday, llegué a casa".
- Avisos al celu: siguen por ntfy (en el iPhone 7, Apple no deja que las apps web avisen solas).

NUEVO EN LA 79: CONECTAR SMART LIFE, MÁS FÁCIL
- Ajustes -> Casa ahora es una guía de 4 pasos, cada uno con su botón para abrir la página justa.
- Si algo falla, FRIDAY marca en rojo EL PASO que hay que revisar y dice qué hacer, y pone en
  verde los que ya están bien.
- Arreglado: el cartel "cross-region access is not allowed" era engañoso. FRIDAY prueba todos los
  Data Center de Tuya y mostraba el error del último (el de China/Europa, que siempre dice eso desde
  Argentina) en vez del problema real.
- Si las claves andan pero todavía no escaneaste el QR, las guarda igual: escaneás el QR con Smart
  Life y tocás "Ya escaneé el QR: buscar mis aparatos". No hay que volver a pegar nada.
- (Corregido) En la guía, los nombres ahora son los que muestra Tuya hoy: service industry =
  "Whole House Smart", Development Method = "Smart Home", Data Center = "West Coast Data Center".

NUEVO EN LA 80: LA ISLA TE AVISA
La isla de arriba se estira unos segundos para mostrarte lo que pasa (aunque FRIDAY no esté
hablando) y después se vuelve a meter. No aparece si estás mirando la ventana de FRIDAY.
- MÚSICA: cuando cambia el tema o ponés algo: la tapa del disco, el tema, el artista y una
  línea sobre el artista (de Wikipedia; si no hay, cuántos fans tiene en Deezer).
- CASA: prendés o apagás una luz: el foquito prendido del color que pusiste (o apagado) y la
  barrita del brillo. La aspiradora: limpiando / a la base y la batería. Anda también si lo
  hacés desde la app del celu.
- SPOTIFY: el volumen con su barrita, "Sonando en iPhone" cuando pasás la música.
- RECORDATORIOS: la campanita con lo que tenías que hacer.
- TELE y COMPU: "Netflix en la tele", "Abriendo Chrome", el volumen, etc.
- WHATSAPP: "Mensaje a Mamá" con lo que mandaste.

NUEVO EN LA 81: TU AGENDA, TU MAIL Y EL CELU COMPARTIDO
Reemplazá FRIDAY.exe (versión 3.2) y friday.html.

AGENDA Y MAIL (Google Calendar y Gmail)
- Ajustes → pestaña "Agenda y mail". Son 3 pasos:
  1. Entrar a FRIDAY con tu cuenta de Google (si ya lo hiciste, aparece tildado).
  2. Activar Google Calendar y Gmail en tu proyecto FRIDAY de Google Cloud: un botón abre
     cada página y tocás "Habilitar". Fijate que arriba diga FRIDAY.
  3. "Conectar agenda y mail". Si Google dice "Google no verificó esta app": es normal, es
     TU app. Tocá "Avanzado" → "Ir a FRIDAY (no seguro)", marcá TODAS las casillas y
     "Continuar".
- Decile: "¿qué tengo hoy?", "¿qué tengo el finde?", "anotame dentista el jueves a las
  cuatro y media", "todos los martes a las 8 gimnasio", "pasá la reunión a las seis",
  "borrá lo del viernes", "¿tengo mails nuevos?", "leeme el mail de Mercado Libre".
- Te avisa 10 minutos antes de cada evento (la isla con el calendario y la voz). Se cambia
  en la misma pestaña (5, 10, 15, 30 minutos o 1 hora).
- Mails nuevos importantes: aparecen en la isla (sin promociones ni redes sociales).
- El saludo de la mañana suma lo que tenés hoy en la agenda y si hay mails sin leer.
- Gmail es SOLO LECTURA: FRIDAY no puede mandar, contestar ni borrar mails.
- Si un día dice que falta activar Calendar o Gmail, te abre la página para "Habilitar".

CELU Y COMPU COMPARTIDOS (con FRIDAY Móvil)
- En la compu: Ajustes → Celular → "Vincular FRIDAY Móvil". Aparece un QR y 16 letras.
- En FRIDAY Móvil: Ajustes → "💻 Vincular con la compu" → Escanear (Android) o escribir las
  letras (iPhone).
- Comparten la memoria (lo que le contás a una lo sabe la otra) y los recordatorios (los
  que pedís en el celu también suenan en la compu, y al revés).
- El celu ve tu agenda de Google (la trae la compu) y le podés pedir "anotame…": se lo pasa
  a la compu y queda en tu Google Calendar apenas la compu esté prendida con FRIDAY.
- Todo viaja cifrado por ntfy: el servidor solo ve letras sin sentido. Los mails nunca
  salen de la compu.
- Si en la compu tenés los avisos del celu activados, FRIDAY Móvil usa ese mismo tema de
  ntfy: no tenés que suscribirte de nuevo.

NUEVO EN LA 82: LISTA DE COMPRAS
Solo cambia friday.html (FRIDAY.exe sigue siendo el 3.2).
- En Encargos aparece "🛒 Lista de compras": agregás a mano, tocás para tachar, "Borrar lo
  comprado" y "📱 Mandar al celu" (como aviso).
- Decile: "agregá leche, pan y yerba a la lista", "sacá el pan", "ya compré la leche",
  "¿qué tengo que comprar?", "borrá lo comprado".
- Si FRIDAY Móvil está vinculada, es LA MISMA lista en el celu: lo que tachás en el súper
  aparece tachado en la compu.

NUEVO EN LA 83: FRIDAY ATENTA (el ecosistema)
Reemplazá FRIDAY.exe (versión 3.3) y friday.html.
FRIDAY ahora mira sola, cada minuto, tu agenda, tus mails, tus envíos, los cumpleaños y tus
rutinas, y decide qué contarte y DÓNDE:
- Si estás en la compu: te lo dice y lo muestra en la isla.
- Si no la tocás hace más de 10 minutos: te llega al celu (con los avisos del celu activados en
  Ajustes → Celular) y cuando volvés te dice "Bienvenido de vuelta, mientras no estabas…".
- De 23 a 8 no molesta: lo que no es urgente te lo cuenta en el saludo de la mañana.

📦 ENVÍOS: los saca solos de tus mails (Mercado Libre, Andreani, Correo Argentino, OCA, Amazon,
  Tiendanube, etc.). Te avisa cuando sale, cuando llega hoy, si está para retirar y cuando lo
  entregan. Preguntale "¿cuándo llega lo que compré?". Hace falta Gmail conectado.
🎂 CUMPLEAÑOS: los de tus contactos de Google aparecen solos; los demás contáselos ("el cumple
  de mamá es el 3 de mayo"). Te avisa la noche anterior y el mismo día te ofrece mandarle un
  WhatsApp (decile "sí, mandale").
⏱ RUTINAS CON HORARIO: "todos los días a las 7:30 prendé la luz del baño y contame el clima",
  "de lunes a viernes a las 8 poné música", "los domingos a las 22 contame la semana que viene".
  Las hace la compu a esa hora (tiene que estar prendida con FRIDAY abierta). Si no estás, el
  resultado te llega al celu. En Encargos podés pausarlas, probarlas o borrarlas.
Todo esto también se ve y se pide desde FRIDAY Móvil (vinculada).

NUEVO EN LA 84: FRIDAY PANEL (la tablet de la casa)
Solo cambia friday.html (FRIDAY.exe sigue siendo el 3.3).
- La tablet se abre en https://TU-USUARIO.github.io/FRIDAY/panel.html (subí panel.html,
  manifest-panel.json, index.html y sw.js a tu GitHub).
- La primera vez muestra 8 letras grandes. En la compu: Ajustes → Celular → "¿Tenés la tablet
  de FRIDAY mostrando un código?", las escribís y listo: la tablet recibe sola tus llaves,
  tu nombre y tu ciudad. En la tablet no se escribe nada nunca.
- Todo por voz: "Friday, prendé la luz", "poné música", "¿qué tengo hoy?". Lo de la casa, la
  música, la tele, la compu, WhatsApp y la agenda lo hace la compu al instante; la tablet dice
  la respuesta. Clima, timers, recordatorios, compras y charla los hace la tablet sola.
- Los avisos de FRIDAY (envíos, cumples, agenda) aparecen grandes en la tablet y los dice.
  Desde la compu o el celu: "avisá en la tablet que la comida está lista".
- Modo demo: si nadie le habla un rato (o "Friday, modo demo"): reloj gigante, clima y tarjetas
  que van rotando. De noche se pone tenue. Se despierta con "Friday" o tocándola.

NUEVO EN LA 85: FRIDAY PANEL REHECHO (ahora es LA MISMA FRIDAY de la compu)
Solo cambia friday.html (FRIDAY.exe sigue siendo el 3.3). En GitHub subí panel.html y sw.js.
- La tablet ya no usa la app del celu: es la FRIDAY de la compu en modo tablet. La misma cara
  (el núcleo, el avatar), el mismo modo demo y, sobre todo, EL MISMO OÍDO: Whisper con la palabra
  "Friday", el detector que distingue voz de ruido (tele, ventilador, platos) y el filtro contra
  las frases inventadas. Si en la compu te entiende bien, en la tablet también.
- No hay dónde escribir: todo por voz. Lo que necesita la compu (casa, música, tele, programas,
  WhatsApp, agenda, mail) se lo pide al instante, y la compu le contesta a la tablet.
- Las confirmaciones ("¿cierro Discord? ¿Lo hago?") te las pregunta la tablet en voz alta y le
  contestás "sí" o "no".
- Si la compu está apagada, te lo dice en vez de quedarse colgada. Clima, noticias, búsquedas,
  timers, recordatorios y charla los hace la tablet sola.
- 🌌 EL CIELO DE TU CIUDAD (lo lindo): en el modo demo hay una vista nueva con el cielo de tu
  ciudad AHORA: el sol y la luna donde están de verdad (con la fase real de la luna), el
  atardecer, las estrellas, estrellas fugaces, nubes, lluvia, tormenta con relámpagos, niebla o
  nieve según el clima, y una ciudad que va prendiendo las luces cuando oscurece, reflejada en
  el agua. Abajo: la hora a la que sale o se pone el sol y la fase de la luna.
  En la tablet arranca con el cielo; en la compu entra en la rotación del demo.
  Pedíselo: "Friday, mostrame el cielo".
- "Buenas noches" en la tablet no apaga el micrófono: queda el cielo de noche y te sigue
  escuchando.
- Para pasar de la tablet vieja a la nueva: subí los archivos, abrí panel.html en la tablet y,
  si te muestra un código, escribilo en la compu (Ajustes → Celular).

NUEVO EN LA 86: LA TABLET FLUIDA, QUE TE ESCUCHE, Y QUE LA COMPU SIEMPRE CONTESTE
Solo cambia friday.html (FRIDAY.exe sigue siendo el 3.3). En GitHub subí panel.html, index.html y sw.js.

POR QUÉ NO TE ESCUCHABA (y qué cambió)
- El micrófono se leía en el mismo lugar donde se dibuja la pantalla: con la tablet trabada se perdían
  pedazos de lo que decías. Ahora se lee aparte, en el hilo de audio: aunque la pantalla se trabe, no se
  pierde nada.
- La tele o una charla de fondo gastaban el cupo gratis de Whisper (el oído de Groq) y después no quedaba
  para vos. Ahora mira solo las primeras palabras y, si no empezás con "Friday", no manda el resto. El
  vistazo y tus pedidos usan dos modelos de Whisper con cupos separados, así la tele nunca te deja sin
  oído. Si hay mucha charla de fondo, presta atención a lo que suena más fuerte que esa charla.
- Arriba de la pantalla dice cómo está el oído: "Decí «Friday»", "Te escucho…", "Mucha charla de fondo:
  decí «Friday» más fuerte" u "Oído sin cupo de Groq · vuelve a las 21:00". (Decí "Friday" al principio.)

POR QUÉ "LA COMPU NO CONTESTÓ"
- La conexión entre la tablet y la compu podía quedar muerta sin avisar (el wifi o el router cortan las
  conexiones quietas). Ahora se revisa sola: si pasan 90 segundos sin señal, se corta, se vuelve a abrir
  y trae lo que se perdió en el medio.
- Si un pedido no sale por un corte, se reintenta dos veces.
- La compu avisa "lo recibí" al toque. Si en 12 segundos no dice nada, la tablet te dice que la compu no
  está (antes esperaba mucho más).
- Si falla internet, reintenta cada vez más espaciado en vez de saturar el servicio de mensajes.

POR QUÉ CONTESTABA TARDÍSIMO (o "se me colgó el cerebro")
- Cada pregunta mandaba instrucciones larguísimas, y el plan gratis de Groq tiene un tope por minuto y
  por día que la tablet y la compu comparten. Ahora las instrucciones son un tercio más cortas, el
  historial va recortado y, si un modelo se queda sin cupo, pasa al siguiente (también gpt-oss-120b). Si
  están todos ocupados unos segundos, espera y contesta igual. Si se acabó el cupo del día, te dice
  cuándo vuelve.
- Lo simple de la casa ("prendé la luz del living") lo dice directo, sin otra vuelta al cerebro.
- RECOMENDADO: Ajustes → Celular → "Llave de Groq solo para la tablet". Hacé otra cuenta gratis en
  console.groq.com con otro mail, creá una llave y pegala ahí: le llega sola a la tablet y cada una
  tiene su propio cupo. También conviene cargar una llave gratis de Gemini (Ajustes): cuando Groq se
  agota, sigue con esa.

POR QUÉ SE TRABABA
- La pantalla se redibujaba entera 60 veces por segundo. Ahora el fondo queda quieto, la cara se dibuja
  en un recuadro chico, en reposo va más lento y el modo demo no dibuja lo que no se ve.
- La tablet arranca en "Animaciones livianas" (Ajustes → General → Animaciones: Automáticas, Livianas o
  Máximas). La compu pasa sola a livianas si la CPU no da abasto.

LO NUEVO EN LA TABLET
- Cara con expresiones: feliz, risa, enamorada, sorprendida, triste, pensativa, guiño, canchera con
  anteojos, confundida, preocupada, con sueño de noche… La elige según lo que dice, y mira la tarjeta
  de lo que te está contando.
- Tablero alrededor de la cara, que se actualiza solo:
  · Clima con las próximas horas.
  · Sonando: la canción que pasa la compu, con la tapa del disco.
  · Hoy: tu agenda de hoy y mañana.
  · Timers y recordatorios, con cuenta regresiva.
  · Casa: tus luces y aparatos. Tocás uno y se prende o apaga; también cambia cuando se lo pedís por voz.
  · Compras: la lista (tocás y se tacha). Es la misma del celu y de la compu.
  · Notas y avisos: lo que te avisó FRIDAY (envíos, cumples, "avisá en la tablet que…"), tus notas y
    cuántos mails importantes tenés sin leer.
- Timers por voz: "Friday, poné un timer de 10 minutos para los fideos", "¿cuánto falta?", "cancelá el
  timer". Suenan en la tablet y no viajan al celu ni a la compu.
- Notas de la casa: "Friday, dejá una nota: compré facturas, están en la alacena", "¿hay notas?",
  "borrá las notas".

=====================================================================
VERSIÓN 87 (solo cambia friday.html; FRIDAY.exe sigue igual)
=====================================================================
- Las notas de la casa se comparten con la tablet (FRIDAY Casa) y el celu: "Friday, dejá una
  nota: hay tarta en la heladera" desde la compu, y aparece en la tablet y en el celu.
- Para que la tablet comparta todo con la compu: en la tablet, Ajustes → "Compartir con la compu
  y el celu"; acá, Ajustes → Celular → "¿Tenés la tablet de FRIDAY mostrando un código?".
Reemplazá friday.html (en la carpeta de FRIDAY) y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 89 (friday.html) + FRIDAY.exe 3.4
=====================================================================
- Videollamadas con la tablet: "Friday, llamá a la tablet" (o Ajustes → Celular → "Llamar a la
  tablet"). Cuando la tablet te llama, suena acá y atendés con un clic o diciendo "atendé".
- FRIDAY vive en segundo plano: arranca minimizada y, si cerrás la ventana, se vuelve a abrir
  minimizada sola. Así la barra de arriba anda siempre. Para verla entera: el ícono de la bandeja
  → Abrir. "Friday, andá a segundo plano" la esconde. Se apaga en Ajustes → Compu → Segundo plano.
  Para salir del todo: ícono de la bandeja → Salir.
- FRIDAY mira: Ajustes → Compu → "FRIDAY mira": la pantalla (cuando FRIDAY no está al frente) y/o la
  cámara, cada 2 a 10 minutos y solo si algo cambió. Si ve algo que valga la pena (un error en tu
  resumen, la cama mal tendida…) te lo dice; si no, se queda callada. Arriba a la izquierda se ve
  "FRIDAY MIRA" mientras está prendido. Cuando quieras: "¿qué ves?", "¿cómo me queda?",
  "mirá mi pantalla". "Dejá de mirar" lo apaga. Usa la llave de Gemini (o la de Groq).
Reemplazá FRIDAY.exe (versión 3.4) y friday.html, y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 90 (solo cambia friday.html; FRIDAY.exe sigue en 3.4)
=====================================================================
- Nunca se queda muda si te estaba escuchando: si algo falló, te pide que lo repitas o te dice qué
  pasó (sin cupo, se cortó). Ajustes → Voz → "Lo último que escuchó" muestra qué pasó con cada cosa.
- Entiende «Friday» aunque Whisper lo escriba "Fraidei", "Freddy" o lo traduzca como "Viernes".
- Se acuerda y retoma: "mañana tengo la prueba" → al otro día te pregunta cómo te fue (también en la
  tablet).
- Más persona: siempre de tu lado, nota cómo estás, festeja tus logros, honesta, con gustos propios.
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 91 (friday.html) + FRIDAY.exe 3.5
=====================================================================
- Mercado Libre de verdad: "buscame en Mercado Libre auriculares bluetooth baratos". FRIDAY.exe
  lee los resultados reales de Mercado Libre (título, precio actual, envío gratis, foto y link) y
  los muestra en pantalla. FRIDAY solo habla de esas publicaciones: si no aparece nada, lo dice;
  nunca inventa páginas, productos ni precios. "Abrime el primero" lo abre en el navegador.
- Investigar: "investigá cuánto fue la inflación de septiembre". Piensa 3 búsquedas distintas,
  lee varias páginas y te cuenta lo importante nombrando las fuentes (se ven en pantalla).
- Modo estudio: "modo estudio de biología" (o "vamos a estudiar historia por una hora").
  Tandas de 25 minutos con 5 de pausa, con un reloj arriba a la derecha. Cada 2 minutos mira tu
  pantalla: si te vas a TikTok o a otra cosa, te avisa con buena onda; si estás estudiando, anota
  de qué se trata y en la pausa te hace una pregunta de repaso (contestale y te corrige). Si le
  preguntás algo del tema, te lo explica como una profe. "Pausá el estudio", "seguimos",
  "terminé de estudiar" (te dice cuánto estudiaste y cuántos días seguidos llevás).
Reemplazá FRIDAY.exe (versión 3.5) y friday.html, y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 92 (solo cambia friday.html; FRIDAY.exe sigue en 3.5)
=====================================================================
- Intercom con la tablet: lo que manda la tablet ("Friday, avisale a la compu que…") se dice acá
  en voz alta y aparece arriba en la barra. Desde acá: "Friday, avisá en la tablet que…".
- Fichas de estudio: al terminar el modo estudio, FRIDAY arma fichas con lo que vio en tu
  pantalla. "Hacé fichas de…" y "tomame las fichas" también andan acá. Se comparten con la tablet.
- Seguir precios: "Friday, seguí el precio de… y avisame si baja de 80 mil". La compu revisa
  Mercado Libre cada unas horas y te avisa (acá y en la tablet) cuando baja.
- Resumen de la semana: el domingo entre las 19 y las 22 (si estás en la compu), o cuando le
  digas "resumen de la semana".
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 93 (solo cambia friday.html; FRIDAY.exe sigue en 3.5)
=====================================================================
- FRIDAY se mueve: si no le hablás un rato, el núcleo (o la cara) sale a pasear por la ventana y
  se asoma por los bordes; cuando le hablás, vuelve a su lugar. Las emociones se ven en el
  movimiento: salta de contenta, tiembla si está preocupada, flota si está enamorada…
  "Friday, quedate quieta" / "Friday, movete".
- Tareas de la casa: ve las tareas y los puntos de la tablet; "ya saqué la basura" te suma puntos.
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 94 (solo cambia friday.html; FRIDAY.exe sigue en 3.5)
=====================================================================
- Chequeo: "Friday, hacé un chequeo" (o Ajustes → Compu → «Hacer el chequeo»). FRIDAY se prueba
  sola: FRIDAY.exe, Mercado Libre de verdad, buscar y leer en internet, ver la pantalla, la barra
  de arriba, el cerebro, la vista, el micrófono, la cámara, la voz, la sincronización, la tablet y
  Google. Al final dice qué falló y «Copiar informe» copia todo (también el chequeo de la tablet,
  si lo hiciste) para pegárselo a Claude.
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 95 + FRIDAY.exe 3.6
=====================================================================
- FRIDAY.exe busca en YouTube por la vía buena (la API de YouTube) y trae el tema que pediste.
  También le busca la música a la tablet cuando su servicio de Cloudflare no anda.
- El chequeo prueba también la búsqueda en YouTube.
Reemplazá FRIDAY.exe (3.6) y friday.html, y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 96 (FRIDAY.exe sigue en 3.6)
=====================================================================
- La música en la compu también busca siempre con el artista que nombraste (y entiende NTVG).
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 97 (FRIDAY.exe sigue en 3.6)
=====================================================================
- La tablet ahora reconoce a la compu aunque la compu tenga un código de una versión vieja.
- Videollamadas: Ajustes → Celular → «Atender sola las llamadas» (antes avisa en voz alta y cuenta
  7 segundos; decí «no» para no atender). Cuando te llaman, FRIDAY aparece al frente y avisa en la
  barra de arriba. Llamada perdida → «Friday, devolvé la llamada».
- Intercom desde la compu, al toque: «Friday, avisale a la tablet que…» (o «al celu», «a todos»),
  y «Friday, respondele que…» contesta el último mensaje.
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 98 (FRIDAY.exe sigue en 3.6)
=====================================================================
- La videollamada se acomoda: se ve la imagen entera; doble clic para llenar la pantalla o volver;
  la rueda del mouse acerca. «Achicar» (o Esc) la deja en una ventanita que se mueve y se agranda
  desde la esquina. Tu cámara se arrastra a cualquier esquina.
- Llamadas de solo voz: botón «Solo voz» o «Friday, llamá a la tablet por voz».
- Cuando te llaman, FRIDAY dice en voz alta quién es. «Atender sola» ahora cuenta 10 segundos.
- Ajustes → Celular: la lista de aparatos unidos muestra qué es cada uno y su versión; «Probar» se
  fija si responde ahora, y si alguno figura mal se corrige con un clic (Compu, Tablet, Celu).
Reemplazá friday.html y volvé a abrir FRIDAY.

=====================================================================
VERSIÓN 99 (FRIDAY.exe sigue en 3.6)
=====================================================================
- Si la tablet está cerca y las dos te escuchan, contesta una sola: la que te oyó más fuerte. La otra
  se calla y en pantalla dice «le contesta la tablet» (o «la compu»). Y la que no contesta deja de
  escuchar sin «Friday», así no se contestan entre ellas.
Reemplazá friday.html y volvé a abrir FRIDAY.
