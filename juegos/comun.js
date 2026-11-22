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
    return t && t.dia === hoy() ? t.lista : [];
  }
  function registrar(juego, puntos) {
    const antes = record(juego), nuevo = puntos > antes;
    if (nuevo) guardar(`record_${juego}`, puntos);
    const lista = top(juego);
    const puesto = lista.length < 10 || puntos > lista[lista.length - 1].puntos
      ? lista.filter((x) => x.puntos >= puntos).length + 1 : null;
    return { nuevoRecord: nuevo && puntos > 0, record: Math.max(antes, puntos), puesto: puntos > 0 ? puesto : null };
  }
  function agregarTop(juego, iniciales, puntos) {
    const lista = top(juego);
    lista.push({ ini: (iniciales || "???").toUpperCase().slice(0, 3), puntos, t: Date.now() });
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
.pets-modal .ok{background:#F2B33D;color:#231A15}.pets-modal .no{background:transparent;color:#FFF4E0;border:2px solid rgba(255,244,224,.4)}`;
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

  /* ---------- íconos planos (paleta Canelazo) para Atrapa la Yapa y la portada ---------- */
  const NS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"';
  const ICONOS = {
    empanada: `<svg ${NS}><path d="M8 64 A42 42 0 0 1 92 64 Z" fill="#F2B33D" stroke="#B4472A" stroke-width="5" stroke-linejoin="round"/><path d="M15 62 A35 35 0 0 1 85 62" fill="none" stroke="#C9852A" stroke-width="7" stroke-dasharray="1.5 9" stroke-linecap="round"/><path d="M32 44 Q40 35 51 34" stroke="#FFF4E0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/></svg>`,
    choclo: `<svg ${NS}><path d="M50 8 C68 8 72 40 66 70 C62 86 38 86 34 70 C28 40 32 8 50 8Z" fill="#F6C945" stroke="#B4472A" stroke-width="4"/><path d="M40 22h20M37 34h26M36 46h28M36 58h28M38 70h24M45 12v70M55 12v70" stroke="#D9A21E" stroke-width="3"/><path d="M34 70 C20 60 16 40 22 28 C30 52 38 62 50 94 Z" fill="#3DBE93" stroke="#1F6E53" stroke-width="3" stroke-linejoin="round"/><path d="M66 70 C80 60 84 40 78 28 C70 52 62 62 50 94 Z" fill="#3DBE93" stroke="#1F6E53" stroke-width="3" stroke-linejoin="round"/></svg>`,
    helado: `<svg ${NS}><path d="M30 48 L50 95 L70 48 Z" fill="#D9A066" stroke="#8A5A2B" stroke-width="4" stroke-linejoin="round"/><path d="M36 52l24 22M64 52l-24 22M42 70l14 0" stroke="#8A5A2B" stroke-width="2.5"/><circle cx="50" cy="40" r="22" fill="#FFF4E0" stroke="#B9A88C" stroke-width="4"/><circle cx="50" cy="21" r="13" fill="#B4472A" stroke="#6E2915" stroke-width="3"/><circle cx="43" cy="33" r="4" fill="#fff" opacity=".85"/></svg>`,
    nota: `<svg ${NS}><circle cx="50" cy="50" r="47" fill="#F2B33D" opacity=".25"/><ellipse cx="38" cy="70" rx="16" ry="11.5" transform="rotate(-20 38 70)" fill="#FFF4E0"/><rect x="49" y="17" width="7.5" height="55" rx="2" fill="#FFF4E0"/><path d="M53 17 C67 25 80 31 75 54 C72 42 64 37 53 35Z" fill="#FFF4E0"/></svg>`,
    hueso: `<svg ${NS}><g transform="rotate(-30 50 50)" fill="#FFF4E0"><rect x="26" y="42" width="48" height="16" rx="7"/><circle cx="25" cy="40" r="11.5"/><circle cx="25" cy="60" r="11.5"/><circle cx="75" cy="40" r="11.5"/><circle cx="75" cy="60" r="11.5"/></g><path d="M38 47 l24 -12" stroke="#B9A88C" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>`,
    regalo: `<svg ${NS}><circle cx="50" cy="56" r="46" fill="#F2B33D" opacity=".28"/><rect x="18" y="42" width="64" height="48" rx="6" fill="#F2B33D" stroke="#9C6A12" stroke-width="4"/><rect x="13" y="31" width="74" height="16" rx="5" fill="#F7C95C" stroke="#9C6A12" stroke-width="4"/><rect x="44" y="31" width="12" height="59" fill="#B4472A"/><path d="M50 31 C36 9 20 21 33 31 Z M50 31 C64 9 80 21 67 31 Z" fill="#B4472A" stroke="#6E2915" stroke-width="3" stroke-linejoin="round"/><path d="M85 8l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFF4E0"/><path d="M12 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FFF4E0"/></svg>`,
    aji: `<svg ${NS}><path d="M58 22 C40 28 25 52 27 77 C28 89 36 93 41 84 C49 64 61 50 73 36 C77 29 69 19 58 22Z" fill="#E0412B" stroke="#8E1F12" stroke-width="4" stroke-linejoin="round"/><path d="M60 24 C62 13 70 7 79 9 C75 13 71 18 71 27 Z" fill="#3DBE93" stroke="#1F6E53" stroke-width="3" stroke-linejoin="round"/><path d="M41 46 C37 54 35 62 36 70" stroke="#fff" stroke-width="4" opacity=".55" fill="none" stroke-linecap="round"/></svg>`
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
    origen: ORIGEN, urlEntradas, marcas, franjaHTML, enlacesEntradas, record, top, registrar, agregarTop, pedirIniciales,
    volverZona: () => BASE + (Q.has("activacion") ? "?activacion=1" : ""), icono, iconoURL, retardo
  };
})();
