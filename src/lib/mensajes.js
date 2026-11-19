/*
 * Mensajes privados entre personas con cuenta.
 *
 * Tabla public.mensajes (bloque 9 de supabase.sql): cada mensaje solo lo leen quien lo manda y quien lo
 * recibe, y lo único que se puede cambiar después es «leído» (y solo quien lo recibe). Llegan al momento
 * con Supabase Realtime. Sin Supabase (demostración) se guardan en este navegador.
 */
import { useSyncExternalStore } from "react";
import { ensureUid, REMOTE, sb } from "./store.js";

const KEY = "hampatu-mensajes";
const CAMPOS = "id,de,para,texto,nombre,ref,leido,created_at";
let lista = [];
let yo = "";
let canal = null;
const subs = new Set();
function emit() { lista = lista.slice(); subs.forEach((f) => f()); }
export function useMensajes() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => lista);
}

function leerLocal() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
function guardarLocal(l) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-1500))); } catch (e) { throw { code: "quota_exceeded" }; } }
const orden = (a, b) => String(a.created_at).localeCompare(String(b.created_at));
function poner(m) {
  const i = lista.findIndex((x) => x.id === m.id);
  if (i >= 0) lista[i] = { ...lista[i], ...m }; else { lista.push(m); lista.sort(orden); }
  emit();
}

/* Carga los mensajes de esta cuenta y escucha los nuevos. Devuelve cómo dejar de escuchar. */
export function iniciarMensajes(uid) {
  yo = uid || "";
  if (!yo) { lista = []; emit(); return () => {}; }
  if (!REMOTE) {
    const cargar = () => { lista = leerLocal().filter((m) => m.de === yo || m.para === yo).sort(orden); emit(); };
    cargar();
    const f = (e) => { if (e.key === KEY) cargar(); };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }
  let vivo = true;
  sb.from("mensajes").select(CAMPOS).or("de.eq." + yo + ",para.eq." + yo).order("created_at", { ascending: true }).limit(2000)
    .then(({ data, error }) => { if (vivo && !error) { lista = data || []; emit(); } });
  canal = sb.channel("mensajes-" + yo)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: "para=eq." + yo }, (p) => vivo && poner(p.new))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mensajes", filter: "de=eq." + yo }, (p) => vivo && poner(p.new))
    .subscribe();
  /* Al volver a la pestaña, se recarga por si se perdió algo sin conexión */
  const alVolver = () => {
    if (document.visibilityState !== "visible") return;
    sb.from("mensajes").select(CAMPOS).or("de.eq." + yo + ",para.eq." + yo).order("created_at", { ascending: true }).limit(2000)
      .then(({ data, error }) => { if (vivo && !error) { lista = data || []; emit(); } });
  };
  document.addEventListener("visibilitychange", alVolver);
  return () => { vivo = false; document.removeEventListener("visibilitychange", alVolver); if (canal) { sb.removeChannel(canal); canal = null; } lista = []; emit(); };
}

export async function enviarMensaje(para, texto, ref, nombre) {
  const de = await ensureUid();
  texto = String(texto || "").trim().slice(0, 2000);
  if (!texto) throw { code: "vacio" };
  if (!para || para === de) throw { code: "42501" };
  const fila = { para, texto, nombre: String(nombre || "").slice(0, 60) || null, ref: ref || null };
  if (!REMOTE) {
    const m = { ...fila, id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), de, leido: false, created_at: new Date().toISOString() };
    const l = leerLocal(); l.push(m); guardarLocal(l); poner(m);
    return m;
  }
  const { data, error } = await sb.from("mensajes").insert(fila).select(CAMPOS).single();
  if (error) throw error;
  poner(data);
  return data;
}

/* Marca como leídos los mensajes que «otro» le mandó a esta cuenta */
export async function marcarLeidos(otro) {
  const sin = lista.filter((m) => m.de === otro && m.para === yo && !m.leido);
  if (!sin.length) return;
  sin.forEach((m) => { m.leido = true; }); emit();
  if (!REMOTE) {
    const l = leerLocal(); l.forEach((m) => { if (m.de === otro && m.para === yo) m.leido = true; }); guardarLocal(l);
    return;
  }
  await sb.from("mensajes").update({ leido: true }).eq("de", otro).eq("para", yo).eq("leido", false);
}

/* Conversaciones: una por persona, la más reciente primero */
export function conversaciones(l, uid) {
  const m = {};
  l.forEach((x) => {
    const otro = x.de === uid ? x.para : x.de;
    const c = m[otro] || (m[otro] = { otro, ultimo: null, sinLeer: 0, nombre: "" });
    c.ultimo = x;
    if (x.para === uid && !x.leido) c.sinLeer++;
    if (x.de === otro && x.nombre) c.nombre = x.nombre;
  });
  return Object.values(m).sort((a, b) => orden(b.ultimo, a.ultimo));
}
export const sinLeerTotal = (l, uid) => l.filter((x) => x.para === uid && !x.leido).length;
