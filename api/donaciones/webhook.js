/*
 * POST /api/donaciones/webhook · avisos de Stripe (firmados).
 * Es lo ÚNICO que marca una donación como pagada. Comprueba la firma con STRIPE_WEBHOOK_SECRET
 * y apunta cada aviso en donaciones_eventos para no procesarlo dos veces si Stripe lo repite.
 *
 * Avisos que hay que activar en Stripe → Developers → Webhooks:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired,
 *   invoice.paid, invoice.payment_failed, customer.subscription.deleted, charge.refunded
 */
import { avanza, config, esUuid, idDe, json, ORIGEN, stripe, supabase } from "../../server/donaciones.js";

export async function POST(request) {
  const c = config();
  if (!c.activo) return json({ error: "inactivo" }, 503);

  const firma = request.headers.get("stripe-signature");
  if (!firma) return json({ error: "firma" }, 400);
  const cuerpo = await request.text(); // el texto tal cual: la firma se calcula sobre él
  let ev;
  try {
    ev = await stripe(c).webhooks.constructEventAsync(cuerpo, firma, c.webhookSecret);
  } catch (e) {
    return json({ error: "firma" }, 400);
  }

  const sb = supabase(c);
  /* Cada aviso una sola vez */
  const { error: dup } = await sb.from("donaciones_eventos").insert({ id: ev.id, tipo: ev.type });
  if (dup) {
    if (dup.code === "23505") return json({ ok: true, repetido: true });
    console.error("Supabase eventos:", dup.message);
    return json({ error: "bd" }, 500);
  }

  try {
    await procesar(ev, c, sb);
    return json({ ok: true });
  } catch (e) {
    console.error("Webhook", ev.type, e && e.message);
    await sb.from("donaciones_eventos").delete().eq("id", ev.id); // para que Stripe lo reintente
    return json({ error: "proceso" }, 500);
  }
}

const nuestro = (m) => !!(m && m.origen === ORIGEN);
const ahora = () => new Date().toISOString();

function chk(r) { if (r.error) throw new Error(r.error.message); return r.data; }

async function piDeFactura(c, factura) {
  const id = idDe(factura);
  if (!id) return null;
  try {
    const l = await stripe(c).invoicePayments.list({ invoice: id, limit: 3 });
    const p = l.data.find((x) => x.payment && x.payment.payment_intent);
    return p ? idDe(p.payment.payment_intent) : null;
  } catch (e) { return null; }
}

/* Cambia el estado solo si avanza (un aviso que llega tarde no deshace uno posterior) */
async function ponerEstado(sb, filtro, estado, extra = {}) {
  let q = sb.from("donaciones").select("id,estado");
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v);
  const filas = chk(await q);
  for (const f of filas) {
    if (!avanza(f.estado, estado)) continue;
    chk(await sb.from("donaciones").update({ estado, ...(estado === "pagada" ? { pagada_en: ahora() } : {}), ...extra }).eq("id", f.id));
  }
}

async function sesionCompletada(s, c, sb) {
  const m = s.metadata || {};
  const pagada = s.payment_status === "paid" || s.payment_status === "no_payment_required";
  const estado = pagada ? "pagada" : "procesando";
  const mensual = s.mode === "subscription";
  const pago = mensual ? await piDeFactura(c, s.invoice) : idDe(s.payment_intent);
  const datos = {
    cantidad: s.amount_total, moneda: s.currency, frecuencia: mensual ? "mensual" : "puntual",
    pago_ref: pago, suscripcion_ref: idDe(s.subscription), suscripcion_estado: mensual ? "activa" : null,
    cliente_ref: idDe(s.customer),
    email: m.noticias === "1" && s.customer_details ? s.customer_details.email || null : null,
  };
  const ya = chk(await sb.from("donaciones").select("id,estado").eq("proveedor", "stripe").eq("proveedor_ref", s.id).maybeSingle());
  if (!ya) {
    chk(await sb.from("donaciones").insert({
      proveedor: "stripe", proveedor_ref: s.id, estado, ...datos, pagada_en: pagada ? ahora() : null,
      proyecto: esUuid(m.proyecto) ? m.proyecto : null,
      donante: m.asociar === "1" && m.donante ? m.donante : null,
      consentimientos: { condiciones: m.condiciones === "1", noticias: m.noticias === "1", asociar: m.asociar === "1", fecha: m.consentido || null },
    }));
    return;
  }
  const cambio = { ...datos };
  if (avanza(ya.estado, estado)) { cambio.estado = estado; if (pagada) cambio.pagada_en = ahora(); }
  chk(await sb.from("donaciones").update(cambio).eq("id", ya.id));
}

/* Cuotas mensuales a partir de la segunda (la primera la confirma checkout.session.completed) */
async function cuota(inv, c, sb, estado) {
  if (inv.billing_reason === "subscription_create") return;
  const det = inv.parent && inv.parent.subscription_details;
  const susc = idDe((det && det.subscription) || inv.subscription);
  if (!susc) return;
  const primera = chk(await sb.from("donaciones").select("id,donante,consentimientos,email")
    .eq("suscripcion_ref", susc).is("origen", null).like("proveedor_ref", "cs_%").maybeSingle());
  if (!primera && !nuestro(det && det.metadata)) return; // no es de Hampatu Ayllu
  const ya = chk(await sb.from("donaciones").select("id,estado").eq("proveedor", "stripe").eq("proveedor_ref", inv.id).maybeSingle());
  if (ya) { if (avanza(ya.estado, estado)) chk(await sb.from("donaciones").update({ estado, ...(estado === "pagada" ? { pagada_en: ahora() } : {}) }).eq("id", ya.id)); return; }
  chk(await sb.from("donaciones").insert({
    proveedor: "stripe", proveedor_ref: inv.id, estado, frecuencia: "mensual",
    cantidad: estado === "pagada" ? inv.amount_paid : inv.amount_due, moneda: inv.currency,
    suscripcion_ref: susc, cliente_ref: idDe(inv.customer), pago_ref: estado === "pagada" ? await piDeFactura(c, inv) : null,
    donante: primera ? primera.donante : null, email: primera ? primera.email : null,
    consentimientos: primera ? primera.consentimientos : {}, origen: primera ? primera.id : null,
    pagada_en: estado === "pagada" ? ahora() : null,
  }));
}

async function procesar(ev, c, sb) {
  const o = ev.data.object;
  switch (ev.type) {
    case "checkout.session.completed":
      if (nuestro(o.metadata)) await sesionCompletada(o, c, sb);
      break;
    case "checkout.session.async_payment_succeeded":
      if (nuestro(o.metadata)) { await sesionCompletada(o, c, sb); await ponerEstado(sb, { proveedor: "stripe", proveedor_ref: o.id }, "pagada"); }
      break;
    case "checkout.session.async_payment_failed":
      if (nuestro(o.metadata)) await ponerEstado(sb, { proveedor: "stripe", proveedor_ref: o.id }, "fallida");
      break;
    case "checkout.session.expired":
      if (nuestro(o.metadata)) await ponerEstado(sb, { proveedor: "stripe", proveedor_ref: o.id, estado: "iniciada" }, "cancelada");
      break;
    case "invoice.paid":
      await cuota(o, c, sb, "pagada");
      break;
    case "invoice.payment_failed":
      await cuota(o, c, sb, "fallida");
      break;
    case "customer.subscription.deleted":
      chk(await sb.from("donaciones").update({ suscripcion_estado: "cancelada" }).eq("suscripcion_ref", o.id).is("origen", null));
      break;
    case "charge.refunded":
      /* Solo reembolsos completos; los parciales se anotan a mano */
      if (o.refunded && o.payment_intent) await ponerEstado(sb, { pago_ref: idDe(o.payment_intent) }, "reembolsada");
      break;
    default:
      break;
  }
}
