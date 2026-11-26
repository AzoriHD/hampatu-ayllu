import { SIMB, SIMB_K, SIMB_VIEJOS, TONOS } from "../data/constants.js";

export const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
export const pad2 = (n) => (n < 10 ? "0" : "") + n;
export const ymd = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
export function deYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export const mayus = (t) => { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); };
export const localeOf = (lang) => (lang === "en" ? "en-GB" : "es-PE");

export const plural = (t, n, one, many) => n + " " + t(n === 1 ? one : many);

export function ago(ts, lang, t) {
  const v = Number(ts); if (!v) return "";
  const en = lang === "en", m = Math.max(0, Math.round((Date.now() - v) / 60000));
  if (m < 1) return en ? "now" : "ahora";
  if (m < 60) return en ? m + " min ago" : "hace " + m + " min";
  const h = Math.round(m / 60); if (h < 24) return en ? h + " h ago" : "hace " + h + " h";
  const d = Math.round(h / 24);
  if (d < 31) return en ? plural(t, d, "día", "días") + " ago" : "hace " + plural(t, d, "día", "días");
  return new Date(v).toLocaleDateString(en ? "en-GB" : "es", { day: "numeric", month: "short", year: "numeric" });
}

export function cuandoTexto(fecha, hora, lang) {
  const d = deYmd(fecha); if (!d) return "";
  return mayus(d.toLocaleDateString(localeOf(lang), { weekday: "long", day: "numeric", month: "long" })) + (hora ? " · " + hora : "");
}

/* Peruvian 9-digit mobiles get the 51 country code for WhatsApp links. */
export function waNumero(txt) {
  const m = String(txt || "").match(/\+?\d[\d\s().-]{6,}\d/); if (!m) return "";
  let d = m[0].replace(/\D/g, "");
  if (d.length === 9 && d.charAt(0) === "9") d = "51" + d;
  return d.length >= 10 && d.length <= 15 ? d : "";
}
export function waEnlace(contacto, texto, ejemplo) {
  const n = ejemplo ? "" : waNumero(contacto); if (!n) return "";
  return "https://wa.me/" + n + "?text=" + encodeURIComponent(texto);
}

export function simboloDe(c) {
  if (SIMB[c.simbolo]) return c.simbolo;
  let h = 0; const s = String(c.id || c.nombre || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SIMB_VIEJOS[h % SIMB_VIEJOS.length];
}
/* Colores propios del símbolo { f: fondo, p: color 1, a: color 2 }, o null. */
const HEX = /^#[0-9a-f]{6}$/i;
export function coloresDe(c) {
  const x = c && c.colores;
  return x && HEX.test(x.f) && HEX.test(x.p) && HEX.test(x.a) ? { f: x.f, p: x.p, a: x.a } : null;
}
/* Color del símbolo: el elegido o, si no hay, el de siempre. */
export function colorDe(c) {
  const n = c && c.color !== "" && c.color != null ? Number(c.color) : NaN;
  if (Number.isInteger(n) && n >= 0 && n < TONOS.length) return n;
  const k = simboloDe(c || {}); const i = SIMB_VIEJOS.indexOf(k);
  return i >= 0 ? i % 3 : SIMB_K.indexOf(k) % TONOS.length;
}

export function errMsg(e) {
  const c = e && e.code;
  if (c === "foto_grande") return "La foto es demasiado grande para guardarla en este navegador.";
  if (c === "foto") return "No se pudieron subir las fotos. Inténtalo otra vez o quítalas y publica sin ellas.";
  if (c === "quota_exceeded") return "La comunidad ha llegado a su límite de entradas. Hay que borrar avisos antiguos antes de añadir más.";
  if (c === "42501") return "No tienes permiso para hacer eso.";
  if (c === "sesion") return "No se pudo conectar con la comunidad. Inténtalo otra vez en un momento.";
  if (c === "login") return "Correo o contraseña incorrectos.";
  if (c === "cuenta") return "Entra o crea tu cuenta para hacerlo.";
  if (c === "ya_existe") return "Ya hay una cuenta con ese correo. Entra con tu contraseña.";
  if (c === "clave_debil") return "Elige una contraseña más larga, de 8 letras o números como mínimo.";
  if (c === "sin_confirmar") return "Primero abre el enlace que te enviamos por correo para activar la cuenta.";
  if (c === "correo_mal") return "Revisa el correo: parece que está mal escrito.";
  if (c === "muchos_correos") return "Se han enviado muchos correos seguidos. Espera unos minutos y vuelve a intentarlo.";
  if (c === "sin_registro") return "Ahora mismo no se pueden crear cuentas nuevas.";
  if (c === "registro") return "No se pudo crear la cuenta. Inténtalo otra vez en un momento.";
  if (c === "sin_red") return "En la versión de demostración no se envían correos.";
  if (c === "invalid_argument") return "No se pudo guardar. Revisa la conexión e inténtalo otra vez.";
  return "No se pudo guardar. Revisa la conexión e inténtalo otra vez.";
}

/* Re-encode through a canvas: smaller file, and the phone's GPS data is dropped. */
export function shrink(file, max = 1280) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.78);
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); };
    im.src = u;
  });
}

export function copiar(texto) {
  try { return navigator.clipboard.writeText(texto); } catch (e) { return Promise.reject(e); }
}

export const VIEWS = ["tablon", "descubre", "mensajes", "proyectos", "comunidades", "colabora", "personas", "calendario", "impacto", "entidades", "artesania", "especie", "recompensas", "apoya", "coordinacion", "app"];
export const viewOf = (h) => (VIEWS.includes(String(h || "").slice(1)) ? String(h).slice(1) : "tablon");
export function avisoDelHash() {
  const m = /^#aviso-([A-Za-z0-9_.~:@+-]+)$/.exec(window.location.hash || "");
  return m ? m[1] : null;
}
export function perfilDelHash() {
  const m = /^#perfil-([A-Za-z0-9_.~:@+-]+)$/.exec(window.location.hash || "");
  return m ? m[1] : null;
}
/* Fichas: #proyecto-<id>, #comunidad-<id> y #apoya-<id> (donar a un proyecto) */
export function detalleDelHash() {
  const m = /^#(proyecto|comunidad|apoya)-([A-Za-z0-9_.~:@+-]+)$/.exec(window.location.hash || "");
  return m ? { tipo: m[1], id: m[2] } : null;
}
export function marcarHash(h) {
  if (window.location.hash === "#" + h) return;
  try { window.history.replaceState(null, "", "#" + h); } catch (e) { /* ignore */ }
}

/* Profile links: only https addresses, or a user name turned into one. Anything else is dropped. */
const REDES = { facebook: "https://www.facebook.com/", instagram: "https://www.instagram.com/", tiktok: "https://www.tiktok.com/@", youtube: "https://www.youtube.com/@", x: "https://x.com/" };
export function enlaceRed(red, v) {
  const s = String(v || "").trim();
  if (/^https?:\/\/[^\s<>"']+$/i.test(s)) return s.replace(/^http:/i, "https:");
  if (red === "web") return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s<>"']*)?$/i.test(s) ? "https://" + s : "";
  const h = s.replace(/^@/, "");
  return REDES[red] && /^[A-Za-z0-9._-]{1,60}$/.test(h) ? REDES[red] + h : "";
}
export const correoValido = (v) => /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(String(v || "").trim());
/* https for saved photos, data: in the demo, blob: for the preview before saving. */
export const fotoSegura = (u) => (/^(https:\/\/|blob:|data:image\/(jpeg|png|webp);)/.test(String(u || "")) ? String(u) : "");
export function iniciales(nombre) {
  const p = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0] || "?").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
}
