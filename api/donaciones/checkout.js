/*
 * POST /api/donaciones/checkout
 * Crea la sesión de pago en Stripe y devuelve la dirección de la página de pago segura de Stripe.
 * La tarjeta se escribe en Stripe, nunca en Hampatu Ayllu. La donación queda «iniciada»
 * y solo pasa a «pagada» cuando Stripe lo confirma por el webhook.
 *
 * Cuerpo: { cantidad: 10, moneda: "eur" | "usd" | "pen", frecuencia: "puntual" | "mensual",
 *           proyecto: "<uuid>" (opcional: vacío = fondo general), idempotencia: "<uuid>",
 *           consentimientos: { condiciones: true, noticias: bool, asociar: bool }, idioma: "es" | "en" }
 * Las donaciones a un proyecto son puntuales y en la moneda del proyecto, y solo si la coordinación
 * lo ha publicado y ha activado sus donaciones.
 * Cabecera opcional: Authorization: Bearer <token de Supabase> (para asociar la donación a la cuenta).
 */
import { centimos, config, esUuid, json, LIMITES, ORIGEN, sitio, stripe, supabase } from "../../server/donaciones.js";

export async function POST(request) {
  const c = config();
  if (!c.activo) return json({ error: "inactivo" }, 503);

  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "datos" }, 400); }
  b = b || {};
  const moneda = String(b.moneda || "").toLowerCase();
  const frecuencia = b.frecuencia === "mensual" ? "mensual" : b.frecuencia === "puntual" ? "puntual" : "";
  const idem = String(b.idempotencia || "");
  const cons = b.consentimientos || {};
  const en = b.idioma === "en";
  if (!c.monedas.includes(moneda)) return json({ error: "moneda" }, 400);
  const cts = centimos(b.cantidad, moneda);
  if (!cts) return json({ error: "cantidad", minimo: LIMITES[moneda][0], maximo: LIMITES[moneda][1] }, 400);
  if (!frecuencia) return json({ error: "frecuencia" }, 400);
  if (!/^[A-Za-z0-9-]{16,64}$/.test(idem)) return json({ error: "datos" }, 400);
  if (cons.condiciones !== true) return json({ error: "condiciones" }, 400);

  /* Donación a un proyecto: tiene que estar publicado, con las donaciones activadas y buscando apoyo o activo */
  let proyecto = null;
  if (b.proyecto) {
    if (!esUuid(b.proyecto)) return json({ error: "proyecto" }, 400);
    const { data: p } = await supabase(c).from("proyectos")
      .select("id,nombre,moneda,estado,publicado,acepta_donaciones,ejemplo").eq("id", b.proyecto).maybeSingle();
    if (!p || !p.publicado || !p.acepta_donaciones || p.ejemplo || !["buscando", "activo"].includes(p.estado)) {
      return json({ error: "proyecto" }, 400);
    }
    if (p.moneda !== moneda) return json({ error: "moneda", moneda: p.moneda }, 400);
    if (frecuencia !== "puntual") return json({ error: "frecuencia" }, 400);
    proyecto = p;
  }

  /* Cuenta: solo si la persona tiene sesión iniciada Y ha aceptado asociar la donación */
  let donante = "";
  const auth = request.headers.get("authorization") || "";
  if (cons.asociar === true && /^Bearer [\w.-]+$/.test(auth)) {
    try {
      const { data } = await supabase(c).auth.getUser(auth.slice(7));
      if (data && data.user && !data.user.is_anonymous) donante = data.user.id;
    } catch (e) { /* sin cuenta: la donación sigue siendo anónima */ }
  }

  const mensual = frecuencia === "mensual";
  const metadata = {
    origen: ORIGEN, frecuencia, donante, proyecto: proyecto ? proyecto.id : "",
    noticias: cons.noticias === true ? "1" : "0", asociar: donante ? "1" : "0", condiciones: "1",
    consentido: new Date().toISOString(),
  };
  const base = sitio();
  const nombre = proyecto
    ? (en ? "Donation to the project: " : "Donación al proyecto: ") + String(proyecto.nombre).slice(0, 120)
    : en ? (mensual ? "Monthly donation to Hampatu Ayllu" : "Donation to Hampatu Ayllu")
      : (mensual ? "Donación mensual a Hampatu Ayllu" : "Donación a Hampatu Ayllu");

  let sesion;
  try {
    sesion = await stripe(c).checkout.sessions.create({
      mode: mensual ? "subscription" : "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: moneda,
          unit_amount: cts,
          product_data: { name: nombre, description: (en ? "Received by: " : "La recibe: ") + c.entidad },
          ...(mensual ? { recurring: { interval: "month" } } : {}),
        },
      }],
      ...(mensual
        ? { subscription_data: { metadata } }
        : { submit_type: "donate", customer_creation: "always", payment_intent_data: { metadata, description: nombre } }),
      metadata,
      locale: en ? "en" : "es",
      success_url: base + "/?donacion=ok&sid={CHECKOUT_SESSION_ID}#apoya",
      cancel_url: base + "/?donacion=cancelada#apoya" + (proyecto ? "-" + proyecto.id : ""),
    }, { idempotencyKey: "hampatu-" + idem });
  } catch (e) {
    console.error("Stripe checkout:", e && e.type, e && e.message);
    return json({ error: "proveedor" }, 502);
  }

  /* Registro: «iniciada». Si falla, el webhook la crea igualmente al confirmarse el pago. */
  const { error } = await supabase(c).from("donaciones").upsert({
    proveedor: "stripe", proveedor_ref: sesion.id, cantidad: cts, moneda, frecuencia, estado: "iniciada", proyecto: proyecto ? proyecto.id : null,
    donante: donante || null, consentimientos: { condiciones: true, noticias: cons.noticias === true, asociar: !!donante, fecha: metadata.consentido },
  }, { onConflict: "proveedor,proveedor_ref", ignoreDuplicates: true });
  if (error) console.error("Supabase donaciones (iniciada):", error.message);

  return json({ url: sesion.url });
}
