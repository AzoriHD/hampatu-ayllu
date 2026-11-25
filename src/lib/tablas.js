/*
 * Tablas de la ampliación (proyectos, colabora, finanzas, informes…).
 *
 * - Con Supabase: cada tabla tiene sus permisos (RLS) en supabase.sql, bloques 10 a 15.
 *   La web solo pide; quien decide lo que se puede hacer es la base de datos.
 * - Sin Supabase (demostración): se guardan en este navegador y, como en el resto de la demo,
 *   quien entra lo puede hacer todo.
 *
 * Tras cada cambio se avisa a las vistas abiertas para que vuelvan a cargar (useCarga).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { ensureUid, REMOTE, sb, uploadPhoto, useData, useMeta } from "./store.js";
import { shrink } from "./utils.js";

/* ---------- avisos de cambios ---------- */
let version = 0;
const subs = new Set();
export function avisar() { version++; subs.forEach((f) => f()); }
export function useVersion() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => version); }

/* Carga datos y los vuelve a cargar cuando algo cambia o cambia la cuenta */
export function useCarga(fn, deps = []) {
  const v = useVersion();
  const meta = useMeta();
  const [st, setSt] = useState({ datos: null, error: null, cargando: true });
  useEffect(() => {
    let vivo = true;
    setSt((s) => ({ ...s, cargando: true }));
    Promise.resolve().then(fn).then(
      (datos) => { if (vivo) setSt({ datos, error: null, cargando: false }); },
      (error) => { if (vivo) setSt({ datos: null, error, cargando: false }); },
    );
    return () => { vivo = false; };
  }, [...deps, v, meta.uid, meta.status]); // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}

/* ---------- demostración: base de datos en este navegador ---------- */
const LKEY = "hampatu-tablas-v1";
function leerL() { try { return JSON.parse(localStorage.getItem(LKEY) || "{}") || {}; } catch (e) { return {}; } }
function guardarL(db) {
  try { localStorage.setItem(LKEY, JSON.stringify(db)); } catch (e) { throw { code: "quota_exceeded" }; }
}
export function vaciarDemo() { try { localStorage.removeItem(LKEY); } catch (e) { /* ignore */ } avisar(); }
const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));
const ahora = () => new Date().toISOString();

const AUTOR = { proyectos: "by", proyecto_comunidades: "by", proyecto_actualizaciones: "by", proyecto_comentarios: "by",
  proyecto_seguidores: "user_id", comunidad_miembros: "user_id", oportunidades: "by", candidaturas: "by",
  movimientos: "registrado_por", informes: "by", proyecto_equipo: "by", roles_usuario: "by",
  comunidad_eventos: "by", comunidad_asistencias: "user_id" };
const DEF = {
  proyectos: { estado: "preparacion", publicado: false, revision_pedida: false, ejemplo: false, acepta_donaciones: false, moneda: "pen",
    objetivos: [], actividades: [], calendario: [], necesidades: [], fotos: [], documentos: [] },
  comunidad_miembros: { rol: "miembro", rol_pedido: "miembro", estado: "solicitada", publico: false },
  proyecto_comunidades: { estado: "propuesta", propuesta_por: "proyecto" },
  proyecto_equipo: { rol: "colaborador", publico: false },
  proyecto_actualizaciones: { tipo: "avance", validada: false, fotos: [], documentos: [] },
  oportunidades: { estado: "abierta", publicado: true },
  candidaturas: { estado: "enviada", tipo: "persona", aparecer: false },
  movimientos: { estado: "registrado" },
  informes: { publicado: false, tipo: "actividad", archivos: [] },
  comunidad_rangos: { color: "tierra", orden: 0 },
  comunidad_eventos: { tipo: "reunion" },
};

function cumple(r, { eq, en, no } = {}) {
  for (const [k, v] of Object.entries(eq || {})) { if ((r[k] ?? null) !== v) return false; }
  for (const [k, v] of Object.entries(en || {})) { if (!v.includes(r[k])) return false; }
  for (const [k, v] of Object.entries(no || {})) { if ((r[k] ?? null) === v) return false; }
  return true;
}
function ordenar(l, orden, desc) {
  if (!orden) return l;
  return l.sort((a, b) => { const x = a[orden] ?? "", y = b[orden] ?? ""; return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); });
}

/* Lo que en Supabase hacen los disparadores (triggers), aquí en pequeño */
function efectosL(db, tabla, fila, antes, uid) {
  const T = (t) => (db[t] = db[t] || []);
  if (tabla === "comunidad_miembros") fila.publico = fila.estado === "aceptada";
  if (tabla === "proyectos" && !antes && !fila.ejemplo && uid) {
    T("proyecto_equipo").push({ id: nuevoId(), proyecto: fila.id, user_id: uid, rol: "responsable", publico: true, by: uid, created_at: ahora() });
  }
  if (tabla === "candidaturas" && antes && fila.estado === "aceptada" && antes.estado !== "aceptada" && fila.proyecto
      && !T("proyecto_equipo").some((e) => e.proyecto === fila.proyecto && e.user_id === fila.by)) {
    T("proyecto_equipo").push({ id: nuevoId(), proyecto: fila.proyecto, user_id: fila.by, rol: "colaborador", funcion: fila.categoria || null,
      publico: !!fila.aparecer, by: uid, created_at: ahora() });
  }
  if (antes) {
    const marca = (campo, cond, por, en) => { if (cond) { fila[por] = uid; fila[en] = ahora(); } };
    if (tabla === "movimientos") {
      marca("estado", fila.estado === "verificado" && antes.estado !== "verificado", "verificado_por", "verificado_en");
      marca("estado", fila.estado === "anulado" && antes.estado !== "anulado", "anulado_por", "anulado_en");
    }
    if (tabla === "informes") marca("publicado", fila.publicado && !antes.publicado, "publicado_por", "publicado_en");
    if (tabla === "proyecto_actualizaciones") marca("validada", fila.validada && !antes.validada, "validada_por", "validada_en");
    if (tabla === "proyecto_comunidades" || tabla === "comunidad_miembros" || tabla === "candidaturas") {
      marca("estado", fila.estado !== antes.estado, "decidido_por", "decidido_en");
    }
    if (tabla === "proyectos" && fila.publicado) fila.revision_pedida = false;
  }
}
function cascadaL(db, tabla, id) {
  if (tabla === "comunidad_rangos") (db.comunidad_miembros || []).forEach((m) => { if (m.rango === id) m.rango = null; });
  if (tabla === "comunidad_eventos") db.comunidad_asistencias = (db.comunidad_asistencias || []).filter((a) => a.evento !== id);
  if (tabla !== "proyectos") return;
  ["proyecto_equipo", "proyecto_comunidades", "proyecto_actualizaciones", "proyecto_comentarios", "proyecto_seguidores"]
    .forEach((t) => { db[t] = (db[t] || []).filter((r) => r.proyecto !== id); });
  ["oportunidades", "candidaturas", "informes", "donaciones"].forEach((t) => (db[t] || []).forEach((r) => { if (r.proyecto === id) r.proyecto = null; }));
}

/* ---------- consultas ---------- */
export async function filas(tabla, { eq, en, no, orden = "created_at", desc = true, limite } = {}) {
  if (REMOTE) {
    let q = sb.from(tabla).select("*");
    for (const [k, v] of Object.entries(eq || {})) q = v === null ? q.is(k, null) : q.eq(k, v);
    for (const [k, v] of Object.entries(en || {})) q = q.in(k, v.length ? v : ["__nada__"]);
    for (const [k, v] of Object.entries(no || {})) q = v === null ? q.not(k, "is", null) : q.neq(k, v);
    if (orden) q = q.order(orden, { ascending: !desc });
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  const l = ordenar((leerL()[tabla] || []).filter((r) => cumple(r, { eq, en, no })).map((r) => ({ ...r })), orden, desc);
  return limite ? l.slice(0, limite) : l;
}

export async function fila(tabla, id, campo = "id") {
  if (REMOTE) {
    const { data, error } = await sb.from(tabla).select("*").eq(campo, id).maybeSingle();
    if (error) throw error;
    return data;
  }
  const r = (leerL()[tabla] || []).find((x) => x[campo] === id);
  return r ? { ...r } : null;
}

export async function crear(tabla, datos) {
  const uid = await ensureUid();
  if (REMOTE) {
    const { data, error } = await sb.from(tabla).insert(datos).select().single();
    if (error) throw error;
    avisar();
    return data;
  }
  const db = leerL();
  const l = (db[tabla] = db[tabla] || []);
  const f = { ...(DEF[tabla] || {}), ...datos, created_at: ahora() };
  if (tabla !== "roles_usuario") f.id = nuevoId();
  if (AUTOR[tabla] && !f[AUTOR[tabla]]) f[AUTOR[tabla]] = uid;
  if (tabla === "candidaturas" && f.oportunidad) {
    const o = (db.oportunidades || []).find((x) => x.id === f.oportunidad);
    if (o) { f.proyecto = o.proyecto || null; f.comunidad = o.comunidad || null; f.categoria = o.categoria; }
  }
  const unico = { comunidad_miembros: ["comunidad", "user_id"], proyecto_comunidades: ["proyecto", "comunidad"],
    proyecto_equipo: ["proyecto", "user_id"], proyecto_seguidores: ["proyecto", "user_id"], roles_usuario: ["user_id"],
    comunidad_rangos: ["comunidad", "nombre"], comunidad_asistencias: ["evento", "user_id"] }[tabla];
  if (unico && l.some((r) => unico.every((k) => r[k] === f[k]))) throw { code: "23505" };
  l.push(f);
  efectosL(db, tabla, f, null, uid);
  guardarL(db);
  avisar();
  return { ...f };
}

export async function cambiar(tabla, id, parte, campo = "id") {
  const uid = await ensureUid();
  if (REMOTE) {
    const { data, error } = await sb.from(tabla).update(parte).eq(campo, id).select();
    if (error) throw error;
    if (!data || !data.length) throw { code: "42501" };
    avisar();
    return data[0];
  }
  const db = leerL();
  const f = (db[tabla] || []).find((r) => r[campo] === id);
  if (!f) throw { code: "42501" };
  const antes = { ...f };
  Object.assign(f, parte);
  if ("actualizado" in antes || tabla === "proyectos" || tabla === "oportunidades") f.actualizado = ahora();
  efectosL(db, tabla, f, antes, uid);
  guardarL(db);
  avisar();
  return { ...f };
}

export async function borrar(tabla, id, campo = "id") {
  await ensureUid();
  if (REMOTE) {
    const { data, error } = await sb.from(tabla).delete().eq(campo, id).select(campo);
    if (error) throw error;
    if (!data || !data.length) throw { code: "42501" };
    avisar();
    return;
  }
  const db = leerL();
  db[tabla] = (db[tabla] || []).filter((r) => r[campo] !== id);
  cascadaL(db, tabla, id);
  guardarL(db);
  avisar();
}

/* ---------- cifras públicas (solo lo verificado; ver cifras_publicas() en supabase.sql) ---------- */
export async function cifras(comunidades) {
  if (REMOTE) {
    const { data, error } = await sb.rpc("cifras_publicas");
    if (error) throw error;
    return data || {};
  }
  return cifrasL(leerL(), comunidades || []);
}
function sumaPor(l, clave, valor) {
  const m = {};
  l.forEach((r) => { const k = clave(r); m[k] = (m[k] || 0) + valor(r); });
  return m;
}
function cifrasL(db, comunidades) {
  const p = (db.proyectos || []).filter((x) => x.publicado && !x.ejemplo), ids = new Set(p.map((x) => x.id));
  const don = (db.donaciones || []).filter((d) => d.estado === "pagada");
  const mov = db.movimientos || [];
  const ing = mov.filter((m) => m.tipo === "ingreso" && m.estado === "verificado");
  const gas = mov.filter((m) => m.tipo === "gasto" && m.estado === "verificado");
  const act = (db.proyecto_actualizaciones || []).filter((a) => a.validada && ids.has(a.proyecto));
  const entradas = don.map((d) => ({ moneda: d.moneda, importe: d.cantidad, fecha: d.pagada_en || d.created_at, via: "donacion" }))
    .concat(ing.map((m) => ({ moneda: m.moneda, importe: m.importe, fecha: m.fecha, via: "ingreso" })));
  const monedas = [...new Set(entradas.map((e) => e.moneda))].sort();
  const estados = {};
  p.forEach((x) => { estados[x.estado] = (estados[x.estado] || 0) + 1; });
  const porMoneda = (l) => Object.entries(sumaPor(l, (r) => r.moneda, (r) => r.importe)).map(([moneda, total]) => ({ moneda, total, n: l.filter((r) => r.moneda === moneda).length }));
  const cat = {};
  gas.forEach((g) => { const k = g.categoria + "|" + g.moneda; cat[k] = cat[k] || { categoria: g.categoria, moneda: g.moneda, total: 0, n: 0 }; cat[k].total += g.importe; cat[k].n++; });
  const mes = {};
  entradas.forEach((e) => { const k = String(e.fecha).slice(0, 7) + "|" + e.moneda; mes[k] = mes[k] || { mes: String(e.fecha).slice(0, 7), moneda: e.moneda, total: 0 }; mes[k].total += e.importe; });
  const seg = sumaPor(db.proyecto_seguidores || [], (s) => s.proyecto, () => 1);
  const vinc = (db.proyecto_comunidades || []).filter((v) => v.estado === "aceptada" && ids.has(v.proyecto) && !String(v.comunidad).startsWith("ej-"));
  return {
    comunidades: comunidades.filter((c) => !c.ejemplo).length,
    comunidades_participantes: new Set(vinc.map((v) => v.comunidad)).size,
    proyectos: estados,
    actividades: act.filter((a) => a.tipo === "actividad").length,
    resultados: act.filter((a) => a.tipo === "resultado").length,
    informes: (db.informes || []).filter((i) => i.publicado).length,
    colaboradores: new Set((db.proyecto_equipo || []).filter((e) => e.rol === "colaborador" && ids.has(e.proyecto)).map((e) => e.user_id)).size,
    donantes: new Set(don.map((d) => d.cliente_ref || d.donante || d.id)).size,
    fondos: monedas.map((moneda) => {
      const l = entradas.filter((e) => e.moneda === moneda);
      return { moneda, donaciones: l.filter((e) => e.via === "donacion").reduce((s, e) => s + e.importe, 0),
        otros: l.filter((e) => e.via === "ingreso").reduce((s, e) => s + e.importe, 0), aportaciones: l.length };
    }),
    gastos: porMoneda(gas),
    gastos_categoria: Object.values(cat).sort((a, b) => b.total - a.total),
    material: porMoneda(gas.filter((g) => g.categoria === "material" || g.categoria === "equipamiento")),
    fondos_mes: Object.values(mes).sort((a, b) => (a.mes < b.mes ? -1 : 1)),
    por_proyecto: p.map((x) => ({
      id: x.id, moneda: x.moneda,
      recaudado: don.filter((d) => d.proyecto === x.id && d.moneda === x.moneda).reduce((s, d) => s + d.cantidad, 0)
        + ing.filter((m) => m.proyecto === x.id && m.moneda === x.moneda).reduce((s, m) => s + m.importe, 0),
      aportaciones: don.filter((d) => d.proyecto === x.id).length + ing.filter((m) => m.proyecto === x.id).length,
      gastado: gas.filter((m) => m.proyecto === x.id && m.moneda === x.moneda).reduce((s, m) => s + m.importe, 0),
      seguidores: seg[x.id] || 0,
    })),
    seguidores: seg,
  };
}

/* Cifras ya cargadas, compartidas por las vistas */
export function useCifras() {
  const data = useData();
  return useCarga(() => cifras(data.comunidades), [data.comunidades.length]);
}

/* ---------- archivos ---------- */
const TIPOS = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/* Fotos: se reducen y pierden los datos GPS del móvil antes de subirse (carpeta pública «fotos») */
export async function subirFoto(file) {
  if (!/^image\//.test(file.type || "")) throw { code: "archivo" };
  const blob = await shrink(file, 1600);
  return uploadPhoto(blob);
}

/* Documentos (PDF o imágenes). bucket «documentos» (público) o «justificantes» (privado: devuelve la ruta) */
export async function subirArchivo(file, bucket = "documentos") {
  let tipo = TIPOS[file.type];
  if (!tipo) throw { code: "archivo" };
  if (file.size > 10 * 1024 * 1024) throw { code: "archivo_grande" };
  let cuerpo = file;
  if (tipo !== "pdf") { cuerpo = await shrink(file, 1800); tipo = "jpg"; }
  const nombre = String(file.name || "documento").slice(0, 120);
  if (!REMOTE) {
    if (cuerpo.size > 400 * 1024) throw { code: "demo_doc" };
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej({ code: "archivo" }); r.readAsDataURL(cuerpo); });
    return { url, ruta: url, nombre, tipo: tipo === "pdf" ? "pdf" : "imagen" };
  }
  const uid = await ensureUid();
  const ruta = uid + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + tipo;
  const { error } = await sb.storage.from(bucket).upload(ruta, cuerpo, { contentType: tipo === "pdf" ? "application/pdf" : "image/jpeg", cacheControl: "31536000" });
  if (error) throw { code: "archivo_subir", message: error.message };
  const url = bucket === "documentos" ? sb.storage.from(bucket).getPublicUrl(ruta).data.publicUrl : "";
  return { url, ruta, nombre, tipo: tipo === "pdf" ? "pdf" : "imagen" };
}

/* Enlace temporal (1 hora) a un justificante privado */
export async function enlaceJustificante(ruta) {
  if (!REMOTE) return ruta;
  const { data, error } = await sb.storage.from("justificantes").createSignedUrl(ruta, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/* ---------- errores en palabras ---------- */
export function errTexto(e, en) {
  const L = (es, eng) => (en ? eng : es);
  const c = e && e.code, m = String((e && e.message) || "");
  if (c === "cuenta") return L("Entra o crea tu cuenta para hacerlo.", "Sign in or create an account to do this.");
  if (c === "42501") {
    if (m && !/row-level security|permission denied|violates/i.test(m)) return m;
    return L("No tienes permiso para hacer eso.", "You don't have permission to do that.");
  }
  if (c === "23505") return L("Eso ya estaba registrado.", "That was already registered.");
  if (c === "23514" || c === "22001" || c === "22P02") return L("Revisa los datos: algún campo está vacío, mal escrito o es demasiado largo.", "Check the form: a field is empty, invalid or too long.");
  if (c === "23503") return m && !/foreign key/i.test(m) ? m : L("Falta algo relacionado (un proyecto o una comunidad).", "Something it depends on is missing (a project or a community).");
  if (c === "archivo") return L("Solo se pueden subir PDF o imágenes (JPG, PNG o WebP).", "Only PDF files or images (JPG, PNG or WebP) can be uploaded.");
  if (c === "archivo_grande") return L("El archivo es demasiado grande (máximo 10 MB).", "The file is too large (10 MB max).");
  if (c === "archivo_subir") return L("No se pudo subir el archivo. Inténtalo otra vez.", "The file could not be uploaded. Try again.");
  if (c === "demo_doc") return L("En la versión de demostración solo caben archivos pequeños (menos de 400 KB).", "In the demo only small files fit (under 400 KB).");
  if (c === "quota_exceeded") return L("Este navegador ya no tiene sitio para guardar más datos de demostración.", "This browser has no room left for more demo data.");
  if (c === "foto") return L("No se pudo subir la foto. Inténtalo otra vez.", "The photo could not be uploaded. Try again.");
  return L("No se pudo guardar. Revisa la conexión e inténtalo otra vez.", "Could not save. Check your connection and try again.");
}
