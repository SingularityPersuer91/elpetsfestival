/* Premios de la Zona de juegos (HUECA-JUEGO-002): los mismos stickers holográficos de La Feria de la web (js/tarjeta.js: foil con los
   colores de la marca, medalla con el perrito y su accesorio, placa y 6 niveles), adaptados a los juegos. El nivel sale del puntaje
   (Atrapa la Yapa) o de la precisión (Sigue el ritmo). Se dibujan en el teléfono y se guardan como video holográfico (MP4 o WebM, 6 s)
   o imagen PNG, ambos 1080×1920, para historias; el reto por WhatsApp invita a jugar y a comprar la entrada. Sin servidor. */
(() => {
  "use strict";
  const P = window.Pets, CFG = window.PETS_CONFIG;
  const W = 1080, H = 1920, CX = W / 2, CY = 910, DUR = 6000;
  const C = "#B4472A", M = "#F2B33D", K = "#FFF4E0", N = "#231A15", V = "#3DBE93";
  const TIT = (t) => `800 ${t}px Bricolage, 'Bricolage Grotesque', 'Arial Black', sans-serif`;
  const TXT = (t, p) => `${p || 600} ${t}px Figtree, system-ui, sans-serif`;
  const URL_JUEGOS = "https://" + CFG.urlJuegosCorta + "/";
  const PERROS = ["perro_bully_babero", "perro_chiquito_disfraz", "perro_mestizo_rescatado", "perro_peludo_grande", "perro_salchicha"];
  /* mismos niveles que La Feria (nombre, foil, accesorio); aquí se ganan con el resultado de cada juego */
  const NIVELES = [
    { nombre: "Yapa en camino", foil: [K, M, K, K, M, K, K, M], rayos: C, marca: C, borde: K, icono: "olla", gorro: "", reflejo: false },
    { nombre: "Buena Sazón", foil: [V, K, V, K, M, V, K, V], rayos: V, marca: V, borde: V, icono: "pata", gorro: "lazo", reflejo: false },
    { nombre: "Mano de Cocina", foil: [M, K, C, M, K, M, C, M], rayos: M, marca: C, borde: M, icono: "regalo", gorro: "audifonos", reflejo: true },
    { nombre: "Cucharón de Oro", foil: [C, M, V, K, M, V, M, C], rayos: C, marca: C, borde: C, icono: "nota", gorro: "chef", reflejo: true },
    { nombre: "Maestro de la Olla", foil: [N, C, M, V, N, M, C, N], rayos: M, marca: C, borde: N, icono: "olla", gorro: "chef", reflejo: true },
    { nombre: "Yapa Legendaria", foil: [M, V, K, C, M, V, K, M], rayos: M, marca: C, borde: N, icono: "pata", gorro: "corona", reflejo: true, focos: true }
  ];
  /* Atrapa la Yapa: puntos de la ronda (una ronda perfecta da unos 4.400). Sigue el ritmo: precisión en %. */
  const UMBRALES = { yapa: [0, 500, 1000, 1800, 2700, 3600], ritmo: [0, 40, 55, 70, 82, 92] };
  const JUEGOS = { yapa: { nombre: "Atrapa la Yapa", perrito: "perro_bully_babero" }, ritmo: { nombre: "Sigue el ritmo", perrito: "perro_mestizo_rescatado" } };
  const CABEZAS = { perro_bully_babero: [100, 42, 92], perro_chiquito_disfraz: [100, 84, 60], perro_mestizo_rescatado: [100, 46, 74], perro_peludo_grande: [100, 34, 86], perro_salchicha: [57, 74, 72] };
  const valorDe = (d) => (d.juego === "ritmo" ? Math.round((d.precision || 0) * 100) : Math.round(d.puntos || 0));
  function nivelDe(juego, valor) { let r = 0; UMBRALES[juego].forEach((m, i) => { if (valor >= m) r = i; }); return r; }
  const meta = (juego, i) => (juego === "ritmo" ? `${UMBRALES.ritmo[i]} % de precisión` : `${P.fmt(UMBRALES.yapa[i])} puntos`);

  /* ---------- carga (perritos de la web sin el fondo cuadrado, logo, marcas y fuentes) ---------- */
  const logo = new Image(), perros = {}, logos = [];
  let listo = null;
  const cargar = (im, src) => new Promise((ok) => { im.onload = ok; im.onerror = ok; im.src = src; });
  const perroSvg = (n) => fetch(P.base + "assets/sticker/" + n + ".svg").then((r) => r.text()).then((t) => {
    t = t.replace(/<rect width="100%" height="100%"[^>]*\/>/, "").replace("<svg ", '<svg width="600" height="600" ');
    perros[n] = new Image();
    return cargar(perros[n], "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t));
  }).catch(() => {});
  function preparar() {
    if (listo) return listo;
    const fuentes = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("800 40px Bricolage"), document.fonts.load("700 40px Figtree")]).catch(() => {}) : Promise.resolve();
    P.marcas().forEach((m) => { const im = new Image(); logos.push({ im, oscuro: !!m.oscuro }); });
    listo = Promise.all([cargar(logo, P.base + "assets/logo-480.webp"), fuentes]
      .concat(PERROS.map(perroSvg), P.marcas().map((m, i) => cargar(logos[i].im, `${P.base}assets/marcas/${m.id}.webp`))));
    return listo;
  }

  /* ---------- dibujo (mismo trazo que La Feria) ---------- */
  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function ajustar(ctx, txt, ini, min, ancho, fuente) {
    let t = ini; ctx.font = fuente(t);
    while (t > min && ctx.measureText(txt).width > ancho) { t -= 2; ctx.font = fuente(t); }
  }
  const sp = (ctx, v) => { if ("letterSpacing" in ctx) ctx.letterSpacing = v; };
  function destello(ctx, x, y, r, c) {
    const k = r * 0.14; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + k, y - k); ctx.lineTo(x + r, y); ctx.lineTo(x + k, y + k); ctx.lineTo(x, y + r); ctx.lineTo(x - k, y + k); ctx.lineTo(x - r, y); ctx.lineTo(x - k, y - k); ctx.closePath(); ctx.fill();
  }
  function estrella(ctx, x, y, r, llena) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.44 : r; ctx[i ? "lineTo" : "moveTo"](x + q * Math.cos(a), y + q * Math.sin(a)); }
    ctx.closePath();
    if (llena) { ctx.fillStyle = M; ctx.fill(); } else { ctx.strokeStyle = M; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function rayos(ctx, cx, cy, r, n, c) {
    ctx.fillStyle = c;
    for (let i = 0; i < n; i += 2) {
      const a = i * 2 * Math.PI / n, b = (i + 1) * 2 * Math.PI / n;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.lineTo(cx + r * Math.cos(b), cy + r * Math.sin(b)); ctx.closePath(); ctx.fill();
    }
  }
  function icono(ctx, n, x, y, e, c, c2) {
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = "round";
    if (n === "pata") {
      ctx.beginPath(); ctx.ellipse(0, 10, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
      [[-26, -6, 9], [-10, -22, 10], [10, -22, 10], [26, -6, 9]].forEach((p) => { ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[2] * 1.3, 0, 0, Math.PI * 2); ctx.fill(); });
    } else if (n === "nota") {
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(14, -32); ctx.quadraticCurveTo(30, -26, 32, -8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 18, 17, 13, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (n === "regalo") {
      ctx.fillRect(-28, -14, 56, 44); ctx.fillStyle = c2 || K; ctx.fillRect(-5, -14, 10, 44); ctx.fillRect(-28, 2, 56, 9);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-13, -24, 13, 8, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(13, -24, 13, 8, -0.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillRect(-32, -6, 64, 7); ctx.beginPath(); ctx.moveTo(-28, 1); ctx.lineTo(28, 1); ctx.bezierCurveTo(28, 26, 12, 34, 0, 34); ctx.bezierCurveTo(-12, 34, -28, 26, -28, 1); ctx.fill();
      ctx.lineWidth = 5; [-12, 12].forEach((q) => { ctx.beginPath(); ctx.moveTo(q, -16); ctx.quadraticCurveTo(q + 9, -26, q, -36); ctx.stroke(); });
    }
    ctx.restore();
  }
  /* accesorio sobre la cabeza del perrito; x, y es lo alto de la cabeza y w su ancho */
  function gorro(ctx, n, x, y, w) {
    if (!n) return;
    ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = N; ctx.lineJoin = "round";
    if (n === "chef") {
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(x - w * 0.3, y - w * 0.42, w * 0.3, 0, Math.PI * 2); ctx.arc(x + w * 0.3, y - w * 0.42, w * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - w * 0.56, w * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(x - w * 0.44, y - w * 0.34, w * 0.88, w * 0.4); ctx.strokeRect(x - w * 0.44, y - w * 0.08, w * 0.88, w * 0.16); ctx.fillRect(x - w * 0.41, y - w * 0.36, w * 0.82, w * 0.3);
    } else if (n === "lazo") {
      ctx.fillStyle = C;
      [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * w * 0.62, y - w * 0.36); ctx.lineTo(x + d * w * 0.62, y + w * 0.26); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = M; ctx.beginPath(); ctx.arc(x, y - w * 0.04, w * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (n === "audifonos") {
      ctx.lineWidth = w * 0.1; ctx.beginPath(); ctx.arc(x, y + w * 0.5, w * 0.6, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      ctx.lineWidth = 6; ctx.fillStyle = M; [-1, 1].forEach((d) => { const q = x + d * w * 0.6; redondo(ctx, q - w * 0.13, y + w * 0.34, w * 0.26, w * 0.44, 14); ctx.fill(); ctx.stroke(); });
    } else {
      ctx.fillStyle = M; ctx.beginPath(); ctx.moveTo(x - w * 0.46, y + w * 0.06); ctx.lineTo(x - w * 0.52, y - w * 0.46); ctx.lineTo(x - w * 0.22, y - w * 0.2); ctx.lineTo(x, y - w * 0.58); ctx.lineTo(x + w * 0.22, y - w * 0.2); ctx.lineTo(x + w * 0.52, y - w * 0.46); ctx.lineTo(x + w * 0.46, y + w * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y - w * 0.12, w * 0.08, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  /* foil: bandas de color de la marca, rayos, puntos de trama y reflejos diagonales */
  function foil(ctx, x, y, w, h, t) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    t.foil.forEach((c, i) => { g.addColorStop(i / (t.foil.length - 1), c); });
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    rayos(ctx, x + w / 2, y + h * 0.4, 1300, 44, "rgba(255,244,224,.2)");
    ctx.fillStyle = "rgba(35,26,21,.07)";
    for (let i = 0; i < w; i += 20) { for (let j = (i / 20) % 2 ? 10 : 0; j < h; j += 20) { ctx.beginPath(); ctx.arc(x + i, y + j, 3, 0, Math.PI * 2); ctx.fill(); } }
    [[0.08, 0.1], [0.84, 0.08], [0.1, 0.3], [0.9, 0.28], [0.06, 0.5], [0.93, 0.52], [0.2, 0.03], [0.72, 0.03]].forEach((q, i) => { icono(ctx, t.icono, x + w * q[0], y + h * q[1], i % 2 ? 1.1 : 0.85, "rgba(255,244,224,.72)", "rgba(35,26,21,.25)"); });
    if (t.reflejo !== false) [[0.12, 150], [0.5, 90], [0.8, 190]].forEach((b) => {
      const bx = x + w * b[0], r = ctx.createLinearGradient(bx, y, bx + b[1], y + 60);
      r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.5, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save(); ctx.translate(bx, y); ctx.rotate(0.5); ctx.fillStyle = r; ctx.fillRect(0, -300, b[1], h + 700); ctx.restore();
    });
  }
  function sticker(ctx, d, t) {
    const sw = 900, sh = 1370, sx = -sw / 2, sy = -sh / 2;
    ctx.fillStyle = "rgba(0,0,0,.4)"; redondo(ctx, sx + 14, sy + 18, sw, sh, 46); ctx.fill();
    ctx.fillStyle = t.borde || K; redondo(ctx, sx, sy, sw, sh, 46); ctx.fill();
    if (t.focos) {
      for (let fi = 0; fi < 46; fi++) {
        const fq = fi / 46 * 2 * (sw + sh); let fx, fy;
        if (fq < sw) { fx = sx + fq; fy = sy + 12; } else if (fq < sw + sh) { fx = sx + sw - 12; fy = sy + fq - sw; } else if (fq < 2 * sw + sh) { fx = sx + sw - (fq - sw - sh); fy = sy + sh - 12; } else { fx = sx + 12; fy = sy + sh - (fq - 2 * sw - sh); }
        ctx.fillStyle = fi % 2 ? M : K; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    const b = 24, ix = sx + b, iy = sy + b, iw = sw - b * 2, ih = sh - b * 2;
    ctx.save(); redondo(ctx, ix, iy, iw, ih, 30); ctx.clip();
    foil(ctx, ix, iy, iw, ih, t);
    /* medalla central con el perrito y el accesorio del nivel */
    const cy = iy + 462, r = 322;
    ctx.fillStyle = N; ctx.beginPath(); ctx.arc(0, cy, r + 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.clip(); rayos(ctx, 0, cy, r, 28, "rgba(242,179,61,.4)");
    [[-222, cy - 196], [226, cy - 186], [-246, cy + 150], [246, cy + 142]].forEach((q, i) => { icono(ctx, t.icono, q[0], q[1], i % 2 ? 1.25 : 1.05, t.marca, K); });
    ctx.restore();
    const pn = d.perrito || (JUEGOS[d.juego] || JUEGOS.yapa).perrito, p = perros[pn] || perros[PERROS[0]], cb = CABEZAS[pn] || CABEZAS[PERROS[0]];
    if (p && p.naturalWidth) { ctx.drawImage(p, -270, cy - 270, 540, 540); gorro(ctx, t.gorro, -270 + cb[0] * 2.7, cy - 270 + cb[1] * 2.7, cb[2] * 2.7); }
    [[-372, iy + 760, 34, K], [372, iy + 700, 26, K], [-352, iy + 300, 22, K], [356, iy + 200, 30, K]].forEach((s) => { destello(ctx, s[0], s[1], s[2], s[3]); });
    /* placa: juego, nivel, estrellas y resultado */
    const py = iy + ih - 470;
    ctx.fillStyle = N; ctx.fillRect(ix, py, iw, 470);
    ctx.fillStyle = M; ctx.fillRect(ix, py, iw, 10);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = M; ctx.font = TXT(32, 700); sp(ctx, "5px"); ctx.fillText((JUEGOS[d.juego] || JUEGOS.yapa).nombre.toUpperCase() + " · ZONA DE JUEGOS", 0, py + 76); sp(ctx, "0px");
    ctx.fillStyle = K; ajustar(ctx, t.nombre, 124, 76, iw - 90, TIT); sp(ctx, "-4px"); ctx.fillText(t.nombre, 0, py + 206); sp(ctx, "0px");
    for (let i = 0; i < NIVELES.length; i++) estrella(ctx, (i - 2.5) * 92, py + 280, 36, i <= d.nivel);
    const linea = (d.juego === "ritmo" ? `${valorDe(d)} % · ` : "") + `${P.fmt(Math.round(d.puntos || 0))} puntos · ¿Me ganas?`;
    ctx.fillStyle = K; ajustar(ctx, linea, 46, 30, iw - 90, (q) => TXT(q, 700)); ctx.fillText(linea, 0, py + 386);
    ctx.restore();
    /* escudo del festival, encima del foil */
    ctx.fillStyle = N; ctx.beginPath(); ctx.arc(ix + 122, iy + 122, 116, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(ix + 122, iy + 122, 106, 0, Math.PI * 2); ctx.fill();
    if (logo.naturalWidth) { const lw = 168, lh = lw * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, ix + 122 - lw / 2, iy + 122 - lh / 2, lw, lh); }
  }
  /* franja de marcas (la de la zona: sin Pilsener en la versión de colegios) */
  function franja(ctx, y, h) {
    const vivos = logos.filter((l) => l.im.naturalWidth), alto = h - 36, sep = 44;
    if (!vivos.length) return;
    const ancho = (l) => (l.oscuro ? alto * 0.78 : alto) * l.im.naturalWidth / l.im.naturalHeight + (l.oscuro ? 28 : 0);
    const total = vivos.reduce((a, l) => a + ancho(l), 0) + sep * (vivos.length - 1), x0 = 90;
    const esc = Math.min(1, (W - 2 * x0 - 60) / total);
    ctx.fillStyle = K; redondo(ctx, x0, y, W - 2 * x0, h, 22); ctx.fill();
    let px = W / 2 - total * esc / 2;
    vivos.forEach((l) => {
      const hh = (l.oscuro ? alto * 0.78 : alto) * esc, ww = hh * l.im.naturalWidth / l.im.naturalHeight, yy = y + (h - hh) / 2;
      if (l.oscuro) { ctx.fillStyle = N; ctx.fillRect(px, yy - 8 * esc, ww + 28 * esc, hh + 16 * esc); ctx.drawImage(l.im, px + 14 * esc, yy, ww, hh); }
      else ctx.drawImage(l.im, px, yy, ww, hh);
      px += ancho(l) * esc + sep * esc;
    });
  }
  /* capa: sin valor = todo; "fondo" = sin la lámina; "sticker" = solo la lámina sobre transparente (para el video) */
  function dibujar(ctx, d, capa) {
    const t = NIVELES[d.nivel] || NIVELES[0];
    if (capa === "sticker") { ctx.save(); ctx.translate(CX, CY); ctx.rotate(-0.022); sticker(ctx, d, t); ctx.restore(); return; }
    ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
    rayos(ctx, CX, 900, 1700, 40, t.rayos);
    ctx.fillStyle = N; ctx.fillRect(0, 0, W, 196); ctx.fillRect(0, 1660, W, H - 1660);
    if (capa !== "fondo") { ctx.save(); ctx.translate(CX, CY); ctx.rotate(-0.022); sticker(ctx, d, t); ctx.restore(); }
    [[86, 130, 26, M], [996, 110, 20, K], [64, 1800, 18, K], [1016, 1790, 26, M]].forEach((s) => { destello(ctx, s[0], s[1], s[2], s[3]); });
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = K; ajustar(ctx, "Mi sticker de la Zona de Juegos", 58, 40, W - 220, TIT); ctx.fillText("Mi sticker de la Zona de Juegos", CX, 136);
    ctx.fillStyle = K; ajustar(ctx, "Entradas solo $5 · 12 y 13 de diciembre", 44, 30, W - 160, (q) => TXT(q, 800)); ctx.fillText("Entradas solo $5 · 12 y 13 de diciembre", CX, 1714);
    ctx.fillStyle = M; ajustar(ctx, "Parque Bicentenario · " + CFG.urlJuegosCorta, 32, 24, W - 160, (q) => TXT(q, 800)); ctx.fillText("Parque Bicentenario · " + CFG.urlJuegosCorta, CX, 1762);
    franja(ctx, 1784, 82);
    ctx.fillStyle = K; ctx.font = TXT(24, 700); sp(ctx, "4px"); ctx.fillText("ESTO NO ES TU ENTRADA", CX, 1902); sp(ctx, "0px");
  }
  function lienzo() { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; }

  /* video: MP4 donde el navegador lo graba (iPhone, Chrome reciente); si no, WebM */
  function tipoVideo() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported || !HTMLCanvasElement.prototype.captureStream) return null;
    const ops = ["video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (const o of ops) { try { if (MediaRecorder.isTypeSupported(o)) return o; } catch (e) { /* nada */ } }
    return null;
  }
  /* un cuadro: fondo fijo, lámina que se inclina y respira, brillo de foil que la cruza y destellos que titilan.
     p va de 0 a 1 y el cuadro final es igual al inicial, así el video se repite sin salto */
  function cuadro(ctx, sx, fondo, st, p) {
    const a = Math.sin(p * 2 * Math.PI), b = Math.cos(p * 2 * Math.PI);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(fondo, 0, 0);
    const e = 1 - 0.04 * Math.abs(a), k = 0.028 * a, dd = 1 + 0.008 * b;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, W, H);
    sx.setTransform(e, k, 0, dd, CX - e * CX, CY - k * CX - dd * CY + 10 * a); sx.drawImage(st, 0, 0);
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "source-atop";
    const pos = 0.5 + 0.8 * a, cl = (v) => Math.max(0, Math.min(1, v));
    const g = sx.createLinearGradient(90, 225, 990, 1595);
    g.addColorStop(cl(pos - 0.22), "rgba(255,244,224,0)"); g.addColorStop(cl(pos - 0.09), "rgba(255,244,224,.62)");
    g.addColorStop(cl(pos), "rgba(61,190,147,.42)"); g.addColorStop(cl(pos + 0.09), "rgba(242,179,61,.52)"); g.addColorStop(cl(pos + 0.22), "rgba(242,179,61,0)");
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    const g2 = sx.createLinearGradient(990, 225, 90, 1595), q = 0.5 - 0.7 * b;
    g2.addColorStop(cl(q - 0.3), "rgba(180,71,42,0)"); g2.addColorStop(cl(q), "rgba(255,255,255,.16)"); g2.addColorStop(cl(q + 0.3), "rgba(180,71,42,0)");
    sx.fillStyle = g2; sx.fillRect(0, 0, W, H);
    ctx.drawImage(sx.canvas, 0, 0);
    [[150, 330, 30, 0, M], [935, 300, 24, 0.3, K], [120, 1180, 22, 0.55, K], [965, 1330, 32, 0.15, M], [800, 1560, 20, 0.7, K], [300, 1600, 18, 0.85, M]].forEach((s) => {
      const f = 0.5 + 0.5 * Math.sin((p * 2 + s[3]) * 2 * Math.PI); if (f < 0.15) return;
      ctx.globalAlpha = f; destello(ctx, s[0], s[1], s[2] * (0.6 + 0.5 * f), s[4]); ctx.globalAlpha = 1;
    });
  }
  function exportarVideo(d, avance) {
    const tipo = tipoVideo(); if (!tipo) return Promise.reject(new Error("sin video"));
    return preparar().then(() => {
      const fondo = lienzo(), st = lienzo(), c = lienzo(), S = lienzo();
      dibujar(fondo.getContext("2d"), d, "fondo"); dibujar(st.getContext("2d"), d, "sticker");
      const ctx = c.getContext("2d"), sx = S.getContext("2d");
      cuadro(ctx, sx, fondo, st, 0);
      return new Promise((ok, mal) => {
        let flujo, rec, fin = false; const trozos = [];
        try { flujo = c.captureStream(30); rec = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: 9000000 }); } catch (e) { mal(e); return; }
        const limpiar = () => { try { flujo.getTracks().forEach((t) => t.stop()); } catch (e) { /* nada */ } [fondo, st, c, S].forEach((x) => { x.width = x.height = 0; }); };
        rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) trozos.push(ev.data); };
        rec.onerror = (ev) => { limpiar(); mal(ev.error || new Error("grabación")); };
        rec.onstop = () => {
          const mime = tipo.split(";")[0], bl = new Blob(trozos, { type: mime }); limpiar();
          if (bl.size > 20000) ok({ blob: bl, type: mime, ext: mime === "video/mp4" ? "mp4" : "webm" }); else mal(new Error("video vacío"));
        };
        rec.start(250);
        const t0 = performance.now();
        (function paso() {
          if (fin) return;
          const ms = performance.now() - t0;
          if (ms >= DUR) { fin = true; cuadro(ctx, sx, fondo, st, 1); if (avance) avance(1); setTimeout(() => { try { rec.stop(); } catch (e) { mal(e); } }, 150); return; }
          cuadro(ctx, sx, fondo, st, ms / DUR); if (avance) avance(ms / DUR);
          requestAnimationFrame(paso);
        })();
      });
    });
  }
  function exportar(d) {
    return preparar().then(() => new Promise((ok, mal) => {
      const c = lienzo(); dibujar(c.getContext("2d"), d);
      c.toBlob((bl) => { c.width = c.height = 0; if (bl) ok(bl); else mal(new Error("sin imagen")); }, "image/png");
    }));
  }
  /* vista previa: completa (9:16) o solo la lámina recortada (galería de premios) */
  function pintar(cv, d, soloLamina) {
    return preparar().then(() => {
      const r = Math.min(window.devicePixelRatio || 1, 2), w = Math.round((cv.clientWidth || 260) * r);
      const caja = soloLamina ? [70, 200, 940, 1430] : [0, 0, W, H];
      cv.width = w; cv.height = Math.round(w * caja[3] / caja[2]);
      const ctx = cv.getContext("2d"); ctx.setTransform(cv.width / caja[2], 0, 0, cv.height / caja[3], -caja[0] * cv.width / caja[2], -caja[1] * cv.height / caja[3]);
      if (soloLamina) dibujar(ctx, d, "sticker"); else dibujar(ctx, d);
    });
  }

  /* ---------- guardar para historias (como la web: hoja de compartir en el teléfono, descarga en computador) ---------- */
  const G = {
    interno: /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|TikTok|musical_ly|BytedanceWebview/i.test(navigator.userAgent || ""),
    movil: !!(window.matchMedia && matchMedia("(pointer: coarse)").matches),
    puede(f) { try { return this.movil && !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] })); } catch (e) { return false; } },
    bajar(f) { const u = URL.createObjectURL(f), a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); },
    AVISO: "Estás dentro de Instagram, Facebook, WhatsApp o TikTok: para guardar tu sticker, abre esta página en Safari o Chrome (menú ··· › Abrir en el navegador)."
  };
  function estilos() {
    if (document.getElementById("pets-sticker-css")) return;
    const s = document.createElement("style"); s.id = "pets-sticker-css";
    s.textContent = `
.holo{position:relative;width:min(250px,64vw);margin:0 auto;overflow:hidden;border-radius:6px;transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform 160ms ease-out;touch-action:pan-y;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.holo canvas{display:block;width:100%;height:auto;aspect-ratio:9/16}
.holo.lamina canvas{aspect-ratio:940/1430}
.holo__brillo{position:absolute;inset:0;pointer-events:none;mix-blend-mode:color-dodge;opacity:.6;background:linear-gradient(115deg,transparent 32%,rgba(255,244,224,.75) 44%,rgba(61,190,147,.55) 51%,rgba(242,179,61,.65) 58%,transparent 70%) var(--bx,0%) var(--by,0%)/260% 260%;animation:pets-holo 3.8s ease-in-out infinite alternate}
.holo--activo .holo__brillo{animation:none}
@keyframes pets-holo{from{background-position:0% 0%}to{background-position:100% 100%}}
.premio{text-align:center}
.premio-ceja{margin:0;font-weight:800;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:#F2B33D}
.premio-nombre{font-family:Bricolage,Figtree,sans-serif;font-weight:800;font-size:clamp(1.6rem,6vw,2.1rem);margin:2px 0 12px;line-height:1.02}
.premio-escalera{list-style:none;display:flex;justify-content:center;gap:6px;margin:14px 0 6px;padding:0}
.premio-escalera li{width:30px;height:8px;border-radius:99px;background:rgba(255,244,224,.18)}
.premio-escalera li.si{background:#F2B33D}.premio-escalera li.actual{box-shadow:0 0 0 3px rgba(242,179,61,.35)}
.premio-sig{margin:6px auto 12px;max-width:34ch;color:rgba(255,244,224,.78);font-weight:700}
.premio-acciones{display:grid;gap:10px;max-width:360px;margin:0 auto}
.premio-acciones .boton{width:100%}
.premio-estado{min-height:1.3em;margin:10px auto 0;max-width:36ch;font-weight:700;font-size:.92rem;color:#FFF4E0}
.premio-aviso{margin:10px auto 0;max-width:36ch;font-size:.88rem;font-weight:700;background:rgba(242,179,61,.16);border:2px solid rgba(242,179,61,.5);border-radius:12px;padding:8px 10px}
.premio-guardar{margin:12px auto 0;max-width:260px}.premio-guardar img,.premio-guardar video{width:156px;height:auto;margin:0 auto;border-radius:6px;display:block}
.premio-guardar p{font-size:.82rem;color:rgba(255,244,224,.72);margin:6px 0 0}
.premio-kiosco{margin:8px auto 0;max-width:34ch;font-weight:700}
@media (prefers-reduced-motion:reduce){.holo{transition:none}.holo__brillo{animation:none;opacity:.3}}`;
    document.head.appendChild(s);
  }
  /* la lámina se inclina con el dedo o el mouse y, en el teléfono, con el giro del equipo */
  function moverHolo(h) {
    if (!h || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const poner = (x, y) => {
      h.classList.add("holo--activo");
      h.style.setProperty("--ry", ((x - 0.5) * 16).toFixed(1) + "deg"); h.style.setProperty("--rx", ((0.5 - y) * 16).toFixed(1) + "deg");
      h.style.setProperty("--bx", (x * 100).toFixed(0) + "%"); h.style.setProperty("--by", (y * 100).toFixed(0) + "%");
    };
    h.addEventListener("pointermove", (e) => { const r = h.getBoundingClientRect(); poner((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
    h.addEventListener("pointerleave", () => { h.classList.remove("holo--activo"); h.style.removeProperty("--rx"); h.style.removeProperty("--ry"); });
    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null || !h.isConnected) return;
      poner(Math.max(0, Math.min(1, 0.5 + e.gamma / 60)), Math.max(0, Math.min(1, 0.5 + ((e.beta || 45) - 45) / 60)));
    });
  }
  function holoHTML(etiqueta, lamina) {
    return `<div class="holo${lamina ? " lamina" : ""}"><canvas width="250" height="${lamina ? 380 : 444}" role="img" aria-label="${etiqueta}"></canvas><span class="holo__brillo"></span></div>`;
  }
  /* enlace de reto: abre la zona con marca de origen (así Meet2Go muestra lo que vende el reto) */
  function textoReto(d) {
    const u = new URL(URL_JUEGOS); u.searchParams.set("utm_source", "whatsapp"); u.searchParams.set("utm_medium", "reto"); u.searchParams.set("utm_campaign", "zona_juegos");
    return `Gané el sticker holográfico «${NIVELES[d.nivel].nombre}» en ${JUEGOS[d.juego].nombre} con ${P.fmt(Math.round(d.puntos || 0))} puntos. ¿Me ganas? ` +
      `Juega gratis: ${u.href} · El Pets Festival, 12 y 13 de diciembre en el Parque Bicentenario. Entradas solo $5`;
  }

  /* pantalla del premio dentro del resultado de cada juego */
  function montar(cont, d) {
    estilos();
    const n = d.nivel, t = NIVELES[n], sig = NIVELES[n + 1], val = valorDe(d), u = UMBRALES[d.juego];
    const nota = !sig ? "¡Llegaste al nivel más alto! Ahora reta a tus panas."
      : d.juego === "ritmo" ? `Con ${u[n + 1]} % de precisión ganas «${sig.nombre}».`
        : `Con ${P.fmt(u[n + 1])} puntos ganas «${sig.nombre}»: te faltaron ${P.fmt(u[n + 1] - val)}.`;
    const conVideo = !P.kiosco && !!tipoVideo();
    cont.innerHTML = `<p class="premio-ceja">Tu premio · nivel ${n + 1} de ${NIVELES.length}</p><h3 class="premio-nombre">${t.nombre}</h3>` +
      holoHTML(`Tu sticker holográfico «${t.nombre}»`) +
      `<ol class="premio-escalera" aria-label="Nivel ${n + 1} de ${NIVELES.length}">${NIVELES.map((x, i) => `<li class="${i <= n ? "si" : ""}${i === n ? " actual" : ""}" title="${x.nombre}"></li>`).join("")}</ol>` +
      `<p class="premio-sig">${nota}</p>` +
      (P.kiosco ? `<p class="premio-kiosco">Juega en tu celular y guarda tu sticker para tus historias: <b>${CFG.urlJuegosCorta}</b></p>` :
        `<div class="premio-acciones">${conVideo ? '<button class="boton" type="button" data-video>Video holográfico para historias</button>' : ""}` +
        `<button class="boton${conVideo ? " secundario" : ""}" type="button" data-imagen>Imagen del sticker</button>` +
        `<a class="boton secundario" data-reto target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=${encodeURIComponent(textoReto(d))}">Retar por WhatsApp</a></div>` +
        `<p class="premio-estado" aria-live="polite"></p><p class="premio-aviso"${G.interno ? "" : " hidden"}>${G.AVISO}</p><div class="premio-guardar" hidden></div>`);
    const h = cont.querySelector(".holo"); moverHolo(h);
    const listoVista = pintar(h.querySelector("canvas"), d);
    if (P.kiosco) return listoVista;
    const est = cont.querySelector(".premio-estado"), des = cont.querySelector("[data-imagen]"), vb = cont.querySelector("[data-video]"), caja = cont.querySelector(".premio-guardar");
    const nombre = `sticker-${d.juego}-${t.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
    let img = null, vid = null, grabando = false, urlVer = null;
    const ver = (fi) => {
      if (urlVer) URL.revokeObjectURL(urlVer);
      urlVer = URL.createObjectURL(fi);
      const esV = fi.type.indexOf("video") === 0;
      caja.innerHTML = (esV ? '<video muted loop autoplay playsinline controls width="156" height="277"></video>' : '<img alt="Tu sticker listo para guardar" width="156" height="277">') +
        `<p>${esV ? "Si no se guardó, abre el video, toca Compartir y elige «Guardar video»." : "Si no se guardó, mantén pulsada la imagen y elige «Guardar en Fotos»."}</p>`;
      caja.firstChild.src = urlVer; caja.hidden = false;
    };
    const entregar = (fi) => {
      if (G.puede(fi)) {
        navigator.share({ files: [fi] }).then(() => { est.textContent = "¡Listo! Súbelo a tus historias y reta a tus panas."; }, (e) => {
          if (e && e.name === "AbortError") { est.textContent = ""; return; }
          G.bajar(fi); ver(fi); est.textContent = "Tu sticker se descargó.";
        });
      } else {
        G.bajar(fi); ver(fi);
        est.textContent = G.interno ? G.AVISO : fi.type.indexOf("video") === 0
          ? `Tu video holográfico se descargó (${fi.name.split(".").pop().toUpperCase()}, 1080×1920). Súbelo a tus historias desde tu galería.`
          : "Tu sticker se descargó como imagen PNG de 1080×1920.";
      }
    };
    let imgF = null;
    const prepImg = () => (img = img || exportar(d).then((bl) => (imgF = new File([bl], nombre + ".png", { type: "image/png" }))));
    prepImg().catch(() => { img = null; });
    des.addEventListener("click", () => {
      if (imgF) { entregar(imgF); return; }   // ya lista: se entrega con este mismo toque
      est.textContent = "Preparando tu sticker…";
      prepImg().then((fi) => {
        // en el teléfono la hoja de compartir pide un toque reciente: si la imagen tardó, se pide un segundo toque
        if (G.puede(fi)) { des.textContent = "Guardar imagen en mi teléfono"; est.textContent = "Tu imagen está lista: toca otra vez para guardarla o subirla a tus historias."; }
        else entregar(fi);
      }, () => { est.textContent = "No se pudo preparar el sticker. Inténtalo otra vez."; img = null; });
    });
    if (vb) vb.addEventListener("click", () => {
      if (grabando) return;
      if (vid) { entregar(vid); return; }
      grabando = true; vb.disabled = true; est.textContent = "Grabando tu video holográfico… 0 %";
      exportarVideo(d, (p) => { est.textContent = `Grabando tu video holográfico… ${Math.round(p * 100)} %`; }).then((r) => {
        grabando = false; vb.disabled = false;
        vid = new File([r.blob], nombre + "-holografico." + r.ext, { type: r.type });
        if (G.puede(vid)) { ver(vid); vb.textContent = "Guardar video en mi teléfono"; est.textContent = "Tu video está listo: tócalo para guardarlo en Fotos o subirlo directo a tus historias."; }
        else entregar(vid);
      }, () => { grabando = false; vb.disabled = false; est.textContent = "Este navegador no pudo grabar el video. Usa «Imagen del sticker»."; });
    });
    return listoVista;
  }

  window.PetsSticker = { NIVELES, UMBRALES, JUEGOS, PERROS, nivelDe, meta, valorDe, preparar, pintar, exportar, exportarVideo, tipoVideo, montar, moverHolo, holoHTML, estilos, textoReto };
})();
