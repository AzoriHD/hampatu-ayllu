/*
 * Donaciones · código compartido del servidor (funciones de Vercel en api/donaciones/).
 * Se ejecuta SOLO en el servidor: aquí viven las claves secretas, que nunca llegan al navegador.
 *
 * El sistema está APAGADO hasta que en Vercel existan todas estas variables (ver README, «Donaciones»):
 *   DONACIONES_ACTIVAS=true, DONACIONES_ENTIDAD, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las crea la integración de Supabase en Vercel).
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const env = process.env;

/* Variables de Supabase con el prefijo que sea (la integración de Vercel crea varias) */
function buscar(finales) {
  for (const f of finales) {
    const k = Object.keys(env).sort((a, b) => a.length - b.length).find((n) => n.endsWith(f) && env[n]);
    if (k) return env[k];
  }
  return "";
}

/* Monedas que admite la web (Stripe cobra en todas ellas) y límites por donación, en unidades */
export const LIMITES = { eur: [1, 5000], usd: [1, 5000], pen: [5, 20000] };

export function config() {
  const monedas = String(env.DONACIONES_MONEDAS || "eur,usd,pen").toLowerCase().split(/[\s,]+/).filter((m) => LIMITES[m]);
  const c = {
    entidad: String(env.DONACIONES_ENTIDAD || "").trim(),
    privacidad: /^https:\/\//.test(env.DONACIONES_PRIVACIDAD_URL || "") ? env.DONACIONES_PRIVACIDAD_URL : "",
    monedas: monedas.length ? [...new Set(monedas)] : ["eur"],
    stripeKey: env.STRIPE_SECRET_KEY || "",
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || "",
    sbUrl: buscar(["SUPABASE_URL"]),
    sbServiceKey: buscar(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]),
  };
  /* Activo solo con TODO configurado: entidad receptora, Stripe, webhook y base de datos */
  c.activo = env.DONACIONES_ACTIVAS === "true" && !!(c.entidad && c.stripeKey && c.webhookSecret && c.sbUrl && c.sbServiceKey);
  return c;
}

let _stripe = null, _sb = null;
export function stripe(c) {
  if (!_stripe) _stripe = new Stripe(c.stripeKey, { maxNetworkRetries: 2, appInfo: { name: "hampatu-ayllu" } });
  return _stripe;
}
export function supabase(c) {
  if (!_sb) _sb = createClient(c.sbUrl, c.sbServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return _sb;
}

/* Dirección de la web para volver de la pasarela. Nunca se toma de la petición (evita redirecciones a otras webs). */
export function sitio() {
  if (env.SITIO_URL && /^https:\/\//.test(env.SITIO_URL)) return env.SITIO_URL.replace(/\/+$/, "");
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return "https://" + env.VERCEL_URL;
  return "https://" + (env.VERCEL_PROJECT_PRODUCTION_URL || "hampatuayllu.vercel.app");
}

export const ORIGEN = "hampatu-ayllu";

export function json(datos, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/* Importe en céntimos a partir de lo que llega del formulario (unidades, hasta 2 decimales) */
export function centimos(valor, moneda) {
  const lim = LIMITES[moneda];
  if (!lim) return 0;
  const n = typeof valor === "number" ? valor : Number(String(valor || "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  const cts = Math.round(n * 100);
  if (Math.abs(n * 100 - cts) > 1e-6) return 0; // más de 2 decimales
  if (cts < lim[0] * 100 || cts > lim[1] * 100) return 0;
  return cts;
}

export const esUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));

/* Orden de los estados: un aviso que llega tarde nunca hace retroceder una donación */
const RANGO = { iniciada: 0, procesando: 1, pagada: 2, fallida: 2, cancelada: 2, reembolsada: 3 };
export function avanza(viejo, nuevo) {
  if (!viejo) return true;
  if (viejo === nuevo) return false;
  if (viejo === "pagada" && (nuevo === "fallida" || nuevo === "cancelada")) return false;
  return (RANGO[nuevo] ?? 0) >= (RANGO[viejo] ?? 0);
}

export const idDe = (x) => (x && typeof x === "object" ? x.id : x) || null;
