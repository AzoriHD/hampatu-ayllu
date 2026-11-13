/*
 * Almacén de datos de la app.
 *
 * - Con Supabase configurado (variables de entorno en Vercel), todo se guarda
 *   en una base de datos compartida: lo que publica uno lo ven todos al momento.
 * - Sin Supabase, funciona como demostración y guarda en este navegador.
 *
 * Coordinación (admin): entra con correo y contraseña. Solo las cuentas que
 * estén en la tabla admin_emails de Supabase pueden marcar fechas, verificar
 * fotos, editar o borrar cualquier cosa y cargar o borrar los ejemplos.
 */
import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import SEED from "../data/seed.js";

export const COLS = ["comunidades", "avisos", "respuestas", "fechas", "votos", "apuntes"];
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
let meta = { remote: REMOTE, status: REMOTE ? "loading" : "ready", uid: null, email: "", admin: !REMOTE };
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
function localUid() {
  try {
    let id = localStorage.getItem("hampatu-uid");
    if (!id) { id = "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem("hampatu-uid", id); }
    return id;
  } catch (e) { return "u-anon"; }
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
  meta = { ...meta, uid: localUid() };
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

async function leerSesion(session) {
  const u = session && session.user;
  let admin = false;
  if (u && !u.is_anonymous) {
    const { data } = await sb.rpc("is_admin");
    admin = data === true;
  }
  setMeta({ uid: u ? u.id : null, email: (u && u.email) || "", admin });
}

if (REMOTE) {
  sb.auth.getSession().then(({ data }) => leerSesion(data.session));
  sb.auth.onAuthStateChange((ev, session) => { if (ev !== "INITIAL_SESSION") setTimeout(() => leerSesion(session), 0); });
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

/* Visitors get an anonymous account the first time they write something. */
let anonEnCurso = null;
export async function ensureUid() {
  if (!REMOTE) return meta.uid;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  if (!anonEnCurso) anonEnCurso = sb.auth.signInAnonymously().finally(() => { anonEnCurso = null; });
  const r = await anonEnCurso;
  if (r.error) throw { code: "sesion", message: r.error.message };
  await leerSesion(r.data.session);
  return r.data.user.id;
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

/* Coordination sign-in (email + password created in Supabase). */
export async function entrarCoordinacion(email, password) {
  if (!REMOTE) throw { code: "sin_red" };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw { code: "login" };
  await leerSesion(data.session);
  if (!meta.admin) { await salirCoordinacion(); throw { code: "no_admin" }; }
}
export async function salirCoordinacion() {
  if (REMOTE) await sb.auth.signOut();
  setMeta({ uid: null, email: "", admin: false });
}
