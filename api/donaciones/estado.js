/*
 * GET /api/donaciones/estado            → si las donaciones están activas y quién las recibe
 * GET /api/donaciones/estado?sid=cs_…   → estado REAL de un pago, preguntado a Stripe (para la página de vuelta)
 */
import { config, json, LIMITES, ORIGEN, stripe } from "../../server/donaciones.js";

export async function GET(request) {
  const c = config();
  const sid = new URL(request.url).searchParams.get("sid");
  if (!sid) {
    return json(c.activo
      ? { activo: true, entidad: c.entidad, monedas: c.monedas, limites: Object.fromEntries(c.monedas.map((m) => [m, LIMITES[m]])), privacidad: c.privacidad }
      : { activo: false });
  }
  if (!c.activo) return json({ error: "inactivo" }, 503);
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid)) return json({ error: "datos" }, 400);
  try {
    const s = await stripe(c).checkout.sessions.retrieve(sid);
    if (!s.metadata || s.metadata.origen !== ORIGEN) return json({ error: "no_encontrada" }, 404);
    const pagada = s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");
    const estado = pagada ? "pagada" : s.status === "complete" ? "procesando" : s.status === "expired" ? "cancelada" : "pendiente";
    return json({ estado, cantidad: s.amount_total, moneda: s.currency, frecuencia: s.mode === "subscription" ? "mensual" : "puntual",
      proyecto: (s.metadata && s.metadata.proyecto) || "" });
  } catch (e) {
    if (e && e.statusCode === 404) return json({ error: "no_encontrada" }, 404);
    console.error("Stripe estado:", e && e.message);
    return json({ error: "proveedor" }, 502);
  }
}
