import { test, mock } from "node:test";
import assert from "node:assert/strict";

/* Supabase falso en memoria: lo justo para el webhook */
const tablas = { donaciones: [], donaciones_eventos: [] };
let nid = 0;
function consulta(t) {
  const f = []; let op = "select", datos = null, unico = false;
  const q = {
    select() { return q; }, eq(k, v) { f.push((r) => r[k] === v); return q; }, is(k, v) { f.push((r) => (r[k] ?? null) === v); return q; },
    like(k, p) { const re = new RegExp("^" + p.replace(/%/g, ".*") + "$"); f.push((r) => re.test(r[k] || "")); return q; },
    maybeSingle() { unico = true; return q; },
    insert(d) { op = "insert"; datos = d; return q; }, update(d) { op = "update"; datos = d; return q; }, delete() { op = "delete"; return q; },
    then(res, rej) {
      try {
        const T = tablas[t];
        if (op === "insert") {
          if (t === "donaciones_eventos" && T.some((r) => r.id === datos.id)) return res({ data: null, error: { code: "23505", message: "dup" } });
          if (t === "donaciones" && T.some((r) => r.proveedor_ref === datos.proveedor_ref)) return res({ data: null, error: { code: "23505", message: "dup" } });
          T.push({ id: t === "donaciones" ? "d" + ++nid : datos.id, ...datos }); return res({ data: null, error: null });
        }
        const sel = T.filter((r) => f.every((g) => g(r)));
        if (op === "update") { sel.forEach((r) => Object.assign(r, datos)); return res({ data: null, error: null }); }
        if (op === "delete") { tablas[t] = T.filter((r) => !sel.includes(r)); return res({ data: null, error: null }); }
        return res({ data: unico ? sel[0] || null : sel.map((r) => ({ ...r })), error: null });
      } catch (e) { rej(e); }
    },
  };
  return q;
}
mock.module("@supabase/supabase-js", { namedExports: { createClient: () => ({ from: consulta }) } });
mock.module("stripe", { defaultExport: class {
  constructor() {
    this.webhooks = { constructEventAsync: async (body, sig) => { if (sig !== "firma-buena") throw new Error("firma"); return JSON.parse(body); } };
    this.invoicePayments = { list: async ({ invoice }) => ({ data: [{ payment: { payment_intent: "pi_de_" + invoice } }] }) };
  }
} });

Object.assign(process.env, { DONACIONES_ACTIVAS: "true", DONACIONES_ENTIDAD: "Entidad de prueba", STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service" });
const { POST } = await import("../api/donaciones/webhook.js");

let n = 0;
const aviso = (type, object, firma = "firma-buena") => POST(new Request("https://x/api", {
  method: "POST", headers: { "stripe-signature": firma }, body: JSON.stringify({ id: "evt_" + ++n, type, data: { object } }) }));
const META = { origen: "hampatu-ayllu", frecuencia: "puntual", noticias: "0", asociar: "0", condiciones: "1", proyecto: "" };
const fila = (ref) => tablas.donaciones.find((r) => r.proveedor_ref === ref);

test("firma mala → 400 y nada se guarda", async () => {
  const r = await aviso("checkout.session.completed", {}, "mala");
  assert.equal(r.status, 400); assert.equal(tablas.donaciones.length, 0);
});

test("pago puntual confirmado", async () => {
  tablas.donaciones.push({ id: "d0", proveedor: "stripe", proveedor_ref: "cs_1", estado: "iniciada", cantidad: 1000, moneda: "eur" });
  const r = await aviso("checkout.session.completed", { id: "cs_1", mode: "payment", payment_status: "paid", amount_total: 1000, currency: "eur",
    payment_intent: "pi_1", customer: "cus_1", metadata: META });
  assert.equal(r.status, 200);
  assert.equal(fila("cs_1").estado, "pagada"); assert.equal(fila("cs_1").pago_ref, "pi_1"); assert.ok(fila("cs_1").pagada_en);
  assert.equal(fila("cs_1").email, null);
});

test("aviso repetido (mismo id) no se procesa dos veces", async () => {
  const ev = { id: "evt_repe", type: "checkout.session.completed", data: { object: { id: "cs_2", mode: "payment", payment_status: "paid", amount_total: 500, currency: "pen", metadata: { ...META, proyecto: "8b0b8f2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b" } } } };
  const req = () => POST(new Request("https://x", { method: "POST", headers: { "stripe-signature": "firma-buena" }, body: JSON.stringify(ev) }));
  assert.equal((await req()).status, 200);
  const r2 = await req(); assert.equal((await r2.json()).repetido, true);
  assert.equal(tablas.donaciones.filter((x) => x.proveedor_ref === "cs_2").length, 1);
  assert.equal(fila("cs_2").proyecto, "8b0b8f2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b");
});

test("pago diferido: procesando → pagada, y un aviso tardío no lo hace retroceder", async () => {
  const s = { id: "cs_3", mode: "payment", payment_status: "unpaid", amount_total: 2000, currency: "usd", payment_intent: "pi_3", metadata: META };
  await aviso("checkout.session.completed", s);
  assert.equal(fila("cs_3").estado, "procesando");
  await aviso("checkout.session.async_payment_succeeded", { ...s, payment_status: "paid" });
  assert.equal(fila("cs_3").estado, "pagada");
  await aviso("checkout.session.completed", s);
  assert.equal(fila("cs_3").estado, "pagada");
  await aviso("checkout.session.expired", s);
  assert.equal(fila("cs_3").estado, "pagada");
});

test("sesión caducada sin pagar → cancelada", async () => {
  tablas.donaciones.push({ id: "d9", proveedor: "stripe", proveedor_ref: "cs_4", estado: "iniciada", cantidad: 500, moneda: "eur" });
  await aviso("checkout.session.expired", { id: "cs_4", metadata: META });
  assert.equal(fila("cs_4").estado, "cancelada");
});

test("sesiones de otras webs se ignoran", async () => {
  await aviso("checkout.session.completed", { id: "cs_otro", mode: "payment", payment_status: "paid", amount_total: 1, currency: "eur", metadata: { origen: "otra" } });
  assert.equal(fila("cs_otro"), undefined);
});

test("mensual: primera cuota, renovación, fallo, baja y correo solo con consentimiento", async () => {
  const m = { ...META, frecuencia: "mensual", noticias: "1" };
  await aviso("checkout.session.completed", { id: "cs_m", mode: "subscription", payment_status: "paid", amount_total: 1000, currency: "eur",
    subscription: "sub_1", invoice: "in_0", customer: "cus_m", customer_details: { email: "a@b.pe" }, metadata: m });
  const p = fila("cs_m");
  assert.equal(p.frecuencia, "mensual"); assert.equal(p.suscripcion_estado, "activa"); assert.equal(p.pago_ref, "pi_de_in_0"); assert.equal(p.email, "a@b.pe");
  await aviso("invoice.paid", { id: "in_0", billing_reason: "subscription_create", amount_paid: 1000, currency: "eur", parent: { subscription_details: { subscription: "sub_1", metadata: m } } });
  assert.equal(tablas.donaciones.filter((x) => x.suscripcion_ref === "sub_1").length, 1, "la primera cuota no se duplica");
  await aviso("invoice.paid", { id: "in_1", billing_reason: "subscription_cycle", amount_paid: 1000, currency: "eur", customer: "cus_m", parent: { subscription_details: { subscription: "sub_1", metadata: m } } });
  const c = fila("in_1");
  assert.equal(c.estado, "pagada"); assert.equal(c.origen, p.id); assert.equal(c.email, "a@b.pe"); assert.equal(c.pago_ref, "pi_de_in_1");
  await aviso("invoice.payment_failed", { id: "in_2", billing_reason: "subscription_cycle", amount_due: 1000, currency: "eur", parent: { subscription_details: { subscription: "sub_1" } } });
  assert.equal(fila("in_2").estado, "fallida");
  await aviso("customer.subscription.deleted", { id: "sub_1" });
  assert.equal(fila("cs_m").suscripcion_estado, "cancelada");
});

test("reembolso completo → reembolsada; parcial → sin cambios", async () => {
  await aviso("charge.refunded", { refunded: false, payment_intent: "pi_1" });
  assert.equal(fila("cs_1").estado, "pagada");
  await aviso("charge.refunded", { refunded: true, payment_intent: "pi_1" });
  assert.equal(fila("cs_1").estado, "reembolsada");
});

test("sin configuración completa, el webhook está apagado", async () => {
  const { POST: P2 } = await import("../api/donaciones/webhook.js?apagado");
  delete process.env.DONACIONES_ENTIDAD;
  const r = await P2(new Request("https://x", { method: "POST", headers: { "stripe-signature": "firma-buena" }, body: "{}" }));
  assert.equal(r.status, 503);
  process.env.DONACIONES_ENTIDAD = "Entidad de prueba";
});
