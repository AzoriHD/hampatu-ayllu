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
