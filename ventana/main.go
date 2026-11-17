// Prototipo: FRIDAY con ventana propia.
//
// Hoy FRIDAY le pide la ventana prestada al navegador (Edge, Chromium) con --app=. De ahí salen
// casi todos los dolores: en la barra de tareas sale el navegador y no FRIDAY, el permiso del
// micrófono hay que escribirlo a mano en los archivos del navegador, y en Wayland no se puede
// minimizar una ventana que no es nuestra.
//
// Esto abre una ventana PROPIA con el motor web del sistema (WebKitGTK). Antes de hacerlo en serio
// hay que contestar tres preguntas, y para eso es este programa:
//
//  1. ¿La ventana lleva NUESTRA identidad? (si no, la barra de tareas sigue igual de mal)
//  2. ¿Podemos darle el micrófono desde el código, sin tocar archivos de nadie?
//  3. ¿Anda la música? (YouTube necesita MediaSource y ciertos codecs)
//
// Carga una página de diagnóstico, ella contesta las tres, el programa lo imprime y se va.
package main

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>

extern gboolean irPermiso(WebKitWebView *w, WebKitPermissionRequest *req, gpointer user);

static gboolean cb_permiso(WebKitWebView *w, WebKitPermissionRequest *req, gpointer user) {
    return irPermiso(w, req, user);
}

// Le damos a la ventana nuestra identidad, que es lo que mira la barra de tareas.
static void identidad(const char *prg, const char *clase) {
    g_set_prgname(prg);
    gdk_set_program_class(clase);
}

static WebKitWebView *armar(const char *uri) {
    GtkWidget *win = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(win), "FRIDAY");
    gtk_window_set_default_size(GTK_WINDOW(win), 1100, 740);

    WebKitWebView *web = WEBKIT_WEB_VIEW(webkit_web_view_new());
    WebKitSettings *s = webkit_web_view_get_settings(web);
    webkit_settings_set_enable_media_stream(s, TRUE);          // micrófono y cámara
    webkit_settings_set_enable_mediasource(s, TRUE);           // para que ande YouTube
    webkit_settings_set_enable_webaudio(s, TRUE);
    webkit_settings_set_media_playback_requires_user_gesture(s, FALSE);
    webkit_settings_set_enable_developer_extras(s, TRUE);
    webkit_settings_set_enable_write_console_messages_to_stdout(s, TRUE);

    g_signal_connect(web, "permission-request", G_CALLBACK(cb_permiso), NULL);
    g_signal_connect(win, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    gtk_container_add(GTK_CONTAINER(win), GTK_WIDGET(web));
    webkit_web_view_load_uri(web, uri);
    gtk_widget_show_all(win);
    return web;
}

// el macro de WebKit no se puede llamar desde Go, así que lo envolvemos
static int es_micro(WebKitPermissionRequest *req) {
    return WEBKIT_IS_USER_MEDIA_PERMISSION_REQUEST(req) ? 1 : 0;
}

static const char *version_webkit(void) {
    static char buf[64];
    g_snprintf(buf, sizeof buf, "%d.%d.%d", webkit_get_major_version(), webkit_get_minor_version(), webkit_get_micro_version());
    return buf;
}
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"time"
	"unsafe"
)

var permisos []string

//export irPermiso
func irPermiso(w *C.WebKitWebView, req *C.WebKitPermissionRequest, user C.gpointer) C.gboolean {
	// Esto es lo que hoy no podemos hacer con el navegador: decirle que sí al micrófono desde acá.
	tipo := "otro"
	if C.es_micro(req) != 0 {
		tipo = "micrófono/cámara"
	}
	permisos = append(permisos, tipo)
	C.webkit_permission_request_allow(req)
	return C.TRUE
}

const diag = `<!doctype html><meta charset="utf-8"><title>FRIDAY</title>
<body style="background:#0b1020;color:#e8eefc;font:16px system-ui;padding:24px">
<h1>Probando la ventana propia…</h1><pre id="o"></pre>
<script>
(async () => {
  const r = {};
  const pre = document.getElementById('o');
  // cada pregunta por separado: si una explota, las demás se contestan igual
  const add = (k, fn) => { try { r[k] = typeof fn === 'function' ? fn() : fn; } catch (e) { r[k] = 'ERROR: ' + e; } pre.textContent = JSON.stringify(r, null, 1); };
  const addA = async (k, fn) => { try { r[k] = await fn(); } catch (e) { r[k] = 'no: ' + (e && e.name || e); } pre.textContent = JSON.stringify(r, null, 1); };

  add('agente', () => navigator.userAgent);

  // 1) el oído: así escucha FRIDAY hoy (AudioWorklet + getUserMedia)
  add('mediaDevices', () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  add('AudioWorklet', () => typeof AudioWorklet !== 'undefined');
  add('audioWorklet_en_contexto', () => typeof AudioContext !== 'undefined' && ('audioWorklet' in AudioContext.prototype));
  add('AudioContext', () => typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
  add('ScriptProcessor', () => typeof AudioContext !== 'undefined' && ('createScriptProcessor' in AudioContext.prototype));
  await addA('microfono', async () => {
    const st = await navigator.mediaDevices.getUserMedia({audio:true});
    const n = st.getAudioTracks().length; st.getTracks().forEach(t => t.stop());
    return 'abrió ' + n + ' pista(s)';
  });
  await addA('aparatos_de_audio', async () => (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput').length);
  add('MediaRecorder', () => typeof MediaRecorder !== 'undefined');

  // 2) la música: YouTube necesita MediaSource y estos codecs
  add('MediaSource', () => !!window.MediaSource);
  add('codecs', () => {
    const ms = t => { try { return !!(window.MediaSource && MediaSource.isTypeSupported(t)); } catch (e) { return 'ERROR'; } };
    return { 'mp4/h264': ms('video/mp4; codecs="avc1.42E01E"'), 'webm/vp9': ms('video/webm; codecs="vp9"'),
             'webm/vp8': ms('video/webm; codecs="vp8"'), 'aac': ms('audio/mp4; codecs="mp4a.40.2"'),
             'opus': ms('audio/webm; codecs="opus"'), 'mp3': ms('audio/mpeg') };
  });
  add('canPlay', () => { const a = document.createElement('audio');
    return { mp3: a.canPlayType('audio/mpeg'), wav: a.canPlayType('audio/wav'), ogg: a.canPlayType('audio/ogg; codecs="vorbis"') }; });

  // 3) lo demás que FRIDAY necesita para andar
  add('guardado', () => { localStorage.setItem('x','1'); localStorage.removeItem('x'); return true; });
  add('indexedDB', () => typeof indexedDB !== 'undefined');
  add('voces_del_sistema', () => window.speechSynthesis ? (speechSynthesis.getVoices() || []).length : -1);
  add('reconocedor_del_navegador', () => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  add('avisos', () => typeof Notification !== 'undefined');
  add('wasm', () => typeof WebAssembly !== 'undefined');
  add('crypto_subtle', () => !!(window.crypto && crypto.subtle));
  add('fetch', () => typeof fetch !== 'undefined');

  await fetch('/listo', {method:'POST', body: JSON.stringify(r)});
})().catch(e => fetch('/listo', {method:'POST', body: JSON.stringify({explotó: String(e)})}));
</script>`

func main() {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Println("no pude abrir el servidor:", err)
		os.Exit(1)
	}
	hecho := make(chan map[string]any, 1)
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, diag)
	})
	mux.HandleFunc("/listo", func(w http.ResponseWriter, r *http.Request) {
		var m map[string]any
		json.NewDecoder(r.Body).Decode(&m)
		select {
		case hecho <- m:
		default:
		}
	})
	go http.Serve(ln, mux)
	uri := "http://" + ln.Addr().String() + "/"

	prg, clase := C.CString("friday"), C.CString("FRIDAY")
	defer C.free(unsafe.Pointer(prg))
	defer C.free(unsafe.Pointer(clase))
	C.gtk_init(nil, nil)
	C.identidad(prg, clase)

	cu := C.CString(uri)
	defer C.free(unsafe.Pointer(cu))
	C.armar(cu)

	go func() {
		var m map[string]any
		select {
		case m = <-hecho:
		case <-time.After(40 * time.Second):
			m = map[string]any{"error": "la página no contestó en 40 segundos"}
		}
		m["webkit"] = C.GoString(C.version_webkit())
		m["permisos_que_llegaron"] = permisos
		b, _ := json.MarshalIndent(m, "", " ")
		fmt.Println("=== RESULTADO ===")
		fmt.Println(string(b))
		fmt.Println("=== FIN ===")
		time.Sleep(300 * time.Millisecond)
		os.Exit(0)
	}()

	C.gtk_main()
}
