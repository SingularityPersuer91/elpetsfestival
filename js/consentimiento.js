/* Aviso de cookies y píxel de Meta. El píxel solo se carga si la persona acepta.
   Sin aceptación no se pide nada a Meta. La decisión queda en este navegador. */
(function () {
  "use strict";
  var PIXEL_ID = "29163532359953133";
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
  }

  /* Cada botón de WhatsApp cuenta como Contactar, con la página de origen. */
  document.addEventListener("click", function (e) {
    if (!cargado || !window.fbq || !e.target.closest) return;
    var a = e.target.closest('a[href*="wa.me/"]');
    if (a) window.fbq("track", "Contact", { content_name: location.pathname });
  }, true);

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
