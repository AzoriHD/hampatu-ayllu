/*
 * Almacén de datos de la app.
 *
 * - Con Supabase configurado (variables de entorno en Vercel), todo se guarda
 *   en una base de datos compartida: lo que publica uno lo ven todos al momento.
 * - Sin Supabase, funciona como demostración y guarda en este navegador.
 *
 * Cuentas: para publicar, responder, votar o apuntarse hace falta una cuenta
 * (correo y contraseña). Cada cuenta tiene su perfil en la colección «perfiles»,
 * con el mismo id que el usuario. Leer no necesita cuenta.
 *
 * Coordinación (admin): las cuentas que estén en la tabla admin_emails de
 * Supabase pueden además marcar fechas, verificar fotos, editar o borrar
 * cualquier cosa y cargar o borrar los ejemplos.
 */
import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import SEED from "../data/seed.js";

export const COLS = ["comunidades", "avisos", "respuestas", "fechas", "votos", "apuntes", "perfiles"];
const KEY = "hampatu-react-v1";
/* global __SB_URL__, __SB_KEY__ */
const SB_URL = typeof __SB_URL__ === "string" ? __SB_URL__ : "";
const SB_KEY = typeof __SB_KEY__ === "string" ? __SB_KEY__ : "";
export const REMOTE = !!(SB_URL && SB_KEY);
const sb = REMOTE ? createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "hampatu-auth" } }) : null;

const vacio = () => Object.fromEntries(COLS.map((c) => [c, {}]));
const copia = (x) => JSON.parse(JSON.stringify(x));

/* The examples, with timestamps moved so the newest reads as "an hour ago". */
function fresh() {
  const data = copia(SEED);
  let max = 0;
  COLS.forEach((c) => Object.values(data[c] || {}).forEach((d) => { max = Math.max(max, d.ts || 0); }));
  const off = Date.now() - 3600000 - max;
  COLS.forEach((c) => { data[c] = data[c] || {}; Object.values(data[c]).forEach((d) => { if (d.ts) d.ts += off; }); });
  return data;
}

/* ---------- shared state + subscriptions ---------- */
let state = vacio();
let meta = { remote: REMOTE, status: REMOTE ? "loading" : "ready", uid: null, email: "", cuenta: false, admin: !REMOTE, recovery: false, nuevo: false };
let snapshot = null;
const listeners = new Set();
function emit() { snapshot = null; listeners.forEach((l) => l()); }
function setMeta(p) { meta = { ...meta, ...p }; emit(); }
function getSnapshot() {
  if (!snapshot) {
    snapshot = {};
    COLS.forEach((c) => { snapshot[c] = Object.entries(state[c]).map(([id, d]) => ({ ...d, id })); });
  }
  return snapshot;
}
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function useData() { return useSyncExternalStore(subscribe, getSnapshot); }
export function useMeta() { return useSyncExternalStore(subscribe, () => meta); }

let counter = 0;
export function newId() { return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (++counter); }

/* ================= LOCAL (demo) ================= */
/* Demo accounts live only in this browser, so the password is kept as typed. */
const CUENTAS = "hampatu-cuentas", SESION = "hampatu-sesion";
function leerJSON(k, d) { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } }
function guardarJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
function sesionLocal(email) {
  const c = email && leerJSON(CUENTAS, {})[email];
  meta = { ...meta, uid: c ? c.uid : null, email: c ? email : "", cuenta: !!c };
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}
function commit(change) {
  const before = JSON.stringify(state);
  change();
  if (!persist()) { state = JSON.parse(before); return Promise.reject({ code: "quota_exceeded" }); }
  emit();
  return Promise.resolve();
}
const local = {
  set: (col, id, data) => commit(() => { state[col][id] = copia(data); }),
  update: (col, id, data) => (state[col][id]
    ? commit(() => { Object.assign(state[col][id], copia(data)); })
    : Promise.reject({ code: "invalid_argument" })),
  removeMany: (pairs) => commit(() => { pairs.forEach(([col, id]) => { delete state[col][id]; }); }),
  reset: () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = fresh(); persist(); emit(); return Promise.resolve();
  },
};
if (!REMOTE) {
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); state = s && typeof s === "object" ? s : fresh(); }
  catch (e) { state = fresh(); }
  COLS.forEach((c) => { state[c] = state[c] || {}; });
  persist();
  try { sesionLocal(localStorage.getItem(SESION) || ""); } catch (e) { /* ignore */ }
}

/* ================= SUPABASE (red real) ================= */
async function loadAll() {
  const out = vacio(), step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await sb.from("docs").select("col,id,data").order("col").order("id").range(from, from + step - 1);
    if (error) throw error;
    data.forEach((r) => { if (out[r.col]) out[r.col][r.id] = r.data || {}; });
    if (data.length < step) break;
  }
  state = out;
  setMeta({ status: "ready" });
}
function recargar() { return loadAll().catch(() => { if (meta.status === "loading") setMeta({ status: "error" }); }); }

/* Old anonymous sessions from before accounts existed count as signed out. */
async function leerSesion(session) {
  const u = session && session.user, cuenta = !!(u && !u.is_anonymous);
  let admin = false;
  if (cuenta) {
    const { data } = await sb.rpc("is_admin");
    admin = data === true;
  }
  setMeta({ uid: cuenta ? u.id : null, email: cuenta ? u.email || "" : "", cuenta, admin });
  if (cuenta) asegurarPerfil(u.id, (u.user_metadata && u.user_metadata.nombre) || "").catch(() => {});
}

/* Every account gets a profile the first time it signs in (also after confirming the email). */
let perfilEnCurso = null;
function asegurarPerfil(uid, nombre) {
  if (!perfilEnCurso) {
    perfilEnCurso = (async () => {
      const d = { nombre: String(nombre || meta.email.split("@")[0]).slice(0, 60), ts: Date.now(), by: uid };
      if (!REMOTE) {
        if (!state.perfiles[uid]) { await local.set("perfiles", uid, d); setMeta({ nuevo: true }); }
        return;
      }
      const { data, error } = await sb.from("docs").select("id").eq("col", "perfiles").eq("id", uid).maybeSingle();
      if (error || data) return;
      const r = await sb.from("docs").insert({ col: "perfiles", id: uid, data: d });
      if (!r.error) { state.perfiles[uid] = d; setMeta({ nuevo: true }); }
    })().finally(() => { perfilEnCurso = null; });
  }
  return perfilEnCurso;
}
export function perfilVisto() { setMeta({ nuevo: false }); }

if (REMOTE) {
  sb.auth.getSession().then(({ data }) => leerSesion(data.session));
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") setMeta({ recovery: true });
    if (ev !== "INITIAL_SESSION") setTimeout(() => leerSesion(session), 0);
  });
  recargar();
  sb.channel("docs-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
      if (p.eventType === "DELETE") {
        const o = p.old || {};
        if (state[o.col] && state[o.col][o.id]) { delete state[o.col][o.id]; emit(); }
      } else {
        const n = p.new || {};
        if (state[n.col]) { state[n.col][n.id] = n.data || {}; emit(); }
      }
    })
    .subscribe();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") recargar(); });
  window.addEventListener("online", recargar);
}

/* Writing needs an account; reading does not. */
export async function ensureUid() {
  if (!REMOTE) { if (!meta.cuenta) throw { code: "cuenta" }; return meta.uid; }
  const { data } = await sb.auth.getSession();
  const u = data.session && data.session.user;
  if (!u || u.is_anonymous) throw { code: "cuenta" };
  return u.id;
}

const remote = {
  async set(col, id, data) {
    const uid = await ensureUid();
    const d = copia(data); if (!d.by) d.by = uid;
    const { error } = await sb.from("docs").upsert({ col, id, data: d });
    if (error) throw error;
    state[col][id] = d; emit();
  },
  async update(col, id, part) {
    await ensureUid();
    if (!state[col][id]) throw { code: "invalid_argument" };
    const d = { ...state[col][id], ...copia(part) };
    const { data, error } = await sb.from("docs").update({ data: d }).eq("col", col).eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw { code: "42501" };
    state[col][id] = d; emit();
  },
  async removeMany(pairs) {
    if (!pairs.length) return;
    await ensureUid();
    const [c0, i0] = pairs[0];
    const { data, error } = await sb.from("docs").delete().eq("col", c0).eq("id", i0).select("id");
    if (error) throw error;
    if (!data.length) throw { code: "42501" };
    /* Replies, sign-ups and votes go with it (the database does this too). */
    const resto = pairs.slice(1), porCol = {};
    resto.forEach(([c, i]) => { (porCol[c] = porCol[c] || []).push(i); });
    await Promise.all(Object.entries(porCol).map(([c, ids]) => sb.from("docs").delete().eq("col", c).in("id", ids)));
    pairs.forEach(([c, i]) => { delete state[c][i]; });
    emit();
  },
  /* Admin: load the examples into the shared network. */
  async reset() {
    await ensureUid();
    const data = fresh(), rows = [];
    COLS.forEach((c) => Object.entries(data[c]).forEach(([id, d]) => rows.push({ col: c, id, data: d })));
    const { error } = await sb.from("docs").upsert(rows);
    if (error) throw error;
    await loadAll();
  },
};

export const store = REMOTE ? remote : local;

/* Admin: remove every example (ids "ej-…", and sign-ups "…__ej-u…"). */
const esEjemplo = (id) => id.startsWith("ej-") || id.includes("__ej-u");
export async function borrarEjemplos() {
  if (!REMOTE) {
    COLS.forEach((c) => Object.keys(state[c]).forEach((id) => { if (esEjemplo(id)) delete state[c][id]; }));
    persist(); emit(); return;
  }
  await ensureUid();
  for (const pat of ["ej-%", "%__ej-u%"]) {
    const { error } = await sb.from("docs").delete().like("id", pat);
    if (error) throw error;
  }
  await loadAll();
}
export function hayEjemplos() { return COLS.some((c) => Object.keys(state[c]).some(esEjemplo)); }

/* Photos: Supabase Storage (bucket «fotos») or, in the demo, inside the post. */
export async function uploadPhoto(blob) {
  if (REMOTE) {
    const uid = await ensureUid();
    const path = uid + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ".jpg";
    const { error } = await sb.storage.from("fotos").upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000" });
    if (error) throw { code: "foto" };
    return sb.storage.from("fotos").getPublicUrl(path).data.publicUrl;
  }
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej({ code: "foto" });
    r.readAsDataURL(blob);
  });
}

/* ---------- accounts ---------- */
const volverAqui = () => window.location.origin + window.location.pathname;
function errAuth(error, porDefecto) {
  const c = (error && error.code) || "";
  if (c === "user_already_exists" || c === "email_exists") return { code: "ya_existe" };
  if (c === "weak_password") return { code: "clave_debil" };
  if (c === "email_not_confirmed") return { code: "sin_confirmar" };
  if (c === "invalid_credentials") return { code: "login" };
  if (c === "email_address_invalid" || c === "validation_failed") return { code: "correo_mal" };
  if (/rate_limit/.test(c)) return { code: "muchos_correos" };
  if (c === "signup_disabled") return { code: "sin_registro" };
  return { code: porDefecto, message: error && error.message };
}

/* Returns "ok" when the account is open, or "revisa" when the email has to be confirmed first. */
export async function registrarse(email, password, nombre) {
  if (!REMOTE) {
    const cs = leerJSON(CUENTAS, {});
    if (cs[email]) throw { code: "ya_existe" };
    cs[email] = { uid: "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), pass: password };
    guardarJSON(CUENTAS, cs);
    try { localStorage.setItem(SESION, email); } catch (e) { /* ignore */ }
    sesionLocal(email); emit();
    await asegurarPerfil(meta.uid, nombre);
    return "ok";
  }
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: volverAqui(), data: { nombre } } });
  if (error) throw errAuth(error, "registro");
  /* With email confirmation on, an address that is already registered comes back with no identities. */
  if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw { code: "ya_existe" };
  if (!data.session) return "revisa";
  await leerSesion(data.session);
  return "ok";
}

export async function entrar(email, password) {
  if (!REMOTE) {
    const c = leerJSON(CUENTAS, {})[email];
    if (!c || c.pass !== password) throw { code: "login" };
    try { localStorage.setItem(SESION, email); } catch (e) { /* ignore */ }
    sesionLocal(email); emit();
    return;
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw errAuth(error, "login");
  await leerSesion(data.session);
}

export async function salir() {
  if (REMOTE) await sb.auth.signOut();
  else { try { localStorage.removeItem(SESION); } catch (e) { /* ignore */ } }
  setMeta({ uid: null, email: "", cuenta: false, admin: !REMOTE, recovery: false, nuevo: false });
}

export async function recuperarClave(email) {
  if (!REMOTE) throw { code: "sin_red" };
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: volverAqui() });
  if (error) throw errAuth(error, "sesion");
}

export async function nuevaClave(password) {
  if (!REMOTE) throw { code: "sin_red" };
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw errAuth(error, "sesion");
  setMeta({ recovery: false });
}
export function cancelarRecuperacion() { setMeta({ recovery: false }); }
