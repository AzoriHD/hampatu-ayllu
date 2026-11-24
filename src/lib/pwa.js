/*
 * App instalable (PWA): guarda el aviso de instalación del navegador y dice
 * en qué dispositivo y navegador estamos, para la página «App» y el aviso flotante.
 * Se importa antes que nada en main.jsx: el navegador lanza el aviso muy pronto.
 */
let aviso = null;
let recienInstalada = false;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); aviso = e; avisar(); });
  window.addEventListener("appinstalled", () => { aviso = null; recienInstalada = true; avisar(); });
}

export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const puedeInstalar = () => !!aviso;
export const recien = () => recienInstalada;

/* Abierta como app (desde su icono) y no en una pestaña del navegador */
export const MODOS_APP = ["standalone", "window-controls-overlay", "fullscreen", "minimal-ui"].map((m) => "(display-mode: " + m + ")");
export const enApp = () =>
  typeof window !== "undefined" &&
  (MODOS_APP.some((q) => window.matchMedia?.(q).matches) || window.navigator.standalone === true);

/* Abre el aviso de instalación del navegador. Devuelve true si la persona aceptó. */
export async function instalar() {
  if (!aviso) return false;
  const ev = aviso;
  ev.prompt();
  let ok = false;
  try { ok = (await ev.userChoice).outcome === "accepted"; } catch (e) { /* ignore */ }
  aviso = null;
  if (ok) recienInstalada = true;
  avisar();
  return ok;
}

/*
 * Botones «Descargar app»: instalan directamente con el aviso del navegador.
 * Si el navegador no lo permite (iPhone, navegador dentro de WhatsApp/Facebook, ya rechazado…),
 * se abre una ventanita con los pasos, sin salir de la página.
 */
export const AYUDA_INSTALAR = "hampatu-instalar-ayuda";
export async function descargarApp(e) {
  if (e) e.preventDefault();
  if (!aviso && !recienInstalada && plataforma() !== "ios") {
    /* a veces el navegador avisa un poco tarde: se espera un momento */
    await new Promise((ok) => { const q = suscribir(() => { q(); ok(); }); setTimeout(() => { q(); ok(); }, 1200); });
  }
  if (aviso) { await instalar(); return; }
  window.dispatchEvent(new Event(AYUDA_INSTALAR));
}

/* Navegador metido dentro de otra app (WhatsApp, Facebook, Instagram…): ahí no se puede instalar */
export const enOtraApp = () => /FBAN|FBAV|FB_IAB|Instagram|Messenger|WhatsApp|Line\/|; wv\)|TikTok|Snapchat/i.test(navigator.userAgent || "");

export function plataforma() {
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/CrOS/.test(ua)) return "linux";
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Linux/i.test(ua)) return "linux";
  return "otro";
}

export function navegador() {
  const ua = navigator.userAgent || "";
  if (/Edg(e|A|iOS)?\//.test(ua)) return "edge";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox|FxiOS/.test(ua)) return "firefox";
  if (/OPR\/|Opera/.test(ua)) return "opera";
  if (/CriOS|Chrome|Chromium/.test(ua)) return "chrome";
  if (/Safari/.test(ua)) return "safari";
  return "otro";
}

export const esMovil = () => ["ios", "android"].includes(plataforma());

/* Comparte el enlace de la app (WhatsApp, etc.) o lo copia si el navegador no sabe compartir. */
export async function compartirApp(texto) {
  const url = window.location.origin + "/#app";
  if (navigator.share) {
    try { await navigator.share({ title: "Hampatu Ayllu", text: texto, url }); return "compartido"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelado"; }
  }
  try { await navigator.clipboard.writeText(url); return "copiado"; } catch (e) { return "error"; }
}
