/* Pruebas del inicio de pago (api/donaciones/checkout.js) con Stripe y Supabase simulados. Ejecuta: npm test */
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const PROY = "8b0b8f2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b", CERRADO = "9c0b8f2e-1c2d-4e5f-8a9b-0c1d2e3f4a5c";
const proyectos = {
  [PROY]: { id: PROY, nombre: "Quebradas", moneda: "pen", estado: "activo", publicado: true, acepta_donaciones: true, ejemplo: false },
  [CERRADO]: { id: CERRADO, nombre: "Cerrado", moneda: "pen", estado: "finalizado", publicado: true, acepta_donaciones: true, ejemplo: false },
};
const filas = [];
const sesiones = [];
mock.module("@supabase/supabase-js", { namedExports: { createClient: () => ({
  auth: { getUser: async (t) => ({ data: { user: t === "buena" ? { id: "u1", is_anonymous: false } : null } }) },
  from: (tabla) => {
    let id = null;
    const q = {
      select() { return q; }, eq(k, v) { if (k === "id") id = v; return q; },
      maybeSingle: async () => ({ data: tabla === "proyectos" ? proyectos[id] || null : null, error: null }),
      upsert: async (f) => { filas.push(f); return { error: null }; },
    };
    return q;
  },
}) } });
mock.module("stripe", { defaultExport: class {
  constructor() { this.checkout = { sessions: { create: async (p, o) => { sesiones.push({ p, o }); return { id: "cs_test_" + sesiones.length, url: "https://checkout.stripe.com/x" }; } } }; }
} });
const ENV = { DONACIONES_ACTIVAS: "true", DONACIONES_ENTIDAD: "Entidad de prueba", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service", SITIO_URL: "https://hampatuayllu.vercel.app" };
Object.assign(process.env, ENV);
const { POST } = await import("../api/donaciones/checkout.js");
const base = { cantidad: 20, moneda: "eur", frecuencia: "puntual", idempotencia: "1234567890abcdef1234", consentimientos: { condiciones: true } };
const pedir = (cuerpo, cab = {}) => POST(new Request("https://x/api", { method: "POST", headers: { "content-type": "application/json", ...cab }, body: JSON.stringify(cuerpo) }));
const err = async (r) => (await r.json()).error;

test("donación puntual válida: crea la sesión de pago y la registra como «iniciada»", async () => {
  const r = await pedir(base);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).url, "https://checkout.stripe.com/x");
  const s = sesiones.at(-1);
  assert.equal(s.p.mode, "payment"); assert.equal(s.p.line_items[0].price_data.unit_amount, 2000); assert.equal(s.p.line_items[0].price_data.currency, "eur");
  assert.equal(s.o.idempotencyKey, "hampatu-1234567890abcdef1234");
  assert.ok(s.p.success_url.startsWith("https://hampatuayllu.vercel.app/?donacion=ok&sid={CHECKOUT_SESSION_ID}"));
  assert.equal(s.p.metadata.origen, "hampatu-ayllu");
  assert.equal(filas.at(-1).estado, "iniciada"); assert.equal(filas.at(-1).cantidad, 2000);
});

test("mensual: suscripción con cuota mensual", async () => {
  await pedir({ ...base, frecuencia: "mensual", moneda: "usd" });
  const s = sesiones.at(-1);
  assert.equal(s.p.mode, "subscription"); assert.deepEqual(s.p.line_items[0].price_data.recurring, { interval: "month" });
});

test("rechaza cantidades, monedas y datos no válidos", async () => {
  assert.equal(await err(await pedir({ ...base, cantidad: 0.5 })), "cantidad");
  assert.equal(await err(await pedir({ ...base, cantidad: 20.555 })), "cantidad");
  assert.equal(await err(await pedir({ ...base, cantidad: 999999 })), "cantidad");
  assert.equal(await err(await pedir({ ...base, moneda: "gbp" })), "moneda");
  assert.equal(await err(await pedir({ ...base, moneda: "pen", cantidad: 2 })), "cantidad");
  assert.equal(await err(await pedir({ ...base, frecuencia: "anual" })), "frecuencia");
  assert.equal(await err(await pedir({ ...base, consentimientos: {} })), "condiciones");
  assert.equal(await err(await pedir({ ...base, idempotencia: "x" })), "datos");
});

test("proyectos: solo si aceptan donaciones, en su moneda y de una vez", async () => {
  const ok = await pedir({ ...base, moneda: "pen", cantidad: 50, proyecto: PROY });
  assert.equal(ok.status, 200);
  assert.equal(sesiones.at(-1).p.metadata.proyecto, PROY);
  assert.equal(filas.at(-1).proyecto, PROY);
  assert.equal(await err(await pedir({ ...base, proyecto: PROY })), "moneda");
  assert.equal(await err(await pedir({ ...base, moneda: "pen", proyecto: PROY, frecuencia: "mensual" })), "frecuencia");
  assert.equal(await err(await pedir({ ...base, moneda: "pen", proyecto: CERRADO })), "proyecto");
  assert.equal(await err(await pedir({ ...base, proyecto: "no-es-un-id" })), "proyecto");
});

test("la cuenta solo se asocia con consentimiento y una sesión válida", async () => {
  await pedir({ ...base, consentimientos: { condiciones: true, asociar: true } }, { authorization: "Bearer buena" });
  assert.equal(filas.at(-1).donante, "u1");
  await pedir({ ...base, consentimientos: { condiciones: true, asociar: false } }, { authorization: "Bearer buena" });
  assert.equal(filas.at(-1).donante, null);
  await pedir({ ...base, consentimientos: { condiciones: true, asociar: true } }, { authorization: "Bearer mala" });
  assert.equal(filas.at(-1).donante, null);
});

test("sin entidad receptora no se cobra nada", async () => {
  delete process.env.DONACIONES_ENTIDAD;
  const n = sesiones.length;
  const r = await pedir(base);
  assert.equal(r.status, 503); assert.equal(sesiones.length, n);
  process.env.DONACIONES_ENTIDAD = ENV.DONACIONES_ENTIDAD;
});
