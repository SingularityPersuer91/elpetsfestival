/* Aviso de cookies y píxel de Meta. El píxel solo se carga si la persona acepta.
   Sin aceptación no se pide nada a Meta. La decisión queda en este navegador. */
(function () {
  "use strict";
  var etiqueta = document.currentScript;
  var PIXEL_ID = (etiqueta && etiqueta.getAttribute("data-pixel")) || "29163532359953133";
  var CLAVE = "pf_cookies_v1";

  function leer() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(valor) {
    try { localStorage.setItem(CLAVE, valor); } catch (e) { /* modo privado: se vuelve a preguntar */ }
  }

  var cargado = false;
  function cargarPixel() {
    if (cargado) return;
    cargado = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
    medirLectura();
  }

  /* Lectura: una sección cuenta si ocupa media pantalla durante 3 segundos. Una vez por sección y por visita.
     ScrollProfundidad marca cuando se pasa del 50 % y del 90 % de la página. Solo con cookies aceptadas. */
  function medirLectura() {
    if (!("IntersectionObserver" in window)) return;
    var pagina = location.pathname, relojes = {}, vistas = {}, niveles = {};
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var id = e.target.id;
        var dentro = e.isIntersecting && e.intersectionRect.height >= window.innerHeight * 0.5;
        if (dentro && !vistas[id] && !relojes[id]) {
          relojes[id] = setTimeout(function () {
            vistas[id] = true;
            window.fbq("trackCustom", "SeccionLeida", { seccion: id, pagina: pagina });
            obs.unobserve(e.target);
          }, 3000);
        } else if (!dentro && relojes[id] && !vistas[id]) {
          clearTimeout(relojes[id]);
          delete relojes[id];
        }
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1] });
    function observar() {
      Array.prototype.forEach.call(document.querySelectorAll("main section[id], section[id]"), function (s) {
        if (s.id !== "aviso-cookies") obs.observe(s);
      });
    }
    function profundidad() {
      var total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      var pct = (window.scrollY / total) * 100;
      [50, 90].forEach(function (n) {
        if (pct >= n && !niveles[n]) {
          niveles[n] = true;
          window.fbq("trackCustom", "ScrollProfundidad", { nivel: n, pagina: pagina });
        }
      });
    }
    window.addEventListener("scroll", profundidad, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observar);
    else observar();
  }

  /* Medición de botones. Nunca se envía lo que la persona escribe ni su foto:
     solo qué botón tocó, en qué zona y en qué página.
     WhatsApp = Contact (estándar) + un evento por tema.
     Otros: ClicRedes, ClicCalendario, ClicMapa, ClicVideo, ClicPregunta,
     ClicNavegacion, PaseDescargar, PaseCompartir, PaseFoto y ClicBoton. */
  function texto(el) {
    /* El menú guarda dos versiones del nombre (corta y larga): se usa la larga. */
    var menu = el.closest(".paginas") ? el.querySelector("span:last-child") : null;
    return ((menu || el).getAttribute("aria-label") || (menu || el).textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }
  function zona(el) {
    if (el.closest(".wa-flotante")) return "flotante";
    if (el.closest(".barra")) return "barra";
    if (el.closest("footer")) return "pie";
    if (el.closest(".otras")) return "otras";
    var s = el.closest("section[id]");
    return s ? s.id : "pagina";
  }
  function temaWhatsApp(href) {
    var t = "";
    try { t = decodeURIComponent(href); } catch (e) { t = href; }
    if (/avisen/.test(t)) return "Entrada";
    if (/condiciones/.test(t)) return "Carpa";
    if (/bases/.test(t)) return "Canino";
    return "Pregunta";
  }
  function medir(el) {
    var datos = { boton: texto(el), zona: zona(el), pagina: location.pathname };
    if (el.tagName === "SUMMARY") {
      if (!el.parentNode.open) window.fbq("trackCustom", "ClicPregunta", datos);
      return;
    }
    if (el.tagName === "BUTTON") {
      var id = el.id;
      var nombre = id === "abrir-video" ? "ClicVideo" : id === "descargar" ? "PaseDescargar" : id === "compartir" ? "PaseCompartir" : id === "feria-descargar" ? "TarjetaDescargar" : id === "feria-compartir" ? "TarjetaCompartir" : "ClicBoton";
      window.fbq("trackCustom", nombre, datos);
      return;
    }
    var href = el.href || "";
    if (href.indexOf("wa.me/") > -1) {
      var tema = temaWhatsApp(href);
      datos.content_name = tema;
      window.fbq("track", "Contact", datos);
      window.fbq("trackCustom", "WhatsApp" + tema, datos);
    } else if (/(facebook|instagram)\.com/.test(href)) {
      if (href.indexOf("/privacy/") > -1) return;
      datos.red = href.indexOf("instagram") > -1 ? "Instagram" : "Facebook";
      window.fbq("trackCustom", "ClicRedes", datos);
    } else if (/\.ics(\?|$)/.test(href)) {
      window.fbq("trackCustom", "ClicCalendario", datos);
    } else if (href.indexOf("/img/mapa/") > -1) {
      window.fbq("trackCustom", "ClicMapa", datos);
    } else {
      datos.destino = el.pathname + el.hash;
      window.fbq("trackCustom", "ClicNavegacion", datos);
    }
  }
  document.addEventListener("click", function (e) {
    if (!cargado || !window.fbq || !e.target.closest) return;
    var el = e.target.closest("a[href], button, summary");
    if (!el || el.disabled) return;
    if (el.closest("#aviso-cookies") || el.id === "cambiar-cookies" || el.classList.contains("saltar")) return;
    medir(el);
  }, true);
  document.addEventListener("change", function (e) {
    if (cargado && window.fbq && e.target.id === "foto" && e.target.files && e.target.files.length) {
      window.fbq("trackCustom", "PaseFoto", { pagina: location.pathname }); /* solo el aviso: la foto no sale del teléfono */
    }
  });

  function ajustarAlto(aviso) {
    var alto = aviso ? aviso.offsetHeight + 12 : 0;
    document.documentElement.style.setProperty("--aviso-alto", alto + "px");
  }

  function quitarAviso() {
    var aviso = document.getElementById("aviso-cookies");
    if (aviso) aviso.remove();
    ajustarAlto(null);
  }

  function mostrarAviso() {
    if (document.getElementById("aviso-cookies")) return;
    var aviso = document.createElement("section");
    aviso.id = "aviso-cookies";
    aviso.className = "aviso-cookies";
    aviso.setAttribute("role", "region");
    aviso.setAttribute("aria-label", "Aviso de cookies");
    aviso.innerHTML =
      '<p>Usamos cookies de Meta para medir esta web y mostrar anuncios del festival, solo si aceptas. ' +
      '<a class="enlace" href="/privacidad.html">Cómo cuidamos tus datos</a></p>' +
      '<div class="aviso-cookies__botones">' +
      '<button type="button" data-cookies="no">Rechazar</button>' +
      '<button type="button" data-cookies="si">Aceptar</button>' +
      "</div>";
    aviso.addEventListener("click", function (e) {
      var valor = e.target.getAttribute && e.target.getAttribute("data-cookies");
      if (!valor) return;
      guardar(valor);
      quitarAviso();
      if (valor === "si") cargarPixel();
    });
    document.body.appendChild(aviso);
    ajustarAlto(aviso);
    window.addEventListener("resize", function () {
      if (document.getElementById("aviso-cookies")) ajustarAlto(aviso);
    });
  }

  /* La Feria invita con su propio saludo; la decisión es la misma de siempre. */
  window.PFCookies = {
    estado: leer,
    decidir: function (valor) { guardar(valor); quitarAviso(); if (valor === "si") cargarPixel(); }
  };

  function iniciar() {
    var decision = leer();
    if (decision === "si") cargarPixel();
    else if (decision !== "no") mostrarAviso();

    /* Botón en la página de privacidad para cambiar la decisión. */
    var cambiar = document.getElementById("cambiar-cookies");
    if (cambiar) {
      cambiar.addEventListener("click", function () {
        try { localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
        if (cargado) location.reload(); else mostrarAviso();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
