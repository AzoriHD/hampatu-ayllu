/* Panel de coordinación.
   «Por hacer» reúne en una sola bandeja todo lo que espera una decisión (lo que más tiempo lleva esperando, primero)
   y deja resolverlo sin salir de ella. El resto de pestañas sirven para buscar, revisar y corregir.
   Lo ven la administración y la coordinación; la base de datos comprueba cada acción (supabase.sql). */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { CATEGORIAS_C, ESTADOS_CAND, ESTADOS_P, PROYECTOS_EJEMPLO, TIPOS_ACT, TIPOS_CAND, TIPOS_INF } from "../data/proyectos.js";
import { REMOTE } from "../lib/store.js";
import { borrar, cambiar, crear, enlaceJustificante, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { NOTIS } from "../lib/notis.js";
import { dinero, estadoDonaciones } from "../lib/donaciones.js";
import { useAvistamientos } from "../lib/avistamientos.js";
import { Autor } from "./People.jsx";
import { CandidaturasRecibidas } from "./Collaborate.jsx";
import { DonacionesLista, Movimientos } from "./Finance.jsx";
import { InformeForm, InformesLista } from "./Impact.jsx";
import { Aviso, Cargando, Confirmar, ErrorCarga, EstadoP, fechaCorta, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

const MapaAvistamientos = lazy(() => import("./MapaAvistamientos.jsx"));

/* ---------- ayudas ---------- */
const TAB_KEY = "hampatu-coord-tab";
const leerTab = () => { try { return localStorage.getItem(TAB_KEY) || "bandeja"; } catch (e) { return "bandeja"; } };
const guardarTab = (k) => { try { localStorage.setItem(TAB_KEY, k); } catch (e) { /* sin almacenamiento */ } };
const DIA = 86400000;
const ms = (iso) => { const v = Date.parse(iso || ""); return isNaN(v) ? 0 : v; };
const dias = (iso) => { const v = ms(iso); return v ? Math.floor((Date.now() - v) / DIA) : 0; };
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const corta = (t, n = 140) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const ESPERA_LARGA = 7; /* días: a partir de aquí se marca «lleva tiempo esperando» */

/* Todo lo pendiente, de una vez. Se recarga solo cuando algo cambia (useCarga). */
function usePendientes() {
  const { uid, permisos } = useApp();
  return useCarga(async () => {
    if (!puede.coordinar(permisos)) return null;
    const [ps, miem, cands, ops, movs, infs, acts] = await Promise.all([
      filas("proyectos", { orden: "actualizado" }),
      filas("comunidad_miembros", { orden: "created_at" }),
      filas("candidaturas", { en: { estado: ["enviada", "en_revision"] } }),
      filas("oportunidades", {}),
      filas("movimientos", { eq: { estado: "registrado" } }),
      filas("informes", { eq: { publicado: false } }),
      filas("proyecto_actualizaciones", { eq: { validada: false }, en: { tipo: ["actividad", "resultado"] } }),
    ]);
    return {
      ps, miem, ops,
      proyectos: ps.filter((p) => !p.publicado && p.revision_pedida && !p.ejemplo),
      miembros: miem.filter((m) => m.estado === "solicitada"),
      /* nadie decide sus propias candidaturas */
      candidaturas: cands.filter((c) => c.by !== uid || permisos.todo),
      movimientos: movs,
      informes: infs,
      resultados: acts,
    };
  }, [uid, permisos.todo, permisos.coordinador]);
}

/* Qué se cuenta en cada pestaña */
function conteos(d, avisNuevos) {
  if (!d) return { total: 0 };
  const n = { proyectos: d.proyectos.length, comunidades: d.miembros.length, candidaturas: d.candidaturas.length,
    finanzas: d.movimientos.length, informes: d.informes.length, resultados: d.resultados.length, avistamientos: avisNuevos };
  n.total = Object.values(n).reduce((s, x) => s + x, 0);
  return n;
}

export default function Coordination() {
  const { meta, permisos } = useApp();
  const L = useL();
  const [tab, setTabS] = useState(leerTab);
  const [abrir, setAbrir] = useState(""); /* formulario que se abre al llegar a una pestaña desde un atajo */
  const cab = useRef(null);
  const pend = usePendientes();
  const avis = useAvistamientos();
  const avisNuevos = meta.admin || !REMOTE ? avis.filter((a) => a.estado === "nuevo").length : 0;
  const n = conteos(pend.datos, avisNuevos);
  const ir = (k, form) => {
    setTabS(k); guardarTab(k); setAbrir(form || "");
    if (cab.current) cab.current.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /* En el móvil las pestañas se deslizan: la elegida se centra para que siempre se vea */
  useEffect(() => {
    const el = cab.current && cab.current.querySelector('.chipbtn[aria-pressed="true"]');
    const fila = el && el.parentElement;
    if (fila && fila.scrollWidth > fila.clientWidth) fila.scrollTo({ left: el.offsetLeft - (fila.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [tab]);
  if (!puede.coordinar(permisos)) {
    return (
      <section id="v-coordinacion">
        <Vacio titulo={L("Solo para la coordinación", "Coordination team only")} texto={meta.cuenta ? L("Tu cuenta no tiene permisos de coordinación. Los da la administración.", "Your account has no coordination permissions. The administrators grant them.") : L("Entra con una cuenta de coordinación.", "Sign in with a coordination account.")} />
      </section>
    );
  }
  const tabs = [
    ["bandeja", L("Por hacer", "To do"), n.total],
    ["proyectos", L("Proyectos", "Projects"), n.proyectos, NOTIS.coordinacion.color],
    ["comunidades", L("Comunidades", "Communities"), n.comunidades, NOTIS.solicitudes.color],
    ["candidaturas", L("Candidaturas", "Applications"), n.candidaturas, NOTIS.propuestas.color],
    ["finanzas", L("Dinero", "Money"), n.finanzas, NOTIS.coordinacion.color],
    ["informes", L("Informes", "Reports"), n.informes, NOTIS.coordinacion.color],
    ["resultados", L("Validar", "Validate"), n.resultados, NOTIS.coordinacion.color],
    /* los avistamientos solo los lee quien tiene permiso en la base de datos (is_admin) */
    ...(meta.admin || !REMOTE ? [["mapa", L("Mapa", "Map")]] : []),
    ...(permisos.admin ? [["permisos", L("Equipo y permisos", "Team and permissions")]] : []),
    ["registro", L("Registro", "Log")],
  ];
  const actual = tabs.some(([k]) => k === tab) ? tab : "bandeja";
  return (
    <section id="v-coordinacion" aria-labelledby="h-coord">
      <div className="caja caja-cabeza" ref={cab}>
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-coord">{L("Coordinación", "Coordination")}</h2>
            <p className="intro">
              {pend.datos == null ? L("Revisar, publicar y verificar. Todo lo que se hace aquí queda en el registro de cambios.", "Review, publish and verify. Everything done here is kept in the change log.")
                : n.total ? <>{L("Tienes ", "You have ")}<b>{n.total}</b>{n.total === 1 ? L(" cosa esperando una decisión.", " item waiting for a decision.") : L(" cosas esperando una decisión.", " items waiting for a decision.")}{actual !== "bandeja" && <> <button type="button" className="linkbtn" onClick={() => ir("bandeja")}>{L("Ver todo lo pendiente", "See everything pending")}</button></>}</>
                : L("Todo al día: no hay nada esperando una decisión.", "All caught up: nothing is waiting for a decision.")}
            </p>
          </div>
        </header>
        <Pestanas etiqueta={L("Secciones", "Sections")} valor={actual} onCambio={(k) => ir(k)} opciones={tabs} />
      </div>
      {actual === "bandeja" && <Bandeja pend={pend} ir={ir} avisNuevos={avisNuevos} />}
      {actual === "proyectos" && <TabProyectos />}
      {actual === "comunidades" && <TabComunidades />}
      {actual === "candidaturas" && <TabCandidaturas />}
      {actual === "finanzas" && <TabFinanzas abrir={abrir === "movimiento"} />}
      {actual === "informes" && <TabInformes abrir={abrir === "informe"} />}
      {actual === "resultados" && <TabResultados />}
      {actual === "mapa" && <Suspense fallback={<div className="caja"><Cargando /></div>}><MapaAvistamientos /></Suspense>}
      {actual === "permisos" && permisos.admin && <TabPermisos />}
      {actual === "registro" && <TabRegistro />}
    </section>
  );
}

/* ---------- POR HACER: una bandeja con todo lo pendiente ---------- */
const TIPOS_B = {
  proyecto: ["Proyecto por publicar", "Project to publish", "proyectos"],
  miembro: ["Solicitud a una comunidad", "Request to a community", "comunidades"],
  candidatura: ["Candidatura", "Application", "candidaturas"],
  movimiento: ["Ingreso o gasto por verificar", "Income or spending to check", "finanzas"],
  informe: ["Informe por publicar", "Report to publish", "informes"],
  resultado: ["Actividad o resultado por validar", "Activity or result to validate", "resultados"],
};

function Bandeja({ pend, ir, avisNuevos }) {
  const { en, data, abrirVisto } = useApp();
  const L = useL();
  const [tipo, setTipo] = useState("");
  const [hecho, setHecho] = useState("");
  const t0 = useRef(0);
  useEffect(() => () => clearTimeout(t0.current), []);
  const avisar = (txt) => { setHecho(txt); clearTimeout(t0.current); t0.current = setTimeout(() => setHecho(""), 5000); };
  const d = pend.datos;

  const items = useMemo(() => {
    if (!d) return [];
    const l = [
      ...d.proyectos.map((x) => ({ tipo: "proyecto", x, desde: x.actualizado || x.created_at })),
      ...d.miembros.map((x) => ({ tipo: "miembro", x, desde: x.created_at })),
      ...d.candidaturas.map((x) => ({ tipo: "candidatura", x, desde: x.created_at })),
      ...d.movimientos.map((x) => ({ tipo: "movimiento", x, desde: x.created_at || x.fecha })),
      ...d.informes.map((x) => ({ tipo: "informe", x, desde: x.created_at })),
      ...d.resultados.map((x) => ({ tipo: "resultado", x, desde: x.created_at || x.fecha })),
    ];
    return l.sort((a, b) => ms(a.desde) - ms(b.desde)); /* lo que más espera, primero */
  }, [d]);
  const cuenta = (k) => items.filter((i) => i.tipo === k).length;
  const lista = tipo ? items.filter((i) => i.tipo === tipo) : items;
  const viejos = items.filter((i) => dias(i.desde) >= ESPERA_LARGA).length;
  const chips = [["", L("Todo", "All"), items.length], ...Object.keys(TIPOS_B).filter((k) => cuenta(k)).map((k) => [k, en ? TIPOS_B[k][1] : TIPOS_B[k][0], cuenta(k)])];
  return (
    <>
      <ErrorCarga error={pend.error} />
      <div className="caja">
        <div className="caja-tit">
          <h3 className="sub">{L("Por hacer", "To do")}</h3>
          <div className="atajos">
            <button type="button" className="btn-mini claro" onClick={() => ir("finanzas", "movimiento")}>+ {L("Ingreso o gasto", "Income or spending")}</button>
            <button type="button" className="btn-mini claro" onClick={() => ir("informes", "informe")}>+ {L("Informe", "Report")}</button>
          </div>
        </div>
        {avisNuevos > 0 && (
          <p className="notice bandeja-avis">
            <b>{avisNuevos === 1 ? L("1 avistamiento nuevo", "1 new sighting") : avisNuevos + L(" avistamientos nuevos", " new sightings")}</b>{" "}
            {L("del hampatu esperan revisión.", "of the hampatu are waiting for review.")}{" "}
            <button type="button" className="btn-mini" onClick={abrirVisto}>{L("Revisar avistamientos", "Review sightings")}</button>
          </p>
        )}
        {pend.cargando && !d ? <Cargando /> : items.length === 0 ? (
          <div className="bandeja-vacia">
            <p className="bandeja-ok" aria-hidden="true">✓</p>
            <p><b>{L("Todo al día.", "All caught up.")}</b> {L("Cuando alguien pida publicar un proyecto, unirse a una comunidad, se ofrezca o registre dinero, aparecerá aquí.", "When someone asks to publish a project, join a community, applies or records money, it will show up here.")}</p>
          </div>
        ) : (
          <>
            <p className="hint">
              {L("Lo que más tiempo lleva esperando sale primero. Resuélvelo aquí mismo o abre su sección para verlo con calma.", "What has waited longest comes first. Sort it out right here, or open its section to look at it calmly.")}
              {viejos > 0 && <> <b className="espera-txt">{viejos === 1 ? L("1 lleva más de una semana.", "1 has waited over a week.") : viejos + L(" llevan más de una semana.", " have waited over a week.")}</b></>}
            </p>
            {chips.length > 2 && <Pestanas etiqueta={L("Tipo", "Type")} valor={tipo} onCambio={setTipo} opciones={chips} />}
            <Aviso texto={hecho} tipo="ok" />
            <ul className="bandeja">
              {lista.map((i) => <ItemBandeja key={i.tipo + i.x.id} it={i} d={d} ir={ir} comunidades={data.comunidades} onHecho={avisar} />)}
            </ul>
          </>
        )}
      </div>
      <EstadoGeneral pend={pend} />
    </>
  );
}

function ItemBandeja({ it, d, ir, comunidades, onHecho }) {
  const { en, ago, perfilDe, irComunidad, irProyecto, escribirA } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const { tipo, x } = it;
  const nombreP = (id) => (id ? (d.ps.find((p) => p.id === id) || {}).nombre || "—" : L("Fondo general", "General fund"));
  const nombreC = (id) => (comunidades.find((c) => c.id === id) || {}).nombre || id;
  const persona = (u) => (perfilDe(u) || {}).nombre || L("Una persona", "Someone");
  const hecho = (fn, txt) => env.enviar(fn, () => onHecho(txt));
  const espera = dias(it.desde);
  const cuando = ms(it.desde) ? ago(ms(it.desde)) : "";
  const etiqueta = en ? TIPOS_B[tipo][1] : TIPOS_B[tipo][0];

  let titulo = "", info = null, acciones = null;
  if (tipo === "proyecto") {
    titulo = x.nombre;
    info = <><EstadoP estado={x.estado} /> {x.meta_fondos > 0 && <span className="meta">{L("objetivo ", "goal ")}{dinero(x.meta_fondos, x.moneda, en)}</span>}</>;
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => hecho(() => cambiar("proyectos", x.id, { publicado: true }), L("Publicado: ", "Published: ") + x.nombre)}>{L("Publicar", "Publish")}</button>
      <button type="button" className="btn-mini claro" onClick={() => irProyecto(x.id)}>{L("Ver ficha", "Open page")}</button>
    </>;
  } else if (tipo === "miembro") {
    const tieneReps = d.miem.some((m) => m.comunidad === x.comunidad && m.rol === "representante" && m.estado === "aceptada");
    titulo = persona(x.user_id) + " → " + nombreC(x.comunidad);
    info = <span className="meta">{x.rol_pedido === "representante" ? L("Pide representar a la comunidad", "Asks to represent the community") : L("Pide ser miembro", "Asks to be a member")}{x.cargo ? " · " + x.cargo : ""}
      {x.mensaje && <> · «{corta(x.mensaje, 120)}»</>}{tieneReps && <> · <b>{L("ya tiene representantes: mejor que decidan ellos", "it already has representatives: better let them decide")}</b></>}</span>;
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => hecho(() => cambiar("comunidad_miembros", x.id, { estado: "aceptada", rol: x.rol_pedido }), L("Aceptada la solicitud de ", "Request accepted: ") + persona(x.user_id))}>{L("Aceptar", "Accept")}</button>
      <Confirmar className="btn-mini claro" texto={L("Rechazar", "Decline")} si={L("Sí, rechazar", "Yes, decline")} onSi={() => hecho(() => cambiar("comunidad_miembros", x.id, { estado: "rechazada" }), L("Rechazada la solicitud de ", "Request declined: ") + persona(x.user_id))} />
      <button type="button" className="linkbtn" onClick={() => irComunidad(x.comunidad)}>{L("Ver comunidad", "Open community")}</button>
    </>;
  } else if (tipo === "candidatura") {
    const o = x.oportunidad && d.ops.find((y) => y.id === x.oportunidad);
    const p = x.proyecto && d.ps.find((y) => y.id === x.proyecto);
    const sobre = (o && o.titulo) || (p && p.nombre) || (x.comunidad && nombreC(x.comunidad)) || L("Propuesta a Hampatu Ayllu", "Proposal to Hampatu Ayllu");
    titulo = persona(x.by) + " · " + sobre;
    info = <span className="meta">{et(TIPOS_CAND, x.tipo)}{x.organizacion ? " · " + x.organizacion : ""}{x.categoria ? " · " + et(CATEGORIAS_C, x.categoria) : ""} · <span className="tag">{et(ESTADOS_CAND, x.estado)}</span>
      {x.mensaje && <span className="bandeja-cita">«{corta(x.mensaje, 160)}»</span>}</span>;
    const decidir = (estado, txt) => hecho(() => cambiar("candidaturas", x.id, { estado }), txt + persona(x.by));
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => decidir("aceptada", L("Aceptada la candidatura de ", "Application accepted: "))}>{L("Aceptar", "Accept")}</button>
      {x.estado === "enviada" && <button type="button" className="btn-mini claro" onClick={() => decidir("en_revision", L("En revisión: ", "Under review: "))}>{L("En revisión", "Under review")}</button>}
      <Confirmar className="btn-mini claro" peligro={false} texto={L("No seleccionar", "Not select")} si={L("Sí, no seleccionar", "Yes, not select")} onSi={() => decidir("rechazada", L("No seleccionada: ", "Not selected: "))} />
      <button type="button" className="linkbtn" onClick={() => ir("candidaturas")}>{L("Leer entera y responder", "Read in full and reply")}</button>
      <button type="button" className="linkbtn" onClick={() => escribirA(x.by, { ref: { titulo: L("Candidatura: ", "Application: ") + sobre } })}>{L("Escribir", "Message")}</button>
    </>;
  } else if (tipo === "movimiento") {
    titulo = (x.tipo === "gasto" ? "− " : "+ ") + dinero(x.importe, x.moneda, en) + " · " + x.concepto;
    info = <span className="meta">{x.tipo === "ingreso" ? L("Ingreso", "Income") : L("Gasto", "Spending")} · {nombreP(x.proyecto)} · {fechaCorta(x.fecha, en)} · {L("registró ", "recorded by ")}<Autor by={x.registrado_por} />
      {!x.justificante && <> · <b className="espera-txt">{L("sin justificante", "no receipt")}</b></>}</span>;
    const ver = () => env.enviar(async () => { const u = await enlaceJustificante(x.justificante); window.open(u, "_blank", "noopener"); });
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => hecho(() => cambiar("movimientos", x.id, { estado: "verificado" }), L("Verificado: ", "Verified: ") + x.concepto)}>{L("Verificar", "Verify")}</button>
      {x.justificante && <button type="button" className="btn-mini claro" onClick={ver}>{L("Ver justificante", "View receipt")}</button>}
      <button type="button" className="linkbtn" onClick={() => ir("finanzas")}>{L("Anular o corregir", "Cancel or fix")}</button>
    </>;
  } else if (tipo === "informe") {
    titulo = x.titulo;
    info = <span className="meta"><span className="tag">{et(TIPOS_INF, x.tipo)}</span> {x.proyecto ? nombreP(x.proyecto) : ""} · {fechaCorta(x.fecha, en)} · <Autor by={x.by} />
      {x.resumen && <span className="bandeja-cita">{corta(x.resumen, 160)}</span>}</span>;
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => hecho(() => cambiar("informes", x.id, { publicado: true }), L("Publicado: ", "Published: ") + x.titulo)}>{L("Publicar", "Publish")}</button>
      <button type="button" className="linkbtn" onClick={() => ir("informes")}>{L("Leerlo entero", "Read it in full")}</button>
    </>;
  } else if (tipo === "resultado") {
    titulo = x.titulo;
    info = <span className="meta"><span className="tag">{et(TIPOS_ACT, x.tipo)}</span> {nombreP(x.proyecto)} · {fechaCorta(x.fecha, en)} · <Autor by={x.by} />
      {(x.fotos || []).length > 0 && " · " + (x.fotos.length === 1 ? L("1 foto", "1 photo") : x.fotos.length + L(" fotos", " photos"))}
      {(x.documentos || []).length > 0 && " · " + (x.documentos.length === 1 ? L("1 documento", "1 document") : x.documentos.length + L(" documentos", " documents"))}</span>;
    acciones = <>
      <button type="button" className="btn-mini" onClick={() => hecho(() => cambiar("proyecto_actualizaciones", x.id, { validada: true }), L("Validado: ", "Validated: ") + x.titulo)}>{L("Validar", "Validate")}</button>
      <button type="button" className="btn-mini claro" onClick={() => irProyecto(x.proyecto)}>{L("Ver pruebas en el proyecto", "See evidence on the project")}</button>
    </>;
  }
  return (
    <li className={"b-item b-" + tipo + (espera >= ESPERA_LARGA ? " espera" : "")}>
      <div className="b-cab">
        <span className="b-tipo">{etiqueta}</span>
        {cuando && <span className={"b-cuando" + (espera >= ESPERA_LARGA ? " espera-txt" : "")}>{espera >= ESPERA_LARGA ? L("lleva " + espera + " días esperando", "waiting for " + espera + " days") : cuando}</span>}
      </div>
      <p className="b-tit">{titulo}</p>
      {info && <div className="b-info">{info}</div>}
      <div className="row b-acc" aria-busy={env.ocupado ? "true" : "false"}>{acciones}</div>
      <Aviso texto={env.msg} />
    </li>
  );
}

function EstadoGeneral({ pend }) {
  const { en } = useApp();
  const L = useL();
  const cif = useCifras();
  const pas = useCarga(estadoDonaciones, []);
  const c = cif.datos || {};
  const ps = (pend.datos && pend.datos.ps) || [];
  return (
    <div className="caja">
      <h3 className="sub">{L("Estado general", "General status")}</h3>
      <ul className="lista-puntos">
        <li>{L("Donaciones en línea: ", "Online donations: ")}<b>{pas.datos && pas.datos.activo ? L("activas", "active") + " · " + pas.datos.entidad : L("desactivadas (falta configurar la entidad receptora o las claves; ver README)", "off (receiving organisation or keys not configured; see README)")}</b></li>
        <li>{L("Comunidades registradas: ", "Registered communities: ")}<b>{c.comunidades || 0}</b> · {L("participando en proyectos: ", "in projects: ")}<b>{c.comunidades_participantes || 0}</b></li>
        <li>{L("Proyectos publicados: ", "Published projects: ")}<b>{ps.filter((p) => p.publicado && !p.ejemplo).length}</b> · {L("borradores: ", "drafts: ")}<b>{ps.filter((p) => !p.publicado && !p.ejemplo).length}</b></li>
        {(c.fondos || []).map((f) => <li key={f.moneda}>{L("Recibido ", "Received ")}({f.moneda.toUpperCase()}): <b>{dinero(f.donaciones + f.otros, f.moneda, en)}</b></li>)}
        {!REMOTE && <li>{L("Versión de demostración: los datos se guardan solo en este navegador.", "Demo version: data is stored in this browser only.")}</li>}
      </ul>
    </div>
  );
}

/* Buscador pequeño reutilizable */
function Buscar({ id, valor, onCambio, ph }) {
  const L = useL();
  return (
    <div className="buscar">
      <label className="sr" htmlFor={id}>{L("Buscar", "Search")}</label>
      <input id={id} type="search" value={valor} placeholder={ph} onChange={(e) => onCambio(e.target.value)} />
      {valor && <button type="button" className="linkbtn" onClick={() => onCambio("")}>{L("Borrar", "Clear")}</button>}
    </div>
  );
}

/* ---------- PROYECTOS ---------- */
function TabProyectos() {
  const { en, ago, irProyecto } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const { datos, error, cargando } = useCarga(() => filas("proyectos", { orden: "actualizado" }));
  const ps = datos || [];
  const hayEjemplo = ps.some((p) => p.ejemplo);
  const faltan = PROYECTOS_EJEMPLO.filter((e) => !ps.some((p) => p.ejemplo && p.nombre === e.nombre));
  const grupos = {
    pide: (p) => !p.publicado && p.revision_pedida && !p.ejemplo,
    borrador: (p) => !p.publicado && !p.revision_pedida && !p.ejemplo,
    publicado: (p) => p.publicado && !p.ejemplo,
    ejemplo: (p) => p.ejemplo,
  };
  const qn = norm(q.trim());
  const lista = ps.filter((p) => (!f || grupos[f](p)) && (!qn || norm(p.nombre + " " + (p.region || "") + " " + (p.responsable_org || "") + " " + et(ESTADOS_P, p.estado)).includes(qn)));
  const cuantos = (k) => ps.filter(grupos[k]).length;
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Proyectos", "Projects")}</h3>
        <span className="row">
          {faltan.length > 0 && <button type="button" className="btn-mini claro" onClick={() => env.enviar(async () => { for (const e of faltan) await crear("proyectos", e); })}>{hayEjemplo ? L("Cargar los ejemplos que faltan", "Load the missing examples") : L("Cargar proyectos de ejemplo", "Load example projects")}</button>}
          {hayEjemplo && <Confirmar texto={L("Borrar los ejemplos", "Delete the examples")} onSi={() => env.enviar(async () => { for (const p of ps.filter((x) => x.ejemplo)) await borrar("proyectos", p.id); })} />}
        </span>
      </div>
      <Buscar id="coord-q-proy" valor={q} onCambio={setQ} ph={L("Buscar por nombre, lugar o estado", "Search by name, place or status")} />
      <Pestanas etiqueta={L("Mostrar", "Show")} valor={f} onCambio={setF} opciones={[["", L("Todos", "All"), ps.length], ["pide", L("Piden publicarse", "Ask to be published"), cuantos("pide")],
        ["borrador", L("Borradores", "Drafts"), cuantos("borrador")], ["publicado", L("Publicados", "Published"), cuantos("publicado")], ...(hayEjemplo ? [["ejemplo", L("Ejemplos", "Examples"), cuantos("ejemplo")]] : [])]} />
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <ul className="lista-gestion">
          {lista.map((p) => (
            <li key={p.id}>
              <span><button type="button" className="linkbtn" onClick={() => irProyecto(p.id)}><b>{p.nombre}</b></button> <EstadoP estado={p.estado} />
                {p.ejemplo && <span className="tag tag-ej">{L("Ejemplo", "Example")}</span>}
                {!p.publicado && <span className={"tag" + (p.revision_pedida ? " tag-pide" : "")}>{p.revision_pedida ? L("Pide publicarse", "Asks to be published") : L("Borrador", "Draft")}</span>}
                {p.publicado && !p.ejemplo && <span className="tag tag-ok">{L("Publicado", "Published")}</span>}
                <span className="meta"> · {p.meta_fondos > 0 ? L("objetivo ", "goal ") + dinero(p.meta_fondos, p.moneda, en) + " · " : ""}{L("cambiado ", "changed ")}{ms(p.actualizado || p.created_at) ? ago(ms(p.actualizado || p.created_at)) : "—"}</span></span>
              <span className="row">
                <button type="button" className={p.publicado ? "btn-mini claro" : "btn-mini"} onClick={() => env.enviar(() => cambiar("proyectos", p.id, { publicado: !p.publicado }))}>{p.publicado ? L("Retirar", "Unpublish") : L("Publicar", "Publish")}</button>
                {!p.ejemplo && <label className="check-mini"><input type="checkbox" checked={!!p.acepta_donaciones} onChange={(e) => env.enviar(() => cambiar("proyectos", p.id, { acepta_donaciones: e.target.checked }))} />{L("Acepta donaciones", "Accepts donations")}</label>}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="meta">{q || f ? L("Nada coincide con la búsqueda.", "Nothing matches the search.") : L("No hay proyectos.", "No projects.")}</p>}
      <p className="hint">{L("Los proyectos de ejemplo enseñan cómo es una ficha en cada estado. Salen marcados como ejemplo y no cuentan en ninguna cifra.", "The example projects show what a page looks like in each status. They are marked as examples and are never counted in figures.")}</p>
      <Aviso texto={env.msg} />
    </div>
  );
}

/* ---------- COMUNIDADES ---------- */
function TabComunidades() {
  const { data, perfilDe, irComunidad } = useApp();
  const L = useL();
  const env = useEnviar();
  const [q, setQ] = useState("");
  const [sinReps, setSinReps] = useState(false);
  const { datos, error, cargando } = useCarga(() => filas("comunidad_miembros", { orden: "created_at" }));
  const ms_ = datos || [];
  const pend = ms_.filter((m) => m.estado === "solicitada");
  const nombreC = (id) => (data.comunidades.find((c) => c.id === id) || {}).nombre || id;
  const nombreP = (u) => (perfilDe(u) || {}).nombre || L("Persona", "Person");
  const reps = (id) => ms_.filter((m) => m.comunidad === id && m.rol === "representante" && m.estado === "aceptada");
  const miembros = (id) => ms_.filter((m) => m.comunidad === id && m.estado === "aceptada").length;
  const qn = norm(q.trim());
  const coms = data.comunidades.filter((c) => !c.ejemplo)
    .filter((c) => (!sinReps || !reps(c.id).length) && (!qn || norm([c.nombre, c.region, c.zonaOtra, c.lema].join(" ")).includes(qn)));
  const nSin = data.comunidades.filter((c) => !c.ejemplo && !reps(c.id).length).length;
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Solicitudes pendientes", "Pending requests")}</h3>
        <p className="hint">{L("Decide la coordinación solo cuando la comunidad todavía no tiene representantes. Si los tiene, mejor que decidan ellos.", "The coordination team should only decide when the community has no representatives yet. If it has, let them decide.")}</p>
        <ErrorCarga error={error} />
        {cargando && !datos ? <Cargando /> : pend.length ? (
          <ul className="lista-gestion">
            {pend.map((m) => {
              const tieneReps = reps(m.comunidad).length > 0;
              return (
                <li key={m.id}>
                  <span><b>{nombreP(m.user_id)}</b> → <button type="button" className="linkbtn" onClick={() => irComunidad(m.comunidad)}>{nombreC(m.comunidad)}</button>
                    <span className="meta"> · {m.rol_pedido === "representante" ? L("pide representar", "asks to represent") : L("pide ser miembro", "asks to be a member")}{m.cargo ? " · " + m.cargo : ""}{tieneReps ? " · " + L("ya tiene representantes", "already has representatives") : ""}</span></span>
                  {m.mensaje && <p className="meta nota">«{m.mensaje}»</p>}
                  <span className="row">
                    <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "aceptada", rol: m.rol_pedido }))}>{L("Aceptar", "Accept")}</button>
                    <Confirmar className="btn-mini claro" texto={L("Rechazar", "Decline")} si={L("Sí, rechazar", "Yes, decline")} onSi={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "rechazada" }))} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <p className="meta">{L("No hay solicitudes pendientes.", "No pending requests.")}</p>}
        <Aviso texto={env.msg} />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Comunidades y representantes", "Communities and representatives")}</h3>
        <Buscar id="coord-q-com" valor={q} onCambio={setQ} ph={L("Buscar comunidad", "Search community")} />
        {nSin > 0 && <Pestanas etiqueta={L("Mostrar", "Show")} valor={sinReps ? "sin" : ""} onCambio={(k) => setSinReps(k === "sin")}
          opciones={[["", L("Todas", "All")], ["sin", L("Sin representantes", "No representatives"), nSin]]} />}
        {coms.length ? (
          <ul className="lista-gestion">
            {coms.map((c) => {
              const r = reps(c.id), nm = miembros(c.id);
              return <li key={c.id}><span><button type="button" className="linkbtn" onClick={() => irComunidad(c.id)}><b>{c.nombre}</b></button>
                <span className="meta"> · {nm === 1 ? L("1 miembro", "1 member") : nm + L(" miembros", " members")} · </span>
                {r.length ? <span className="meta">{L("representa: ", "represented by: ")}{r.map((m) => nombreP(m.user_id)).join(", ")}</span> : <span className="tag tag-pide">{L("sin representantes", "no representatives")}</span>}</span></li>;
            })}
          </ul>
        ) : <p className="meta">{q || sinReps ? L("Nada coincide con la búsqueda.", "Nothing matches the search.") : L("Todavía no hay comunidades.", "No communities yet.")}</p>}
      </div>
    </>
  );
}

/* ---------- CANDIDATURAS ---------- */
function TabCandidaturas() {
  const { data } = useApp();
  const L = useL();
  const { datos } = useCarga(async () => {
    const [ops, ps] = await Promise.all([filas("oportunidades", {}), filas("proyectos", {})]);
    return { ops, ps };
  });
  return (
    <div className="caja">
      <h3 className="sub">{L("Candidaturas y propuestas", "Applications and proposals")}</h3>
      <p className="hint">{L("Puedes escribir una respuesta antes de decidir: la persona la verá junto a la decisión.", "You can write a reply before deciding: the person will see it with the decision.")}</p>
      {datos ? <CandidaturasRecibidas ops={datos.ops} proyectos={datos.ps} comunidades={data.comunidades} /> : <Cargando />}
    </div>
  );
}

/* ---------- DINERO ---------- */
function TabFinanzas({ abrir }) {
  const L = useL();
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Ingresos y gastos", "Income and spending")}</h3>
        <p className="hint">{L("Registra los gastos con su justificante y verifica lo que registran los proyectos. Nada se borra: los errores se anulan con un motivo y quedan en el registro.", "Record spending with its receipt and verify what projects record. Nothing is deleted: mistakes are cancelled with a reason and stay in the log.")}</p>
        <Movimientos proyecto={null} abrir={abrir} />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Donaciones por la pasarela", "Donations through the payment provider")}</h3>
        <DonacionesLista />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Campañas de los proyectos", "Project campaigns")}</h3>
        <p className="hint">{L("Cada proyecto fija su objetivo y el destino de los fondos en su ficha. Sus donaciones se activan o desactivan en la pestaña «Proyectos».", "Each project sets its goal and use of funds on its page. Its donations are turned on or off in the “Projects” tab.")}</p>
      </div>
    </>
  );
}

/* ---------- INFORMES ---------- */
function TabInformes({ abrir }) {
  const L = useL();
  const [form, setForm] = useState(!!abrir);
  const [f, setF] = useState("");
  const { datos, cargando } = useCarga(async () => {
    const [infs, ps] = await Promise.all([filas("informes", { orden: "fecha" }), filas("proyectos", {})]);
    return { infs, ps };
  });
  const infs = (datos && datos.infs) || [];
  const lista = f === "borrador" ? infs.filter((i) => !i.publicado) : f === "publicado" ? infs.filter((i) => i.publicado) : infs;
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Informes", "Reports")}</h3>
        {!form && <button type="button" className="btn-mini" onClick={() => setForm(true)}>+ {L("Nuevo informe", "New report")}</button>}
      </div>
      {form && <InformeForm onClose={() => setForm(false)} />}
      {infs.length > 0 && <Pestanas etiqueta={L("Mostrar", "Show")} valor={f} onCambio={setF} opciones={[["", L("Todos", "All"), infs.length],
        ["borrador", L("Por publicar", "To publish"), infs.filter((i) => !i.publicado).length], ["publicado", L("Publicados", "Published"), infs.filter((i) => i.publicado).length]]} />}
      {cargando && !datos ? <Cargando /> : lista.length ? <InformesLista lista={lista} proyectos={datos.ps} /> : <p className="meta">{L("No hay informes.", "No reports.")}</p>}
    </div>
  );
}

/* ---------- VALIDAR ---------- */
function TabResultados() {
  const { en } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const { datos, cargando } = useCarga(async () => {
    const [acts, ps] = await Promise.all([filas("proyecto_actualizaciones", { en: { tipo: ["actividad", "resultado"] }, orden: "fecha" }), filas("proyectos", {})]);
    return { acts, ps };
  });
  const acts = (datos && datos.acts) || [];
  const pend = acts.filter((a) => !a.validada), hechas = acts.filter((a) => a.validada).slice(0, 20);
  const nombreP = (id) => ((datos && datos.ps.find((p) => p.id === id)) || {}).nombre || "—";
  const Item = ({ a }) => (
    <li>
      <span><span className="tag">{et(TIPOS_ACT, a.tipo)}</span> <b>{a.titulo}</b> <span className="meta">· <a href={"#proyecto-" + a.proyecto}>{nombreP(a.proyecto)}</a> · {fechaCorta(a.fecha, en)} · <Autor by={a.by} />
        {(a.fotos || []).length > 0 && " · " + a.fotos.length + " " + L("fotos", "photos")}</span></span>
      <button type="button" className={a.validada ? "linkbtn" : "btn-mini"} onClick={() => env.enviar(() => cambiar("proyecto_actualizaciones", a.id, { validada: !a.validada }))}>{a.validada ? L("Quitar validación", "Remove validation") : L("Validar", "Validate")}</button>
    </li>
  );
  return (
    <div className="caja">
      <h3 className="sub">{L("Actividades y resultados", "Activities and results")}</h3>
      <p className="hint">{L("Valida solo lo comprobado (fotos, informes, testimonios de la comunidad). Lo validado cuenta en «Nuestro impacto».", "Only validate what has been checked (photos, reports, community accounts). Validated items count in “Our impact”.")}</p>
      {cargando && !datos ? <Cargando /> : <>
        <h4>{L("Por validar", "To validate")}</h4>
        {pend.length ? <ul className="lista-gestion">{pend.map((a) => <Item key={a.id} a={a} />)}</ul> : <p className="meta">{L("Nada pendiente.", "Nothing pending.")}</p>}
        {hechas.length > 0 && <><h4>{L("Validadas recientemente", "Recently validated")}</h4><ul className="lista-gestion">{hechas.map((a) => <Item key={a.id} a={a} />)}</ul></>}
      </>}
      <Aviso texto={env.msg} />
    </div>
  );
}

/* ---------- EQUIPO Y PERMISOS (solo administración) ---------- */
function TabPermisos() {
  const { data, perfilDe } = useApp();
  const L = useL();
  const env = useEnviar();
  const [q, setQ] = useState("");
  const { datos, cargando } = useCarga(() => filas("roles_usuario", { orden: "created_at" }));
  const roles = datos || [];
  const dentro = new Set(roles.map((r) => r.user_id));
  const ql = norm(q.trim());
  const cand = ql.length >= 2 ? data.perfiles.filter((p) => !dentro.has(p.id) && norm(p.nombre).includes(ql)).slice(0, 8) : [];
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Equipo de coordinación", "Coordination team")}</h3>
        {cargando && !datos ? <Cargando /> : roles.length ? (
          <ul className="lista-gestion">{roles.map((r) => <li key={r.user_id}><span><b>{(perfilDe(r.user_id) || {}).nombre || r.user_id}</b> <span className="meta">· {L("desde ", "since ")}{fechaCorta(r.created_at)}</span></span>
            <Confirmar texto={L("Quitar permiso", "Remove permission")} onSi={() => env.enviar(() => borrar("roles_usuario", r.user_id, "user_id"))} /></li>)}</ul>
        ) : <p className="meta">{L("Nadie más tiene permisos de coordinación.", "Nobody else has coordination permissions.")}</p>}
        <label htmlFor="perm-q">{L("Añadir a alguien al equipo (necesita tener cuenta)", "Add someone to the team (they need an account)")}</label>
        <input id="perm-q" type="search" value={q} placeholder={L("Escribe su nombre", "Type their name")} onChange={(e) => setQ(e.target.value)} />
        {ql.length >= 2 && !cand.length && <p className="meta">{L("No hay nadie con ese nombre que no esté ya en el equipo.", "Nobody with that name who isn't already on the team.")}</p>}
        {cand.length > 0 && <ul className="sugerencias">{cand.map((p) => <li key={p.id}><button type="button" className="linkbtn" onClick={() => env.enviar(() => crear("roles_usuario", { user_id: p.id, rol: "coordinador" }), () => setQ(""))}>{L("Hacer coordinador/a a ", "Make coordinator: ")}{p.nombre}</button></li>)}</ul>}
        <Aviso texto={env.msg} />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Quién puede hacer qué", "Who can do what")}</h3>
        <div className="tabla-w">
          <table className="tabla roles">
            <thead><tr><th></th><th>{L("Administración", "Admin")}</th><th>{L("Coordinación", "Coordination")}</th><th>{L("Representante", "Representative")}</th><th>{L("Responsable de proyecto", "Project lead")}</th><th>{L("Cuenta", "Account")}</th></tr></thead>
            <tbody>
              {[
                [L("Dar y quitar permisos", "Grant and remove permissions"), 1, 0, 0, 0, 0],
                [L("Publicar proyectos y activar donaciones", "Publish projects and turn on donations"), 1, 1, 0, 0, 0],
                [L("Verificar gastos y validar resultados", "Verify spending and validate results"), 1, 1, 0, 0, 0],
                [L("Publicar informes", "Publish reports"), 1, 1, 0, 0, 0],
                [L("Crear proyectos (borrador)", "Create projects (draft)"), 1, 1, 1, 0, 0],
                [L("Editar la ficha de su comunidad y aceptar miembros", "Edit their community page and accept members"), 1, 1, 1, 0, 0],
                [L("Editar su proyecto, equipo y registrar gastos", "Edit their project, team and record spending"), 1, 1, 0, 1, 0],
                [L("Publicar necesidades de colaboración", "Post calls for help"), 1, 1, 1, 1, 0],
                [L("Revisar candidaturas de lo suyo", "Review applications for their items"), 1, 1, 1, 1, 0],
                [L("Seguir, comentar, ofrecerse y donar", "Follow, comment, apply and donate"), 1, 1, 1, 1, 1],
              ].map(([txt, ...s]) => <tr key={txt}><td>{txt}</td>{s.map((v, i) => <td key={i} className="centro">{v ? "✓" : "—"}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <p className="hint">{L("La administración son los correos de la tabla admin_emails de Supabase (bloque 7 de supabase.sql).", "Administrators are the emails in Supabase's admin_emails table (block 7 of supabase.sql).")}</p>
      </div>
    </>
  );
}

/* ---------- REGISTRO DE CAMBIOS ---------- */
const TABLAS_R = {
  docs: ["Ficha de comunidad", "Community page", "comunidades"], roles_usuario: ["Permisos", "Permissions", "permisos"],
  comunidad_miembros: ["Miembros de comunidad", "Community members", "comunidades"], proyectos: ["Proyecto", "Project", "proyectos"],
  proyecto_equipo: ["Equipo de proyecto", "Project team", "proyectos"], proyecto_comunidades: ["Comunidad en proyecto", "Community in project", "proyectos"],
  proyecto_actualizaciones: ["Actividad o resultado", "Activity or result", "proyectos"], oportunidades: ["Necesidad de colaboración", "Call for help", "candidaturas"],
  candidaturas: ["Candidatura", "Application", "candidaturas"], donaciones: ["Donación", "Donation", "dinero"],
  movimientos: ["Ingreso o gasto", "Income or spending", "dinero"], informes: ["Informe", "Report", "informes"],
};
const ACCIONES_R = { insert: ["creó", "created"], update: ["cambió", "changed"], delete: ["borró", "deleted"] };
const CAMPOS_R = {
  publicado: ["publicado", "published"], estado: ["estado", "status"], revision_pedida: ["pide publicarse", "asks to be published"],
  acepta_donaciones: ["acepta donaciones", "accepts donations"], validada: ["validada", "validated"], rol: ["rol", "role"],
  nombre: ["nombre", "name"], titulo: ["título", "title"], importe: ["importe", "amount"], motivo_anulacion: ["motivo de anulación", "reason for cancelling"],
  nota: ["respuesta", "reply"], justificante: ["justificante", "receipt"], meta_fondos: ["objetivo", "goal"], descripcion: ["descripción", "description"],
  resumen: ["resumen", "summary"], fotos: ["fotos", "photos"], documentos: ["documentos", "documents"], concepto: ["concepto", "concept"],
};
const GRUPOS_R = [["", "Todo", "All"], ["proyectos", "Proyectos", "Projects"], ["comunidades", "Comunidades", "Communities"],
  ["candidaturas", "Candidaturas", "Applications"], ["dinero", "Dinero", "Money"], ["informes", "Informes", "Reports"], ["permisos", "Permisos", "Permissions"]];

function valorR(v, en) {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return en ? "yes" : "sí";
  if (v === false) return "no";
  if (Array.isArray(v)) return String(v.length);
  if (typeof v === "object") return "…";
  return corta(String(v), 40);
}

function TabRegistro() {
  const { en, perfilDe } = useApp();
  const L = useL();
  const [limite, setLimite] = useState(150);
  const [grupo, setGrupo] = useState("");
  const [q, setQ] = useState("");
  const { datos, error, cargando } = useCarga(async () => {
    if (!REMOTE) return { reg: [], ps: [] };
    const [reg, ps] = await Promise.all([filas("auditoria", { orden: "created_at", limite }), filas("proyectos", {})]);
    return { reg, ps };
  }, [limite]);
  const reg = (datos && datos.reg) || [];
  const quien = (r) => (r.por ? (perfilDe(r.por) || {}).nombre || L("Una cuenta", "An account") : L("Sistema", "System"));
  const nombreDe = (r) => {
    const c = r.cambios || {};
    const v = (k) => (Array.isArray(c[k]) ? c[k][1] ?? c[k][0] : c[k]);
    const n = v("nombre") || v("titulo") || v("concepto");
    if (n) return String(n);
    if (r.tabla === "proyectos") return ((datos.ps || []).find((p) => p.id === r.fila) || {}).nombre || "";
    return "";
  };
  const qn = norm(q.trim());
  const lista = reg.filter((r) => (!grupo || (TABLAS_R[r.tabla] || [])[2] === grupo) && (!qn || norm(quien(r) + " " + nombreDe(r) + " " + ((TABLAS_R[r.tabla] || [r.tabla])[en ? 1 : 0])).includes(qn)));
  return (
    <div className="caja">
      <h3 className="sub">{L("Registro de cambios", "Change log")}</h3>
      <p className="hint">{L("Cada alta, cambio o baja en proyectos, comunidades, candidaturas, dinero, informes y permisos queda anotado aquí con quién y cuándo. Nadie puede borrarlo.", "Every creation, change or removal in projects, communities, applications, money, reports and permissions is recorded here with who and when. Nobody can delete it.")}</p>
      {!REMOTE && <p className="meta">{L("En la versión de demostración no hay registro.", "There is no log in the demo version.")}</p>}
      <ErrorCarga error={error} />
      {REMOTE && <>
        <Buscar id="coord-q-reg" valor={q} onCambio={setQ} ph={L("Buscar por persona o nombre", "Search by person or name")} />
        <Pestanas etiqueta={L("Área", "Area")} valor={grupo} onCambio={setGrupo} opciones={GRUPOS_R.map(([k, es, eng]) => [k, en ? eng : es])} />
      </>}
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <>
          <ul className="registro-lista">
            {lista.map((r) => {
              const t = TABLAS_R[r.tabla], nom = nombreDe(r);
              const cambios = r.accion === "update" ? Object.entries(r.cambios || {}) : [];
              return (
                <li key={r.id}>
                  <p><b>{quien(r)}</b> {(ACCIONES_R[r.accion] || [r.accion, r.accion])[en ? 1 : 0]} <span className="tag">{t ? t[en ? 1 : 0] : r.tabla}</span>
                    {nom && <> <b>«{corta(nom, 60)}»</b></>}
                    {r.tabla === "proyectos" && r.fila && r.accion !== "delete" && <> · <a href={"#proyecto-" + r.fila}>{L("ver", "view")}</a></>}</p>
                  {cambios.length > 0 && (
                    <ul className="reg-cambios">
                      {cambios.slice(0, 6).map(([k, par]) => {
                        const [a, b] = Array.isArray(par) ? par : [undefined, par];
                        return <li key={k}><span className="meta">{CAMPOS_R[k] ? CAMPOS_R[k][en ? 1 : 0] : k}:</span> {valorR(a, en)} → <b>{valorR(b, en)}</b></li>;
                      })}
                      {cambios.length > 6 && <li className="meta">+{cambios.length - 6}</li>}
                    </ul>
                  )}
                  <p className="meta">{new Date(r.created_at).toLocaleString(en ? "en-GB" : "es-PE", { dateStyle: "medium", timeStyle: "short" })}</p>
                </li>
              );
            })}
          </ul>
          {reg.length >= limite && <button type="button" className="btn-mini claro" onClick={() => setLimite((x) => x + 150)}>{L("Ver más antiguos", "Show older")}</button>}
        </>
      ) : REMOTE && !cargando ? <p className="meta">{q || grupo ? L("Nada coincide con la búsqueda.", "Nothing matches the search.") : L("Sin cambios registrados.", "No changes recorded.")}</p> : null}
    </div>
  );
}
