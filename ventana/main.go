// FRIDAY con ventana propia.
//
// Hasta ahora FRIDAY le pedía la ventana prestada al navegador (Edge, Chromium) con --app=. De ahí
// salían casi todos los dolores: en la barra de tareas aparecía el navegador y no FRIDAY, el
// permiso del micrófono había que escribirlo a mano en los archivos del navegador, en Wayland no se
// podía minimizar una ventana que no es nuestra, y la ventana llevaba el ícono de otro.
//
// Este programa abre una ventana NUESTRA con el motor web del sistema (WebKitGTK). La ventana lleva
// el nombre y el ícono de FRIDAY, el micrófono se lo damos desde el código, y minimizarla o traerla
// al frente es cosa nuestra.
//
// No reemplaza al programa de FRIDAY: lo acompaña. «friday» sigue siendo el que manda, y abre esta
// ventana apuntándola a su propia página (http://127.0.0.1:8765). Si esta ventana no está, o le
// falta WebKit, FRIDAY sigue abriéndose en el navegador como siempre.
//
// Se maneja por un socket: FRIDAY le escribe «minimizar», «mostrar» o «chau» y la ventana obedece.
package main

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1
#include <stdlib.h>
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>

extern gboolean irPermiso(WebKitWebView *w, WebKitPermissionRequest *req, gpointer user);
extern gboolean irPolitica(WebKitWebView *w, WebKitPolicyDecision *d, int tipo, gpointer user);
extern gboolean irLatido(gpointer user);

static gboolean cb_permiso(WebKitWebView *w, WebKitPermissionRequest *req, gpointer user) {
    return irPermiso(w, req, user);
}
static gboolean cb_politica(WebKitWebView *w, WebKitPolicyDecision *d, WebKitPolicyDecisionType tipo, gpointer user) {
    return irPolitica(w, d, (int)tipo, user);
}
static gboolean cb_latido(gpointer user) { return irLatido(user); }

// Nuestra identidad: es lo que mira la barra de tareas para saber que esta ventana es FRIDAY y no
// otra cosa. Va en dos tiempos, y el orden importa: el nombre del programa, antes de arrancar GTK
// (después revienta), y la clase, DESPUÉS (si no, al arrancar GTK se la pisa con una versión suya
// sacada del nombre, y la ventana terminaba diciendo «Friday» en vez de «FRIDAY»).
static void nombre_programa(const char *prg) { g_set_prgname(prg); }
static void clase_ventana(const char *clase) { gdk_set_program_class(clase); }

static GtkWidget *ventana = NULL;

static WebKitWebView *armar(const char *uri, const char *titulo, const char *datos, const char *cache,
                            const char *icono, int ancho, int alto, int oculta) {
    ventana = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(ventana), titulo);
    gtk_window_set_default_size(GTK_WINDOW(ventana), ancho, alto);
    // el nombre que usa el escritorio para juntar la ventana con su .desktop
    gtk_window_set_role(GTK_WINDOW(ventana), "friday");
    if (icono && *icono) {
        gtk_window_set_icon_from_file(GTK_WINDOW(ventana), icono, NULL);
    }
    gtk_window_set_icon_name(GTK_WINDOW(ventana), "bufalabs-friday");

    // Lo que FRIDAY guarda (ajustes, memoria, recordatorios) vive en SU carpeta, no mezclado con
    // la del navegador: así no se pierde ni se lo lleva puesto una limpieza del navegador.
    WebKitWebsiteDataManager *dm = webkit_website_data_manager_new(
        "base-data-directory", datos, "base-cache-directory", cache, NULL);
    WebKitWebContext *ctx = webkit_web_context_new_with_website_data_manager(dm);
    webkit_web_context_set_cache_model(ctx, WEBKIT_CACHE_MODEL_WEB_BROWSER);

    WebKitWebView *web = WEBKIT_WEB_VIEW(webkit_web_view_new_with_context(ctx));
    WebKitSettings *s = webkit_web_view_get_settings(web);
    webkit_settings_set_enable_media_stream(s, TRUE);                    // micrófono y cámara
    webkit_settings_set_enable_mediasource(s, TRUE);                     // para que ande la música
    webkit_settings_set_enable_webaudio(s, TRUE);
    webkit_settings_set_enable_webgl(s, TRUE);
    webkit_settings_set_media_playback_requires_user_gesture(s, FALSE);  // que pueda hablar sola
    webkit_settings_set_javascript_can_access_clipboard(s, TRUE);
    webkit_settings_set_enable_developer_extras(s, TRUE);
    webkit_settings_set_enable_back_forward_navigation_gestures(s, FALSE);

    g_signal_connect(web, "permission-request", G_CALLBACK(cb_permiso), NULL);
    g_signal_connect(web, "decide-policy", G_CALLBACK(cb_politica), NULL);
    g_signal_connect(ventana, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    gtk_container_add(GTK_CONTAINER(ventana), GTK_WIDGET(web));
    webkit_web_view_load_uri(web, uri);
    gtk_widget_show_all(ventana);
    if (oculta) gtk_window_iconify(GTK_WINDOW(ventana));
    gtk_widget_grab_focus(GTK_WIDGET(web));
    return web;
}

static void minimizar(void)  { if (ventana) gtk_window_iconify(GTK_WINDOW(ventana)); }
static void mostrar(void)    { if (ventana) { gtk_window_deiconify(GTK_WINDOW(ventana));
                                              gtk_window_present(GTK_WINDOW(ventana)); } }
static void cerrar(void)     { gtk_main_quit(); }
static int  esta_mini(void)  { if (!ventana) return 0;
    GdkWindow *g = gtk_widget_get_window(ventana);
    return g && (gdk_window_get_state(g) & GDK_WINDOW_STATE_ICONIFIED) ? 1 : 0; }
static void tamano(int *a, int *b) { if (ventana) gtk_window_get_size(GTK_WINDOW(ventana), a, b); }

// el macro de WebKit no se puede llamar desde Go, así que lo envolvemos
static int es_micro(WebKitPermissionRequest *req) {
    return WEBKIT_IS_USER_MEDIA_PERMISSION_REQUEST(req) ? 1 : 0;
}
static int es_aviso(WebKitPermissionRequest *req) {
    return WEBKIT_IS_NOTIFICATION_PERMISSION_REQUEST(req) ? 1 : 0;
}
static void permitir(WebKitPermissionRequest *req) { webkit_permission_request_allow(req); }

// De una decisión de navegación sacamos a dónde va y si fue la persona la que tocó algo. Lo
// segundo importa: si la persona hace clic en un enlace, eso va al navegador; si es un pedacito de
// la página que se carga solo (un video metido adentro, por ejemplo), se queda acá.
static const char *a_donde(WebKitPolicyDecision *d, int *gesto) {
    WebKitNavigationPolicyDecision *n = WEBKIT_NAVIGATION_POLICY_DECISION(d);
    WebKitNavigationAction *a = webkit_navigation_policy_decision_get_navigation_action(n);
    if (!a) return NULL;
    WebKitURIRequest *r = webkit_navigation_action_get_request(a);
    if (!r) return NULL;
    *gesto = webkit_navigation_action_is_user_gesture(a) ? 1 : 0;
    return webkit_uri_request_get_uri(r);
}
static void ignorar(WebKitPolicyDecision *d) { webkit_policy_decision_ignore(d); }

// cada tanto miramos si FRIDAY nos mandó algo (a GTK hay que hablarle desde su propio hilo)
static void latir(void) { g_timeout_add(150, cb_latido, NULL); }

static const char *version_webkit(void) {
    static char buf[64];
    g_snprintf(buf, sizeof buf, "%d.%d.%d", webkit_get_major_version(), webkit_get_minor_version(), webkit_get_micro_version());
    return buf;
}
*/
import "C"

import (
	"bufio"
	"flag"
	"fmt"
	"net"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"unsafe"
)

var (
	// lo que llega por el socket y todavía no hicimos (a GTK hay que hablarle desde su propio hilo)
	muCola sync.Mutex
	cola   []string

	casa     string // la dirección de FRIDAY: lo de acá adentro se abre acá
	versión  = "1.0"
	silencio bool
)

func anotar(f string, a ...any) {
	if !silencio {
		fmt.Fprintf(os.Stderr, "ventana: "+f+"\n", a...)
	}
}

//export irPermiso
func irPermiso(w *C.WebKitWebView, req *C.WebKitPermissionRequest, user C.gpointer) C.gboolean {
	// Esta es la ventana de FRIDAY mostrando la página de FRIDAY: lo que pida, se lo damos. Es
	// justo lo que con el navegador había que ir a escribir a mano en sus archivos.
	switch {
	case C.es_micro(req) != 0:
		anotar("le di el micrófono")
	case C.es_aviso(req) != 0:
		anotar("le di los avisos")
	default:
		anotar("le di un permiso más")
	}
	C.permitir(req)
	return C.TRUE
}

//export irPolitica
func irPolitica(w *C.WebKitWebView, d *C.WebKitPolicyDecision, tipo C.int, user C.gpointer) C.gboolean {
	// 0 = ir a una página, 1 = abrir una ventana nueva. Lo demás (descargas, respuestas) lo dejamos.
	if tipo != 0 && tipo != 1 {
		return C.FALSE
	}
	var gesto C.int
	cu := C.a_donde(d, &gesto)
	if cu == nil {
		return C.FALSE
	}
	destino := C.GoString(cu)
	if deCasa(destino) {
		return C.FALSE // la página de FRIDAY: adentro
	}
	if tipo == 0 && gesto == 0 {
		return C.FALSE // un pedacito que se carga solo: que se cargue acá
	}
	// cualquier otra cosa (entrar con Google, un enlace de una noticia, YouTube) va al navegador de
	// verdad, donde la persona ya tiene sus sesiones abiertas
	anotar("al navegador: %s", recortar(destino))
	C.ignorar(d)
	abrirAfuera(destino)
	return C.TRUE
}

//export irLatido
func irLatido(user C.gpointer) C.gboolean {
	muCola.Lock()
	pend := cola
	cola = nil
	muCola.Unlock()
	for _, c := range pend {
		switch c {
		case "minimizar":
			C.minimizar()
		case "mostrar":
			C.mostrar()
		case "chau":
			C.cerrar()
		}
	}
	return C.TRUE // seguir latiendo
}

// ¿es la propia página de FRIDAY?
func deCasa(u string) bool {
	if casa == "" {
		return true
	}
	a, err := url.Parse(u)
	if err != nil {
		return false
	}
	switch a.Scheme {
	case "about", "blob", "data", "javascript", "":
		return true
	}
	b, err := url.Parse(casa)
	if err != nil {
		return false
	}
	return strings.EqualFold(a.Host, b.Host)
}

func abrirAfuera(u string) {
	if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
		return
	}
	cmd := exec.Command("xdg-open", u)
	cmd.Stdout, cmd.Stderr = nil, nil
	if err := cmd.Start(); err != nil {
		anotar("no pude abrir el navegador: %v", err)
		return
	}
	go cmd.Wait()
}

func recortar(s string) string {
	if len(s) > 80 {
		return s[:80] + "…"
	}
	return s
}

// ---------------------------------------------------------------- el socket, para que FRIDAY mande
func escuchar(ruta string) {
	os.Remove(ruta)
	os.MkdirAll(filepath.Dir(ruta), 0o700)
	ln, err := net.Listen("unix", ruta)
	if err != nil {
		anotar("sin socket (%v): la ventana anda igual, pero FRIDAY no la va a poder minimizar", err)
		return
	}
	os.Chmod(ruta, 0o600)
	go func() {
		defer os.Remove(ruta)
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go atender(c)
		}
	}()
}

func atender(c net.Conn) {
	defer c.Close()
	sc := bufio.NewScanner(c)
	for sc.Scan() {
		orden := strings.ToLower(strings.TrimSpace(sc.Text()))
		switch orden {
		case "ping":
			fmt.Fprintf(c, "friday-ventana %s\n", versión)
			continue
		case "estado":
			var a, b C.int
			C.tamano(&a, &b)
			fmt.Fprintf(c, "{\"ok\":true,\"version\":%q,\"minimizada\":%v,\"ancho\":%d,\"alto\":%d}\n",
				versión, C.esta_mini() != 0, int(a), int(b))
			continue
		case "minimizar", "mostrar", "chau":
			muCola.Lock()
			cola = append(cola, orden)
			muCola.Unlock()
			fmt.Fprintln(c, "ok")
		default:
			fmt.Fprintln(c, "no entiendo")
		}
	}
}

func main() {
	var (
		uri    = flag.String("url", "http://127.0.0.1:8765/", "la página de FRIDAY")
		titulo = flag.String("titulo", "FRIDAY", "el nombre de la ventana")
		clase  = flag.String("clase", "FRIDAY", "cómo se presenta ante la barra de tareas")
		datos  = flag.String("datos", "", "carpeta donde guarda lo suyo (ajustes, memoria)")
		icono  = flag.String("icono", "", "archivo del ícono")
		sock   = flag.String("socket", "", "socket para que FRIDAY la maneje")
		ancho  = flag.Int("ancho", 1180, "")
		alto   = flag.Int("alto", 780, "")
		mini   = flag.Bool("mini", false, "ventana chica (la de al costado)")
		oculta = flag.Bool("oculta", false, "arrancar minimizada")
		ver    = flag.Bool("version", false, "")
		callar = flag.Bool("callado", false, "")
	)
	flag.Parse()
	silencio = *callar
	if *ver {
		fmt.Println("FRIDAY ventana", versión)
		return
	}
	casa = *uri
	if *mini {
		*ancho, *alto = 460, 760
	}
	if *datos == "" {
		base := os.Getenv("XDG_DATA_HOME")
		if base == "" {
			base = filepath.Join(os.Getenv("HOME"), ".local", "share")
		}
		*datos = filepath.Join(base, "FRIDAY", "ventana")
	}
	cache := filepath.Join(*datos, "cache")
	os.MkdirAll(cache, 0o700)
	if *sock != "" {
		escuchar(*sock)
	}

	cs := func(s string) *C.char { return C.CString(s) }
	prg, cl := cs("friday"), cs(*clase)
	defer C.free(unsafe.Pointer(prg))
	defer C.free(unsafe.Pointer(cl))
	C.nombre_programa(prg)
	C.gtk_init(nil, nil)
	C.clase_ventana(cl)

	cu, ct, cd, cc, ci := cs(*uri), cs(*titulo), cs(*datos), cs(cache), cs(*icono)
	for _, p := range []*C.char{cu, ct, cd, cc, ci} {
		defer C.free(unsafe.Pointer(p))
	}
	ocu := C.int(0)
	if *oculta {
		ocu = 1
	}
	C.armar(cu, ct, cd, cc, ci, C.int(*ancho), C.int(*alto), ocu)
	anotar("abierta con WebKit %s; guardando en %s", C.GoString(C.version_webkit()), *datos)

	C.latir()
	C.gtk_main()
}
