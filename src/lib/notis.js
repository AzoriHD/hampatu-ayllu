/*
 * Numeritos de aviso del menú: uno por tipo, cada uno con su color, para ver de un vistazo qué ha llegado.
 *   mensajes     → mensajes privados sin leer (botón de Mensajes)
 *   tablon       → avisos nuevos en el tablón desde la última vez que lo abriste
 *   propuestas   → propuestas de colaboración (candidaturas) por decidir, para quien las revisa (Colabora)
 *   solicitudes  → personas que piden entrar en una comunidad que representas o coordinas (Comunidades)
 *   coordinacion → el resto de lo que espera a la coordinación: proyectos, dinero, informes, validar, avistamientos
 */
import { useEffect, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { filas, useCarga } from "./tablas.js";
import { puede } from "./permisos.js";
import { sinLeerTotal, useMensajes } from "./mensajes.js";
import { useAvistamientos } from "./avistamientos.js";

export const NOTIS = {
  mensajes: { color: "#c0392b", es: ["mensaje sin leer", "mensajes sin leer"], en: ["unread message", "unread messages"] },
  tablon: { color: "#2f6fb5", es: ["aviso nuevo", "avisos nuevos"], en: ["new post", "new posts"] },
  propuestas: { color: "#2e8b57", es: ["propuesta de colaboración", "propuestas de colaboración"], en: ["collaboration proposal", "collaboration proposals"] },
  solicitudes: { color: "#7b4fb0", es: ["solicitud para entrar en una comunidad", "solicitudes para entrar en una comunidad"], en: ["request to join a community", "requests to join a community"] },
  coordinacion: { color: "#c46a12", es: ["tarea de coordinación", "tareas de coordinación"], en: ["coordination task", "coordination tasks"] },
};
/* En qué sección del menú sale cada número */
export const NOTI_DE = { tablon: "tablon", colabora: "propuestas", comunidades: "solicitudes", coordinacion: "coordinacion" };

export function textoNoti(tipo, n, en) {
  const t = NOTIS[tipo][en ? "en" : "es"];
  return n + " " + t[n === 1 ? 0 : 1];
}

const VISTO = "hampatu-tablon-visto";
function leerVisto() { try { return Number(localStorage.getItem(VISTO)) || 0; } catch (e) { return 0; } }
function guardarVisto(v) { try { localStorage.setItem(VISTO, String(v)); } catch (e) { /* ignore */ } }
const nada = () => [];

export function useNotis() {
  const { data, uid, meta, permisos, view } = useApp();
  const mensajes = useMensajes();
  const avis = useAvistamientos();
  const coord = meta.cuenta && puede.coordinar(permisos);
  const revisa = meta.cuenta && puede.publicarNecesidad(permisos);
  const decideMiembros = meta.cuenta && (coord || permisos.representa.size > 0);

  /* Tablón: la primera vez no se cuenta nada; luego, lo publicado por otras personas desde tu última visita */
  const [visto, setVisto] = useState(() => { const v = leerVisto(); if (!v) { const ahora = Date.now(); guardarVisto(ahora); return ahora; } return v; });
  useEffect(() => {
    if (view !== "tablon") return undefined;
    const marcar = () => { const ahora = Date.now(); guardarVisto(ahora); setVisto(ahora); };
    marcar();
    return marcar;
  }, [view]);

  const q = useCarga(async () => {
    if (!meta.cuenta) return null;
    const [cands, miem, ps, movs, infs, acts] = await Promise.all([
      revisa ? filas("candidaturas", { en: { estado: ["enviada", "en_revision"] } }).catch(nada) : [],
      decideMiembros ? filas("comunidad_miembros", { eq: { estado: "solicitada" } }).catch(nada) : [],
      coord ? filas("proyectos", { eq: { revision_pedida: true, publicado: false } }).catch(nada) : [],
      coord ? filas("movimientos", { eq: { estado: "registrado" } }).catch(nada) : [],
      coord ? filas("informes", { eq: { publicado: false } }).catch(nada) : [],
      coord ? filas("proyecto_actualizaciones", { eq: { validada: false }, en: { tipo: ["actividad", "resultado"] } }).catch(nada) : [],
    ]);
    return { cands, miem, ps, movs, infs, acts };
  }, [meta.cuenta, revisa, decideMiembros, coord]);
  const d = q.datos;

  return {
    mensajes: meta.cuenta ? sinLeerTotal(mensajes, uid) : 0,
    tablon: view === "tablon" ? 0 : data.avisos.filter((a) => (a.ts || 0) > visto && a.by !== uid).length,
    propuestas: d ? d.cands.filter((c) => c.by !== uid || permisos.todo).length : 0,
    solicitudes: d ? d.miem.filter((m) => m.user_id !== uid && puede.representar(permisos, m.comunidad)).length : 0,
    coordinacion: d && coord ? d.ps.filter((p) => !p.ejemplo).length + d.movs.length + d.infs.length + d.acts.length
      + (meta.admin ? avis.filter((a) => a.estado === "nuevo").length : 0) : 0,
  };
}
