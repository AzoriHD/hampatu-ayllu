/*
 * Avistamientos privados («He visto un sapo»).
 *
 * El sitio exacto del sapo no puede salir en el tablón, que lo lee cualquiera.
 * Por eso estos avisos van a una tabla aparte (public.avistamientos) que solo
 * leen quien lo envió y la coordinación, y sus fotos a una carpeta privada
 * (bucket «avistamientos»), que se ve con enlaces temporales.
 *
 * Sin Supabase (demostración) se guardan en este navegador.
 */
import { useSyncExternalStore } from "react";
import { ensureUid, REMOTE, sb } from "./store.js";

export const ESTADOS = {
  nuevo: ["Nuevo", "New"],
  revisado: ["En revisión", "Being checked"],
  confirmado: ["Confirmado", "Confirmed"],
  descartado: ["Descartado", "Discarded"],
};

const KEY = "hampatu-avistamientos";
let lista = [];
let cargado = false;
const subs = new Set();
function emit() { lista = lista.slice(); subs.forEach((f) => f()); }
export function useAvistamientos() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => lista);
}
export const avistamientosCargados = () => cargado;

function leerLocal() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
function guardarLocal(l) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { throw { code: "quota_exceeded" }; }
}

/* Quien envía ve los suyos; la coordinación, todos (lo decide la base de datos). */
export async function cargarAvistamientos(uid, admin) {
  if (!REMOTE) {
    const l = leerLocal();
    lista = admin ? l : l.filter((a) => a.by === uid);
  } else {
    const { data, error } = await sb.from("avistamientos").select("id,by,created_at,estado,data")
      .order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    lista = data;
  }
  cargado = true; emit();
}
export function vaciarAvistamientos() { lista = []; cargado = false; emit(); }

function blobADataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej({ code: "foto" }); r.readAsDataURL(blob); });
}

/* Las fotos ya llegan pasadas por shrink(): sin los datos de ubicación del móvil. */
export async function enviarAvistamiento(d, blobs) {
  const uid = await ensureUid();
  const fotos = [];
  for (const b of blobs.slice(0, 3)) {
    if (!REMOTE) { fotos.push(await blobADataUrl(b)); continue; }
    const path = uid + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + ".jpg";
    const { error } = await sb.storage.from("avistamientos").upload(path, b, { contentType: "image/jpeg" });
    if (error) throw { code: "foto" };
    fotos.push(path);
  }
  const data = { ...d, fotos, by: uid };
  if (!REMOTE) {
    const fila = { id: "v" + Date.now().toString(36), by: uid, created_at: new Date().toISOString(), estado: "nuevo", data };
    const l = leerLocal(); l.unshift(fila); guardarLocal(l);
    lista = [fila].concat(lista); emit();
    return;
  }
  const { data: fila, error } = await sb.from("avistamientos").insert({ data }).select("id,by,created_at,estado,data").single();
  if (error) {
    if (fotos.length) sb.storage.from("avistamientos").remove(fotos).catch(() => {});
    throw error;
  }
  lista = [fila].concat(lista); emit();
}

export async function cambiarEstado(id, estado) {
  if (!ESTADOS[estado]) return;
  if (!REMOTE) {
    const l = leerLocal(); const f = l.find((a) => a.id === id); if (f) f.estado = estado; guardarLocal(l);
  } else {
    await ensureUid();
    const { data, error } = await sb.from("avistamientos").update({ estado }).eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw { code: "42501" };
  }
  lista = lista.map((a) => (a.id === id ? { ...a, estado } : a)); emit();
}

export async function borrarAvistamiento(id) {
  const fila = lista.find((a) => a.id === id);
  if (!REMOTE) {
    guardarLocal(leerLocal().filter((a) => a.id !== id));
  } else {
    await ensureUid();
    const { data, error } = await sb.from("avistamientos").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw { code: "42501" };
    const fotos = (fila && fila.data && fila.data.fotos) || [];
    if (fotos.length) sb.storage.from("avistamientos").remove(fotos).catch(() => {});
  }
  lista = lista.filter((a) => a.id !== id); emit();
}

/* Enlaces temporales (1 hora) para ver las fotos privadas. */
const urls = {};
export async function urlFoto(path) {
  if (!REMOTE || /^data:/.test(path)) return path;
  const u = urls[path];
  if (u && u.hasta > Date.now()) return u.url;
  const { data, error } = await sb.storage.from("avistamientos").createSignedUrl(path, 3600);
  if (error) throw error;
  urls[path] = { url: data.signedUrl, hasta: Date.now() + 3300000 };
  return data.signedUrl;
}
