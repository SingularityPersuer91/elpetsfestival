/* Concurso de bandas Graba Estudio × El Pets Festival (HUECA-GRABA-002).
   Reels del concurso (videos.json) con su casillero de votación: el voto del público son los «me gusta» de Instagram.
   Seguimiento público (historial.json): quién se postula, cuántos votos suma cada banda y cómo van, actualizado cada hora.
   El reproductor de Instagram (embed.js) se carga solo cuando la persona toca un reel. */
(function () {
  "use strict";
  var CIERRE = new Date("2026-12-06T23:59:59-05:00");
  var HITOS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var $ = function (s) { return document.querySelector(s); };
  var embedCargado = false;
  var DATOS = window.__DATOS || null; // la vista previa trae sus datos de ejemplo

  function reelValido(url) { return /^https:\/\/www\.instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?$/.test(url); }
  function num(n) { return (n || 0).toLocaleString("es-EC"); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function fechaHora(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.getDate() + " " + MESES[d.getMonth()] + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function enlaceIG(url, txt, cls) { var a = el("a", cls || "reel__votar", txt); a.href = url; a.target = "_blank"; a.rel = "noopener"; return a; }

  function cargarEmbed() {
    if (embedCargado) { if (window.instgrm) window.instgrm.Embeds.process(); return; }
    var s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js"; s.async = true;
    s.onload = function () { embedCargado = true; if (window.instgrm) window.instgrm.Embeds.process(); };
    document.body.appendChild(s);
  }
  function abrir(card, url) {
    if (DATOS) { var a = enlaceIG(url, ""); document.body.appendChild(a); a.click(); a.remove(); return; }
    var bq = el("blockquote", "instagram-media");
    bq.setAttribute("data-instgrm-permalink", url); bq.setAttribute("data-instgrm-version", "14");
    bq.appendChild(enlaceIG(url, "Ver el reel en Instagram"));
    card.querySelector(".reel__abrir").replaceWith(bq);
    cargarEmbed();
  }

  // votos sumados en las últimas 24 h según el historial
  function ultimas24(h, ahora) {
    if (!h || !h.length) return 0;
    var lim = ahora - 864e5, base = h[0][1];
    for (var i = 0; i < h.length; i++) { if (new Date(h[i][0]) <= lim) base = h[i][1]; }
    return Math.max(0, h[h.length - 1][1] - base);
  }
  // línea de votos (SVG), del primer registro al último
  function linea(h) {
    if (!h || h.length < 2) return null;
    var W = 220, H = 44, t0 = new Date(h[0][0]).getTime(), t1 = new Date(h[h.length - 1][0]).getTime() || t0 + 1;
    var max = Math.max.apply(null, h.map(function (x) { return x[1]; })) || 1;
    var pts = h.map(function (x) {
      var px = (new Date(x[0]).getTime() - t0) / Math.max(1, t1 - t0) * (W - 8) + 4;
      var py = H - 4 - (x[1] / max) * (H - 8);
      return px.toFixed(1) + "," + py.toFixed(1);
    });
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "voto__linea"); svg.setAttribute("aria-hidden", "true");
    var area = document.createElementNS(ns, "polygon");
    area.setAttribute("points", "4," + (H - 4) + " " + pts.join(" ") + " " + pts[pts.length - 1].split(",")[0] + "," + (H - 4));
    area.setAttribute("class", "voto__area");
    var pl = document.createElementNS(ns, "polyline"); pl.setAttribute("points", pts.join(" ")); pl.setAttribute("class", "voto__trazo");
    var ult = pts[pts.length - 1].split(","), c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", ult[0]); c.setAttribute("cy", ult[1]); c.setAttribute("r", "3.5"); c.setAttribute("class", "voto__punto");
    svg.appendChild(area); svg.appendChild(pl); svg.appendChild(c);
    return svg;
  }
  // registro público: postulaciones y votos que llegan a cada hito
  function eventos(lista, hist) {
    var ev = [];
    lista.forEach(function (v) {
      var h = hist[v.url] || [];
      ev.push({ t: h.length ? h[0][0] : v.fecha + "T12:00:00-05:00", txt: v.banda + " se postuló al concurso", tipo: "post" });
      var prev = 0;
      h.forEach(function (x) {
        var alto = 0;
        HITOS.forEach(function (m) { if (prev < m && x[1] >= m) alto = m; });
        if (alto) ev.push({ t: x[0], txt: v.banda + " pasó los " + num(alto) + " votos", tipo: "hito" });
        prev = x[1];
      });
    });
    ev.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
    return ev.slice(0, 20);
  }

  function pintar(lista, hist, estado) {
    var ok = (lista || []).filter(function (v) { return v && v.banda && reelValido(v.url); });
    ok.sort(function (a, b) { return (b.votos || 0) - (a.votos || 0); });
    if (estado && estado.actualizado) $("[data-actualizado]").textContent = "Actualizado el " + fechaHora(estado.actualizado) + "." + (estado.cerrado ? " Votación cerrada: los votos quedaron fijos." : " Se actualiza cada hora.");
    if (!ok.length) return;
    hist = hist || {};
    var ahora = estado && estado.actualizado ? new Date(estado.actualizado) : new Date();
    var cerrado = new Date() > CIERRE;
    $("[data-vacio]").hidden = true; $("[data-seguimiento]").hidden = false;
    $("[data-n-bandas]").textContent = num(ok.length);
    $("[data-n-votos]").textContent = num(ok.reduce(function (s, v) { return s + (v.votos || 0); }, 0));
    $("[data-n-coment]").textContent = num(ok.reduce(function (s, v) { return s + (v.comentarios || 0); }, 0));
    var ranking = $("[data-ranking]"), grid = $("[data-reels]");
    ok.forEach(function (v, i) {
      var li = el("li", "voto__fila");
      li.appendChild(el("span", "voto__pos", String(i + 1)));
      li.appendChild(el("span", "voto__banda", v.banda));
      li.appendChild(el("span", "voto__n", num(v.votos) + (v.votos === 1 ? " voto" : " votos")));
      ranking.appendChild(li);

      var card = el("article", "reel");
      var btn = el("button", "reel__abrir"); btn.type = "button";
      btn.setAttribute("aria-label", "Ver el reel de " + v.banda + " (abre el reproductor de Instagram)");
      btn.innerHTML = '<span class="reel__pos" aria-hidden="true"></span><span class="reel__play" aria-hidden="true"></span><span class="reel__aviso">Toca para ver · carga Instagram</span>';
      btn.querySelector(".reel__pos").textContent = "#" + (i + 1);
      btn.addEventListener("click", function () { abrir(card, v.url); });

      var caja = el("div", "voto__caja");
      caja.appendChild(el("p", "reel__banda", v.banda));
      var fila = el("div", "voto__cifras");
      var grande = el("p", "voto__grande"); grande.appendChild(el("b", null, num(v.votos))); grande.appendChild(el("span", null, v.votos === 1 ? " voto" : " votos"));
      fila.appendChild(grande);
      var d24 = ultimas24(hist[v.url], ahora);
      fila.appendChild(el("p", "voto__dia", d24 > 0 ? "+" + num(d24) + " en 24 h" : "sin votos nuevos en 24 h"));
      caja.appendChild(fila);
      var svg = linea(hist[v.url]); if (svg) caja.appendChild(svg);
      caja.appendChild(el("p", "reel__datos", num(v.comentarios) + " comentarios · se postuló el " + fechaHora((hist[v.url] && hist[v.url][0] && hist[v.url][0][0]) || v.fecha + "T12:00:00-05:00")));
      caja.appendChild(enlaceIG(v.url, cerrado ? "Ver en Instagram" : "Votar en Instagram"));
      if (!cerrado) caja.appendChild(el("p", "voto__como", "Tu voto es un «me gusta» en su reel."));
      card.appendChild(btn); card.appendChild(caja); grid.appendChild(card);
    });
    var ev = eventos(ok, hist);
    if (ev.length) {
      $("[data-pasa]").hidden = false;
      var ol = $("[data-eventos]");
      ev.forEach(function (e) {
        var li = el("li", "pasa__item pasa__item--" + e.tipo);
        li.appendChild(el("time", "pasa__hora", fechaHora(e.t))); li.querySelector("time").setAttribute("datetime", e.t);
        li.appendChild(el("span", "pasa__txt", e.txt));
        ol.appendChild(li);
      });
    }
  }

  function json(n, defecto) { return fetch(n, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : defecto; }).catch(function () { return defecto; }); }
  if (DATOS) { pintar(DATOS.videos, DATOS.historial, DATOS.estado); }
  else { Promise.all([json("videos.json", []), json("historial.json", {}), json("estado.json", {})]).then(function (r) { pintar(r[0], r[1], r[2]); }); }

  var cuenta = $("[data-cuenta]");
  function tic() {
    var ms = CIERRE - new Date();
    if (ms <= 0) { cuenta.textContent = "Convocatoria cerrada"; cuenta.hidden = false; return; }
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
    cuenta.textContent = d > 0 ? "Quedan " + d + (d === 1 ? " día" : " días") + " y " + h + " h" : "Quedan " + h + " h";
    cuenta.hidden = false;
  }
  if (cuenta) { tic(); setInterval(tic, 60000); }

  var cp = $("[data-copiar]");
  if (cp) {
    cp.addEventListener("click", function () {
      var s = cp.querySelector("span"), t = s.textContent;
      var hecho = function () { s.textContent = "Copiado"; setTimeout(function () { s.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(cp.getAttribute("data-copiar")).then(hecho).catch(function () {});
    });
  }
})();
