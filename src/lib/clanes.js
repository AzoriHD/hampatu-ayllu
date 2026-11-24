/* Comunidades como clanes: forma de entrar, número de miembros y mis comunidades (supabase.sql, bloque 16). */
import { REMOTE, sb } from "./store.js";
import { filas, useCarga } from "./tablas.js";
import { puede } from "./permisos.js";

/* [ES, EN, explicación ES, explicación EN] */
export const INGRESOS = {
  abierta: ["Abierta", "Open", "Quien quiera ser miembro entra directamente.", "Anyone who wants to be a member joins straight away."],
  solicitud: ["Con solicitud", "By request", "Sus representantes aceptan cada solicitud.", "Its representatives approve each request."],
  cerrada: ["Cerrada", "Closed", "Ahora no admite miembros nuevos.", "Not taking new members right now."],
};
export const ingresoDe = (c) => (c && INGRESOS[c.ingreso] ? c.ingreso : "solicitud");

/* { idComunidad: nº de miembros aceptados } */
export async function cuentasMiembros() {
  if (REMOTE) {
    const { data, error } = await sb.rpc("comunidad_cuentas");
    if (error) return {};
    return Object.fromEntries((data || []).map((r) => [r.comunidad, r.miembros]));
  }
  const n = {};
  (await filas("comunidad_miembros", { eq: { estado: "aceptada" }, orden: null })).forEach((m) => { n[m.comunidad] = (n[m.comunidad] || 0) + 1; });
  return n;
}

/* Para la lista: cuántos son, a cuáles pertenezco y qué solicitudes tengo que decidir */
export function useClanes(meta, uid, permisos) {
  const rep = [...(permisos.representa || [])];
  const coord = puede.coordinar(permisos);
  const r = useCarga(async () => {
    const [n, mias, pend] = await Promise.all([
      cuentasMiembros(),
      meta.cuenta && uid ? filas("comunidad_miembros", { eq: { user_id: uid }, orden: null }) : [],
      coord ? filas("comunidad_miembros", { eq: { estado: "solicitada" }, orden: null })
        : rep.length ? filas("comunidad_miembros", { en: { comunidad: rep }, eq: { estado: "solicitada" }, orden: null }) : [],
    ]);
    const pendientes = {};
    pend.forEach((m) => { if (m.user_id !== uid) pendientes[m.comunidad] = (pendientes[m.comunidad] || 0) + 1; });
    return { n, mias: Object.fromEntries(mias.map((m) => [m.comunidad, m])), pendientes };
  }, [meta.cuenta, uid, coord, rep.join(",")]);
  return r.datos || { n: {}, mias: {}, pendientes: {} };
}

/* Candado de cada apartado de la ficha (supabase.sql, bloque 17). La comunidad decide si es público o solo para sus miembros.
   [ES, EN, qué se oculta ES, qué se oculta EN] */
export const APARTADOS = {
  miembros: ["Miembros", "Members", "la lista de miembros y representantes", "the list of members and representatives"],
  proyectos: ["Proyectos", "Projects", "los proyectos en los que participa", "the projects it takes part in"],
  ayuda: ["Pide ayuda", "Help wanted", "sus peticiones de ayuda", "its calls for help"],
  avisos: ["Avisos", "Posts", "sus avisos, también en el tablón", "its posts, also on the board"],
};
export const privadoDe = (c, k) => !!(c && c.privado && c.privado[k] === true);
/* Lo público lo ve todo el mundo; lo privado, sus miembros y la coordinación.
   Sirve para enseñar u ocultar: quien de verdad lo comprueba es la base de datos. */
export const esMiembroDe = (permisos, com) => !!(permisos && (permisos.miembros || []).some((m) => m.comunidad === com && m.estado === "aceptada"));
export const veApartado = (c, k, permisos) => !privadoDe(c, k) || puede.coordinar(permisos) || esMiembroDe(permisos, c && c.id);
/* Iconos del candado (para <Svg d=…>) */
export const CANDADO = '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
export const CANDADO_ABIERTO = '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.75-1.4"/>';
