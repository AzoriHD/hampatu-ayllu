/*
 * Almacén de datos de la app.
 *
 * Ahora guarda todo en el navegador de cada persona (localStorage), así que
 * cada visitante ve los ejemplos más lo que publique él mismo.
 * Para que la red sea compartida de verdad, este archivo es el único que hay
 * que cambiar: las mismas funciones (set, update, removeMany, uploadPhoto)
 * pueden llamar a una base de datos como Supabase o Firebase.
 */
import { useSyncExternalStore } from "react";
import SEED from "../data/seed.js";

const KEY = "hampatu-react-v1";
export const COLS = ["comunidades", "avisos", "respuestas", "fechas", "votos", "apuntes"];

function fresh() {
  const data = JSON.parse(JSON.stringify(SEED));
  // Move the example timestamps so the newest one reads as "an hour ago".
  let max = 0;
  COLS.forEach((c) => Object.values(data[c] || {}).forEach((d) => { max = Math.max(max, d.ts || 0); }));
  const off = Date.now() - 3600000 - max;
  COLS.forEach((c) => Object.values(data[c] || {}).forEach((d) => { if (d.ts) d.ts += off; }));
  return data;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") return saved;
  } catch (e) { /* storage unavailable: start from the examples */ }
  return fresh();
}

let state = load();
COLS.forEach((c) => { state[c] = state[c] || {}; });
let snapshot = null;
const listeners = new Set();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}
function emit() { snapshot = null; listeners.forEach((l) => l()); }
persist();

function getSnapshot() {
  if (!snapshot) {
    snapshot = {};
    COLS.forEach((c) => { snapshot[c] = Object.entries(state[c]).map(([id, d]) => ({ ...d, id })); });
  }
  return snapshot;
}
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

/* Apply a change; if the browser has no room left, undo it and report it. */
function commit(change) {
  const before = JSON.stringify(state);
  change();
  if (!persist()) { state = JSON.parse(before); return Promise.reject({ code: "quota_exceeded" }); }
  emit();
  return Promise.resolve();
}

let counter = 0;
export function newId() { return "l" + Date.now().toString(36) + (++counter); }

export const store = {
  set: (col, id, data) => commit(() => { state[col][id] = JSON.parse(JSON.stringify(data)); }),
  update: (col, id, data) => (state[col][id]
    ? commit(() => { Object.assign(state[col][id], JSON.parse(JSON.stringify(data))); })
    : Promise.reject({ code: "invalid_argument" })),
  removeMany: (pairs) => commit(() => { pairs.forEach(([col, id]) => { delete state[col][id]; }); }),
  reset: () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = fresh(); persist(); emit();
  },
};

export function useData() { return useSyncExternalStore(subscribe, getSnapshot); }

/* Photos are kept inside the post as an image address (data URL). */
export function uploadPhoto(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej({ code: "foto" });
    r.readAsDataURL(blob);
  });
}

/* One anonymous id per browser, used for votes and sign-ups. */
export function getUid() {
  try {
    let id = localStorage.getItem("hampatu-uid");
    if (!id) { id = "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem("hampatu-uid", id); }
    return id;
  } catch (e) { return "u-anon"; }
}
