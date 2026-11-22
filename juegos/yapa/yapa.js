/* Atrapa la Yapa · El Pets Festival — juego corto para activaciones en colegios (HUECA-JUEGO-002). Sin dependencias.
   Se mueve un plato con el perro del festival y se atrapa lo que cae. Las cosas llegan al plato en el pulso de la canción
   (reloj del audio, igual que Sigue el ritmo). Parámetros: ?kiosco=1 · ?activacion=1 · ?demo=1 (juega solo) ·
   ?prueba=1 (expone el estado) · ?cancion=<id> · ?semilla=<n> (misma ronda siempre). */
(() => {
  "use strict";
  const CFG = window.PETS_CONFIG, P = window.Pets;
  const Q = new URLSearchParams(location.search);
  const DEMO = Q.has("demo"), PRUEBA = Q.has("prueba"), KIOSCO = P.kiosco;
  const RONDA = (CFG.yapa && CFG.yapa.segundos) || 38;
  const ESPERA = 2.4;
  const $ = (s) => document.querySelector(s);
  const TIPOS = {
    empanada: { pts: 10, bueno: true, color: "#F2B33D" }, choclo: { pts: 10, bueno: true, color: "#F2B33D" },
    helado: { pts: 10, bueno: true, color: "#FFF4E0" }, nota: { pts: 15, bueno: true, color: "#FFF4E0" },
    hueso: { pts: 20, bueno: true, color: "#FFF4E0" }, regalo: { pts: 50, bueno: true, color: "#F2B33D" },
    aji: { pts: -30, bueno: false, color: "#B4472A" }
  };
  const FRASES = ["¡Chévere!", "¡Qué rico!", "¡De ley!", "¡Full yapa!", "¡Sabroso!"];
  const CONFETI = ["#B4472A", "#F2B33D", "#3DBE93", "#FFF4E0"];

  // azar con semilla (para pruebas repetibles)
  let semilla = Number(Q.get("semilla")) || Math.floor(Math.random() * 1e9);
  const azar = () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------------- audio ---------------- */
  let ctx = null, manifiesto = null;
  const cache = {};
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ latencyHint: "interactive" });
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* iOS antiguo */ }
    }
    if (ctx.state !== "running") { try { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* iOS al volver de compartir */ } }
    return ctx;
  }
  function relojOido() {
    let t = ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return Math.min(Math.max(t, ctx.currentTime - 0.5), ctx.currentTime);
  }
  function tono(f, dur, tipo = "triangle", vol = 0.22, f2 = null, cuando = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + cuando, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sonido = {
    atrapa: (combo) => tono(660 * Math.pow(2, Math.min(combo, 14) / 12), 0.09, "triangle", 0.2),
    yapa: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.14, "square", 0.09, null, i * 0.07)),
    aji: () => { tono(320, 0.28, "sawtooth", 0.13, 110); tono(180, 0.2, "square", 0.06, 90, 0.05); },
    hito: () => { tono(988, 0.12, "triangle", 0.16); tono(1319, 0.18, "triangle", 0.16, null, 0.09); },
    cuenta: (f) => tono(f, 0.07, "square", 0.08)
  };

  async function cargar(c) {
    if (cache[c.id]) return cache[c.id];
    const [chart, datos] = await Promise.all([
      fetch("../ritmo/" + c.chart).then((r) => { if (!r.ok) throw new Error("chart"); return r.json(); }),
      fetch("../ritmo/" + c.audio).then((r) => { if (!r.ok) throw new Error("audio"); return r.arrayBuffer(); })
    ]);
    const buffer = await new Promise((ok, mal) => { const p = ctx.decodeAudioData(datos, ok, mal); if (p && p.then) p.then(ok, mal); });
    cache[c.id] = { chart, buffer, retardo: P.retardo(buffer, chart.huella) };
    return cache[c.id];
  }

  /* ---------------- íconos (SVG del festival a imagen, una vez) ---------------- */
  const IMG = {};
  for (const n of Object.keys(TIPOS)) { const i = new Image(); i.src = P.iconoURL(n); IMG[n] = i; }
  const sena = new Image(); sena.src = "../assets/sena.png";
  document.querySelectorAll("[data-icono]").forEach((e) => { e.innerHTML = P.icono(e.dataset.icono); });

  /* ---------------- pantallas ---------------- */
  function mostrar(id) {
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.toggle("activa", p.id === id));
    document.body.classList.toggle("jugando", id === "juego" || id === "pausa");
  }
  function pintarRecord() { const r = P.record("yapa"); $("#record-inicio").textContent = r ? `Tu récord: ${P.fmt(r)} puntos` : ""; }

  /* ---------------- ronda ---------------- */
  const J = { estado: "inicio" };
  P.volverSiInactivo(() => J.estado === "jugando" || J.estado === "resultado");
  let G = null;
  const lienzo = $("#lienzo"), c2 = lienzo.getContext("2d");

  function planificar(chart) {
    const per = 60 / chart.bpm, p0 = chart.primer_pulso_ms / 1000, plan = [];
    const regalos = [9.5 + azar() * 2, 20 + azar() * 2, 30 + azar() * 2];
    for (let k = 0; ; k++) {
      const tl = p0 + k * per;                                  // llega al plato en el pulso
      if (tl > RONDA - 0.5) break;
      const f = Math.min(1, tl / RONDA), caida = 2.4 - 0.9 * f;
      if (tl < caida + 0.6) continue;
      if (azar() > 0.66 + 0.32 * f) continue;
      const n = f > 0.22 && azar() < 0.2 + 0.25 * f ? 2 : 1;
      let x0 = null;
      for (let j = 0; j < n; j++) {
        let tipo;
        if (j === 0 && regalos.length && tl >= regalos[0]) { tipo = "regalo"; regalos.shift(); }
        else {
          const r = azar(), pa = 0.11 + 0.1 * f;
          tipo = r < pa ? "aji" : r < pa + 0.17 ? "nota" : r < pa + 0.29 ? "hueso" : ["empanada", "choclo", "helado"][Math.floor(azar() * 3)];
        }
        const x = x0 === null ? 0.1 + azar() * 0.8 : ((x0 - 0.1 + 0.32 + azar() * 0.36) % 0.8) + 0.1;   // el segundo, lejos del primero
        x0 = x;
        plan.push({ tl, ts: tl - caida, caida, tipo, x });
      }
    }
    return plan.sort((a, b) => a.ts - b.ts);
  }
  // puntaje máximo posible de la ronda (atrapar todo lo bueno y esquivar los ajíes): el nivel del premio se mide contra esto.
  // Es un techo: cada cosa se atrapa entre el 97 y el 108 % de su caída, así que cuenta como doble si puede caer dentro de alguna yapa.
  function maxRonda(plan) {
    const buenos = plan.filter((p) => TIPOS[p.tipo].bueno && p.ts + 0.97 * p.caida < RONDA).sort((a, b) => a.tl - b.tl);
    const regalos = buenos.filter((p) => p.tipo === "regalo").map((p) => [p.ts + 0.97 * p.caida, p.ts + 1.08 * p.caida]);
    let combo = 0, pts = 0;
    buenos.forEach((p) => {
      const i0 = p.ts + 0.97 * p.caida, i1 = p.ts + 1.08 * p.caida, mult = Math.min(5, 1 + Math.floor(++combo / 6));
      const doble = regalos.some(([r0, r1]) => (p.tipo === "regalo" ? r0 < i0 : i1 >= r0) && i0 < r1 + 6);
      pts += TIPOS[p.tipo].pts * mult * (doble ? 2 : 1);
    });
    return Math.max(pts, 1);
  }

  async function empezarRonda() {
    audio();
    const lista = manifiesto.canciones;
    let c = lista.find((x) => x.id === Q.get("cancion"));
    if (!c) {   // al azar, sin repetir la última
      let ult = null; try { ult = localStorage.getItem("pets_yapa_ultima"); } catch (e) { /* sin almacenamiento */ }
      const otras = lista.filter((x) => x.id !== ult);
      c = otras[Math.floor(Math.random() * otras.length)] || lista[0];
    }
    try { localStorage.setItem("pets_yapa_ultima", c.id); } catch (e) { /* sin almacenamiento */ }
    mostrar("carga");
    try { await Promise.all([cargar(c), document.fonts ? document.fonts.load("800 40px Bricolage") : null]); }
    catch (e) { $("#carga-texto").textContent = "No se pudo cargar la música. Revisa la conexión y vuelve a intentar."; setTimeout(() => mostrar("inicio"), 2600); return; }
    const { chart, buffer, retardo } = cache[c.id];
    Object.assign(J, {
      estado: "jugando", cancion: c, chart, retardo, plan: planificar(chart), idxPlan: 0, items: [],
      jx: 0.5, objetivo: 0.5, tecla: 0, puntos: 0, combo: 0, comboMax: 0, mult: 1, atrapados: 0, buenos: 0, yapas: 0, ajies: 0,
      yapaHasta: -1e9, pica: -1e9, sacudir: 0, textos: [], particulas: [], frase: null, tVisual: -ESPERA, ultimoPerf: performance.now(),
      cuentaMostrada: null, terminado: false, periodo: 60 / chart.bpm, primerPulso: chart.primer_pulso_ms / 1000, ang: 0, dts: []
    });
    J.max = maxRonda(J.plan);
    $("#hud-cancion").textContent = `Suena: ${c.artista} · ${c.cancion}`; $("#hud-puntos").textContent = "0";
    $("#lado-img").src = "../" + c.imagen.replace(/^\.\.\//, ""); $("#lado-artista").textContent = c.artista; $("#lado-cancion").textContent = c.cancion;
    $("#lado-dia").textContent = c.dia === "sabado" ? "Sábado 12 de diciembre" : "Domingo 13 de diciembre";
    $("#ayuda").textContent = ("ontouchstart" in window) ? "Mueve el plato con el dedo" : "Muévete con ← → o con el mouse";
    mostrar("juego"); medir();
    const fuente = ctx.createBufferSource(); fuente.buffer = buffer;
    const vol = ctx.createGain(); vol.gain.value = 0.8;
    fuente.connect(vol); vol.connect(ctx.destination);
    J.inicio = ctx.currentTime + ESPERA; fuente.start(J.inicio);
    J.fuente = fuente; J.vol = vol;
    $("#ayuda").classList.add("ver");
    requestAnimationFrame(cuadro);
  }

  const tiempo = () => relojOido() - J.inicio - J.retardo;

  function cuadro(ahora) {
    if (J.estado !== "jugando") return;
    const tA = tiempo();
    const dt = Math.min(0.1, (ahora - J.ultimoPerf) / 1000); J.ultimoPerf = ahora;
    if (PRUEBA || DEMO) J.dts.push(dt);
    J.tVisual += dt;
    const d = tA - J.tVisual;
    if (Math.abs(d) > 0.05 || !isFinite(J.tVisual)) J.tVisual = tA; else J.tVisual += d * 0.15;
    const t = J.tVisual;

    // aparecer
    while (J.idxPlan < J.plan.length && J.plan[J.idxPlan].ts <= t) {
      const p = J.plan[J.idxPlan++]; J.items.push({ ...p, estado: 0 }); if (TIPOS[p.tipo].bueno) J.buenos++;
    }
    // mover el plato
    if (DEMO) robot(t);
    if (J.tecla) J.objetivo = Math.max(0.06, Math.min(0.94, J.objetivo + J.tecla * 1.7 * dt));
    if (t >= J.pica) J.jx += (J.objetivo - J.jx) * Math.min(1, dt * 16);
    // atrapar y perder
    const alcance = (G.pw + G.r * 0.55) / G.fw;
    for (const it of J.items) {
      if (it.estado) continue;
      const prog = (t - it.ts) / it.caida;
      if (prog >= 0.97 && prog <= 1.08 && Math.abs(it.x - J.jx) <= alcance) atrapar(it, t);
      else if (prog > 1.08) { it.estado = 2; if (TIPOS[it.tipo].bueno && J.combo > 0) { J.combo = 0; J.mult = 1; } }
    }
    J.items = J.items.filter((it) => it.estado !== 1 && (t - it.ts) / it.caida < 1.6);
    // cuenta regresiva y fin
    cuentaRegresiva(t);
    $("#barra").style.width = `${Math.max(0, Math.min(100, (t / RONDA) * 100))}%`;
    dibujar(t, ahora);
    if (t >= RONDA && !J.terminado) { terminar(); return; }
    requestAnimationFrame(cuadro);
  }

  function cuentaRegresiva(t) {
    const el = $("#cuenta"); let txt = "";
    if (t < -ESPERA + 0.25) txt = ""; else if (t < -1.6) txt = "3"; else if (t < -0.8) txt = "2"; else if (t < 0) txt = "1"; else if (t < 0.5) txt = "¡Ya!";
    if (txt !== J.cuentaMostrada) {
      J.cuentaMostrada = txt; el.textContent = txt; el.classList.remove("pop"); void el.offsetWidth;
      if (txt) { el.classList.add("pop"); sonido.cuenta(txt === "¡Ya!" ? 1320 : 880); }
    }
    if (t > 4) $("#ayuda").classList.remove("ver");
  }

  function atrapar(it, t) {
    it.estado = 1;
    const x = G.x0 + it.x * G.fw, y = G.yPlato - G.r * 0.4;
    if (it.tipo === "aji") {
      J.puntos = Math.max(0, J.puntos + TIPOS.aji.pts); J.combo = 0; J.mult = 1; J.pica = t + 0.8; J.sacudir = 14; J.ajies++;
      J.textos.push({ txt: "¡PICA! −30", x, y: y - G.r, t0: performance.now(), color: "#FFF4E0", grande: true });
      chispas(x, y, ["#B4472A", "#F2B33D", "#FFF4E0"], 14); sonido.aji();
    } else {
      J.combo++; J.comboMax = Math.max(J.comboMax, J.combo); J.atrapados++;
      J.mult = Math.min(5, 1 + Math.floor(J.combo / 6));
      const x2 = t < J.yapaHasta ? 2 : 1, pts = TIPOS[it.tipo].pts * J.mult * x2;
      J.puntos += pts;
      J.textos.push({ txt: `+${pts}`, x, y: y - G.r, t0: performance.now(), color: x2 > 1 ? "#F2B33D" : "#FFF4E0" });
      chispas(x, y, [TIPOS[it.tipo].color, ...CONFETI], it.tipo === "regalo" ? 30 : 10);
      sonido.atrapa(J.combo);
      if (it.tipo === "regalo") { J.yapaHasta = t + 6; J.yapas++; J.frase = { txt: "¡LA YAPA! ×2", t0: performance.now(), dorada: true }; sonido.yapa(); }
      else if (J.combo % 10 === 0) { J.frase = { txt: FRASES[(J.combo / 10 - 1) % FRASES.length], t0: performance.now() }; sonido.hito(); }
    }
    $("#hud-puntos").textContent = P.fmt(J.puntos);
  }

  function chispas(x, y, colores, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (azar() - 0.5) * Math.PI * 1.4, v = 160 + azar() * 320;
      J.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: performance.now(), color: colores[i % colores.length], tam: 4 + azar() * 6, giro: azar() * 6 });
    }
  }

  function robot(t) {   // modo demostración: va a la siguiente cosa buena y esquiva el ají
    const prox = J.items.filter((it) => !it.estado && it.ts + it.caida > t - 0.02).sort((a, b) => a.tl - b.tl);
    const meta = prox.find((it) => TIPOS[it.tipo].bueno);
    if (!meta) return;
    let x = meta.x;
    const aji = prox.find((it) => it.tipo === "aji" && Math.abs(it.tl - meta.tl) < 0.3 && Math.abs(it.x - x) * G.fw < G.pw + G.r);
    if (aji) x += (x >= aji.x ? 1 : -1) * ((G.pw + G.r) / G.fw) * 0.7;
    J.objetivo = Math.max(0.06, Math.min(0.94, x));
  }

  /* ---------------- dibujo ---------------- */
  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr);
    const fw = Math.min(w * 0.96, h * 0.7, 640), x0 = (w - fw) / 2;
    const hud = 70 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--seguro-arriba")) || 0);
    G = { w, h, dpr, fw, x0, yTop: hud + 34, yPlato: h * (h > w ? 0.84 : 0.86), r: Math.max(26, Math.min(fw * 0.085, 58)), pw: Math.max(52, Math.min(fw * 0.155, 118)) };
  }
  window.addEventListener("resize", () => { if (J.estado === "jugando" || J.estado === "pausa") medir(); });

  function pulso(t) { const f = ((t - J.primerPulso) / J.periodo) % 1; return t < J.primerPulso - 0.05 ? 0 : 1 - (f < 0 ? f + 1 : f); }

  function dibujar(t, ahora) {
    const { w, h, dpr, fw, x0, yTop, yPlato, r, pw } = G;
    const p = pulso(t), enYapa = t < J.yapaHasta;
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2.globalAlpha = 1;   // cada cuadro arranca opaco (sin estelas)
    c2.fillStyle = "#231A15"; c2.fillRect(0, 0, w, h);
    const sx = J.sacudir > 0.5 ? (Math.random() - 0.5) * J.sacudir : 0, sy = J.sacudir > 0.5 ? (Math.random() - 0.5) * J.sacudir : 0;
    J.sacudir *= 0.86;
    c2.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    // rayos de sol que giran y laten con el pulso (más rápido con la yapa)
    J.ang += (enYapa ? 0.9 : 0.18) * (1 / 60);
    c2.save(); c2.translate(w / 2, yTop + (yPlato - yTop) * 0.38); c2.rotate(J.ang); const esc = 1 + p * 0.04; c2.scale(esc, esc);
    const R = Math.hypot(w, h);
    for (let i = 0; i < 20; i++) {
      c2.fillStyle = i % 2 ? (enYapa ? "rgba(242,179,61,.22)" : "rgba(180,71,42,.17)") : "rgba(242,179,61,.04)";
      c2.beginPath(); c2.moveTo(0, 0); c2.arc(0, 0, R, (i * Math.PI) / 10, ((i + 1) * Math.PI) / 10); c2.closePath(); c2.fill();
    }
    c2.restore();
    // campo de juego (más claro) y piso
    c2.fillStyle = "rgba(35,26,21,.55)"; c2.fillRect(x0, yTop, fw, h - yTop);
    // guirnalda
    const yLuz = yTop - 18;
    c2.strokeStyle = "rgba(255,244,224,.35)"; c2.lineWidth = 1.5; c2.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = yLuz + Math.sin((x / w) * Math.PI * 6) * 4; x === 0 ? c2.moveTo(x, y) : c2.lineTo(x, y); }
    c2.stroke();
    for (let i = 0, nL = Math.max(8, Math.round(w / 46)); i <= nL; i++) {
      const x = (i / nL) * w, y = yLuz + Math.sin((x / w) * Math.PI * 6) * 4 + 5;
      c2.globalAlpha = i % 2 ? 0.45 + 0.55 * p : 0.95 - 0.5 * p;
      c2.fillStyle = i % 2 ? "#F2B33D" : "#FFF4E0"; c2.beginPath(); c2.arc(x, y, 3.2, 0, Math.PI * 2); c2.fill();
    }
    c2.globalAlpha = 1;
    // tiempo y multiplicador
    const resta = Math.max(0, Math.ceil(RONDA - Math.max(0, t)));
    c2.textAlign = "center"; c2.textBaseline = "middle";
    c2.font = `800 ${Math.round(Math.min(fw * 0.11, 54))}px Bricolage, sans-serif`;
    c2.fillStyle = resta <= 5 && t > 0 ? "#F2B33D" : "rgba(255,244,224,.9)";
    c2.fillText(`0:${String(resta).padStart(2, "0")}`, w / 2, yTop + 30);
    if (J.mult > 1 || enYapa) {
      const txt = `×${J.mult * (enYapa ? 2 : 1)}`;
      c2.font = `800 ${Math.round(Math.min(fw * 0.075, 34))}px Bricolage, sans-serif`;
      const mw = c2.measureText(txt).width + 24, mx = x0 + fw - mw / 2 - 10, my = yTop + 30;
      c2.fillStyle = enYapa ? "#F2B33D" : "#B4472A"; c2.beginPath(); c2.arc(mx, my, mw / 2, 0, Math.PI * 2); c2.fill();
      c2.fillStyle = enYapa ? "#231A15" : "#FFF4E0"; c2.fillText(txt, mx, my + 1);
    }
    if (J.combo >= 3) {
      c2.font = `800 ${Math.round(Math.min(fw * 0.055, 24))}px Figtree, sans-serif`; c2.fillStyle = "rgba(255,244,224,.7)";
      c2.textAlign = "left"; c2.fillText(`COMBO ${J.combo}`, x0 + 14, yTop + 30); c2.textAlign = "center";
    }
    // lo que cae
    const y0 = yTop - r;
    for (const it of J.items) {
      const prog = (t - it.ts) / it.caida;
      if (prog < 0) continue;
      const y = y0 + prog * (yPlato - y0), x = x0 + it.x * fw;
      const im = IMG[it.tipo];
      c2.globalAlpha = it.estado === 2 ? Math.max(0, 1 - (prog - 1.08) * 3) : 1;
      if (it.tipo === "regalo") { c2.save(); c2.translate(x, y); c2.rotate(Math.sin(ahora / 160) * 0.25); c2.drawImage(im, -r * 1.25, -r * 1.25, r * 2.5, r * 2.5); c2.restore(); }
      else if (im.complete) c2.drawImage(im, x - r, y - r, r * 2, r * 2);
    }
    c2.globalAlpha = 1;
    // el plato con el perro
    const px = x0 + J.jx * fw, pica = t < J.pica, salto = p * 4;
    c2.fillStyle = "rgba(0,0,0,.35)"; c2.beginPath(); c2.ellipse(px, yPlato + r * 0.9, pw * 0.95, r * 0.28, 0, 0, Math.PI * 2); c2.fill();
    if (sena.complete && sena.naturalWidth) {
      const ts = pw * 1.15;
      c2.save(); if (pica) { c2.translate(px, yPlato - ts * 0.35); c2.rotate(Math.sin(ahora / 40) * 0.15); c2.translate(-px, -(yPlato - ts * 0.35)); }
      c2.drawImage(sena, px - ts / 2, yPlato - ts * 0.85 - salto, ts, ts);
      if (pica) { c2.globalAlpha = 0.45; c2.fillStyle = "#B4472A"; c2.beginPath(); c2.arc(px, yPlato - ts * 0.35 - salto, ts * 0.47, 0, Math.PI * 2); c2.fill(); c2.globalAlpha = 1; }
      c2.restore();
    }
    c2.fillStyle = "#6E2915"; c2.beginPath(); c2.ellipse(px, yPlato + r * 0.25, pw, r * 0.55, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = enYapa ? "#F2B33D" : "#B4472A"; c2.beginPath(); c2.ellipse(px, yPlato, pw, r * 0.5, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = "#FFF4E0"; c2.beginPath(); c2.ellipse(px, yPlato - r * 0.05, pw * 0.82, r * 0.3, 0, 0, Math.PI * 2); c2.fill();
    if (pica) {   // humito
      for (let i = 0; i < 3; i++) {
        const k = ((ahora / 600) + i / 3) % 1; c2.globalAlpha = 0.6 * (1 - k); c2.fillStyle = "#FFF4E0";
        c2.beginPath(); c2.arc(px + (i - 1) * pw * 0.35, yPlato - pw * 1.1 - k * 40, 6 + k * 10, 0, Math.PI * 2); c2.fill();
      }
      c2.globalAlpha = 1;
    }
    // chispas y confeti
    const vivas = [];
    for (const q of J.particulas) {
      const s = (ahora - q.t0) / 1000; if (s > 0.9) continue;
      c2.globalAlpha = 1 - s / 0.9; c2.fillStyle = q.color;
      c2.save(); c2.translate(q.x + q.vx * s, q.y + q.vy * s + 700 * s * s); c2.rotate(q.giro + s * 8); c2.fillRect(-q.tam / 2, -q.tam / 4, q.tam, q.tam / 2); c2.restore();
      vivas.push(q);
    }
    J.particulas = vivas; c2.globalAlpha = 1;
    // puntos que suben
    const vivos = [];
    for (const q of J.textos) {
      const s = (ahora - q.t0) / 1000; if (s > 0.8) continue;
      c2.globalAlpha = s < 0.55 ? 1 : 1 - (s - 0.55) / 0.25;
      c2.font = `800 ${Math.round(Math.min(fw * (q.grande ? 0.085 : 0.065), q.grande ? 40 : 30))}px Bricolage, sans-serif`;
      c2.lineWidth = 5; c2.strokeStyle = "#231A15"; c2.strokeText(q.txt, q.x, q.y - s * 70); c2.fillStyle = q.color; c2.fillText(q.txt, q.x, q.y - s * 70);
      vivos.push(q);
    }
    J.textos = vivos; c2.globalAlpha = 1;
    // frase grande
    if (J.frase) {
      const s = (ahora - J.frase.t0) / 1000;
      if (s < 1.2) {
        const esc2 = s < 0.12 ? 0.6 + s * 4 : 1 + (s - 0.12) * 0.05;
        c2.globalAlpha = s < 0.9 ? 1 : 1 - (s - 0.9) / 0.3;
        c2.save(); c2.translate(w / 2, yTop + (yPlato - yTop) * 0.4); c2.rotate(-0.06); c2.scale(esc2, esc2);
        c2.font = `800 ${Math.round(Math.min(fw * 0.13, 66))}px Bricolage, sans-serif`;
        c2.lineWidth = 10; c2.strokeStyle = "#231A15"; c2.strokeText(J.frase.txt, 0, 0);
        c2.fillStyle = J.frase.dorada ? "#F2B33D" : "#FFF4E0"; c2.fillText(J.frase.txt, 0, 0);
        c2.restore();
      } else J.frase = null;
    }
    c2.globalAlpha = 1;
    // borde dorado mientras dura la yapa
    if (enYapa) {
      const rest = J.yapaHasta - t;
      c2.globalAlpha = 0.55 + 0.45 * p; c2.strokeStyle = "#F2B33D"; c2.lineWidth = 8 + p * 6; c2.strokeRect(4, 4, w - 8, h - 8);
      c2.globalAlpha = 1; c2.fillStyle = "#F2B33D"; c2.fillRect(x0, h - 8, fw * (rest / 6), 8);
    }
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- fin ---------------- */
  function detener() {
    try { if (J.vol) J.vol.gain.setTargetAtTime(0, ctx.currentTime, 0.15); } catch (e) { /* sin audio */ }
    const f = J.fuente; J.fuente = null; setTimeout(() => { try { f && f.stop(); } catch (e) { /* ya detenida */ } }, 900);
  }
  function terminar() {
    J.terminado = true; J.estado = "resultado"; detener();
    const punteria = J.buenos ? J.atrapados / J.buenos : 0;
    // titular y premio salen del mismo nivel (sticker.js: % del máximo posible de esta ronda)
    const nivel = window.PetsSticker.nivelDe("yapa", window.PetsSticker.valorDe({ juego: "yapa", puntos: J.puntos, max: J.max }));
    const titulo = ["¡Otra vez, que tú puedes!", "¡Bien ahí!", "¡Buena mano!", "¡Qué buena mano!", "¡Casi leyenda!", "¡Maestro de la Yapa!"][nivel];
    const reg = P.registrar("yapa", J.puntos);
    J.resultado = { puntos: J.puntos, atrapados: J.atrapados, buenos: J.buenos, comboMax: J.comboMax, yapas: J.yapas, ajies: J.ajies, punteria, nivel, max: J.max, registro: reg };
    $("#res-tema").textContent = `Atrapa la Yapa · con ${J.cancion.artista}`;
    $("#t-resultado").textContent = titulo;
    $("#res-puntos").textContent = P.fmt(J.puntos);
    $("#res-atrapados").textContent = J.atrapados; $("#res-combo").textContent = J.comboMax; $("#res-yapas").textContent = J.yapas;
    $("#res-ajies").textContent = J.ajies; $("#res-punteria").textContent = `${Math.round(punteria * 100)} %`; $("#res-record-num").textContent = P.fmt(reg.record);
    $("#res-record").hidden = !reg.nuevoRecord;
    mostrar("resultado"); pintarRecord();
    // premio: sticker holográfico de La Feria según el puntaje (sticker.js)
    window.PetsSticker.montar($("#premio"), { juego: "yapa", nivel, puntos: J.puntos, max: J.max });
    // en el teléfono el premio queda más abajo: aviso arriba que lleva hasta él
    const rp = $("#res-premio"); rp.textContent = `Ganaste el sticker «${window.PetsSticker.NIVELES[J.resultado.nivel].nombre}» ↓`; rp.hidden = false;
    rp.onclick = (e) => { e.preventDefault(); $("#premio").scrollIntoView({ behavior: "smooth", block: "start" }); };
    if (P.activacion && reg.puesto && !DEMO) P.pedirIniciales(reg.puesto, J.puntos).then((ini) => { if (ini) P.agregarTop("yapa", ini, J.puntos); });
    if (KIOSCO) {
      clearTimeout(J.temporizador);
      J.temporizador = setTimeout(() => {
        if (J.estado !== "resultado" || document.querySelector(".pets-modal")) return;
        if (P.activacion) location.href = P.volverZona(); else mostrar("inicio");
      }, CFG.segundosKioscoResultado * 1000);
    }
  }
  function pausar() { if (J.estado !== "jugando") return; J.estado = "pausa"; ctx.suspend(); mostrar("pausa"); }
  function seguir() {
    if (J.estado !== "pausa") return;
    ctx.resume().then(() => { J.estado = "jugando"; mostrar("juego"); medir(); J.ultimoPerf = performance.now(); J.tVisual = tiempo(); requestAnimationFrame(cuadro); });
  }

  /* ---------------- entrada ---------------- */
  const aObjetivo = (x) => { if (G) J.objetivo = Math.max(0.06, Math.min(0.94, (x - G.x0) / G.fw)); };
  lienzo.addEventListener("pointerdown", (e) => { e.preventDefault(); if (J.estado === "jugando") { J.arrastre = e.pointerId; aObjetivo(e.clientX); } }, { passive: false });
  lienzo.addEventListener("pointermove", (e) => { if (J.estado === "jugando" && (J.arrastre === e.pointerId || e.pointerType === "mouse")) aObjetivo(e.clientX); });
  const suelta = (e) => { if (J.arrastre === e.pointerId) J.arrastre = null; };
  lienzo.addEventListener("pointerup", suelta); lienzo.addEventListener("pointercancel", suelta);
  lienzo.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    if (J.estado === "jugando" && ["ArrowLeft", "KeyA"].includes(e.code)) { J.tecla = -1; e.preventDefault(); }
    else if (J.estado === "jugando" && ["ArrowRight", "KeyD"].includes(e.code)) { J.tecla = 1; e.preventDefault(); }
    else if ((e.code === "Escape" || e.code === "Space") && J.estado === "jugando") { e.preventDefault(); pausar(); }
    else if ((e.code === "Escape" || e.code === "Space") && J.estado === "pausa") { e.preventDefault(); seguir(); }
    else if ((e.code === "Enter" || e.code === "Space") && J.estado === "inicio") { e.preventDefault(); empezarRonda(); }
  });
  window.addEventListener("keyup", (e) => {
    if ((["ArrowLeft", "KeyA"].includes(e.code) && J.tecla < 0) || (["ArrowRight", "KeyD"].includes(e.code) && J.tecla > 0)) J.tecla = 0;
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });
  $("#boton-pausa").addEventListener("click", pausar);
  $("#seguir").addEventListener("click", seguir);
  $("#jugar").addEventListener("click", empezarRonda);
  $("#otra-vez").addEventListener("click", () => { clearTimeout(J.temporizador); empezarRonda(); });

  /* ---------------- arranque ---------------- */
  P.enlacesEntradas();
  document.querySelectorAll("[data-zona]").forEach((a) => { a.href = P.volverZona(); });
  pintarRecord();
  if (KIOSCO) {
    document.body.classList.add("kiosco");
    document.addEventListener("pointerdown", () => {
      try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* sin pantalla completa */ }
      try { if (navigator.wakeLock) navigator.wakeLock.request("screen").catch(() => {}); } catch (e) { /* sin bloqueo */ }
    });
  }
  if (PRUEBA || DEMO) {
    window.__yapa = { J, get G() { return G; }, tiempo: () => (ctx && J.inicio ? tiempo() : null), estado: () => J.estado, resultado: () => J.resultado,
      empezar: () => empezarRonda() };
  }
  fetch("../ritmo/canciones.json").then((r) => r.json()).then((m) => {
    manifiesto = m;
    if (DEMO) empezarRonda();
  }).catch(() => { $("#record-inicio").textContent = "No se pudo cargar la música."; });
  // sin conexión solo en kiosco y pantalla grande
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && KIOSCO && !PRUEBA && !DEMO) navigator.serviceWorker.register("../sw.js").catch(() => {});
})();
