/* El Cucharón de la Yapa: sirve la torre más alta con un toque. Juego original del festival, en lienzo y sin librerías.
   Con movimiento reducido, el cucharón avanza por pasos y no hay rebotes, sacudidas ni partículas. */
(function () {
  var W = 360, H = 520, PH = 22, BASE = 140, PERFECTO = 6, PISO = H - 62, DUDA = 0;
  var C = "#B4472A", M = "#F2B33D", K = "#FFF4E0", N = "#231A15", V = "#3DBE93";
  var TIPOS = [["Mote", K, N], ["Fritada", C, K], ["Empanada", M, N], ["Dulces", V, N]];
  var cuadro = 0, salida = null, tono = null, sonido = false;
  var quieto = function () { return matchMedia("(prefers-reduced-motion: reduce)").matches; };
  function detener() { cancelAnimationFrame(cuadro); clearTimeout(salida); cuadro = 0; }

  /* núcleo sin dibujo: lo usa el juego y el bot de calibración */
  function velocidad(p) { return Math.min(135 + p * 9, 345); }
  function crear() { return { torre: [{ x: W / 2, w: BASE, t: 0 }], w: BASE, racha: 0, justos: 0, pisos: 0, vivo: true }; }
  function colocar(e, x, tol) {
    var top = e.torre[e.torre.length - 1], dx = x - top.x, r = { justo: false, yapa: false, cae: null };
    if (Math.abs(dx) <= (tol || PERFECTO)) {
      r.justo = true; e.racha += 1; e.justos += 1; x = top.x;
      if (e.racha % 3 === 0) { e.w = Math.min(BASE, e.w + 12); r.yapa = true; }
    } else {
      var solapa = e.w - Math.abs(dx);
      e.racha = 0;
      if (solapa <= 0) { e.vivo = false; r.cae = { x: x, w: e.w }; return r; }
      var iz = Math.max(x - e.w / 2, top.x - top.w / 2), de = Math.min(x + e.w / 2, top.x + top.w / 2);
      r.cae = { x: dx > 0 ? de + Math.abs(dx) / 2 : iz - Math.abs(dx) / 2, w: Math.abs(dx) };
      e.w = solapa; x = (iz + de) / 2;
    }
    e.pisos += 1;
    e.torre.push({ x: x, w: e.w, t: e.pisos % TIPOS.length });
    return r;
  }

  function pitar(f, d) {
    if (!sonido) return;
    try {
      tono = tono || new (window.AudioContext || window.webkitAudioContext)();
      var o = tono.createOscillator(), g = tono.createGain();
      o.frequency.value = f; o.type = "triangle"; g.gain.value = .06; o.connect(g); g.connect(tono.destination);
      g.gain.exponentialRampToValueAtTime(.001, tono.currentTime + d); o.start(); o.stop(tono.currentTime + d);
    } catch (e) { sonido = false; }
  }
  function redondo(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pieza(ctx, p, y, extra) {
    var T = TIPOS[p.t], e = extra || 1, w = p.w * e, h = (PH - 3) * (2 - e);
    ctx.fillStyle = T[1]; redondo(ctx, p.x - w / 2, y - h, w, h, 8); ctx.fill();
    ctx.strokeStyle = N; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = T[2];
    for (var i = -2; i <= 2; i++) { var q = p.x + i * w / 6; ctx.beginPath(); ctx.arc(q, y - h / 2 + (i % 2) * 3, 2, 0, Math.PI * 2); ctx.fill(); }
  }
  function cucharon(ctx, x, y, w, L) {
    ctx.strokeStyle = L; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + w * .4, y - 26); ctx.lineTo(x + w * .4 + 42, y - 44); ctx.stroke();
    ctx.fillStyle = L; ctx.fillRect(x - w * .55, y - 28, w * 1.1, 5);
    ctx.fillStyle = M; ctx.beginPath(); ctx.moveTo(x - w * .5, y - 23); ctx.lineTo(x + w * .5, y - 23); ctx.quadraticCurveTo(x + w * .4, y, x, y); ctx.quadraticCurveTo(x - w * .4, y, x - w * .5, y - 23); ctx.fill();
    ctx.strokeStyle = L; ctx.lineWidth = 2; ctx.stroke();
  }
  function fondo(ctx, pisos, t) {
    var noche = pisos >= 20, tarde = pisos >= 10;
    ctx.fillStyle = noche ? N : tarde ? M : K; ctx.fillRect(0, 0, W, H);
    if (noche) { ctx.fillStyle = K; for (var i = 0; i < 24; i++) { ctx.fillRect((i * 67) % W, (i * 41) % 300, 2, 2); } }
    ctx.fillStyle = noche ? C : tarde ? C : M;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 120); ctx.lineTo(70, H - 160); ctx.lineTo(130, H - 128); ctx.lineTo(205, H - 188); ctx.lineTo(280, H - 132); ctx.lineTo(360, H - 168); ctx.lineTo(360, H); ctx.fill();
    for (var c = 0; c < 8; c++) { ctx.fillStyle = c % 2 ? (tarde ? K : M) : C; var x = c * 45; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 45, 0); ctx.lineTo(x + 45, 12); ctx.arc(x + 22.5, 12, 22.5, 0, Math.PI); ctx.fill(); }
    if (tarde) {
      ctx.strokeStyle = noche ? K : N; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 54); ctx.quadraticCurveTo(180, 84, 360, 54); ctx.stroke();
      for (var f = 1; f < 8; f++) { var q = f / 8, ly = 54 + 60 * q * (1 - q) * 1; ctx.fillStyle = (f + Math.floor(t / 400)) % 2 ? M : K; ctx.beginPath(); ctx.arc(q * 360, ly + 6, 4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function iniciar(c, op, fin) {
    detener();
    c.innerHTML = '<div class="cuch"><div class="cuch__marco"><canvas id="cuch-lienzo" width="360" height="520" aria-label="Torre de la yapa. Toca Servir para soltar cada pieza."></canvas></div>' +
      '<button class="boton cuch__servir" type="button" id="cuch-servir">Servir</button><div class="cuch__pie"><button class="feria__cerrar" type="button" id="cuch-sonido" aria-pressed="' + sonido + '">' + (sonido ? "Sonido sí" : "Sonido no") + '</button><p class="cuch__res" id="cuch-res" aria-live="polite"></p></div></div>';
    var lz = document.getElementById("cuch-lienzo"), ctx = lz.getContext("2d"), servir = document.getElementById("cuch-servir"), res = document.getElementById("cuch-res");
    var r = Math.min(window.devicePixelRatio || 1, 2); lz.width = W * r; lz.height = H * r;
    var e = crear(), lento = quieto(), x = 40, dir = 1, ant = 0, cam = 0, sac = 0, rebote = 0, chop = 0, restos = [], chispas = [], letreros = [], cayendo = false, finT = 0;
    var perro = window.PFTarjeta.imagen(op.perrito);
    function letrero(tx, col) { letreros = [{ tx: tx, col: col, y: 156, v: 1 }]; }
    function chispear(px, py, n) {
      if (lento) return;
      for (var i = 0; i < n; i++) { chispas.push({ x: px, y: py, vx: (Math.random() - .5) * 150, vy: -60 - Math.random() * 110, v: 1, c: [M, C, V, K][i % 4] }); }
    }
    function tocar(ev) {
      if (ev) ev.preventDefault();
      if (!e.vivo || cayendo) return;
      var pv = velocidad(e.pisos), top = e.torre[e.torre.length - 1], px = lento ? top.x + Math.round((x - top.x) / 14) * 14 : x;
      var t = colocar(e, px, lento ? 8 : PERFECTO), y = PISO - e.pisos * PH + cam;
      if (t.cae) restos.push({ x: t.cae.x, y: y, w: t.cae.w, vy: 40, t: e.pisos % TIPOS.length });
      if (!e.vivo) {
        cayendo = true; sac = lento ? 0 : 7; res.textContent = "¡Se cayó! Tu perrito está feliz."; pitar(150, .4); if (navigator.vibrate) navigator.vibrate(60);
        finT = performance.now() + 900; return;
      }
      rebote = lento ? 0 : 1; pitar(320 + Math.min(e.racha, 12) * 40, .12); if (navigator.vibrate) navigator.vibrate(t.justo ? 18 : 8);
      if (t.yapa) { letrero("¡Yapa!", C); chispear(top.x, y, 16); sac = lento ? 0 : 3; }
      else if (t.justo) { letrero(e.racha > 1 ? "¡Justo x" + e.racha + "!" : "¡Justo!", V); chispear(top.x, y, 8); }
      res.textContent = e.pisos + (e.pisos === 1 ? " piso" : " pisos");
      x = dir > 0 ? 40 : 320; dir = -dir; ant = pv;
    }
    function dibujar(t, dt) {
      var obj = Math.max(0, e.pisos * PH - 210);
      cam += (obj - cam) * Math.min(1, dt * (lento ? 60 : 7));
      ctx.setTransform(r, 0, 0, r, 0, 0);
      fondo(ctx, e.pisos, t);
      ctx.save();
      if (sac > .2) { ctx.translate((Math.random() - .5) * sac, (Math.random() - .5) * sac); sac *= .86; }
      var base = PISO + cam;
      ctx.fillStyle = N; ctx.fillRect(W / 2 - BASE / 2 - 18, base, BASE + 36, 8);
      ctx.fillStyle = K; ctx.fillRect(W / 2 - BASE / 2 - 6, base + 8, BASE + 12, 5);
      e.torre.forEach(function (p, i) { if (i === 0) return; var yy = base - (i - 1) * PH; if (yy > -20) pieza(ctx, p, yy, i === e.torre.length - 1 && rebote > 0 ? 1 + rebote * .06 : 1); });
      rebote = Math.max(0, rebote - dt * 6);
      if (e.vivo) {
        var y = Math.max(196, base - e.pisos * PH - 112), pq = { x: x, w: e.w, t: (e.pisos + 1) % TIPOS.length };
        pieza(ctx, pq, y + 22); cucharon(ctx, x, y, Math.max(46, e.w * .6), e.pisos >= 20 ? K : N);
      }
      restos.forEach(function (q) { var v = { x: q.x, w: q.w, t: q.t }; pieza(ctx, v, q.y); });
      ctx.restore();
      if (perro && perro.naturalWidth) {
        var es = chop > 0 ? 1 + chop * .14 : 1, ds = 84 * es;
        ctx.fillStyle = K; ctx.strokeStyle = N; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(50, H - 44, 42 * es, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.drawImage(perro, 50 - ds / 2, H - 44 - ds / 2, ds, ds);
        if (chop > 0) { ctx.fillStyle = N; ctx.fillRect(96, H - 86, 62, 26); ctx.fillStyle = K; ctx.font = "800 17px 'Bricolage Grotesque', sans-serif"; ctx.textAlign = "center"; ctx.fillText("¡Ñam!", 127, H - 67); }
      }
      chop = Math.max(0, chop - dt * 1.4);
      chispas.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 280 * dt; s.v -= dt * 1.6; ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 5, 5); });
      chispas = chispas.filter(function (s) { return s.v > 0; });
      ctx.textAlign = "center"; ctx.fillStyle = e.pisos >= 20 ? K : N;
      ctx.font = "800 44px 'Bricolage Grotesque', sans-serif"; ctx.fillText(String(e.pisos), W / 2, 104);
      ctx.font = "700 13px Figtree, sans-serif"; ctx.fillText(op.reto ? "Reto: " + op.reto + " pisos" : "pisos", W / 2, 122);
      letreros.forEach(function (l) { ctx.globalAlpha = Math.max(0, l.v); ctx.fillStyle = e.pisos >= 20 && l.col === C ? M : l.col === V ? (e.pisos >= 20 ? V : N) : l.col; ctx.font = "800 28px 'Bricolage Grotesque', sans-serif"; ctx.fillText(l.tx, W / 2, l.y); l.v -= dt * 1.5; });
      ctx.globalAlpha = 1; letreros = letreros.filter(function (l) { return l.v > 0; });
    }
    function paso(t) {
      var dt = Math.min(.05, (t - (paso.t || t)) / 1000); paso.t = t;
      if (e.vivo) {
        x += dir * velocidad(e.pisos) * dt * (lento ? .7 : 1);
        if (x >= 320) { x = 320; dir = -1; } else if (x <= 40) { x = 40; dir = 1; }
      }
      restos.forEach(function (q) { q.vy += 620 * dt; q.y += q.vy * dt; if (q.y > H - 40 && !q.comido) { q.comido = true; chop = 1; pitar(520, .08); } });
      restos = restos.filter(function (q) { return q.y < H + 60; });
      dibujar(t, dt);
      if (cayendo && t > finT) {
        detener();
        return fin({ pisos: e.pisos, justos: e.justos, corona: TIPOS[e.torre[e.torre.length - 1].t][0], torre: e.torre.map(function (p) { return { x: p.x, w: p.w, t: p.t }; }) });
      }
      cuadro = requestAnimationFrame(paso);
    }
    servir.addEventListener("click", tocar);
    lz.addEventListener("pointerdown", tocar);
    var son = document.getElementById("cuch-sonido");
    son.addEventListener("click", function () { sonido = !sonido; son.textContent = sonido ? "Sonido sí" : "Sonido no"; son.setAttribute("aria-pressed", String(sonido)); if (sonido) pitar(440, .1); });
    window.PFCucharon.__estado = function () { return { e: e, x: x, dir: dir }; };
    cuadro = requestAnimationFrame(paso); servir.focus({ preventScroll: true });
  }
  window.PFCucharon = { iniciar: iniciar, detener: detener, nucleo: { crear: crear, colocar: colocar, velocidad: velocidad, PERFECTO: PERFECTO, TIPOS: TIPOS, BASE: BASE, PH: PH } };
})();
