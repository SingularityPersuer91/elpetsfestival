/* Sigue el ritmo · El Pets Festival — motor del juego (HUECA-JUEGO-001). Sin dependencias externas.
   Reloj: el del audio (Web Audio). Las notas se dibujan y se juzgan contra lo que se está oyendo, no contra los cuadros de pantalla.
   Parámetros de la URL: ?kiosco=1 (modo kiosco) · ?demo=1&cancion=<id>&dif=<facil|normal> (juega solo) ·
   ?prueba=1 (expone el estado para las pruebas) · ?medir=1 (graba el volumen real del audio contra el reloj del juego). */
(() => {
  "use strict";
  const CFG = window.PETS_CONFIG;
  const Q = new URLSearchParams(location.search);
  const KIOSCO = window.Pets.kiosco;
  const DEMO = Q.has("demo"), PRUEBA = Q.has("prueba"), MEDIR = Q.has("medir");
  const COLOR = ["#B4472A", "#F2B33D", "#3DBE93", "#FFF4E0"];   // canela, mostaza, menta, crema
  const BORDE = ["#6E2915", "#9C6A12", "#1F6E53", "#B9A88C"];
  const TECLAS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
  const ROTULO_TECLA = ["D", "F", "J", "K"];
  const PUNTOS = { perfecto: 100, bien: 70, casi: 40 };
  const PESO = { perfecto: 1, bien: 0.7, casi: 0.4, fallo: 0 };
  const TEXTO = { perfecto: "¡PERFECTO!", bien: "¡BIEN!", casi: "CASI", fallo: "FALLO" };
  const TEXTO_COLOR = { perfecto: "#F2B33D", bien: "#FFF4E0", casi: "#3DBE93", fallo: "#E0694A" };
  const W = { perfecto: CFG.ventanas.perfecto / 1000, bien: CFG.ventanas.bien / 1000, casi: CFG.ventanas.casi / 1000 };
  const GRACIA_VACIO = 0.25;   // un toque sin nota a menos de 250 ms corta el combo
  const GRACIA_FALLO = 0.08;   // espera extra antes de dar una nota por fallada: un toque a tiempo puede llegar tarde a la cola de eventos
  const ESPERA = 2.4;          // segundos de cuenta regresiva antes de que arranque la canción
  const $ = (s) => document.querySelector(s);

  const guardar = (k, v) => { try { localStorage.setItem("pets_" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k, d) => { try { const v = localStorage.getItem("pets_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };

  let manifiesto = null;
  let dificultad = Q.get("dif") || leer("dificultad", CFG.dificultadInicial);
  let ajusteMs = Number(leer("ajuste_ms", 0)) || 0;
  let ctx = null;
  const cache = {};
  const medicion = [];

  /* ---------------- audio y relojes ---------------- */
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ latencyHint: "interactive" });
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* iOS antiguo */ }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // Instante del contexto que está sonando ahora por el parlante (descuenta la latencia de salida que informa el equipo).
  function relojOido() {
    let t = ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return Math.min(Math.max(t, ctx.currentTime - 0.5), ctx.currentTime);
  }
  function relojDeEvento(ts) {
    const ahora = performance.now();
    const edad = (typeof ts === "number" && ts > ahora - 3000 && ts <= ahora + 5) ? (ahora - ts) / 1000 : 0;
    return relojOido() - edad;
  }

  // Retardo del decodificador MP3 de este navegador: compara la «huella» del chart (volumen cada ~5 ms, hecho con ffmpeg)
  // con el audio decodificado aquí. Devuelve segundos: positivo = el audio decodificado viene atrasado.
  function retardoDecodificador(buf, h) {
    try {
      const sr = buf.sampleRate, paso = (h.paso_ms / 1000) * sr, n = h.valores.length, M = 30;
      const a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
      const env = new Float32Array(n + 2 * M);
      for (let k = 0; k < n + 2 * M; k++) {
        const ini = Math.round((h.inicio_ms / 1000) * sr + (k - M) * paso), fin = Math.round(ini + paso);
        let s = 0;
        for (let i = Math.max(0, ini); i < Math.min(a.length, fin); i++) { const v = (a[i] + b[i]) * 0.5; s += v * v; }
        env[k] = Math.sqrt(Math.sqrt(s / paso));
      }
      const ref = h.valores; let mr = 0; for (let i = 0; i < n; i++) mr += ref[i]; mr /= n;
      const corr = new Float32Array(2 * M + 1); let mejor = -2, lag = 0;
      for (let L = -M; L <= M; L++) {
        let me = 0; for (let i = 0; i < n; i++) me += env[i + M + L]; me /= n;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < n; i++) { const x = ref[i] - mr, y = env[i + M + L] - me; sxy += x * y; sxx += x * x; syy += y * y; }
        const c = sxy / Math.sqrt(sxx * syy + 1e-12); corr[L + M] = c;
        if (c > mejor) { mejor = c; lag = L; }
      }
      let fino = lag;
      if (lag > -M && lag < M) {
        const y0 = corr[lag + M - 1], y1 = corr[lag + M], y2 = corr[lag + M + 1], d = y0 - 2 * y1 + y2;
        if (d < 0) fino = lag + (0.5 * (y0 - y2)) / d;
      }
      if (mejor < 0.5) return { s: 0, confianza: mejor };
      return { s: (fino * h.paso_ms) / 1000, confianza: mejor };
    } catch (e) { return { s: 0, confianza: 0 }; }
  }

  async function cargar(c) {
    if (cache[c.id]) return cache[c.id];
    const [chart, datos] = await Promise.all([
      fetch(c.chart).then((r) => { if (!r.ok) throw new Error("chart " + r.status); return r.json(); }),
      fetch(c.audio).then((r) => { if (!r.ok) throw new Error("audio " + r.status); return r.arrayBuffer(); })
    ]);
    const buffer = await new Promise((ok, mal) => { const p = ctx.decodeAudioData(datos, ok, mal); if (p && p.then) p.then(ok, mal); });
    const retardo = retardoDecodificador(buffer, chart.huella);
    cache[c.id] = { chart, buffer, retardo };
    return cache[c.id];
  }

  /* ---------------- pantallas ---------------- */
  function mostrar(id) {
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.toggle("activa", p.id === id));
    document.body.classList.toggle("jugando", id === "juego" || id === "pausa");
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  function franjas() {   // franja de marcas y enlaces de compra (comun.js: sin Pilsener en la versión colegios)
    window.Pets.enlacesEntradas();
    document.querySelectorAll("[data-zona]").forEach((a) => { a.href = window.Pets.volverZona(); });
  }

  function pintarInicio() {
    const dias = { sabado: "Sábado 12 de diciembre", domingo: "Domingo 13 de diciembre" };
    const cont = $("#dias"); cont.innerHTML = ""; cont.className = "dias-fila";
    for (const d of ["sabado", "domingo"]) {
      const lista = manifiesto.canciones.filter((c) => c.dia === d);
      const sec = document.createElement("section"); sec.className = "dia";
      sec.innerHTML = `<h2><span>${d === "sabado" ? "Sábado" : "Domingo"}</span>${dias[d].replace(/^\S+ /, "")}</h2><div class="dia-grilla"></div>`;
      const g = sec.querySelector(".dia-grilla");
      for (const c of lista) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "artista"; b.dataset.id = c.id;
        b.setAttribute("aria-label", `Jugar con ${c.artista}: ${c.cancion}`);
        b.innerHTML = `<img src="${c.imagen}" alt="" width="720" height="529">` +
          `<span class="info"><span class="tema">${c.cancion}</span><span class="meta">${c.artista} · ${mmss(c.duracion_s)}</span><span class="jugar">Jugar</span></span>`;
        b.addEventListener("click", () => elegir(c));
        g.appendChild(b);
      }
      cont.appendChild(sec);
    }
    document.querySelectorAll(".segmento button").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.dif === dificultad));
      b.onclick = () => { dificultad = b.dataset.dif; guardar("dificultad", dificultad); pintarInicio(); };
    });
  }

  /* ---------------- estado del juego ---------------- */
  const J = { estado: "inicio" };
  let G = null;           // geometría
  const lienzo = $("#lienzo"); const c2 = lienzo.getContext("2d");
  const sena = new Image(); sena.src = "../assets/sena.png";

  async function elegir(c) {
    audio();
    mostrar("carga"); $("#carga-texto").textContent = `Cargando «${c.cancion}»…`;
    try {
      await Promise.all([cargar(c), document.fonts ? document.fonts.load("800 40px Bricolage") : null]);
    } catch (e) {
      $("#carga-texto").textContent = "No se pudo cargar la canción. Revisa la conexión y vuelve a intentar.";
      setTimeout(() => mostrar("inicio"), 2600);
      return;
    }
    empezar(c);
  }

  function empezar(c) {
    const { chart, buffer, retardo } = cache[c.id];
    const notas = chart.dificultades[dificultad].notas.map((n, i) => ({ t: n.timestamp_ms / 1000, lane: n.lane, estado: 0, i }));
    Object.assign(J, {
      estado: "jugando", cancion: c, chart, notas, idx: 0, retardo: retardo.s, confRetardo: retardo.confianza,
      carriles: [0, 1, 2, 3].map((l) => notas.filter((n) => n.lane === l)), ptr: [0, 0, 0, 0],
      puntos: 0, combo: 0, comboMax: 0, mult: 1, conteo: { perfecto: 0, bien: 0, casi: 0, fallo: 0 }, errores: [],
      efectos: [], texto: null, presionado: [0, 0, 0, 0], punteros: new Map(), duracion: chart.duracion_ms / 1000,
      periodo: 60 / chart.bpm, primerPulso: chart.primer_pulso_ms / 1000, caida: CFG.caida[dificultad] || 1.5,
      tVisual: -ESPERA, ultimoPerf: performance.now(), cuentaMostrada: null, terminado: false
    });
    $("#hud-artista").textContent = c.artista; $("#hud-cancion").textContent = c.cancion; $("#hud-puntos").textContent = "0";
    $("#lado-img").src = c.imagen; $("#lado-artista").textContent = c.artista; $("#lado-cancion").textContent = c.cancion;
    $("#lado-dia").textContent = c.dia === "sabado" ? "Sábado 12 de diciembre" : "Domingo 13 de diciembre";
    mostrar("juego"); medir();
    const fuente = ctx.createBufferSource(); fuente.buffer = buffer;
    const vol = ctx.createGain(); vol.gain.value = 1;
    fuente.connect(vol); vol.connect(ctx.destination);
    if (MEDIR) conectarMedidor(fuente);
    J.inicio = ctx.currentTime + ESPERA;
    fuente.start(J.inicio);
    J.fuente = fuente;
    $("#ayuda").classList.add("ver");
    requestAnimationFrame(cuadro);
  }

  const tiempo = (reloj) => reloj - J.inicio - J.retardo - ajusteMs / 1000;

  function cuadro(ahora) {
    if (J.estado !== "jugando") return;
    const tAudio = tiempo(relojOido());
    const dt = Math.min(0.1, (ahora - J.ultimoPerf) / 1000); J.ultimoPerf = ahora;
    J.tVisual += dt;
    if (PRUEBA || DEMO) (J.dts = J.dts || []).push(dt);
    const dif = tAudio - J.tVisual;
    if (Math.abs(dif) > 0.05 || !isFinite(J.tVisual)) J.tVisual = tAudio; else J.tVisual += dif * 0.15;

    if (DEMO) robot(tAudio);
    // notas que pasaron sin tocarse
    while (J.idx < J.notas.length && (J.notas[J.idx].estado || J.notas[J.idx].t < tAudio - W.casi - GRACIA_FALLO)) {
      const n = J.notas[J.idx];
      if (!n.estado) fallo(n);
      J.idx++;
    }
    cuentaRegresiva(tAudio);
    $("#barra").style.width = `${Math.max(0, Math.min(100, (tAudio / J.duracion) * 100))}%`;
    dibujar(J.tVisual, ahora);
    if (tAudio > J.duracion + 0.3 && !J.terminado) { terminar(); return; }
    requestAnimationFrame(cuadro);
  }

  function cuentaRegresiva(t) {
    const el = $("#cuenta");
    let txt = "";
    if (t < -ESPERA + 0.25) txt = ""; else if (t < -1.6) txt = "3"; else if (t < -0.8) txt = "2"; else if (t < 0) txt = "1"; else if (t < 0.5) txt = "¡Ya!";
    if (txt !== J.cuentaMostrada) {
      J.cuentaMostrada = txt; el.textContent = txt; el.classList.remove("pop"); void el.offsetWidth; if (txt) el.classList.add("pop");
    }
    if (t > 4) $("#ayuda").classList.remove("ver");
  }

  function multiplicador() { return Math.min(4, 1 + Math.floor(J.combo / 10)); }

  function golpear(lane, t) {
    const lista = J.carriles[lane];
    let k = J.ptr[lane];
    while (k < lista.length && lista[k].estado) k++;
    J.ptr[lane] = k;
    let mejor = null, dmin = 1e9, cercana = false;
    for (let i = k; i < lista.length; i++) {
      const n = lista[i]; if (n.estado) continue;
      const d = t - n.t;
      if (d < -GRACIA_VACIO) break;
      const ad = Math.abs(d);
      if (ad <= GRACIA_VACIO) cercana = true;
      if (ad <= W.casi && ad < dmin) { dmin = ad; mejor = n; }
    }
    if (!mejor) {
      if (!cercana && J.combo > 0) { J.combo = 0; J.mult = 1; }
      return null;
    }
    mejor.estado = 1; mejor.error = t - mejor.t;
    const tipo = dmin <= W.perfecto ? "perfecto" : dmin <= W.bien ? "bien" : "casi";
    J.conteo[tipo]++; J.combo++; J.comboMax = Math.max(J.comboMax, J.combo);
    const m = multiplicador();
    if (m > J.mult) J.yapa = { texto: `¡LA YAPA ×${m}!`, t0: performance.now() };
    J.mult = m;
    J.puntos += PUNTOS[tipo] * m;
    J.errores.push(Math.round(mejor.error * 1000));
    $("#hud-puntos").textContent = J.puntos.toLocaleString("es-EC");
    J.texto = { tipo, t0: performance.now() };
    explosion(lane, tipo);
    return { tipo, error_ms: Math.round(mejor.error * 1000) };
  }

  function fallo(n) {
    n.estado = 2; J.conteo.fallo++; J.combo = 0; J.mult = 1;
    J.texto = { tipo: "fallo", t0: performance.now() };
  }

  function robot(t) {   // modo demostración: toca cada nota en su instante exacto
    for (let l = 0; l < 4; l++) {
      const lista = J.carriles[l];
      let k = J.ptr[l];
      while (k < lista.length && lista[k].estado) k++;
      if (k < lista.length && lista[k].t <= t) { golpear(l, lista[k].t); J.presionado[l] = performance.now() + 90; }
    }
  }

  function presionar(lane, reloj) {
    J.presionado[lane] = Infinity;
    return golpear(lane, tiempo(reloj));
  }
  function soltar(lane) { J.presionado[lane] = performance.now() + 60; }

  /* ---------------- dibujo ---------------- */
  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr);
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ancho = Math.min(w * 0.94, h * 0.62, 560);
    const x0 = (w - ancho) / 2, lw = ancho / 4;
    const hud = 70 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--seguro-arriba")) || 0);
    G = { w, h, dpr, ancho, x0, lw, yTop: hud + 34, yHit: h * (h > w ? 0.8 : 0.83), r: Math.min(lw * 0.34, 46) };
    pintarFondo();
  }

  // Lo que no cambia entre cuadros (fondo, pista, separadores, línea de acierto, cordel de la guirnalda) se pinta una vez.
  const fondo = document.createElement("canvas"); const cf = fondo.getContext("2d");
  let haces = [];
  function pintarFondo() {
    const { w, h, dpr, x0, ancho, lw, yTop, yHit } = G;
    fondo.width = lienzo.width; fondo.height = lienzo.height; cf.setTransform(dpr, 0, 0, dpr, 0, 0);
    cf.fillStyle = "#231A15"; cf.fillRect(0, 0, w, h);
    const yLuz = yTop - 18;
    cf.strokeStyle = "rgba(255,244,224,.35)"; cf.lineWidth = 1.5; cf.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = yLuz + Math.sin((x / w) * Math.PI * 6) * 4; x === 0 ? cf.moveTo(x, y) : cf.lineTo(x, y); }
    cf.stroke();
    const grad = cf.createLinearGradient(0, yTop, 0, h);
    grad.addColorStop(0, "rgba(46,35,28,0)"); grad.addColorStop(0.18, "rgba(46,35,28,1)"); grad.addColorStop(1, "rgba(46,35,28,1)");
    cf.fillStyle = grad; cf.fillRect(x0, yTop, ancho, h - yTop);
    for (let l = 1; l < 4; l++) { cf.fillStyle = "rgba(255,244,224,.08)"; cf.fillRect(x0 + lw * l - 1, yTop, 2, h - yTop); }
    cf.fillStyle = "rgba(255,244,224,.22)"; cf.fillRect(x0, yHit - 1.5, ancho, 3);
    haces = COLOR.map((col) => {
      const g2 = c2.createLinearGradient(0, yHit, 0, yTop + (yHit - yTop) * 0.25);
      g2.addColorStop(0, col + "44"); g2.addColorStop(1, col + "00"); return g2;
    });
  }
  window.addEventListener("resize", () => { if (J.estado === "jugando" || J.estado === "pausa") medir(); });

  function xCarril(l) { return G.x0 + G.lw * (l + 0.5); }
  function carrilDeX(x) { return Math.max(0, Math.min(3, Math.floor((x - G.x0) / G.lw))); }

  function explosion(l, tipo) {
    const x = xCarril(l), y = G.yHit, n = tipo === "perfecto" ? 12 : 7;
    J.efectos.push({ anillo: true, x, y, t0: performance.now(), color: COLOR[l] });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 220;
      J.efectos.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t0: performance.now(), color: COLOR[(l + i) % 4], tam: 3 + Math.random() * 4 });
    }
  }

  function pulso(t) {   // 1 en el pulso, baja hasta el siguiente
    const f = ((t - J.primerPulso) / J.periodo) % 1;
    return t < J.primerPulso - 0.05 ? 0 : 1 - (f < 0 ? f + 1 : f);
  }

  function dibujar(t, ahora) {
    const { w, h, x0, ancho, lw, yTop, yHit, r } = G;
    c2.globalAlpha = 1;   // el fondo siempre opaco: si quedara una transparencia del cuadro anterior, las notas dejarían estela
    c2.drawImage(fondo, 0, 0, w, h);
    const p = pulso(t);
    // bombillos de la guirnalda (Navidad sutil) que laten con el pulso
    const yLuz = yTop - 18;
    for (let i = 0, nL = Math.max(8, Math.round(w / 46)); i <= nL; i++) {
      const x = (i / nL) * w, y = yLuz + Math.sin((x / w) * Math.PI * 6) * 4 + 5;
      c2.globalAlpha = i % 2 ? 0.45 + 0.55 * p : 0.95 - 0.5 * p;
      c2.fillStyle = i % 2 ? "#F2B33D" : "#FFF4E0"; c2.beginPath(); c2.arc(x, y, 3.2, 0, Math.PI * 2); c2.fill();
    }
    c2.globalAlpha = 1;
    for (let l = 0; l < 4; l++) if (J.presionado[l] > ahora) { c2.fillStyle = haces[l]; c2.fillRect(x0 + lw * l + 2, yTop, lw - 4, yHit - yTop); }

    // receptores
    for (let l = 0; l < 4; l++) {
      const x = xCarril(l), pr = J.presionado[l] > ahora;
      c2.beginPath(); c2.arc(x, yHit, r * (pr ? 0.92 : 1), 0, Math.PI * 2);
      c2.fillStyle = pr ? COLOR[l] : "rgba(35,26,21,.9)"; c2.fill();
      c2.lineWidth = 4; c2.strokeStyle = COLOR[l]; c2.stroke();
      if (!("ontouchstart" in window) || KIOSCO) {
        c2.fillStyle = pr ? "#231A15" : "rgba(255,244,224,.55)"; c2.font = `800 ${Math.round(r * 0.55)}px Figtree, sans-serif`;
        c2.textAlign = "center"; c2.textBaseline = "middle"; c2.fillText(ROTULO_TECLA[l], x, yHit + 1);
      }
    }

    const recorrido = yHit - yTop;
    // combo y la yapa (detrás de las notas)
    c2.textAlign = "center"; c2.textBaseline = "middle";
    if (J.combo >= 5) {
      const yC = yTop + recorrido * 0.32;
      c2.globalAlpha = 0.5; c2.fillStyle = "#FFF4E0"; c2.font = `800 ${Math.round(Math.min(lw * 1.05, 92))}px Bricolage, sans-serif`;
      c2.fillText(String(J.combo), w / 2, yC);
      c2.globalAlpha = 0.45; c2.font = `800 ${Math.round(Math.min(lw * 0.24, 18))}px Figtree, sans-serif`;
      c2.fillText(J.mult > 1 ? `COMBO · PUNTOS ×${J.mult}` : "COMBO", w / 2, yC + Math.min(lw * 0.7, 60));
    }
    if (J.yapa) {
      const s = (ahora - J.yapa.t0) / 1000;
      if (s < 1.1) {
        c2.globalAlpha = s < 0.8 ? 1 : 1 - (s - 0.8) / 0.3;
        c2.font = `800 ${Math.round(Math.min(lw * 0.5, 40))}px Bricolage, sans-serif`;
        c2.lineWidth = 6; c2.strokeStyle = "#231A15"; const yY = yTop + recorrido * 0.14 - s * 20;
        c2.strokeText(J.yapa.texto, w / 2, yY); c2.fillStyle = "#F2B33D"; c2.fillText(J.yapa.texto, w / 2, yY);
      } else J.yapa = null;
    }
    c2.globalAlpha = 1;
    // notas visibles
    for (let i = J.idx; i < J.notas.length; i++) {
      const n = J.notas[i];
      const dtn = n.t - t;
      if (dtn > J.caida + 0.05) break;
      if (n.estado === 1) continue;
      const y = yHit - (dtn / J.caida) * recorrido;
      if (y < yTop - r) continue;
      const x = xCarril(n.lane);
      c2.globalAlpha = n.estado === 2 ? 0.35 : Math.min(1, (y - yTop + r) / (r * 3));
      c2.beginPath(); c2.arc(x, y, r * 0.86, 0, Math.PI * 2); c2.fillStyle = BORDE[n.lane]; c2.fill();
      c2.beginPath(); c2.arc(x, y - 2, r * 0.74, 0, Math.PI * 2); c2.fillStyle = COLOR[n.lane]; c2.fill();
      c2.beginPath(); c2.arc(x - r * 0.25, y - r * 0.3, r * 0.16, 0, Math.PI * 2); c2.fillStyle = "rgba(255,255,255,.55)"; c2.fill();
    }
    c2.globalAlpha = 1;

    // efectos
    const vivos = [];
    for (const e of J.efectos) {
      const s = (ahora - e.t0) / 1000;
      if (e.anillo) {
        if (s > 0.35) continue;
        c2.globalAlpha = 1 - s / 0.35; c2.strokeStyle = e.color; c2.lineWidth = 5;
        c2.beginPath(); c2.arc(e.x, e.y, r * (1 + s * 2.4), 0, Math.PI * 2); c2.stroke();
      } else {
        if (s > 0.6) continue;
        c2.globalAlpha = 1 - s / 0.6; c2.fillStyle = e.color;
        c2.fillRect(e.x + e.vx * s - e.tam / 2, e.y + e.vy * s + 420 * s * s - e.tam / 2, e.tam, e.tam);
      }
      vivos.push(e);
    }
    J.efectos = vivos; c2.globalAlpha = 1;

    // texto de acierto
    c2.textAlign = "center"; c2.textBaseline = "middle";
    if (J.texto) {
      const s = (ahora - J.texto.t0) / 1000;
      if (s < 0.5) {
        const esc = s < 0.08 ? 1.25 - s * 3 : 1;
        c2.globalAlpha = s < 0.35 ? 1 : 1 - (s - 0.35) / 0.15;
        c2.font = `800 ${Math.round(Math.min(lw * 0.62, 44) * esc)}px Bricolage, sans-serif`;
        c2.lineWidth = 6; c2.strokeStyle = "#231A15"; c2.strokeText(TEXTO[J.texto.tipo], w / 2, yHit - r * 2.4);
        c2.fillStyle = TEXTO_COLOR[J.texto.tipo]; c2.fillText(TEXTO[J.texto.tipo], w / 2, yHit - r * 2.4);
      }
    }
    c2.globalAlpha = 1;
    // la seña salta con el pulso, sobre la guirnalda (no tapa las notas)
    if (sena.complete && sena.naturalWidth) {
      const tam = Math.min(40, lw * 0.5), salto = p * 6;
      c2.drawImage(sena, w / 2 - tam / 2, yTop - 18 - tam / 2 - salto, tam, tam);
    }
  }

  /* ---------------- fin y resultado ---------------- */
  function detenerFuente() { try { J.fuente && J.fuente.stop(); } catch (e) { /* ya detenida */ } J.fuente = null; }

  function terminar() {
    J.terminado = true; J.estado = "resultado"; detenerFuente();
    const n = J.notas.length || 1, cn = J.conteo;
    const precision = (cn.perfecto * PESO.perfecto + cn.bien * PESO.bien + cn.casi * PESO.casi) / n;
    const estrellas = precision >= 0.9 ? 3 : precision >= 0.75 ? 2 : precision >= 0.55 ? 1 : 0;
    const titulo = ["¡Sigue practicando!", "¡Buen ritmo!", "¡Qué nivel!", "¡Estrella de la Yapa!"][estrellas];
    J.resultado = { precision, estrellas, puntos: J.puntos, comboMax: J.comboMax, conteo: { ...cn } };
    $("#res-tema").textContent = `${J.cancion.artista} · ${J.cancion.cancion} · ${dificultad === "facil" ? "Fácil" : "Normal"}`;
    $("#t-resultado").textContent = titulo;
    $("#res-puntos").textContent = J.puntos.toLocaleString("es-EC");
    $("#res-precision").textContent = `${Math.round(precision * 100)} %`;
    $("#res-combo").textContent = J.comboMax;
    $("#res-perfectos").textContent = cn.perfecto; $("#res-bien").textContent = cn.bien;
    $("#res-casi").textContent = cn.casi; $("#res-fallos").textContent = cn.fallo;
    const estrella = (on, i) => `<svg viewBox="0 0 24 24" class="${on ? "encendida" : "apagada"}" style="animation-delay:${i * 0.15}s"><path fill="#F2B33D" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3 6.1 20.5l1.3-6.5L2.5 9.4l6.6-.8z"/></svg>`;
    $("#estrellas").innerHTML = [0, 1, 2].map((i) => estrella(i < estrellas, i)).join("");
    const reg = window.Pets.registrar("ritmo", J.puntos);
    $("#res-record").hidden = !reg.nuevoRecord;
    J.resultado.registro = reg;
    mostrar("resultado");
    // premio: sticker holográfico de La Feria según la precisión (sticker.js)
    const S = window.PetsSticker;
    J.resultado.nivel = S.nivelDe("ritmo", Math.round(precision * 100));
    S.montar($("#premio"), { juego: "ritmo", nivel: J.resultado.nivel, puntos: J.puntos, precision });
    // en el teléfono el premio queda más abajo: aviso arriba que lleva hasta él
    const rp = $("#res-premio"); rp.textContent = `Ganaste el sticker «${window.PetsSticker.NIVELES[J.resultado.nivel].nombre}» ↓`; rp.hidden = false;
    rp.onclick = (e) => { e.preventDefault(); $("#premio").scrollIntoView({ behavior: "smooth", block: "start" }); };
    if (window.Pets.activacion && reg.puesto && !DEMO) {
      window.Pets.pedirIniciales(reg.puesto, J.puntos).then((ini) => { if (ini) window.Pets.agregarTop("ritmo", ini, J.puntos); });
    }
    if (KIOSCO) {
      clearTimeout(J.temporizador);
      J.temporizador = setTimeout(() => {
        if (J.estado !== "resultado" || document.querySelector(".pets-modal")) return;
        if (window.Pets.activacion) location.href = window.Pets.volverZona(); else volverInicio();
      }, CFG.segundosKioscoResultado * 1000);
    }
  }

  function volverInicio() { clearTimeout(J.temporizador); detenerFuente(); J.estado = "inicio"; mostrar("inicio"); }

  function pausar() {
    if (J.estado !== "jugando") return;
    J.estado = "pausa"; ctx.suspend(); mostrar("pausa");
  }
  function seguir() {
    if (J.estado !== "pausa") return;
    ctx.resume().then(() => {
      J.estado = "jugando"; mostrar("juego"); medir();
      J.ultimoPerf = performance.now(); J.tVisual = tiempo(relojOido());
      requestAnimationFrame(cuadro);
    });
  }

  /* ---------------- entrada ---------------- */
  lienzo.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (J.estado !== "jugando") return;
    const l = carrilDeX(e.clientX);
    J.punteros.set(e.pointerId, l);
    const r = presionar(l, relojDeEvento(e.timeStamp));
    if (PRUEBA) (window.__toques = window.__toques || []).push({ carril: l, r, t: tiempo(relojDeEvento(e.timeStamp)) });
  }, { passive: false });
  const fin = (e) => { const l = J.punteros && J.punteros.get(e.pointerId); if (l !== undefined) { soltar(l); J.punteros.delete(e.pointerId); } };
  lienzo.addEventListener("pointerup", fin); lienzo.addEventListener("pointercancel", fin); lienzo.addEventListener("pointerleave", fin);
  lienzo.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    if (J.estado === "jugando" && e.code in TECLAS) { e.preventDefault(); if (!e.repeat) presionar(TECLAS[e.code], relojDeEvento(e.timeStamp)); }
    else if ((e.code === "Escape" || e.code === "Space") && J.estado === "jugando") { e.preventDefault(); pausar(); }
    else if ((e.code === "Escape" || e.code === "Space") && J.estado === "pausa") { e.preventDefault(); seguir(); }
  });
  window.addEventListener("keyup", (e) => { if (e.code in TECLAS && J.estado === "jugando") soltar(TECLAS[e.code]); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausar(); });

  $("#boton-pausa").addEventListener("click", pausar);
  $("#seguir").addEventListener("click", seguir);
  $("#salir").addEventListener("click", () => { if (ctx) ctx.resume(); volverInicio(); });
  $("#otra-vez").addEventListener("click", () => { clearTimeout(J.temporizador); audio(); empezar(J.cancion); });
  $("#volver").addEventListener("click", volverInicio);

  /* ---------------- calibración ---------------- */
  let calib = null;
  function mostrarAjuste() { $("#ajuste").value = ajusteMs; $("#ajuste-valor").textContent = `${ajusteMs > 0 ? "+" : ""}${ajusteMs} ms`; }
  function clic(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 1320; g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.09);
  }
  function calibrar() {
    audio();
    const p = 0.6, n = 12, t0 = ctx.currentTime + 1.0;
    calib = { clics: [], toques: [], fin: t0 + n * p + 0.4 };
    for (let i = 0; i < n; i++) { clic(t0 + i * p); calib.clics.push(t0 + i * p); }
    $("#metro-texto").textContent = "Toca con el golpe";
    $("#calib-resultado").textContent = "";
    const anim = () => {
      if (!calib) return;
      const t = relojOido();
      const cerca = calib.clics.some((c) => t >= c && t < c + 0.09);
      $("#metronomo").classList.toggle("golpe", cerca);
      if (t > calib.fin) return terminarCalibracion();
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }
  function terminarCalibracion() {
    const d = [];
    for (const tq of calib.toques) {
      let mejor = null;
      calib.clics.forEach((c, i) => { if (i >= 2 && Math.abs(tq - c) < 0.3 && (mejor === null || Math.abs(tq - c) < Math.abs(mejor))) mejor = tq - c; });
      if (mejor !== null) d.push(mejor);
    }
    $("#metronomo").classList.remove("golpe"); $("#metro-texto").textContent = "Otra vez";
    if (d.length < 5) { $("#calib-resultado").textContent = "Faltaron toques. Inténtalo otra vez, tocando con cada golpe."; calib = null; return; }
    d.sort((a, b) => a - b);
    ajusteMs = Math.round((d[Math.floor(d.length / 2)] * 1000) / 5) * 5;
    guardar("ajuste_ms", ajusteMs); mostrarAjuste();
    $("#calib-resultado").textContent = ajusteMs === 0 ? "¡Perfecto! El ritmo está bien." : `Listo: ajustamos ${Math.abs(ajusteMs)} ms.`;
    calib = null;
  }
  $("#metronomo").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!calib) { calibrar(); return; }
    calib.toques.push(relojDeEvento(e.timeStamp));
  });
  $("#ajuste").addEventListener("input", (e) => { ajusteMs = Number(e.target.value); guardar("ajuste_ms", ajusteMs); mostrarAjuste(); });
  $("#abrir-calibrar").addEventListener("click", () => { mostrarAjuste(); mostrar("calibrar"); });
  $("#cerrar-calibrar").addEventListener("click", () => { calib = null; mostrar("inicio"); });

  /* ---------------- medición (pruebas) ---------------- */
  function conectarMedidor(fuente) {
    const codigo = `class M extends AudioWorkletProcessor{constructor(){super();this.b=[]}process(i){const x=i[0]&&i[0][0];if(x){let s=0;for(let k=0;k<x.length;k++)s+=x[k]*x[k];this.b.push(currentTime,Math.sqrt(s/x.length));if(this.b.length>=256){this.port.postMessage(this.b);this.b=[]}}return true}}registerProcessor('medidor',M)`;
    const url = URL.createObjectURL(new Blob([codigo], { type: "application/javascript" }));
    ctx.audioWorklet.addModule(url).then(() => {
      const nodo = new AudioWorkletNode(ctx, "medidor");
      nodo.port.onmessage = (m) => { for (let k = 0; k < m.data.length; k += 2) medicion.push(m.data[k], m.data[k + 1]); };
      const mudo = ctx.createGain(); mudo.gain.value = 0;
      fuente.connect(nodo); nodo.connect(mudo); mudo.connect(ctx.destination);
    });
  }

  /* ---------------- arranque ---------------- */
  if (KIOSCO) {
    document.body.classList.add("kiosco");
    const pedir = () => {
      try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* sin pantalla completa */ }
      try { if (navigator.wakeLock) navigator.wakeLock.request("screen").catch(() => {}); } catch (e) { /* sin bloqueo de pantalla */ }
    };
    document.addEventListener("pointerdown", pedir);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  if (PRUEBA || MEDIR || DEMO) {
    window.__juego = {
      J, cache, medicion, get G() { return G; }, xCarril: (l) => xCarril(l),
      tiempo: () => (ctx && J.inicio ? tiempo(relojOido()) : null),
      reloj: () => ({ ctx: ctx ? ctx.currentTime : null, oido: ctx ? relojOido() : null, perf: performance.now(), inicio: J.inicio, retardo: J.retardo, ajuste_ms: ajusteMs, sr: ctx ? ctx.sampleRate : null }),
      elegirPorId: (id) => elegir(manifiesto.canciones.find((c) => c.id === id)),
      estado: () => J.estado, resultado: () => J.resultado, calib: () => calib, ajuste: () => ajusteMs
    };
  }

  fetch("canciones.json").then((r) => r.json()).then((m) => {
    manifiesto = m; franjas(); pintarInicio(); mostrarAjuste();
    if (DEMO && Q.get("cancion")) {
      const c = m.canciones.find((x) => x.id === Q.get("cancion"));
      if (c) elegir(c);
    }
  }).catch(() => { $("#dias").innerHTML = '<p class="bajada">No se pudo cargar la lista de canciones.</p>'; });

  // sin conexión solo en kiosco y pantalla grande: en los teléfonos no se precargan los 7 MB de la zona
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && KIOSCO && !PRUEBA && !MEDIR && !DEMO) {
    navigator.serviceWorker.register("../sw.js").catch(() => { /* sin modo sin conexión */ });
  }
})();
