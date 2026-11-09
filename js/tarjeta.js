/* Stickers holográficos de La Feria. Se dibujan en el teléfono y se guardan como video holográfico (MP4, 6 s) o imagen, ambos 1080×1920 para historias.
   Diseño original del festival: foil con los colores de la marca, sin datos personales ni servidor. */
(function () {
  var W = 1080, H = 1920;
  var C = "#B4472A", M = "#F2B33D", K = "#FFF4E0", N = "#231A15", V = "#3DBE93";
  var TIT = "800 {t}px 'Bricolage Grotesque', 'Arial Black', sans-serif", TXT = "{p} {t}px Figtree, system-ui, sans-serif";
  var fu = function (pl, t, p) { return pl.replace("{t}", t).replace("{p}", p || 600); };
  var URL_PUBLICA = (window.PETS_CONFIG && window.PETS_CONFIG.URL_PUBLICA) || "https://elpetsfestivalquito.com/";
  var URL_CORTA = URL_PUBLICA.replace(/^https?:\/\//, "").replace(/\/$/, "");
  var PERROS = ["perro_bully_babero", "perro_chiquito_disfraz", "perro_mestizo_rescatado", "perro_peludo_grande", "perro_salchicha"];
  var TEMAS = {
    "Comida típica": { titulo: "Cuchara de Oro", frase: "Vengo por la yapa de la olla", foil: [C, M, K, M, C, M, K, C], rayos: C, marca: C, gorro: "chef", icono: "olla" },
    "Regalos de Navidad": { titulo: "Modo Aguinaldo", frase: "Vengo por los regalos", foil: [V, K, C, V, K, M, V, C], rayos: V, marca: V, gorro: "lazo", icono: "regalo" },
    "Música en vivo": { titulo: "Primera Fila", frase: "Vengo a cantarlo todo", foil: [C, N, M, V, N, C, M, N], rayos: M, marca: C, gorro: "audifonos", icono: "nota" },
    "Festival canino": { titulo: "Patas en la Pista", frase: "Vengo al festival canino", foil: [M, V, K, M, V, K, M, C], rayos: K, marca: C, gorro: "corona", icono: "pata" }
  };
  /* niveles del juego: la rareza se gana con la altura de la torre */
  var NIVELES = [
    { nombre: "Yapa en camino", min: 0, foil: [K, M, K, K, M, K, K, M], rayos: C, marca: C, borde: K, icono: "olla", gorro: "", reflejo: false },
    { nombre: "Buena Sazón", min: 5, foil: [V, K, V, K, M, V, K, V], rayos: V, marca: V, borde: V, icono: "pata", gorro: "lazo", reflejo: false },
    { nombre: "Mano de Cocina", min: 10, foil: [M, K, C, M, K, M, C, M], rayos: M, marca: C, borde: M, icono: "regalo", gorro: "audifonos", reflejo: true },
    { nombre: "Cucharón de Oro", min: 15, foil: [C, M, V, K, M, V, M, C], rayos: C, marca: C, borde: C, icono: "nota", gorro: "chef", reflejo: true },
    { nombre: "Maestro de la Olla", min: 20, foil: [N, C, M, V, N, M, C, N], rayos: M, marca: C, borde: N, icono: "olla", gorro: "chef", reflejo: true },
    { nombre: "Yapa Legendaria", min: 30, foil: [M, V, K, C, M, V, K, M], rayos: M, marca: C, borde: N, icono: "pata", gorro: "corona", reflejo: true, focos: true }
  ];
  var COLOR_PIEZA = [[K, N], [C, K], [M, N], [V, N]];
  /* punto más alto de la cabeza de cada perrito, en unidades del dibujo de 200 */
  var CABEZAS = { perro_bully_babero: [100, 42, 92], perro_chiquito_disfraz: [100, 84, 60], perro_mestizo_rescatado: [100, 46, 74], perro_peludo_grande: [100, 34, 86], perro_salchicha: [57, 74, 72] };
  var logo = new Image(), perros = {}, listo = null;
  var cargar = function (im, src) { return new Promise(function (ok) { im.onload = ok; im.onerror = ok; im.src = src; }); };
  /* los pictos traen fondo cuadrado: se quita para recortarlos como sticker */
  function perroSvg(n) {
    var previo = window.PF_SVG && window.PF_SVG[n];
    return (previo ? Promise.resolve(previo) : fetch("img/pictos/" + n + ".svg").then(function (r) { return r.text(); })).then(function (t) {
      t = t.replace(/<rect width="100%" height="100%"[^>]*\/>/, "").replace("<svg ", '<svg width="600" height="600" ');
      perros[n] = new Image();
      return cargar(perros[n], "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t));
    });
  }
  function preparar() {
    if (listo) return listo;
    var fuentes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("800 40px 'Bricolage Grotesque'"), document.fonts.load("700 40px Figtree")]).catch(function () {}) : Promise.resolve();
    listo = Promise.all([cargar(logo, "img/marca/logo-gastronomico-480.webp"), fuentes].concat(PERROS.map(perroSvg)));
    return listo;
  }
  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function ajustar(ctx, txt, ini, min, ancho) {
    var t = ini; ctx.font = fu(TIT, t);
    while (t > min && ctx.measureText(txt).width > ancho) { t -= 4; ctx.font = fu(TIT, t); }
  }
  function destello(ctx, x, y, r, c) {
    var k = r * .14; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + k, y - k); ctx.lineTo(x + r, y); ctx.lineTo(x + k, y + k); ctx.lineTo(x, y + r); ctx.lineTo(x - k, y + k); ctx.lineTo(x - r, y); ctx.lineTo(x - k, y - k); ctx.closePath(); ctx.fill();
  }
  function estrella(ctx, x, y, r, llena) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .44 : r; ctx[i ? "lineTo" : "moveTo"](x + q * Math.cos(a), y + q * Math.sin(a)); }
    ctx.closePath();
    if (llena) { ctx.fillStyle = M; ctx.fill(); } else { ctx.strokeStyle = M; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function rayos(ctx, cx, cy, r, n, c) {
    ctx.fillStyle = c;
    for (var i = 0; i < n; i += 2) {
      var a = i * 2 * Math.PI / n, b = (i + 1) * 2 * Math.PI / n;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.lineTo(cx + r * Math.cos(b), cy + r * Math.sin(b)); ctx.closePath(); ctx.fill();
    }
  }
  /* foil: bandas de color de la marca, rayos, puntos de trama y reflejos diagonales */
  function icono(ctx, n, x, y, e, c, c2) {
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = "round";
    if (n === "pata") {
      ctx.beginPath(); ctx.ellipse(0, 10, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
      [[-26, -6, 9], [-10, -22, 10], [10, -22, 10], [26, -6, 9]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[2] * 1.3, 0, 0, Math.PI * 2); ctx.fill(); });
    } else if (n === "nota") {
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(14, -32); ctx.quadraticCurveTo(30, -26, 32, -8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 18, 17, 13, -.3, 0, Math.PI * 2); ctx.fill();
    } else if (n === "regalo") {
      ctx.fillRect(-28, -14, 56, 44); ctx.fillStyle = c2 || K; ctx.fillRect(-5, -14, 10, 44); ctx.fillRect(-28, 2, 56, 9);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-13, -24, 13, 8, .5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(13, -24, 13, 8, -.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(-32, -6, 64, 7); ctx.beginPath(); ctx.moveTo(-28, 1); ctx.lineTo(28, 1); ctx.bezierCurveTo(28, 26, 12, 34, 0, 34); ctx.bezierCurveTo(-12, 34, -28, 26, -28, 1); ctx.fill();
      ctx.lineWidth = 5; [-12, 12].forEach(function (q) { ctx.beginPath(); ctx.moveTo(q, -16); ctx.quadraticCurveTo(q + 9, -26, q, -36); ctx.stroke(); });
    }
    ctx.restore();
  }
  /* accesorio sobre la cabeza del perrito; x, y es lo alto de la cabeza y w su ancho */
  function gorro(ctx, n, x, y, w) {
    ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = N; ctx.lineJoin = "round";
    if (n === "chef") {
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(x - w * .3, y - w * .42, w * .3, 0, Math.PI * 2); ctx.arc(x + w * .3, y - w * .42, w * .3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - w * .56, w * .36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(x - w * .44, y - w * .34, w * .88, w * .4); ctx.strokeRect(x - w * .44, y - w * .08, w * .88, w * .16); ctx.fillRect(x - w * .41, y - w * .36, w * .82, w * .3);
    } else if (n === "lazo") {
      ctx.fillStyle = C;
      [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * w * .62, y - w * .36); ctx.lineTo(x + d * w * .62, y + w * .26); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = M; ctx.beginPath(); ctx.arc(x, y - w * .04, w * .15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (n === "audifonos") {
      ctx.lineWidth = w * .1; ctx.beginPath(); ctx.arc(x, y + w * .5, w * .6, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      ctx.lineWidth = 6; ctx.fillStyle = M; [-1, 1].forEach(function (d) { var q = x + d * w * .6; redondo(ctx, q - w * .13, y + w * .34, w * .26, w * .44, 14); ctx.fill(); ctx.stroke(); });
    } else {
      ctx.fillStyle = M; ctx.beginPath(); ctx.moveTo(x - w * .46, y + w * .06); ctx.lineTo(x - w * .52, y - w * .46); ctx.lineTo(x - w * .22, y - w * .2); ctx.lineTo(x, y - w * .58); ctx.lineTo(x + w * .22, y - w * .2); ctx.lineTo(x + w * .52, y - w * .46); ctx.lineTo(x + w * .46, y + w * .06); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y - w * .12, w * .08, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function foil(ctx, x, y, w, h, t) {
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    t.foil.forEach(function (c, i) { g.addColorStop(i / (t.foil.length - 1), c); });
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    rayos(ctx, x + w / 2, y + h * .4, 1300, 44, "rgba(255,244,224,.2)");
    ctx.fillStyle = "rgba(35,26,21,.07)";
    for (var i = 0; i < w; i += 20) { for (var j = (i / 20) % 2 ? 10 : 0; j < h; j += 20) { ctx.beginPath(); ctx.arc(x + i, y + j, 3, 0, Math.PI * 2); ctx.fill(); } }
    [[.08, .1], [.84, .08], [.1, .3], [.9, .28], [.06, .5], [.93, .52], [.2, .03], [.72, .03]].forEach(function (q, i) { icono(ctx, t.icono, x + w * q[0], y + h * q[1], i % 2 ? 1.1 : .85, "rgba(255,244,224,.72)", "rgba(35,26,21,.25)"); });
    if (t.reflejo !== false) [[.12, 150], [.5, 90], [.8, 190]].forEach(function (b) {
      var bx = x + w * b[0], r = ctx.createLinearGradient(bx, y, bx + b[1], y + 60);
      r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(.5, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save(); ctx.translate(bx, y); ctx.rotate(.5); ctx.fillStyle = r; ctx.fillRect(0, -300, b[1], h + 700); ctx.restore();
    });
  }
  /* la torre real de la partida, junto al perrito */
  function torre(ctx, d, t, cy) {
    var pz = (d.torre || []).slice(1), n = Math.max(pz.length, 1), alto = Math.min(30, 420 / n), base = cy + 236, cx = 90, es = 2;
    var o = d.torre && d.torre[0] ? d.torre[0].x : 180;
    ctx.fillStyle = N; ctx.fillRect(cx - 170, base, 340, 12);
    pz.forEach(function (p, i) {
      var c = COLOR_PIEZA[p.t] || COLOR_PIEZA[0], w = Math.max(p.w * es, 18), x = cx + (p.x - o) * es, y = base - (i + 1) * alto;
      ctx.fillStyle = c[0]; redondo(ctx, x - w / 2, y, w, Math.max(alto - 2, 4), Math.min(alto / 2, 10)); ctx.fill();
      ctx.strokeStyle = N; ctx.lineWidth = alto > 10 ? 3 : 1; ctx.stroke();
    });
    var p = perros[d.perrito] || perros[PERROS[0]], cb = CABEZAS[d.perrito] || CABEZAS[PERROS[0]];
    if (p && p.naturalWidth) { ctx.drawImage(p, -300, cy - 30, 300, 300); if (t.gorro) gorro(ctx, t.gorro, -300 + cb[0] * 1.5, cy - 30 + cb[1] * 1.5, cb[2] * 1.5); }
  }
  function sticker(ctx, d, t) {
    var sw = 900, sh = 1370, sx = -sw / 2, sy = -sh / 2;
    /* lámina con borde recortado */
    ctx.fillStyle = "rgba(0,0,0,.4)"; redondo(ctx, sx + 14, sy + 18, sw, sh, 46); ctx.fill();
    ctx.fillStyle = t.borde || K; redondo(ctx, sx, sy, sw, sh, 46); ctx.fill();
    if (t.focos) { for (var fi = 0; fi < 46; fi++) { var fq = fi / 46 * 2 * (sw + sh), fx, fy; if (fq < sw) { fx = sx + fq; fy = sy + 12; } else if (fq < sw + sh) { fx = sx + sw - 12; fy = sy + fq - sw; } else if (fq < 2 * sw + sh) { fx = sx + sw - (fq - sw - sh); fy = sy + sh - 12; } else { fx = sx + 12; fy = sy + sh - (fq - 2 * sw - sh); } ctx.fillStyle = fi % 2 ? M : K; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill(); } }
    var b = 24, ix = sx + b, iy = sy + b, iw = sw - b * 2, ih = sh - b * 2;
    ctx.save(); redondo(ctx, ix, iy, iw, ih, 30); ctx.clip();
    foil(ctx, ix, iy, iw, ih, t);
    /* medalla central */
    var cy = iy + 462, r = 322;
    ctx.fillStyle = N; ctx.beginPath(); ctx.arc(0, cy, r + 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.clip(); rayos(ctx, 0, cy, r, 28, "rgba(242,179,61,.4)");
    [[-222, cy - 196], [226, cy - 186], [-246, cy + 150], [246, cy + 142]].forEach(function (q, i) { icono(ctx, t.icono, q[0], q[1], i % 2 ? 1.25 : 1.05, t.marca, K); });
    ctx.restore();
    if (d.tipo === "plan") { var p = perros[d.perrito] || perros[PERROS[0]]; if (p && p.naturalWidth) ctx.drawImage(p, -270, cy - 270, 540, 540); var cb = CABEZAS[d.perrito] || CABEZAS[PERROS[0]]; gorro(ctx, t.gorro, -270 + cb[0] * 2.7, cy - 270 + cb[1] * 2.7, cb[2] * 2.7); }
    else torre(ctx, d, t, cy);
    [[-372, iy + 760, 34, K], [372, iy + 700, 26, K], [-352, iy + 300, 22, K], [356, iy + 200, 30, K]].forEach(function (s) { destello(ctx, s[0], s[1], s[2], s[3]); });
    /* placa */
    var py = iy + ih - 470;
    ctx.fillStyle = N; ctx.fillRect(ix, py, iw, 470);
    ctx.fillStyle = M; ctx.fillRect(ix, py, iw, 10);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    var sp = function (v) { if ("letterSpacing" in ctx) ctx.letterSpacing = v; };
    ctx.fillStyle = M; ctx.font = fu(TXT, 32, 700); sp("5px"); ctx.fillText(d.tipo === "plan" ? d.dia.toUpperCase() + " · EN LA PISTA" : "EL CUCHARÓN DE LA YAPA", 0, py + 76); sp("0px");
    ctx.fillStyle = K; ajustar(ctx, d.tipo === "plan" ? t.titulo : t.nombre, 124, 76, iw - 90); sp("-4px"); ctx.fillText(d.tipo === "plan" ? t.titulo : t.nombre, 0, py + 206); sp("0px");
    if (d.tipo === "plan") {
      ctx.fillStyle = M; ctx.font = fu(TXT, 42, 800); ctx.fillText(t.frase + (d.perro ? " con mi perro" : ""), 0, py + 286);
      ctx.fillStyle = K; ajustar(ctx, d.artistas.join(" · "), 58, 40, iw - 90); ctx.fillText(d.artistas.join(" · "), 0, py + 376);
    } else {
      for (var i = 0; i < NIVELES.length; i++) estrella(ctx, (i - 2.5) * 92, py + 280, 36, i <= d.nivel);
      ctx.fillStyle = K; ctx.font = fu(TXT, 46, 700); ctx.fillText(d.pisos + (d.pisos === 1 ? " piso" : " pisos") + " · ¿Me ganas?", 0, py + 386);
    }
    ctx.restore();
    /* escudo del festival, encima del foil */
    ctx.fillStyle = N; ctx.beginPath(); ctx.arc(ix + 122, iy + 122, 116, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(ix + 122, iy + 122, 106, 0, Math.PI * 2); ctx.fill();
    if (logo.naturalWidth) { var lw = 168, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, ix + 122 - lw / 2, iy + 122 - lh / 2, lw, lh); }
  }
  function tema(d) { return d.tipo === "plan" ? (TEMAS[d.motivo] || TEMAS["Comida típica"]) : NIVELES[d.nivel]; }
  /* capa: sin valor = todo; "fondo" = sin la lámina; "sticker" = solo la lámina sobre transparente (para el video) */
  function dibujar(ctx, d, capa) {
    var t = tema(d);
    if (capa === "sticker") { ctx.save(); ctx.translate(W / 2, 910); ctx.rotate(-.022); sticker(ctx, d, t); ctx.restore(); return; }
    ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
    rayos(ctx, W / 2, 900, 1700, 40, t.rayos);
    ctx.fillStyle = N; ctx.fillRect(0, 0, W, 196); ctx.fillRect(0, 1660, W, H - 1660);
    if (capa !== "fondo") { ctx.save(); ctx.translate(W / 2, 910); ctx.rotate(-.022); sticker(ctx, d, t); ctx.restore(); }
    [[86, 130, 26, M], [996, 110, 20, K], [64, 1800, 18, K], [1016, 1790, 26, M]].forEach(function (s) { destello(ctx, s[0], s[1], s[2], s[3]); });
    var sp = function (v) { if ("letterSpacing" in ctx) ctx.letterSpacing = v; };
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = K; ctx.font = fu(TIT, 58); ctx.fillText("Mi sticker de La Feria", W / 2, 136);
    ctx.font = fu(TXT, 42, 800); ctx.fillText("12 y 13 de diciembre · Parque Bicentenario", W / 2, 1722);
    ctx.fillStyle = M; ctx.font = fu(TXT, 34, 800); ctx.fillText(URL_CORTA, W / 2, 1782);
    ctx.fillStyle = K; ctx.font = fu(TXT, 26, 700); sp("4px"); ctx.fillText("ESTO NO ES TU ENTRADA", W / 2, 1838); sp("0px");
  }
  /* video: MP4 donde el navegador lo graba (iPhone, Chrome reciente); si no, WebM */
  function tipoVideo() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported || !HTMLCanvasElement.prototype.captureStream) return null;
    var ops = ["video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < ops.length; i++) { try { if (MediaRecorder.isTypeSupported(ops[i])) return ops[i]; } catch (e) { /* nada */ } }
    return null;
  }
  function lienzo() { var c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
  var DUR = 6000, CX = W / 2, CY = 910;
  /* un cuadro: fondo fijo, lámina que se inclina y respira, brillo de foil que la cruza y destellos que titilan.
     p va de 0 a 1 y el cuadro final es igual al inicial, así el video se repite sin salto */
  function cuadro(ctx, sx, fondo, st, p) {
    var a = Math.sin(p * 2 * Math.PI), b = Math.cos(p * 2 * Math.PI);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(fondo, 0, 0);
    var e = 1 - .04 * Math.abs(a), k = .028 * a, dd = 1 + .008 * b;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, W, H);
    sx.setTransform(e, k, 0, dd, CX - e * CX, CY - k * CX - dd * CY + 10 * a); sx.drawImage(st, 0, 0);
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "source-atop";
    var pos = .5 + .8 * a, cl = function (v) { return Math.max(0, Math.min(1, v)); };
    var g = sx.createLinearGradient(90, 225, 990, 1595);
    g.addColorStop(cl(pos - .22), "rgba(255,244,224,0)"); g.addColorStop(cl(pos - .09), "rgba(255,244,224,.62)");
    g.addColorStop(cl(pos), "rgba(61,190,147,.42)"); g.addColorStop(cl(pos + .09), "rgba(242,179,61,.52)"); g.addColorStop(cl(pos + .22), "rgba(242,179,61,0)");
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    var g2 = sx.createLinearGradient(990, 225, 90, 1595), q = .5 - .7 * b;
    g2.addColorStop(cl(q - .3), "rgba(180,71,42,0)"); g2.addColorStop(cl(q), "rgba(255,255,255,.16)"); g2.addColorStop(cl(q + .3), "rgba(180,71,42,0)");
    sx.fillStyle = g2; sx.fillRect(0, 0, W, H);
    ctx.drawImage(sx.canvas, 0, 0);
    [[150, 330, 30, 0, M], [935, 300, 24, .3, K], [120, 1180, 22, .55, K], [965, 1330, 32, .15, M], [800, 1560, 20, .7, K], [300, 1600, 18, .85, M]].forEach(function (s) {
      var f = .5 + .5 * Math.sin((p * 2 + s[3]) * 2 * Math.PI); if (f < .15) return;
      ctx.globalAlpha = f; destello(ctx, s[0], s[1], s[2] * (.6 + .5 * f), s[4]); ctx.globalAlpha = 1;
    });
  }
  function exportarVideo(d, avance) {
    var tipo = tipoVideo(); if (!tipo) return Promise.reject(new Error("sin video"));
    return preparar().then(function () {
      var fondo = lienzo(), st = lienzo(), c = lienzo(), S = lienzo();
      dibujar(fondo.getContext("2d"), d, "fondo"); dibujar(st.getContext("2d"), d, "sticker");
      var ctx = c.getContext("2d"), sx = S.getContext("2d");
      cuadro(ctx, sx, fondo, st, 0);
      return new Promise(function (ok, mal) {
        var flujo, rec, trozos = [], fin = false;
        try { flujo = c.captureStream(30); rec = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: 9000000 }); } catch (e) { mal(e); return; }
        var limpiar = function () { try { flujo.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* nada */ } [fondo, st, c, S].forEach(function (x) { x.width = x.height = 0; }); };
        rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); };
        rec.onerror = function (ev) { limpiar(); mal(ev.error || new Error("grabación")); };
        rec.onstop = function () {
          var mime = tipo.split(";")[0], b = new Blob(trozos, { type: mime }); limpiar();
          if (b.size > 20000) ok({ blob: b, type: mime, ext: mime === "video/mp4" ? "mp4" : "webm" }); else mal(new Error("video vacío"));
        };
        rec.start(250);
        var t0 = performance.now();
        (function paso() {
          if (fin) return;
          var ms = performance.now() - t0;
          if (ms >= DUR) { fin = true; cuadro(ctx, sx, fondo, st, 1); if (avance) avance(1); setTimeout(function () { try { rec.stop(); } catch (e) { mal(e); } }, 150); return; }
          cuadro(ctx, sx, fondo, st, ms / DUR); if (avance) avance(ms / DUR);
          requestAnimationFrame(paso);
        })();
      });
    });
  }
  window.PFTarjeta = {
    PERROS: PERROS,
    tipoVideo: tipoVideo,
    exportarVideo: exportarVideo,
    NIVELES: NIVELES,
    imagen: function (n) { return perros[n]; },
    nivelDe: function (p) { var r = 0; NIVELES.forEach(function (x, i) { if (p >= x.min) r = i; }); return r; },
    preparar: preparar,
    pintar: function (lienzo, d) {
      return preparar().then(function () {
        var r = Math.min(window.devicePixelRatio || 1, 2), w = Math.round((lienzo.clientWidth || 260) * r);
        lienzo.width = w; lienzo.height = Math.round(w * H / W);
        var ctx = lienzo.getContext("2d"); ctx.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0); dibujar(ctx, d);
      });
    },
    exportar: function (d) {
      return preparar().then(function () {
        return new Promise(function (ok, mal) {
          var c = document.createElement("canvas"); c.width = W; c.height = H; dibujar(c.getContext("2d"), d);
          c.toBlob(function (b) { c.width = c.height = 0; if (b) ok(b); else mal(new Error("sin imagen")); }, "image/png");
        });
      });
    },
    URL_PUBLICA: URL_PUBLICA
  };
})();
