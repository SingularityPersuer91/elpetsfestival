/* Piezas comunes de la Zona de juegos de El Pets Festival (HUECA-JUEGO-002): marcas, enlaces de compra, récords, mejores
   puntajes del día en este equipo e iniciales. Los premios (stickers holográficos) están en sticker.js. Sin dependencias y sin enviar datos a ningún lado. */
(() => {
  "use strict";
  const CFG = window.PETS_CONFIG;
  const Q = new URLSearchParams(location.search);
  const BASE = new URL(".", document.currentScript.src).href;   // carpeta /juegos/
  const guardar = (k, v) => { try { localStorage.setItem("pets_" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k, d) => { try { const v = localStorage.getItem("pets_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const fmt = (n) => Number(n).toLocaleString("es-EC");

  const marcas = () => CFG.marcas.filter((m) => CFG.mostrarPilsener || !m.alcohol);
  function franjaHTML() {
    const ms = marcas(), alcohol = ms.some((m) => m.alcohol);
    return `<div class="logos">${ms.map((m) => `<img src="${BASE}assets/marcas/${m.id}.webp" alt="${m.nombre}"${m.oscuro ? ' class="chip-oscuro"' : ""}>`).join("")}</div>` +
      (alcohol ? `<p class="aviso">${CFG.avisoAlcohol}</p>` : "");
  }
  /* Origen de la visita para la marca de compra: el QR del colegio trae utm_source=colegios, el reto por WhatsApp trae whatsapp y la
     pestaña Juegos de la web no trae nada (= web). Se recuerda en la pestaña del navegador mientras pasa de la portada a los juegos. */
  const ORIGEN = (() => {
    let o = (Q.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    try { if (o) sessionStorage.setItem("pets_origen", o); else o = sessionStorage.getItem("pets_origen") || ""; } catch (e) { /* sin almacenamiento */ }
    return o || (Q.has("activacion") ? "colegios" : "web");
  })();
  function urlEntradas() {
    if (ORIGEN === "colegios") return CFG.urlEntradas;
    const u = new URL(CFG.urlEntradasWeb); u.searchParams.set("utm_source", ORIGEN); return u.href;
  }
  function enlacesEntradas(raiz = document) {
    const url = urlEntradas();
    raiz.querySelectorAll("[data-entradas]").forEach((a) => { a.href = url; a.target = "_blank"; a.rel = "noopener"; });
    raiz.querySelectorAll("img[data-qr-entradas]").forEach((im) => { im.src = BASE + (ORIGEN === "colegios" ? "assets/qr_entradas.png" : "assets/qr_entradas_web.png"); });
    raiz.querySelectorAll("[data-franja]").forEach((f) => { f.innerHTML = franjaHTML(); });
  }

  /* ---------- récords y mejores del día (solo en este equipo) ---------- */
  function record(juego) { return Number(leer(`record_${juego}`, 0)) || 0; }
  function top(juego) {
    const t = leer(`top_${juego}`, null);
    if (t && t.dia !== hoy()) { try { localStorage.removeItem(`pets_top_${juego}`); } catch (e) { /* sin almacenamiento */ } return []; }   // la tabla vencida se borra
    return t ? t.lista : [];
  }
  // la pantalla grande muestra 5 puestos por juego: solo se pide nombre a quien entra en esos 5
  const PUESTOS = 5;
  // iniciales que no van en una pantalla de colegio
  const VETADAS = new Set(["PUT", "PTA", "PTO", "CUL", "MRD", "VRG", "VRN", "CAC", "FUC", "FCK", "SEX", "XXX", "KKK", "NAZ", "PIJ", "HDP", "CTM", "MMV"]);
  const limpiarIniciales = (s) => { const v = String(s || "").toUpperCase().replace(/[^A-ZÑ]/g, "").slice(0, 3); return !v || VETADAS.has(v) ? "???" : v; };
  // ?reiniciar=1 en la pantalla grande borra las tablas del día (al cambiar de colegio)
  if (Q.has("reiniciar")) ["yapa", "ritmo"].forEach((j) => { try { localStorage.removeItem(`pets_top_${j}`); } catch (e) { /* sin almacenamiento */ } });
  function registrar(juego, puntos) {
    const antes = record(juego), nuevo = puntos > antes;
    if (nuevo) guardar(`record_${juego}`, puntos);
    const lista = top(juego);
    const lugar = lista.filter((x) => x.puntos >= puntos).length + 1, puesto = lugar <= PUESTOS ? lugar : null;
    return { nuevoRecord: nuevo && puntos > 0, record: Math.max(antes, puntos), puesto: puntos > 0 ? puesto : null };
  }
  function agregarTop(juego, iniciales, puntos) {
    const lista = top(juego);
    lista.push({ ini: limpiarIniciales(iniciales), puntos, t: Date.now() });
    lista.sort((a, b) => b.puntos - a.puntos || a.t - b.t);
    guardar(`top_${juego}`, { dia: hoy(), lista: lista.slice(0, 10) });
  }

  /* ---------- iniciales (pantalla grande del colegio) ---------- */
  function estilos() {
    if (document.getElementById("pets-comun-css")) return;
    const s = document.createElement("style"); s.id = "pets-comun-css";
    s.textContent = `
.pets-modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(35,26,21,.88);backdrop-filter:blur(4px);padding:16px}
.pets-modal .caja{background:#2E231C;border:3px solid #F2B33D;border-radius:24px;padding:22px 18px;width:min(100%,420px);text-align:center;color:#FFF4E0;box-shadow:0 0 0 6px rgba(242,179,61,.18),0 20px 50px rgba(0,0,0,.5)}
.pets-modal h2{font-family:Bricolage,Figtree,sans-serif;font-weight:800;font-size:1.9rem;margin:0 0 4px;color:#F2B33D}
.pets-modal p{margin:0 0 14px;color:rgba(255,244,224,.75)}
.pets-modal input{font:800 2.6rem Bricolage,Figtree,sans-serif;letter-spacing:.35em;text-transform:uppercase;text-align:center;width:100%;padding:10px 0 10px .35em;border-radius:16px;border:3px solid #3B2D24;background:#231A15;color:#FFF4E0}
.pets-modal input:focus{outline:none;border-color:#F2B33D}
.pets-modal .fila{display:flex;gap:10px;margin-top:14px}
.pets-modal button{flex:1;min-height:52px;border-radius:999px;border:0;font:800 1.05rem Figtree,sans-serif;cursor:pointer}
.pets-modal .ok{background:#F2B33D;color:#231A15}.pets-modal .no{background:transparent;color:#FFF4E0;border:2px solid rgba(255,244,224,.4)}
.pets-aviso-interno{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:70;display:flex;gap:10px;align-items:center;background:#F2B33D;color:#231A15;border-radius:16px;padding:12px 14px;font:700 .95rem/1.3 Figtree,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.pets-aviso-interno p{margin:0;flex:1}.pets-aviso-interno button{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:#231A15;color:#FFF4E0;font-size:1.4rem;cursor:pointer}`;
    document.head.appendChild(s);
  }
  function pedirIniciales(puesto, puntos) {
    estilos();
    return new Promise((listo) => {
      const m = document.createElement("div"); m.className = "pets-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = `<div class="caja"><h2>¡Puesto ${puesto} de hoy!</h2><p>${fmt(puntos)} puntos. Escribe tus iniciales para la tabla.</p>
        <input maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Tus iniciales (3 letras)" placeholder="ABC">
        <div class="fila"><button class="no" type="button">Saltar</button><button class="ok" type="button">Guardar</button></div></div>`;
      document.body.appendChild(m);
      const inp = m.querySelector("input");
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/[^a-zA-ZñÑ]/g, "").toUpperCase().slice(0, 3); });
      const cerrar = (v) => { m.remove(); listo(v); };
      m.querySelector(".ok").onclick = () => cerrar(inp.value || null);
      m.querySelector(".no").onclick = () => cerrar(null);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") cerrar(inp.value || null); });
      setTimeout(() => inp.focus(), 50);
      setTimeout(() => { if (document.body.contains(m)) cerrar(inp.value || null); }, 30000);   // sin uso: se cierra solo
    });
  }

  /* ---------- aviso para navegadores internos (Instagram, Facebook, WhatsApp, TikTok): ahí no se puede guardar el sticker ---------- */
  const INTERNO = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|TikTok|musical_ly|BytedanceWebview/i.test(navigator.userAgent || "");
  function avisoInterno() {
    if (!INTERNO || Q.has("activacion") || Q.has("kiosco") || CFG.kiosco || !document.body) return;
    estilos();
    const d = document.createElement("div"); d.className = "pets-aviso-interno"; d.setAttribute("role", "status");
    d.innerHTML = '<p>Para guardar tu sticker de premio, abre esta página en Safari o Chrome: menú ··· › Abrir en el navegador.</p><button type="button" aria-label="Cerrar aviso">×</button>';
    d.querySelector("button").onclick = () => d.remove();
    document.body.appendChild(d);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avisoInterno); else avisoInterno();

  /* ---------- pantalla grande: si un juego queda abierto sin uso (inicio, pausa, ajuste), vuelve sola a la zona ---------- */
  function volverSiInactivo(ocupado, segundos = 60) {
    if (!Q.has("activacion")) return;
    let tm = null;
    const armar = () => { clearTimeout(tm); tm = setTimeout(() => { if (ocupado && ocupado()) { armar(); return; } location.href = BASE + "?activacion=1"; }, segundos * 1000); };
    ["pointerdown", "keydown", "touchstart"].forEach((e) => addEventListener(e, armar, { passive: true }));
    armar();
  }

  /* ---------- íconos planos (paleta Canelazo, sin contorno, como la ilustración I2 del manual) ---------- */
  const NS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"';
  const ICONOS = {
    empanada: `<svg ${NS}><path d="M8 66 A42 42 0 0 1 92 66 Z" fill="#F2B33D"/><path d="M8 66 A42 42 0 0 1 92 66 L83 66 A33 33 0 0 0 17 66 Z" fill="#B4472A" opacity=".5"/><ellipse cx="40" cy="47" rx="11" ry="4.5" transform="rotate(-24 40 47)" fill="#FFF4E0" opacity=".75"/></svg>`,
    choclo: `<svg ${NS}><path d="M34 70 C20 60 16 40 22 28 C30 52 38 62 50 94 Z" fill="#3DBE93"/><path d="M50 8 C68 8 72 40 66 70 C62 86 38 86 34 70 C28 40 32 8 50 8Z" fill="#F2B33D"/><g fill="#B4472A" opacity=".38"><circle cx="45" cy="22" r="3.4"/><circle cx="55" cy="22" r="3.4"/><circle cx="41" cy="34" r="3.6"/><circle cx="50" cy="34" r="3.6"/><circle cx="59" cy="34" r="3.6"/><circle cx="40" cy="47" r="3.8"/><circle cx="50" cy="47" r="3.8"/><circle cx="60" cy="47" r="3.8"/><circle cx="41" cy="60" r="3.8"/><circle cx="50" cy="60" r="3.8"/><circle cx="59" cy="60" r="3.8"/><circle cx="45" cy="72" r="3.4"/><circle cx="55" cy="72" r="3.4"/></g><path d="M66 70 C80 60 84 40 78 28 C70 52 62 62 50 94 Z" fill="#3DBE93"/><path d="M66 70 C80 60 84 40 78 28 C74 48 66 62 58 80 Z" fill="#231A15" opacity=".16"/></svg>`,
    helado: `<svg ${NS}><path d="M30 48 L50 95 L70 48 Z" fill="#B4472A"/><path d="M39 52 L50 80 L61 52 Z" fill="#F2B33D" opacity=".3"/><circle cx="50" cy="40" r="22" fill="#FFF4E0"/><path d="M28 44 Q34 54 40 46 Q46 56 52 46 Q58 54 64 46 Q68 51 72 44 L72 40 L28 40 Z" fill="#F2B33D" opacity=".85"/><circle cx="50" cy="20" r="12" fill="#B4472A"/><circle cx="43" cy="32" r="4" fill="#FFF4E0" opacity=".9"/></svg>`,
    nota: `<svg ${NS}><circle cx="50" cy="50" r="47" fill="#F2B33D" opacity=".25"/><ellipse cx="38" cy="70" rx="16" ry="11.5" transform="rotate(-20 38 70)" fill="#FFF4E0"/><rect x="49" y="17" width="7.5" height="55" rx="2" fill="#FFF4E0"/><path d="M53 17 C67 25 80 31 75 54 C72 42 64 37 53 35Z" fill="#FFF4E0"/></svg>`,
    hueso: `<svg ${NS}><g transform="rotate(-30 50 50)" fill="#FFF4E0"><rect x="26" y="42" width="48" height="16" rx="7"/><circle cx="25" cy="40" r="11.5"/><circle cx="25" cy="60" r="11.5"/><circle cx="75" cy="40" r="11.5"/><circle cx="75" cy="60" r="11.5"/></g></svg>`,
    regalo: `<svg ${NS}><circle cx="50" cy="56" r="46" fill="#F2B33D" opacity=".28"/><rect x="18" y="42" width="64" height="48" rx="6" fill="#F2B33D"/><rect x="13" y="31" width="74" height="16" rx="5" fill="#F2B33D"/><rect x="13" y="44" width="74" height="4" fill="#231A15" opacity=".18"/><rect x="44" y="31" width="12" height="59" fill="#B4472A"/><path d="M50 31 C36 9 20 21 33 31 Z M50 31 C64 9 80 21 67 31 Z" fill="#B4472A"/><path d="M85 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFF4E0"/><path d="M12 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FFF4E0"/></svg>`,
    aji: `<svg ${NS}><path d="M58 22 C40 28 25 52 27 77 C28 89 36 93 41 84 C49 64 61 50 73 36 C77 29 69 19 58 22Z" fill="#B4472A"/><path d="M60 24 C62 13 70 7 79 9 C75 13 71 18 71 27 Z" fill="#3DBE93"/><path d="M41 46 C37 54 35 62 36 70 C39 62 41 56 45 48 Z" fill="#FFF4E0" opacity=".6"/></svg>`
  };
  const icono = (n) => ICONOS[n] || "";
  const iconoURL = (n) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(ICONOS[n] || "");

  /* Retardo del decodificador MP3 del navegador contra la huella del chart (mismo método que Sigue el ritmo). */
  function retardo(buf, h) {
    try {
      const sr = buf.sampleRate, paso = (h.paso_ms / 1000) * sr, n = h.valores.length, M = 30;
      const a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
      const env = new Float32Array(n + 2 * M);
      for (let k = 0; k < n + 2 * M; k++) {
        const ini = Math.round((h.inicio_ms / 1000) * sr + (k - M) * paso), fin = Math.round(ini + paso);
        let s2 = 0;
        for (let i = Math.max(0, ini); i < Math.min(a.length, fin); i++) { const v = (a[i] + b[i]) * 0.5; s2 += v * v; }
        env[k] = Math.sqrt(Math.sqrt(s2 / paso));
      }
      const ref = h.valores; let mr = 0; for (let i = 0; i < n; i++) mr += ref[i]; mr /= n;
      let mejor = -2, lag = 0;
      for (let L = -M; L <= M; L++) {
        let me = 0; for (let i = 0; i < n; i++) me += env[i + M + L]; me /= n;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < n; i++) { const x = ref[i] - mr, y = env[i + M + L] - me; sxy += x * y; sxx += x * x; syy += y * y; }
        const c = sxy / Math.sqrt(sxx * syy + 1e-12);
        if (c > mejor) { mejor = c; lag = L; }
      }
      return mejor < 0.5 ? 0 : (lag * h.paso_ms) / 1000;
    } catch (e) { return 0; }
  }

  window.Pets = {
    activacion: Q.has("activacion"), kiosco: !!CFG.kiosco || Q.has("kiosco") || Q.has("activacion"), base: BASE, fmt,
    origen: ORIGEN, interno: INTERNO, urlEntradas, volverSiInactivo, marcas, franjaHTML, enlacesEntradas, record, top, registrar, agregarTop, pedirIniciales,
    volverZona: () => BASE + (Q.has("activacion") ? "?activacion=1" : ""), icono, iconoURL, retardo
  };
})();
