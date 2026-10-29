/* El Pets Festival · landing · comportamiento (sin dependencias).
   1) Botones que preseleccionan el interés de la lista y cambian el texto del envío. 2) Lista de interés hacia el Google Form
   del organizador, con validación tolerante y errores junto a cada campo. 3) Pase «Nos vemos aquí» en canvas: nace cerca de
   su sección (o al tocar el formulario), dibuja la vista previa a su tamaño visible y exporta 1080×1920 solo al descargar o
   compartir; la foto se procesa en el teléfono. 4) Video detrás de un toque. 5) Tira de fechas según el día en Quito.
   6) Entradas suaves (respetan «reducir movimiento»). */
(function () {
  "use strict";
  var C = window.PETS_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var URL_PUBLICA = C.URL_PUBLICA || "https://singularitypersuer91.github.io/elpetsfestival/";
  var URL_CORTA = URL_PUBLICA.replace(/^https?:\/\//, "").replace(/\/$/, "");

  /* 1) interés preseleccionado y texto del botón de envío */
  var form = $("#form-lista"), estado = $("#estado"), enviar = $("#enviar"), E = C.ENTRADAS || {};
  var TEXTO_ENVIO = { "Entrada": "Sumarme a la lista", "Carpa para vender": "Pedir las condiciones de carpa", "Auspicio para mi marca": "Pedir información de auspicio" };
  var textoEnvio = function () {
    var r = $('#form-lista input[name="interes"]:checked');
    if (enviar && r) enviar.textContent = TEXTO_ENVIO[r.value] || TEXTO_ENVIO.Entrada;
  };
  $$("[data-interes]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-interes");
      var r = $('#form-lista [data-campo="interes"] input[value="' + v + '"]');
      if (r) { r.checked = true; textoEnvio(); }
    });
  });
  $$('#form-lista input[name="interes"]').forEach(function (r) { r.addEventListener("change", textoEnvio); });

  /* opciones opcionales: se pueden volver a dejar sin respuesta */
  var limpiar = $("#limpiar-opcionales");
  var opcionales = $$('#form-lista input[name="dia_lista"], #form-lista input[name="perro_lista"]');
  var verLimpiar = function () { if (limpiar) limpiar.hidden = !opcionales.some(function (r) { return r.checked; }); };
  opcionales.forEach(function (r) { r.addEventListener("change", verLimpiar); });
  if (limpiar) limpiar.addEventListener("click", function () {
    opcionales.forEach(function (r) { r.checked = false; }); verLimpiar();
    var primero = $('#form-lista input[name="dia_lista"]'); if (primero) primero.focus();
  });

  /* 2) lista de interés: action y name desde config.js; sin todos los identificadores obligatorios no se envía */
  var listo = !!(C.FORM_ACTION && E.nombre && E.contacto && E.interes && E.acepto);
  var campo = function (k) { return $$('#form-lista [data-campo="' + k + '"]').reduce(function (a, el) { return a.concat(el.tagName === "FIELDSET" ? $$("input", el) : [el]); }, []); };
  var aviso = $("#aviso-conexion");
  if (form && !listo) { enviar.disabled = true; }
  if (form && listo) {
    form.action = C.FORM_ACTION;
    ["nombre", "contacto", "interes", "dia", "perro", "acepto"].forEach(function (k) { if (E[k]) campo(k).forEach(function (el) { el.name = E[k]; }); });
    campo("acepto").forEach(function (el) { el.value = C.ACEPTO_VALOR || "Acepto"; });
    enviar.disabled = false; if (aviso) aviso.hidden = true;
    enviar.setAttribute("aria-describedby", "estado");
  }
  var esCorreo = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  var esCelular = function (v) { var d = v.replace(/[\s().-]/g, ""); return /^\+?[0-9]{9,15}$/.test(d); };
  var marcar = function (el, msg) {
    var err = $("#" + el.id + "-error"); if (!err) return;
    if (msg) { el.setAttribute("aria-invalid", "true"); err.textContent = msg; err.hidden = false; }
    else { el.removeAttribute("aria-invalid"); err.textContent = ""; err.hidden = true; }
  };
  var validar = function () {
    var fN = $("#nombre"), fC = $("#contacto"), fA = $("#acepto"), primero = null;
    var n = fN.value.trim(), c = fC.value.trim();
    marcar(fN, n ? "" : "Escribe tu nombre."); if (!n) primero = primero || fN;
    var mc = !c ? "Escribe tu WhatsApp o tu correo." : (esCorreo(c) || esCelular(c) ? "" : "Revisa el dato: un celular de 10 dígitos que empiece con 09, o un correo como tu@correo.com.");
    marcar(fC, mc); if (mc) primero = primero || fC;
    marcar(fA, fA.checked ? "" : "Para anotarte, marca la casilla de autorización."); if (!fA.checked) primero = primero || fA;
    return primero;
  };
  if (form) {
    ["nombre", "contacto"].forEach(function (id) { var el = $("#" + id); el.addEventListener("input", function () { if (el.getAttribute("aria-invalid")) marcar(el, ""); }); });
    $("#acepto").addEventListener("change", function () { if ($("#acepto").checked) marcar($("#acepto"), ""); });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!listo) return;
      var malo = validar();
      if (malo) { estado.textContent = "Revisa los campos marcados."; malo.focus(); return; }
      var datos = new FormData(form);
      ["dia_lista", "perro_lista"].forEach(function (k) { datos.delete(k); });
      enviar.disabled = true; estado.textContent = "Enviando…";
      /* Pendiente al conectar: el receptor debe confirmar el registro (no-cors no permite leer la respuesta). */
      fetch(C.FORM_ACTION, { method: "POST", mode: "no-cors", body: datos })
        .then(function () { window.location.href = "gracias.html"; })
        .catch(function () { enviar.disabled = false; estado.textContent = "No se pudo enviar. Revisa tu conexión e inténtalo otra vez."; });
    });
  }

  /* 3) pase «Nos vemos aquí» */
  var lienzo = $("#lienzo"), fp = $("#form-pase"), vista = $("#pase-vista");
  if (lienzo && lienzo.getContext && fp) {
    var W = 1080, H = 1920, foto = null, iniciado = false, listos = null, pendiente = false;
    var logo = new Image(), papel = new Image(), perroVacio = new Image(), grano = null;
    var COL = { canela: "#B4472A", mostaza: "#F2B33D", crema: "#FFF4E0", carbon: "#231A15" };
    var titulo = "800 {t}px 'Bricolage Grotesque', 'Arial Black', sans-serif", texto = "{p} {t}px Figtree, system-ui, sans-serif";
    var f = function (pl, t, p) { return pl.replace("{t}", t).replace("{p}", p || 600); };
    var resumen = $("#pase-resumen"), estadoPase = $("#pase-estado"), errFoto = $("#foto-error");
    var leer = function () {
      return { dia: (fp.querySelector('input[name="dia"]:checked') || {}).value || "Sábado 12 de diciembre", zona: fp.zona.value, perro: fp.perro.value.trim().slice(0, 18) };
    };
    var cargar = function (im, src) { return new Promise(function (ok) { im.onload = ok; im.onerror = ok; im.src = src; }); };
    /* grano: una tesela de 6 px cacheada y un solo fillRect con patrón (antes, unos 57.600 fillRect por dibujo) */
    var patronGrano = function (ctx) {
      if (!grano) { grano = document.createElement("canvas"); grano.width = grano.height = 6; var g = grano.getContext("2d"); g.fillStyle = "rgba(35,26,21,0.05)"; g.fillRect(0, 0, 1.2, 1.2); g.fillRect(3, 3, 1.2, 1.2); }
      return ctx.createPattern(grano, "repeat");
    };
    /* pase como boleto impreso: talón crema con filo mostaza, picado en las esquinas, perforación y talón mostaza.
       Dibuja en coordenadas de 1080×1920; la escala la pone quien llama. */
    function dibujar(ctx) {
      var d = leer(), sp = function (v) { if ("letterSpacing" in ctx) ctx.letterSpacing = v; };
      var X0 = 72, X1 = W - 72, Y0 = 170, Y1 = 1740, PERF = 1430;
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; sp("0px");
      ctx.fillStyle = COL.canela; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = patronGrano(ctx); ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COL.crema; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
      ctx.fillStyle = COL.mostaza; ctx.fillRect(X0, Y0, X1 - X0, 14);
      if (papel.naturalWidth) { ctx.drawImage(papel, 0, 0, 230, 230); ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(papel, 0, 0, 230, 230); ctx.restore(); }
      if (logo.naturalWidth) { var lw = 210, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, (W - lw) / 2, Y0 + 52, lw, lh); }
      ctx.fillStyle = COL.carbon; ctx.font = f(texto, 34, 600); sp("5px"); ctx.fillText("NOS VEMOS EN", W / 2, 548); sp("0px");
      var nz = d.zona.charAt(0).toUpperCase() + d.zona.slice(1), tz = 150; ctx.font = f(titulo, tz);
      while (tz > 90 && ctx.measureText(nz).width > X1 - X0 - 120) { tz -= 4; ctx.font = f(titulo, tz); }
      ctx.fillStyle = COL.canela; sp("-4px"); ctx.fillText(nz, W / 2, 690); sp("0px");
      var fx = 290, fy = 740, fw = W - 580, fh = 500;
      ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
      if (foto) { var s = Math.max(fw / foto.width, fh / foto.height), dw = foto.width * s, dh = foto.height * s; ctx.drawImage(foto, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); }
      else {
        ctx.fillStyle = COL.crema; ctx.fillRect(fx, fy, fw, fh);
        if (perroVacio.naturalWidth) ctx.drawImage(perroVacio, fx + (fw - 300) / 2, fy + 40, 300, 300);
        ctx.fillStyle = COL.carbon; ctx.font = f(texto, 34, 600); ctx.fillText("Tu foto, si quieres", W / 2, fy + fh - 60);
      }
      ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = COL.carbon; ctx.strokeRect(fx, fy, fw, fh);
      ctx.fillStyle = COL.carbon;
      if (d.perro) { var tn = 96; ctx.font = f(titulo, tn); while (tn > 48 && ctx.measureText(d.perro).width > X1 - X0 - 120) { tn -= 4; ctx.font = f(titulo, tn); } sp("-3px"); ctx.fillText(d.perro, W / 2, 1330); sp("0px"); ctx.font = f(texto, 36, 600); ctx.fillText("y su familia", W / 2, 1382); }
      else { ctx.font = f(titulo, 72); sp("-2px"); ctx.fillText("Con toda la familia", W / 2, 1340); sp("0px"); }
      ctx.fillStyle = COL.mostaza; ctx.fillRect(X0, PERF, X1 - X0, Y1 - PERF);
      ctx.fillStyle = COL.canela; [X0, X1].forEach(function (x) { ctx.beginPath(); ctx.arc(x, PERF, 30, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = COL.carbon; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(X0 + 46, PERF); ctx.lineTo(X1 - 46, PERF); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.carbon; var td = 58, ld = d.dia + " de 2026"; ctx.font = f(texto, td, 800); while (td > 40 && ctx.measureText(ld).width > X1 - X0 - 80) { td -= 2; ctx.font = f(texto, td, 800); } ctx.fillText(ld, W / 2, PERF + 108);
      ctx.font = f(texto, 36, 600); ctx.fillText("09:00 a 21:00 · Parque Bicentenario, Quito", W / 2, PERF + 168);
      ctx.font = f(texto, 30, 700); sp("4px"); ctx.fillText("ESTO NO ES TU ENTRADA", W / 2, PERF + 246); sp("0px");
      ctx.fillStyle = COL.crema; ctx.font = f(texto, 38, 800); ctx.fillText("El Pets Festival Gastronómico", W / 2, 1800);
      ctx.font = f(texto, 30, 600); ctx.fillText("La Yapa de Quito · 12 y 13 de diciembre de 2026", W / 2, 1846);
      ctx.font = f(texto, 28, 700); ctx.fillText(URL_CORTA, W / 2, 1890);
    }
    var describir = function () {
      var d = leer(), t = "Pase: " + d.dia.toLowerCase() + " de 2026, nos vemos en " + d.zona + ", " + (d.perro ? d.perro + " y su familia" : "con toda la familia") + (foto ? ", con tu foto" : "") + ".";
      lienzo.setAttribute("aria-label", "Vista previa del " + t.charAt(0).toLowerCase() + t.slice(1));
      return t;
    };
    /* vista previa: tamaño visible × densidad (tope 2) */
    var ajustar = function () {
      var w = Math.round(vista.clientWidth || 240), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var bw = Math.round(w * dpr), bh = Math.round(bw * H / W);
      if (lienzo.width !== bw || lienzo.height !== bh) { lienzo.width = bw; lienzo.height = bh; }
    };
    var pintar = function () {
      pendiente = false; if (listos !== true) return;
      ajustar(); var ctx = lienzo.getContext("2d"); ctx.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0); dibujar(ctx); describir();
    };
    var programar = function () { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } };
    var avisarResumen; var anunciar = function () { clearTimeout(avisarResumen); avisarResumen = setTimeout(function () { if (resumen) resumen.textContent = describir(); }, 700); };
    var iniciar = function () {
      if (iniciado) return listos; iniciado = true;
      var fuentes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("800 40px 'Bricolage Grotesque'"), document.fonts.load("700 40px Figtree")]).catch(function () {}) : Promise.resolve();
      listos = Promise.all([cargar(logo, "img/marca/logo-gastronomico-240.webp"), cargar(papel, "img/marca/papel-picado-esquina.svg"), cargar(perroVacio, "img/pictos/perro_mestizo_rescatado.svg"), fuentes])
        .then(function () { listos = true; var est = $(".pase__estatico", vista); pintar(); lienzo.hidden = false; if (est) est.hidden = true; return true; });
      return listos;
    };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (ent) { if (ent.some(function (e) { return e.isIntersecting; })) { io.disconnect(); iniciar(); } }, { rootMargin: "300px 0px" });
      io.observe($("#pase"));
    } else { iniciar(); }
    ["focusin", "pointerdown", "input", "change"].forEach(function (t) { fp.addEventListener(t, function () { iniciar(); }); });
    fp.addEventListener("input", function () { programar(); anunciar(); }); fp.addEventListener("change", function () { programar(); anunciar(); });
    var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(programar, 150); });

    /* foto: límite de peso y de dimensiones, reducción a 1200 px, error visible y liberación de bitmaps y URLs */
    var MAX_BYTES = 15 * 1024 * 1024, MAX_PX = 50e6, LADO = 1200, turno = 0, fotoNombre = $("#foto-nombre");
    var cerrar = function (x) { if (x && x.close) { try { x.close(); } catch (e) { /* nada */ } } };
    var errorFoto = function (msg) { if (!errFoto) return; errFoto.textContent = msg || ""; errFoto.hidden = !msg; if (msg) fp.foto.setAttribute("aria-invalid", "true"); else fp.foto.removeAttribute("aria-invalid"); };
    var quitarFoto = function () { foto = null; };
    fp.foto.addEventListener("change", function () {
      var a = fp.foto.files && fp.foto.files[0], mio = ++turno; errorFoto("");
      if (fotoNombre) fotoNombre.textContent = a ? a.name : "Ninguna foto elegida";
      if (!a) { quitarFoto(); programar(); return; }
      if (a.size > MAX_BYTES) { errorFoto("Esa foto pesa más de 15 MB. Elige una más liviana."); fp.foto.value = ""; if (fotoNombre) fotoNombre.textContent = "Ninguna foto elegida"; quitarFoto(); programar(); return; }
      var usar = function (src, w, h, liberar) {
        if (mio !== turno) { liberar(); return; }
        if (!w || !h || w * h > MAX_PX) { liberar(); errorFoto("Esa foto es demasiado grande para procesarla aquí. Prueba con otra."); return; }
        var s = Math.min(1, LADO / Math.max(w, h)), c = document.createElement("canvas");
        c.width = Math.round(w * s); c.height = Math.round(h * s); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
        liberar(); foto = c; iniciar(); programar(); anunciar();
      };
      var fallo = function () { if (mio === turno) { errorFoto("No pudimos abrir esa foto. Prueba con una JPG o PNG."); quitarFoto(); programar(); } };
      var comoImagen = function () {
        var url = URL.createObjectURL(a), im = new Image();
        im.onload = function () { usar(im, im.naturalWidth, im.naturalHeight, function () { URL.revokeObjectURL(url); }); };
        im.onerror = function () { URL.revokeObjectURL(url); fallo(); };
        im.src = url;
      };
      /* respeta la orientación EXIF del teléfono cuando el navegador lo permite */
      if (window.createImageBitmap) { createImageBitmap(a, { imageOrientation: "from-image" }).then(function (bm) { usar(bm, bm.width, bm.height, function () { cerrar(bm); }); }, comoImagen); }
      else { comoImagen(); }
    });

    var nombreArchivo = function () { var p = fp.perro.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return "pase-el-pets-festival-2026" + (p ? "-" + p : "") + ".png"; };
    /* exportación a 1080×1920 solo al descargar o compartir */
    var exportar = function () {
      return Promise.resolve(iniciar()).then(function () {
        return new Promise(function (ok, mal) {
          var c = document.createElement("canvas"); c.width = W; c.height = H; dibujar(c.getContext("2d"));
          c.toBlob(function (b) { c.width = c.height = 0; if (b) ok(b); else mal(new Error("sin blob")); }, "image/png");
        });
      });
    };
    var avisoPase = function (m) { if (estadoPase) estadoPase.textContent = m || ""; };
    var guardar = $("#pase-guardar"), guardarImg = null, urlGuardar = null;
    var comp = $("#compartir"), puedeCompartir = false;
    try { puedeCompartir = !!(navigator.canShare && window.File && navigator.canShare({ files: [new File(["x"], "x.png", { type: "image/png" })] })); } catch (e) { puedeCompartir = false; }
    comp.hidden = !puedeCompartir; /* sin compartir archivos (navegadores internos): queda Descargar y mantener pulsada la imagen */
    $("#descargar").addEventListener("click", function () {
      avisoPase("Preparando tu pase…");
      exportar().then(function (b) {
        var url = URL.createObjectURL(b), a = document.createElement("a"); a.href = url; a.download = nombreArchivo(); document.body.appendChild(a); a.click(); a.remove();
        if (!puedeCompartir && guardar) {
          if (!guardarImg) { guardarImg = new Image(); guardarImg.alt = "Tu pase listo para guardar"; guardarImg.width = 240; guardarImg.height = 427; guardar.insertBefore(guardarImg, guardar.firstChild); }
          if (urlGuardar) URL.revokeObjectURL(urlGuardar);
          urlGuardar = url; guardarImg.src = url; guardar.hidden = false;
          avisoPase("Listo. Si tu navegador no lo descargó, mantén pulsada la imagen de abajo para guardarla.");
        } else { setTimeout(function () { URL.revokeObjectURL(url); }, 4000); avisoPase("Listo: tu pase se descargó."); }
      }, function () { avisoPase("No se pudo preparar el pase. Inténtalo otra vez."); });
    });
    comp.addEventListener("click", function () {
      avisoPase("Preparando tu pase…");
      exportar().then(function (b) {
        var arch = new File([b], nombreArchivo(), { type: "image/png" });
        return navigator.share({ files: [arch], title: "El Pets Festival 2026", text: "Nos vemos en El Pets Festival · 12 y 13 de diciembre de 2026 · Parque Bicentenario, Quito · " + URL_PUBLICA })
          .then(function () { avisoPase(""); }, function (e) {
            if (e && e.name === "AbortError") avisoPase(""); /* la persona canceló: no es un error */
            else avisoPase("No se pudo compartir. Descarga el pase y súbelo desde tu galería.");
          });
      }, function () { avisoPase("No se pudo preparar el pase. Inténtalo otra vez."); });
    });
  }

  /* 4) video detrás de un toque */
  var abrir = $("#abrir-video"), video = $("#video-yapa");
  if (abrir && video) abrir.addEventListener("click", function () { abrir.hidden = true; video.poster = "video/poster-540.jpg"; video.hidden = false; video.play().catch(function () {}); video.focus(); });

  /* 5) tira de fechas (hora de Quito, UTC−5): se resalta la casilla publicada cuya fecha ya llegó; si ninguna llegó, la próxima publicada */
  var hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10), abierta = null, proxima = null;
  $$("#fechas li[data-publicado]").forEach(function (li) { var d = li.getAttribute("data-fecha"); if (d <= hoy) abierta = li; else if (!proxima) proxima = li; });
  if (abierta) abierta.classList.add("abierta"); else if (proxima) proxima.classList.add("proxima");

  /* 6) movimiento: la cartela del héroe sube en CSS; cada imagen aparece una vez (8 px, 240 ms). Sin movimiento si se pide reducirlo. */
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducir && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-mov");
    var obs = new IntersectionObserver(function (ent) { ent.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    $$(".foto:not(.heroe__foto), .mapa").forEach(function (el) { obs.observe(el); });
  }
})();
