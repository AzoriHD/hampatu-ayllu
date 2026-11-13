import { SIMB, SIMB_K } from "../data/constants.js";

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
  return SIMB_K[h % SIMB_K.length];
}

export function errMsg(e) {
  const c = e && e.code;
  if (c === "foto_grande") return "La foto es demasiado grande para guardarla en este navegador.";
  if (c === "foto") return "No se pudieron subir las fotos. Inténtalo otra vez o quítalas y publica sin ellas.";
  if (c === "quota_exceeded") return "La red ha llegado a su límite de entradas. Hay que borrar avisos antiguos antes de añadir más.";
  if (c === "42501") return "No tienes permiso para hacer eso.";
  if (c === "sesion") return "No se pudo conectar con la red. Inténtalo otra vez en un momento.";
  if (c === "login") return "Correo o contraseña incorrectos.";
  if (c === "no_admin") return "Esa cuenta no es de coordinación.";
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

export const VIEWS = ["tablon", "comunidades", "calendario", "artesania", "especie", "recompensas"];
export const viewOf = (h) => (VIEWS.includes(String(h || "").slice(1)) ? String(h).slice(1) : "tablon");
export function avisoDelHash() {
  const m = /^#aviso-([A-Za-z0-9_.~:@+-]+)$/.exec(window.location.hash || "");
  return m ? m[1] : null;
}
export function marcarHash(h) {
  if (window.location.hash === "#" + h) return;
  try { window.history.replaceState(null, "", "#" + h); } catch (e) { /* ignore */ }
}
