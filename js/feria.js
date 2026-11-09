/* La Feria: abre cada experiencia dentro de su sección. Se carga solo al tocar un boleto. */
(function () {
  var escena = document.getElementById("feria-escena");
  if (!escena) return;
  var ENTRADA = "https://www.meet2go.com/ev/elpetsfestivaluio";
  var ARTISTAS = { "Sábado 12": ["I.N.R.I", "EMPICCCCC"], "Domingo 13": ["Jammal Sánchez", "GHETTO WARRIOR"] };
  var MOTIVOS = ["Comida típica", "Regalos de Navidad", "Música en vivo", "Festival canino"];
  var NOMBRES = ["Bully", "Chiquito", "Mestizo", "Peludo", "Salchicha"];
  var abierta = null, ficha = 0, origen = null;

  function html(s) { var d = document.createElement("div"); d.innerHTML = s; return d; }
  function evento(n, d) { if (window.fbq) window.fbq("trackCustom", n, d); }
  function cerrar() {
    abierta = null; ficha += 1; escena.hidden = true; escena.innerHTML = ""; document.body.classList.remove("feria-abierta");
    if (window.PFCucharon) window.PFCucharon.detener();
    var b = origen || document.querySelector(".feria__boletos button"); if (b) b.focus();
  }
  function marco(titulo, ayuda) {
    escena.innerHTML = '<div class="feria__marco"><div class="feria__barra"><h3 tabindex="-1">' + titulo + '</h3><button class="feria__cerrar" type="button" id="feria-cerrar">Cerrar</button></div><p class="feria__ayuda">' + ayuda + '</p><div id="feria-cuerpo"></div><p class="feria__estado" id="feria-estado" role="status"></p></div>';
    escena.hidden = false; document.body.classList.add("feria-abierta");
    document.getElementById("feria-cerrar").addEventListener("click", cerrar);
    escena.querySelector("h3").focus({ preventScroll: true });
    escena.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return document.getElementById("feria-cuerpo");
  }
  function acciones() {
    var G = window.PFGuardar, T = window.PFTarjeta, conVideo = !!T.tipoVideo();
    var c = html('<div class="feria__acciones">' + (conVideo ? '<button class="boton" type="button" id="feria-video">Video holográfico para historias</button>' : "") +
      '<button class="boton' + (conVideo ? " boton--linea" : "") + '" type="button" id="feria-descargar">Imagen del sticker</button>' +
      '<a class="boton boton--linea" href="' + ENTRADA + '" target="_blank" rel="noopener">Quiero mi entrada</a></div>' +
      '<p class="feria__aviso" id="feria-aviso"' + (G.interno ? "" : " hidden") + ">" + G.AVISO_INTERNO + "</p>" +
      '<div class="feria__guardar" id="feria-guardar" hidden></div>').childNodes;
    return { nodos: c, activar: function (leer) {
      var est = document.getElementById("feria-estado"), base = "sticker-el-pets-festival";
      var des = document.getElementById("feria-descargar"), vb = document.getElementById("feria-video"), caja = document.getElementById("feria-guardar");
      var TXT_V = vb ? vb.textContent : "", TXT_I = des.textContent, urlVer = null;
      var img = { k: "", t: null, f: null }, vid = { k: "", f: null, grabando: false };
      var clave = function () { return JSON.stringify(leer()); };
      var prepImg = function () {
        var k = clave();
        if (img.k !== k) {
          img.k = k; img.f = null;
          img.t = T.exportar(leer()).then(function (b) { var fi = new File([b], base + ".png", { type: "image/png" }); if (img.k === k) img.f = fi; return fi; });
          img.t.catch(function () { est.textContent = "No se pudo preparar el sticker. Inténtalo otra vez."; });
        }
        return img.t;
      };
      var ver = function (fi) {
        if (urlVer) URL.revokeObjectURL(urlVer);
        urlVer = URL.createObjectURL(fi);
        var esV = fi.type.indexOf("video") === 0;
        caja.innerHTML = (esV ? '<video muted loop autoplay playsinline controls width="216" height="384"></video>' : '<img alt="Tu sticker listo para guardar" width="216" height="384">') +
          "<p>" + (esV ? "Si no se guardó, abre el video, toca Compartir y elige «Guardar video»." : "Si no se guardó, mantén pulsada la imagen y elige «Guardar en Fotos».") + "</p>";
        caja.firstChild.src = urlVer; caja.hidden = false;
      };
      var entregar = function (fi) {
        if (G.puede(fi)) {
          G.compartir(fi).then(function () { est.textContent = ""; }, function (e) {
            if (e && e.name === "AbortError") { est.textContent = ""; return; }
            G.bajar(fi); ver(fi); est.textContent = "Tu sticker se descargó.";
          });
        } else {
          G.bajar(fi); ver(fi);
          est.textContent = G.interno ? G.AVISO_INTERNO : (fi.type.indexOf("video") === 0 ? "Tu video holográfico se descargó (" + fi.name.split(".").pop().toUpperCase() + ", 1080×1920). Súbelo a tus historias desde tu galería." : "Tu sticker se descargó como imagen PNG de 1080×1920.");
        }
      };
      var reiniciar = function () { vid.f = null; if (vb && !vid.grabando) vb.textContent = TXT_V; des.textContent = TXT_I; };
      prepImg();
      var form = document.getElementById("feria-plan");
      if (form) form.addEventListener("change", function () { reiniciar(); prepImg(); });
      des.addEventListener("click", function () {
        if (img.f && img.k === clave()) { entregar(img.f); return; }
        est.textContent = "Preparando tu sticker…";
        prepImg().then(function (fi) {
          if (G.puede(fi)) { des.textContent = "Guardar imagen en mi teléfono"; est.textContent = "Tu imagen está lista: tócala otra vez para guardarla o subirla a tus historias."; }
          else entregar(fi);
        });
      });
      if (vb) vb.addEventListener("click", function () {
        if (vid.grabando) return;
        if (vid.f && vid.k === clave()) { entregar(vid.f); return; }
        var k = clave(); vid.grabando = true; vb.disabled = true; est.textContent = "Grabando tu video holográfico… 0 %";
        T.exportarVideo(leer(), function (p) { est.textContent = "Grabando tu video holográfico… " + Math.round(p * 100) + " %"; }).then(function (r) {
          vid.grabando = false; vb.disabled = false;
          var fi = new File([r.blob], base + "-holografico." + r.ext, { type: r.type });
          if (k !== clave()) { reiniciar(); est.textContent = "Cambiaste tu sticker: toca otra vez para grabar el nuevo."; return; }
          vid.f = fi; vid.k = k;
          if (G.puede(fi)) { ver(fi); vb.textContent = "Guardar video en mi teléfono"; est.textContent = "Tu video está listo: tócalo para guardarlo en Fotos o subirlo directo a tus historias."; }
          else entregar(fi);
        }, function () {
          vid.grabando = false; vb.disabled = false;
          est.textContent = "Este navegador no pudo grabar el video. Usa «Imagen del sticker».";
        });
      });
    } };
  }
  function grupo(nombre, leyenda, ops) {
    return '<fieldset class="feria__grupo"><legend>' + leyenda + "</legend><div>" + ops.map(function (o, i) {
      return '<label><input type="radio" name="' + nombre + '" value="' + o + '"' + (i ? "" : " checked") + "><span>" + o + "</span></label>";
    }).join("") + "</div></fieldset>";
  }
  function holo(lienzoId) {
    return '<div class="holo" id="feria-holo"><canvas id="' + lienzoId + '" width="260" height="462" role="img" aria-label="Vista previa de tu sticker holográfico"></canvas><span class="holo__brillo"></span></div>';
  }
  function moverHolo() {
    var h = document.getElementById("feria-holo");
    if (!h || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    h.addEventListener("pointermove", function (e) {
      var r = h.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      h.classList.add("holo--activo");
      h.style.setProperty("--ry", ((x - .5) * 16).toFixed(1) + "deg"); h.style.setProperty("--rx", ((.5 - y) * 16).toFixed(1) + "deg");
      h.style.setProperty("--bx", (x * 100).toFixed(0) + "%"); h.style.setProperty("--by", (y * 100).toFixed(0) + "%");
    });
    h.addEventListener("pointerleave", function () { h.classList.remove("holo--activo"); h.style.removeProperty("--rx"); h.style.removeProperty("--ry"); });
  }
  function perritos() {
    return '<fieldset class="feria__grupo feria__perritos"><legend>Elige tu perrito</legend><div>' + NOMBRES.map(function (n, i) {
      return '<label><input type="radio" name="perrito" value="' + window.PFTarjeta.PERROS[i] + '"' + (i ? "" : " checked") + '><span>' + n + "</span></label>";
    }).join("") + "</div></fieldset>";
  }
  function abrirPlan() {
    var c = marco("Mi Plan de Pista", "Elige y tu sticker holográfico se arma solo.");
    c.className = "feria__plan";
    c.innerHTML = '<form id="feria-plan">' + grupo("dia", "¿Qué día vienes?", ["Sábado 12", "Domingo 13"]) + grupo("motivo", "¿Qué te trae?", MOTIVOS) + perritos() + grupo("perro", "¿Vienes con perro?", ["Sí", "No"]) + '</form><div class="feria__vista">' + holo("feria-lienzo") + '<div id="feria-pie"></div></div>';
    moverHolo();
    var f = document.getElementById("feria-plan"), l = document.getElementById("feria-lienzo");
    var leer = function () { var dia = f.dia.value; return { tipo: "plan", dia: dia, motivo: f.motivo.value, perro: f.perro.value === "Sí", perrito: f.perrito.value, artistas: ARTISTAS[dia] }; };
    var pintar = function () { window.PFTarjeta.pintar(l, leer()); };
    f.addEventListener("change", pintar); pintar();
    var a = acciones(), pie = document.getElementById("feria-pie");
    while (a.nodos.length) pie.appendChild(a.nodos[0]);
    a.activar(leer);
    evento("FeriaAbrir", { pieza: "Mi Plan de Pista" });
  }
  var perritoElegido = null, mejor = 0;
  function jugar(reto) {
    var c = marco("El Cucharón de la Yapa", reto ? "Te retaron: " + reto + " pisos. ¿Le ganas?" : "Toca para soltar cada pieza. Lo que cae fuera, se lo come tu perrito.");
    c.className = "feria__juego";
    window.PFCucharon.iniciar(c, { perrito: perritoElegido, reto: reto }, function (r) { terminar(c, r, reto); });
  }
  function terminar(c, r, reto) {
    var T = window.PFTarjeta, nivel = T.nivelDe(r.pisos), N_ = T.NIVELES, sig = N_[nivel + 1];
    mejor = Math.max(mejor, r.pisos);
    evento("JuegoFin", { juego: "Cucharon", nivel: N_[nivel].nombre, pisos: r.pisos });
    var d = { tipo: "juego", nivel: nivel, pisos: r.pisos, perrito: perritoElegido, corona: r.corona, torre: r.torre };
    var url = T.URL_PUBLICA + "#reto-" + r.pisos, texto = "Serví " + r.pisos + " pisos en El Cucharón de la Yapa. ¿Me ganas? " + url;
    var nota = reto ? (r.pisos > reto ? "¡Ganaste el reto de " + reto + " pisos!" : r.pisos === reto ? "¡Empate a " + reto + " pisos!" : "Te faltaron " + (reto - r.pisos + 1) + " para ganar el reto.") : sig ? "Te faltaron " + (sig.min - r.pisos) + " para " + sig.nombre + "." : "Llegaste al nivel más alto.";
    c.className = "feria__plan";
    c.innerHTML = '<div class="feria__fin"><p class="feria__rango">' + N_[nivel].nombre + '</p><p class="feria__dato">' + r.pisos + (r.pisos === 1 ? " piso" : " pisos") + " · " + r.justos + (r.justos === 1 ? " justo" : " justos") + " · corona de " + r.corona.toLowerCase() + '</p><p class="feria__nota">' + nota + '</p><p class="feria__mejor">Tu mejor torre de hoy: ' + mejor + '</p><button class="boton" type="button" id="feria-otra">Otra yapa</button><a class="boton boton--linea" id="feria-retar" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Retar por WhatsApp</a>' + (sig ? '<div class="feria__meta"><canvas id="feria-meta" width="96" height="171" aria-hidden="true"></canvas><p>Siguiente sticker: <strong>' + sig.nombre + "</strong></p></div>" : "") + '</div><div class="feria__vista">' + holo("feria-lienzo") + '<div id="feria-pie"></div></div>';
    moverHolo();
    T.pintar(document.getElementById("feria-lienzo"), d);
    if (sig) T.pintar(document.getElementById("feria-meta"), { tipo: "juego", nivel: nivel + 1, pisos: sig.min, perrito: perritoElegido, corona: r.corona, torre: r.torre });
    var a = acciones(), pie = document.getElementById("feria-pie");
    while (a.nodos.length) pie.appendChild(a.nodos[0]);
    a.activar(function () { return d; });
    document.getElementById("feria-otra").addEventListener("click", function () { jugar(reto); });
    document.getElementById("feria-estado").textContent = N_[nivel].nombre + ", " + r.pisos + " pisos. " + nota;
  }
  function abrirCucharon(op) {
    var reto = op && op.reto;
    if (reto) evento("RetoAbrir", { pisos: reto });
    var mia = ficha;
    window.PFTarjeta.preparar().then(function () {
      if (mia !== ficha) return;
      if (perritoElegido) return jugar(reto);
      var c = marco("El Cucharón de la Yapa", reto ? "Te retaron: " + reto + " pisos. Elige tu perrito y responde." : "Elige tu perrito y sirve la torre más alta.");
      c.className = "feria__juego";
      c.innerHTML = '<form id="feria-elige">' + perritos() + '<button class="boton" type="submit">Empezar</button></form>';
      document.getElementById("feria-elige").addEventListener("submit", function (e) { e.preventDefault(); perritoElegido = e.target.perrito.value; jugar(reto); });
    });
    evento("FeriaAbrir", { pieza: "El Cucharón de la Yapa" });
  }
  var invitado = false;
  function invitar(seguir) {
    escena.innerHTML = '<div class="feria__invita"><img src="img/pictos/grupo_la_mesa.svg" width="600" height="190" alt=""><h3 tabindex="-1">¡Qué bueno verte en La Feria!</h3><p class="feria__invita-texto">Ayúdanos a mejorar tu experiencia. Si aceptas, usamos cookies de Meta para medir la web y mostrar anuncios del festival.</p><p class="feria__invita-nota">Decidas lo que decidas, puedes jugar igual.</p><div class="feria__invita-botones"><button class="boton" type="button" id="feria-si">Aceptar y entrar</button><button class="boton" type="button" id="feria-no">Entrar sin cookies</button></div><p><a class="enlace" href="privacidad.html">Cómo cuidamos tus datos</a></p></div>';
    escena.hidden = false; document.body.classList.add("feria-abierta");
    escena.querySelector("h3").focus({ preventScroll: true });
    escena.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    [["feria-si", "si"], ["feria-no", "no"]].forEach(function (b) {
      document.getElementById(b[0]).addEventListener("click", function () { invitado = true; window.PFCookies.decidir(b[1]); seguir(); });
    });
  }
  window.PFFeria = { abrir: function (p, op, boton) {
    abierta = p; ficha += 1; origen = boton || null;
    if (window.PFCucharon) window.PFCucharon.detener();
    var seguir = function () { if (p === "plan") abrirPlan(); else if (p === "cucharon") abrirCucharon(op); };
    if (!invitado && window.PFCookies && !window.PFCookies.estado()) invitar(seguir); else seguir();
  } };
})();
