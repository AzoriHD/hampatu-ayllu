/*
 * Donaciones desde la web. El cobro lo hace la pasarela (Stripe) a través de las funciones del servidor
 * (api/donaciones/*): aquí no se ve ninguna clave secreta ni ningún dato de tarjeta.
 * Mientras falte la entidad receptora o alguna clave, el servidor dice «activo: false» y no se puede donar.
 */
import { REMOTE, sb } from "./store.js";

export async function estadoDonaciones() {
  try {
    const r = await fetch("/api/donaciones/estado", { headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) return { activo: false };
    const d = await r.json();
    return d && d.activo === true ? d : { activo: false };
  } catch (e) {
    return { activo: false }; // sin servidor (por ejemplo, con npm run dev): apagado
  }
}

/* Abre la página de pago segura de la pasarela. Devuelve la dirección a la que hay que ir. */
export async function iniciarDonacion(datos) {
  const headers = { "content-type": "application/json" };
  if (REMOTE && datos.consentimientos && datos.consentimientos.asociar) {
    const { data } = await sb.auth.getSession();
    if (data.session) headers.authorization = "Bearer " + data.session.access_token;
  }
  let r;
  try {
    r = await fetch("/api/donaciones/checkout", { method: "POST", headers, body: JSON.stringify(datos) });
  } catch (e) {
    throw { code: "red" };
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) throw { code: d.error || "proveedor", ...d };
  return d.url;
}

/* Estado real de un pago, preguntado a la pasarela por el servidor */
export async function comprobarDonacion(sid) {
  const r = await fetch("/api/donaciones/estado?sid=" + encodeURIComponent(sid), { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw { code: d.error || "proveedor" };
  return d;
}

/* Clave para que un doble clic no cree dos pagos */
export const claveIdempotencia = () => (crypto.randomUUID ? crypto.randomUUID()
  : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2));

export function dinero(centimos, moneda, en) {
  const n = (Number(centimos) || 0) / 100;
  try {
    return new Intl.NumberFormat(en ? "en-GB" : "es-PE", { style: "currency", currency: String(moneda || "eur").toUpperCase(), currencyDisplay: "narrowSymbol",
      minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  } catch (e) {
    return n.toFixed(2) + " " + String(moneda || "").toUpperCase();
  }
}
