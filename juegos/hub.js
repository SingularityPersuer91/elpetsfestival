/* Zona de juegos · El Pets Festival (HUECA-JUEGO-002): página de juegos y pantalla grande del colegio (?activacion=1). */
(() => {
  "use strict";
  const CFG = window.PETS_CONFIG, P = window.Pets;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // marcas (versión colegios sin Pilsener), enlaces de compra con marca de origen, íconos
  P.enlacesEntradas();
  $$("[data-icono]").forEach((e) => { e.innerHTML = P.icono(e.dataset.icono); });
  $$("[data-url-juegos]").forEach((e) => { e.textContent = CFG.urlJuegosCorta; });

  // cinta con el cartel
  const piezas = ["I.N.R.I", "EMPICCCCC", "Jammal Sánchez", "GHETTO WARRIOR", "12 Y 13 DE DICIEMBRE", "PARQUE BICENTENARIO", "ENTRADAS SOLO $5"];
  const una = piezas.map((p) => `<span>${p}</span><span class="estrella">★</span>`).join("");
  $$(".cinta-mov").forEach((c) => { c.innerHTML = una + una + una + una; });

  // récords de este equipo
  $$("[data-record]").forEach((e) => { const r = P.record(e.dataset.record); e.textContent = r ? `Tu récord: ${P.fmt(r)} puntos` : "Todavía no tienes récord: ¡estrénalo!"; });

  if (P.activacion) { activacion(); return; }

  /* ================= página ================= */
  // barra que se vuelve sólida al bajar
  const barra = $("#barra");
  const alBajar = () => barra.classList.toggle("solida", scrollY > 30);
  addEventListener("scroll", alBajar, { passive: true }); alBajar();

  // aparecer al entrar en pantalla
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$(".revela").forEach((e) => io.observe(e));

  // videos: solo corren cuando se ven (ahorra batería y datos)
  const ioV = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting && !quieto) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.25 });
  // con «reducir movimiento» los videos no corren: queda el póster
  $$("video").forEach((v) => { v.muted = true; if (quieto) { v.autoplay = false; v.removeAttribute("autoplay"); v.pause(); } ioV.observe(v); });

  // el cartel, desde la lista de canciones del juego
  fetch("ritmo/canciones.json").then((r) => r.json()).then((m) => {
    $("[data-artistas]").innerHTML = m.canciones.map((c, i) => `
      <a class="artista revela" style="transition-delay:${i * 90}ms" href="ritmo/" aria-label="Jugar Sigue el ritmo con ${c.artista}: ${c.cancion}">
        <img src="${c.imagen.replace(/^\.\.\//, "")}" width="720" height="529" loading="lazy" alt="">
        <span class="info"><span class="dia">${c.dia === "sabado" ? "Sábado 12" : "Domingo 13"}</span><strong>${c.artista}</strong><em>${c.cancion}</em></span>
      </a>`).join("");
    $$(".artistas .revela").forEach((e) => io.observe(e));
  }).catch(() => {});

  // cuenta regresiva al festival (hora de Quito)
  const caja = $("[data-cuenta]");
  const inicio = new Date("2026-12-12T09:00:00-05:00").getTime(), fin = new Date("2026-12-13T21:00:00-05:00").getTime();
  const pintar = () => {
    const ahora = Date.now();
    if (ahora >= fin) { caja.innerHTML = ""; return; }
    if (ahora >= inicio) { caja.innerHTML = '<div class="hoy">¡El festival es hoy!</div>'; return; }
    let s = Math.floor((inicio - ahora) / 1000);
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const mi = Math.floor(s / 60); s -= mi * 60;
    const u = (n, t) => `<div><b>${String(n).padStart(2, "0")}</b><span>${t}</span></div>`;
    caja.innerHTML = u(d, d === 1 ? "día" : "días") + u(h, "horas") + u(mi, "min") + u(s, "seg");
  };
  pintar(); setInterval(pintar, 1000);
  caja.setAttribute("aria-label", "Cuenta regresiva al festival");

  // fondo del héroe: cosas del juego que caen lento, con profundidad
  const lz = $(".hero-fondo"), cx = lz.getContext("2d");
  const tipos = ["empanada", "nota", "hueso", "regalo", "choclo", "helado", "nota"];
  const imgs = tipos.map((n) => { const i = new Image(); i.src = P.iconoURL(n); return i; });
  let W = 0, H = 0, piezasF = [], visible = true, ultimo = performance.now();
  const medir = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = lz.clientWidth; H = lz.clientHeight;
    lz.width = W * dpr; lz.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = quieto ? 0 : Math.round(Math.min(26, W / 50));
    piezasF = Array.from({ length: n }, (_, i) => nueva(i, true));
  };
  const nueva = (i, alAzar) => {
    const z = 0.35 + Math.random() * 0.65;
    // en pantallas anchas caen solo por la mitad derecha, para no pasar detrás del texto
    const x = W >= 980 ? W * 0.52 + Math.random() * W * 0.48 : Math.random() * W;
    return { img: imgs[i % imgs.length], x, y: alAzar ? Math.random() * H : -60, z, tam: 22 + z * 34, v: 18 + z * 46, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 1.2 };
  };
  const anim = (t) => {
    const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
    if (visible && !document.hidden) {
      cx.globalAlpha = 1; cx.clearRect(0, 0, W, H);
      piezasF.forEach((p, i) => {
        p.y += p.v * dt; p.giro += p.vg * dt;
        if (p.y > H + 60) piezasF[i] = nueva(i, false);
        cx.globalAlpha = W >= 980 ? 0.18 + p.z * 0.32 : 0.1 + p.z * 0.18;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.giro); if (p.img.complete) cx.drawImage(p.img, -p.tam / 2, -p.tam / 2, p.tam, p.tam); cx.restore();
      });
      cx.globalAlpha = 1;
    }
    requestAnimationFrame(anim);
  };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe($(".hero"));
  addEventListener("resize", medir); medir(); requestAnimationFrame(anim);

  // premios: un sticker de muestra que se inclina y los 6 niveles, dibujados al acercarse (sticker.js)
  const S = window.PetsSticker, muestra = $("[data-sticker-muestra]"), niveles = $("[data-niveles]");
  if (S && muestra && niveles) {
    S.estilos();
    muestra.insertAdjacentHTML("afterbegin", S.holoHTML("Sticker holográfico de muestra: Cucharón de Oro"));
    niveles.innerHTML = S.NIVELES.map((x, i) => `<figure class="nivel revela" style="transition-delay:${i * 70}ms">${S.holoHTML("Sticker " + x.nombre, true)}` +
      `<figcaption><b>${i + 1} · ${x.nombre}</b>${i ? `<span>Yapa: ${S.meta("yapa", i)}</span><span>Ritmo: ${S.meta("ritmo", i).replace(" de precisión", "")}</span>` : "<span>Juega una ronda</span>"}</figcaption></figure>`).join("");
    $$(".niveles .revela").forEach((e) => io.observe(e));
    S.moverHolo(muestra.querySelector(".holo"));
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      S.pintar(muestra.querySelector("canvas"), { juego: "yapa", nivel: 3, puntos: 2150 });
      $$(".niveles canvas").forEach((cv, i) => S.pintar(cv, { juego: i % 2 ? "ritmo" : "yapa", nivel: i, puntos: [380, 760, 1420, 2150, 3080, 3920][i],
        precision: [0.35, 0.48, 0.63, 0.76, 0.86, 0.96][i] }, true));   // el perrito va por nivel, igual que en el premio
    }, { rootMargin: "400px" }).observe($("#premios"));
  }

  /* ================= pantalla grande del colegio ================= */
  function activacion() {
    document.body.classList.add("activacion", "kiosco");
    const colores = ["#B4472A", "#F2B33D", "#3DBE93", "#FFF4E0"], conf = $(".confeti");
    for (let i = 0; i < (quieto ? 0 : 34); i++) {
      const e = document.createElement("i");
      e.style.left = `${Math.random() * 100}%`; e.style.background = colores[i % 4];
      e.style.animationDuration = `${6 + Math.random() * 7}s`; e.style.animationDelay = `${-Math.random() * 12}s`;
      e.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`); e.style.setProperty("--rot", `${360 + Math.random() * 720}deg`);
      if (i % 3 === 0) { e.style.width = "8px"; e.style.height = "8px"; e.style.borderRadius = "50%"; }
      conf.appendChild(e);
    }
    const pintarTop = () => $$("[data-top]").forEach((ol) => {
      const lista = P.top(ol.dataset.top).slice(0, 5);
      ol.innerHTML = lista.length ? lista.map((x) => `<li><span class="ini">${x.ini}</span><span class="pts">${P.fmt(x.puntos)}</span></li>`).join("")
        : '<li class="vacio">¡Sé el primero!</li>';
    });
    pintarTop(); setInterval(pintarTop, 5000);
    const cartas = $$(".activacion-vista .juego"); let k = 0;
    setInterval(() => { cartas.forEach((c, i) => c.classList.toggle("destacado", i === k % cartas.length)); k++; }, 2500);
    document.addEventListener("pointerdown", () => {
      try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* sin pantalla completa */ }
      try { if (navigator.wakeLock) navigator.wakeLock.request("screen").catch(() => {}); } catch (e) { /* sin bloqueo */ }
    });
    // sin conexión: solo en la pantalla grande del colegio (en los teléfonos no se precargan los 7 MB de la zona)
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !new URLSearchParams(location.search).has("prueba")) navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
