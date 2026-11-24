/*
 * «Apoya la causa»: datos que se rellenan a mano. Lo que esté vacío no sale en la web.
 * Después: commit y Sync, y Vercel lo publica solo.
 *
 * Las donaciones con tarjeta (Stripe) NO se configuran aquí: van con variables de entorno en Vercel
 * (ver README → «Donaciones»). Mientras no exista una entidad receptora habilitada, quedan desactivadas.
 * No pongas aquí datos de nadie sin su permiso ni cuentas que no sean de la entidad que recibe el dinero.
 */

/* Otras formas de donar, si la entidad receptora las tiene (Perú) */
export const DONAR = {
  yape: "",      // número de Yape o Plin de la entidad, p. ej. "987 654 321"
  titular: "",   // a nombre de quién está (la entidad, no una persona)
  banco: "",     // p. ej. "BCP"
  cuenta: "",    // número de cuenta de la entidad
  cci: "",       // código de cuenta interbancario
  paypal: "",    // enlace completo, p. ej. "https://paypal.me/…"
  correo: "",    // correo para empresas, donaciones grandes o de material
};

/* ONG colaboradora que gestiona fondos para Hampatu Ayllu mediante un acuerdo formal.
   Si se rellena, sale como alternativa para donar a través de ella. */
export const ONG_COLABORADORA = {
  nombre: "",    // nombre de la ONG
  enlace: "",    // su página de donaciones (https://…)
  acuerdo: "",   // una frase sobre el acuerdo, p. ej. "Gestiona los fondos del proyecto según el convenio de 2027"
};

/* Imagen de la cabecera: el sapo arlequín peruano (foto real, recortada). Cámbiala por una foto del hábitat
   cuando la tengas: ponla en public/img/ y escribe aquí su nombre. */
export const FOTO_CABECERA = {
  src: "/img/morfo-verde-v2.webp",
  es: "Sapo arlequín peruano (Atelopus peruensis), coloración verde y negra",
  en: "Peruvian harlequin toad (Atelopus peruensis), green and black colouring",
};
