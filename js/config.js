/* Configuración de la landing (tres páginas, tres listas de interés).
   LISTAS: un Google Form por público, o uno solo con la pregunta oculta «origen». Para cada lista se completa FORM_ACTION
   (la URL que termina en /formResponse) y el identificador entry.N de cada campo marcado con data-campo en su página.
   Mientras falte FORM_ACTION o cualquier identificador, el botón de esa lista queda deshabilitado y no se envía nada.
   URL_PUBLICA: la que se imprime en el pase y se comparte. Cambiarla al tener dominio propio. */
window.PETS_CONFIG = {
  LISTAS: {
    entrada: { FORM_ACTION: "", ENTRADAS: { origen: "", nombre: "", contacto: "", dia: "", acepto: "" } },
    carpa: { FORM_ACTION: "", ENTRADAS: { origen: "", nombre: "", negocio: "", rubro: "", contacto: "", instagram: "", cocina: "", acepto: "" } },
    canino: { FORM_ACTION: "", ENTRADAS: { origen: "", nombre: "", contacto: "", momento: "", perro: "", raza: "", acepto: "" } }
  },
  ACEPTO_VALOR: "Acepto",
  URL_PUBLICA: "https://singularitypersuer91.github.io/elpetsfestival/"
};
