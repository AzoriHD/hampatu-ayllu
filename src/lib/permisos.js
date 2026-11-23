/*
 * Qué puede hacer la cuenta abierta. Sirve para enseñar u ocultar botones:
 * quien de verdad lo comprueba es la base de datos (políticas RLS de supabase.sql).
 *
 *   admin        → correo en admin_emails: todo, también dar y quitar permisos
 *   coordinador  → roles_usuario: gestiona proyectos, comunidades, candidaturas, finanzas, informes y resultados
 *   representa   → comunidades en las que es representante aceptado
 *   gestiona     → proyectos de los que es responsable
 *   participa    → proyectos en los que está (equipo o comunidad vinculada)
 */
import { REMOTE } from "./store.js";
import { filas, useCarga } from "./tablas.js";

const VACIO = { cargado: false, admin: false, coordinador: false, representa: new Set(), gestiona: new Set(), participa: new Set(), miembros: [] };

async function cargar(meta) {
  if (!meta.cuenta || !meta.uid) return { ...VACIO, cargado: true };
  /* Demostración: quien entra lo puede todo, como en el resto de la demo */
  if (!REMOTE) return { ...VACIO, cargado: true, admin: true, coordinador: true, todo: true };
  const [roles, miembros, equipo] = await Promise.all([
    filas("roles_usuario", { eq: { user_id: meta.uid }, orden: null }),
    filas("comunidad_miembros", { eq: { user_id: meta.uid } }),
    filas("proyecto_equipo", { eq: { user_id: meta.uid } }),
  ]);
  const representa = new Set(miembros.filter((m) => m.rol === "representante" && m.estado === "aceptada").map((m) => m.comunidad));
  const participa = new Set(equipo.map((e) => e.proyecto));
  if (representa.size) {
    const v = await filas("proyecto_comunidades", { en: { comunidad: [...representa] }, eq: { estado: "aceptada" } });
    v.forEach((x) => participa.add(x.proyecto));
  }
  return {
    cargado: true, admin: !!meta.admin, coordinador: !!meta.admin || roles.some((r) => r.rol === "coordinador"),
    representa, participa, miembros, gestiona: new Set(equipo.filter((e) => e.rol === "responsable").map((e) => e.proyecto)),
  };
}

/* Se usa una vez en App.jsx y se reparte por el contexto */
export function usePermisosCarga(meta) {
  const r = useCarga(() => cargar(meta), [meta.cuenta, meta.uid, meta.admin]);
  return r.datos || VACIO;
}

/* Ayudas: p = permisos */
export const puede = {
  coordinar: (p) => !!(p.todo || p.coordinador),
  gestionar: (p, proyecto) => !!(p.todo || p.coordinador || p.gestiona.has(proyecto)),
  participar: (p, proyecto) => !!(p.todo || p.coordinador || p.participa.has(proyecto)),
  representar: (p, comunidad) => !!(p.todo || p.coordinador || p.representa.has(comunidad)),
  crearProyecto: (p) => !!(p.todo || p.coordinador || p.representa.size),
  publicarNecesidad: (p) => !!(p.todo || p.coordinador || p.representa.size || p.gestiona.size),
};
