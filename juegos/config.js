/* Ajustes de la Zona de juegos de El Pets Festival (HUECA-JUEGO-002). Se cambian sin tocar el código.
   Publicada en la web oficial (elpetsfestivalquito.com/juegos/, pestaña «Juegos») y usada en la activación en colegios: sin Pilsener ni ningún motivo de alcohol (público menor de edad; el Ministerio de Educación prohíbe
   la publicidad de alcohol en los planteles). Para usarla fuera de colegios se puede volver a poner mostrarPilsener: true. */
window.PETS_CONFIG = {
  marcas: [
    { id: "clapzy", nombre: "Clapzy" },
    { id: "pilsener", nombre: "Pilsener", alcohol: true },
    { id: "meet2go", nombre: "Meet2Go", oscuro: true },   // logo amarillo: va sobre carbón, como en la web
    { id: "mediarptv", nombre: "MEDIARPTV" },
    { id: "brandlab", nombre: "BrandLab AI" }
  ],
  mostrarPilsener: false,
  avisoAlcohol: "Prohibida la venta de alcohol a menores de edad. Consume con moderación.",
  // Compra de entradas con marca de origen: en Meet2Go se ve cuántas visitas y compras llegan desde la activación en colegios
  // (urlEntradas, también en el QR de la pantalla grande) y desde la pestaña Juegos de la web o el reto por WhatsApp (urlEntradasWeb:
  // comun.js cambia utm_source por el origen de la visita).
  urlEntradas: "https://www.meet2go.com/ev/elpetsfestivaluio?utm_source=colegios&utm_medium=juegos&utm_campaign=activacion_colegios",
  urlEntradasWeb: "https://www.meet2go.com/ev/elpetsfestivaluio?utm_source=web&utm_medium=juegos&utm_campaign=zona_juegos",
  // Dirección pública de la zona de juegos (el QR de «escanea y juega» de la pantalla grande apunta aquí).
  urlJuegos: "https://elpetsfestivalquito.com/juegos/?utm_source=colegios&utm_medium=qr&utm_campaign=activacion_colegios",
  urlJuegosCorta: "elpetsfestivalquito.com/juegos",
  kiosco: false,
  segundosKioscoResultado: 45,
  ventanas: { perfecto: 45, bien: 90, casi: 135 },
  caida: { facil: 1.75, normal: 1.4 },
  dificultadInicial: "facil",
  yapa: { segundos: 38 }
};
