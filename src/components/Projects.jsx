/* Proyectos de conservación: lista, ficha de cada iniciativa y formulario. Tablas en supabase.sql, bloque 11. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG, P } from "../data/constants.js";
import { CATEGORIAS_C, demoEjemplo, ESTADOS_O, ESTADOS_P, TIPOS_ACT, TIPOS_NEC } from "../data/proyectos.js";
import { borrar, cambiar, crear, fila, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero } from "../lib/donaciones.js";
import { copiar, fotoSegura, str } from "../lib/utils.js";
import { Autor } from "./People.jsx";
import { Archivos, Aviso, Barra, Cargando, Confirmar, ErrorCarga, EstadoP, fechaCorta, FilasEditor, Galeria, Parrafos, Pestanas, SubirDocs, SubirFotos, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";
import { OportunidadForm } from "./Collaborate.jsx";
import { InformeForm, InformesLista } from "./Impact.jsx";
import { Movimientos } from "./Finance.jsx";

const centimos = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return v === "" || v == null || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100); };
const unidades = (c) => (c == null ? "" : String(c / 100));
const lineas = (l, k = "texto") => (Array.isArray(l) ? l : []).filter((x) => x && String(x[k] || "").trim());

/* ================= Lista ================= */
export default function Projects() {
  const { t, en, data, permisos, canPost, pedirCuenta, irProyecto } = useApp();
  const L = useL(), et = useEt();
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const { datos, error, cargando } = useCarga(async () => {
    const [ps, vs] = await Promise.all([filas("proyectos", { orden: "actualizado" }), filas("proyecto_comunidades", { eq: { estado: "aceptada" } })]);
    return { ps, vs };
  });
  const cif = useCifras();
  const nombreCom = useMemo(() => Object.fromEntries(data.comunidades.map((c) => [c.id, c.nombre])), [data.comunidades]);
  const ps = (datos && datos.ps) || [];
  const ql = q.trim().toLowerCase();
  const lista = ps.filter((p) => (!estado || (estado === "mios" ? puede.participar(permisos, p.id) && !permisos.todo : p.estado === estado))
    && (!ql || [p.nombre, p.resumen, p.region, p.especies, p.ecosistemas].join(" ").toLowerCase().includes(ql)))
    .sort((a, b) => (a.ejemplo - b.ejemplo) || String(b.actualizado).localeCompare(String(a.actualizado)));
  const n = (k) => ps.filter((p) => p.estado === k).length;
  const mios = !permisos.todo && ps.some((p) => puede.participar(permisos, p.id));

  const nuevoProyecto = () => {
    if (!canPost) { pedirCuenta(L("Para crear un proyecto necesitas una cuenta. Es gratis y tarda un minuto.", "To create a project you need an account. It is free and takes a minute.")); return; }
    setNuevo((v) => !v);
  };

  return (
    <section id="v-proyectos" aria-labelledby="h-proyectos">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-proyectos">{L("Proyectos de conservación", "Conservation projects")}</h2>
            <p className="intro">{L("Iniciativas que nacen de las comunidades: qué problema quieren resolver, quién participa, qué necesitan y qué van consiguiendo.", "Initiatives born in the communities: the problem they tackle, who takes part, what they need and what they achieve.")}</p>
          </div>
        </header>
        <Pestanas etiqueta={L("Filtrar por estado", "Filter by status")} valor={estado} onCambio={setEstado}
          opciones={[["", L("Todos", "All"), ps.length], ...Object.keys(ESTADOS_P).filter((k) => n(k)).map((k) => [k, et(ESTADOS_P, k), n(k)]), ...(mios ? [["mios", L("Mis proyectos", "My projects")]] : [])]} />
        <div className="bar">
          <div className="search"><label htmlFor="q-proy" className="sr">{L("Buscar proyecto", "Search projects")}</label>
            <input id="q-proy" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Buscar por nombre, lugar o especie", "Search by name, place or species")} /></div>
          <button type="button" className="btn" onClick={nuevoProyecto}>{L("Nuevo proyecto", "New project")}</button>
        </div>
        {nuevo && canPost && !puede.crearProyecto(permisos) && (
          <p className="notice">{L("Los proyectos los crean las comunidades a través de sus representantes, o la coordinación. Si formas parte de una comunidad o grupo, pide ser su representante desde su ficha en ", "Projects are created by communities through their representatives, or by the coordination team. If you belong to a community or group, ask to be its representative from its page in ")}<a href="#comunidades">{L("Comunidades", "Communities")}</a>.</p>
        )}
      </div>
      {nuevo && puede.crearProyecto(permisos) && <ProjectForm onClose={() => setNuevo(false)} onGuardado={(p) => { setNuevo(false); irProyecto(p.id); }} />}
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <div className="proy-grid">
          {lista.map((p) => <ProjectCard key={p.id} p={p} vinculos={(datos.vs || []).filter((v) => v.proyecto === p.id)} nombreCom={nombreCom}
            cifra={cif.datos && (cif.datos.por_proyecto || []).find((x) => x.id === p.id)} />)}
        </div>
      ) : (
        <Vacio titulo={ps.length ? L("Ningún proyecto con este filtro", "No projects match this filter") : L("Todavía no hay proyectos publicados", "No projects published yet")}
          texto={ps.length ? "" : L("Cuando una comunidad presente su primera iniciativa, aparecerá aquí con sus objetivos, necesidades y avances.", "When a community presents its first initiative it will appear here, with its goals, needs and progress.")}>
          {ps.length > 0 && <button type="button" className="linkbtn" onClick={() => { setEstado(""); setQ(""); }}>{L("Quitar filtros", "Clear filters")}</button>}
        </Vacio>
      )}
    </section>
  );
}

function Portada({ p, grande }) {
  const src = fotoSegura(p.portada) || fotoSegura((p.fotos || [])[0]);
  return src
    ? <img className={grande ? "proy-portada grande" : "proy-portada"} src={src} alt="" loading={grande ? "eager" : "lazy"} />
    : <div className={(grande ? "proy-portada grande" : "proy-portada") + " sin-foto"} aria-hidden="true"><span>{(p.nombre || "?").slice(0, 1)}</span></div>;
}

function ProjectCard({ p, vinculos, nombreCom, cifra }) {
  const { t, en } = useApp();
  const L = useL();
  const meta = p.meta_fondos || 0, rec = (cifra && cifra.recaudado) || 0;
  const demo = demoEjemplo(p);
  return (
    <article className="proy">
      <a className="proy-enlace" href={"#proyecto-" + p.id} aria-label={p.nombre}><Portada p={p} /></a>
      <div className="proy-cuerpo">
        <div className="row"><EstadoP estado={p.estado} />
          {p.ejemplo && <span className="tag tag-ej">{L("Ejemplo", "Example")}</span>}
          {!p.publicado && <span className="tag">{p.revision_pedida ? L("Pendiente de revisión", "Awaiting review") : L("Borrador", "Draft")}</span>}</div>
        <h3><a href={"#proyecto-" + p.id}>{p.nombre}</a></h3>
        {p.resumen && <p>{p.resumen}</p>}
        <p className="meta">{[t(P[p.zona] || ""), p.region].filter(Boolean).join(" · ")}</p>
        {vinculos.length > 0 && <p className="meta">{L("Con ", "With ")}{vinculos.map((v) => nombreCom[v.comunidad]).filter(Boolean).join(", ")}</p>}
        {meta > 0 && !p.ejemplo && (
          <div className="proy-fondos">
            <Barra valor={rec} total={meta} etiqueta={L("Financiación conseguida", "Funding raised")} />
            <p className="meta"><b>{dinero(rec, p.moneda, en)}</b> {L("de", "of")} {dinero(meta, p.moneda, en)}</p>
          </div>
        )}
        {demo && demo.meta > 0 && (
          <div className="proy-fondos">
            <Barra valor={demo.conseguido} total={demo.meta} etiqueta={L("Financiación conseguida (cifra ficticia)", "Funding raised (fictional figure)")} />
            <p className="meta"><b>{dinero(demo.conseguido, p.moneda, en)}</b> {L("de", "of")} {dinero(demo.meta, p.moneda, en)} <span className="tag tag-ej">{L("Cifras ficticias", "Fictional figures")}</span></p>
          </div>
        )}
      </div>
    </article>
  );
}

/* ================= Ficha ================= */
export function ProjectPage({ id }) {
  const { t, en, data, meta, uid, canPost, pedirCuenta, permisos, irDonar, irComunidad } = useApp();
  const L = useL(), et = useEt();
  const [editar, setEditar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const env = useEnviar();
  const { datos, error, cargando } = useCarga(async () => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { p: null };
    const p = await fila("proyectos", id);
    if (!p) return { p: null };
    const [vinculos, equipo, acts, coms, ops, infs, sigo] = await Promise.all([
      filas("proyecto_comunidades", { eq: { proyecto: id }, orden: "created_at", desc: false }),
      filas("proyecto_equipo", { eq: { proyecto: id }, orden: "created_at", desc: false }),
      filas("proyecto_actualizaciones", { eq: { proyecto: id }, orden: "fecha" }),
      filas("proyecto_comentarios", { eq: { proyecto: id }, orden: "created_at", desc: false }),
      filas("oportunidades", { eq: { proyecto: id } }),
      filas("informes", { eq: { proyecto: id }, orden: "fecha" }),
      meta.cuenta && uid ? filas("proyecto_seguidores", { eq: { proyecto: id, user_id: uid } }) : Promise.resolve([]),
    ]);
    return { p, vinculos, equipo, acts, coms, ops, infs, sigo: sigo[0] || null };
  }, [id]);
  const cif = useCifras();
  const top = useRef(null);
  useEffect(() => { if (editar) top.current?.scrollIntoView({ block: "start" }); }, [editar]);

  if (cargando && !datos) return <section className="ficha-p"><Cargando /></section>;
  if (error) return <section className="ficha-p"><ErrorCarga error={error} /></section>;
  const { p } = datos || {};
  if (!p) {
    return (
      <section className="ficha-p">
        <Vacio titulo={L("No encontramos este proyecto", "We could not find this project")} texto={L("Puede que se haya retirado o que todavía sea un borrador.", "It may have been removed or still be a draft.")}>
          <a className="btn-ghost" href="#proyectos">{L("Ver todos los proyectos", "See all projects")}</a>
        </Vacio>
      </section>
    );
  }
  const gestiona = puede.gestionar(permisos, p.id), participa = puede.participar(permisos, p.id), coord = puede.coordinar(permisos);
  const cifra = (cif.datos && (cif.datos.por_proyecto || []).find((x) => x.id === p.id)) || { recaudado: 0, aportaciones: 0, gastado: 0 };
  const seguidores = (cif.datos && cif.datos.seguidores && cif.datos.seguidores[p.id]) || 0;
  const com = (cid) => data.comunidades.find((c) => c.id === cid);
  const aceptadas = datos.vinculos.filter((v) => v.estado === "aceptada");
  const visibles = datos.equipo.filter((e) => e.publico || participa);
  const demo = demoEjemplo(p);
  const donable = p.acepta_donaciones && p.publicado && !p.ejemplo && (p.estado === "buscando" || p.estado === "activo");
  const objetivos = lineas(p.objetivos), actividades = lineas(p.actividades), calendario = lineas(p.calendario, "hito"), necesidades = lineas(p.necesidades);
  const abiertas = datos.ops.filter((o) => o.estado === "abierta" || o.estado === "en_curso");

  const seguir = () => {
    if (!canPost) { pedirCuenta(L("Para seguir un proyecto necesitas una cuenta. Es gratis y tarda un minuto.", "To follow a project you need an account. It is free and takes a minute.")); return; }
    env.enviar(() => (datos.sigo ? borrar("proyecto_seguidores", datos.sigo.id) : crear("proyecto_seguidores", { proyecto: p.id })));
  };
  const compartir = () => {
    const url = window.location.origin + window.location.pathname + "#proyecto-" + p.id;
    if (navigator.share) navigator.share({ title: p.nombre, url }).catch(() => {});
    else copiar(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1600); }, () => {});
  };

  if (editar) {
    return (
      <section className="ficha-p" ref={top}>
        <ProjectForm p={p} onClose={() => setEditar(false)} onGuardado={() => setEditar(false)} />
      </section>
    );
  }

  return (
    <section id="v-proyecto" className="ficha-p" aria-labelledby="h-proyecto">
      <article className="caja ficha-cabeza">
        <Portada p={p} grande />
        <div className="ficha-cabeza-txt">
          <p className="volver"><a href="#proyectos">← {L("Proyectos", "Projects")}</a></p>
          <div className="row"><EstadoP estado={p.estado} />{p.ejemplo && <span className="tag tag-ej">{L("Ejemplo", "Example")}</span>}</div>
          <h2 className="vista-h" id="h-proyecto">{p.nombre}</h2>
          {p.resumen && <p className="intro">{p.resumen}</p>}
          <p className="meta">{[t(P[p.zona] || ""), p.region].filter(Boolean).join(" · ")}</p>
          <div className="row ficha-acciones">
            {donable && <button type="button" className="btn-acc" onClick={() => irDonar(p.id)}>{L("Apoyar este proyecto", "Support this project")}</button>}
            {p.publicado && !p.ejemplo && (
              <button type="button" className={datos.sigo ? "btn-ghost activo" : "btn-ghost"} aria-pressed={datos.sigo ? "true" : "false"} onClick={seguir} disabled={env.ocupado}>
                {datos.sigo ? L("Siguiendo", "Following") : L("Seguir", "Follow")}{seguidores > 0 ? " · " + seguidores : ""}
              </button>
            )}
            {abiertas.length > 0 && <a className="btn-ghost" href="#p-colabora">{L("Colaborar", "Get involved")}</a>}
            <button type="button" className="btn-ghost" onClick={compartir}>{copiado ? L("Enlace copiado", "Link copied") : L("Compartir", "Share")}</button>
          </div>
          <Aviso texto={env.msg} />
        </div>
      </article>

      {p.ejemplo && (
        <p className="notice aviso-ejemplo"><strong>{L("Proyecto de ejemplo.", "Example project.")}</strong> {L("Muestra cómo se presenta una iniciativa en Hampatu Ayllu. No es un proyecto real ni describe actividades que se estén realizando, y no cuenta en ninguna cifra.", "It shows how an initiative is presented on Hampatu Ayllu. It is not a real project, does not describe activities under way and is not counted in any figure.")}</p>
      )}
      {!p.publicado && (
        <div className="notice">
          <p><strong>{L("Borrador.", "Draft.")}</strong> {L("Solo lo ven su equipo, las comunidades a las que se ha propuesto y la coordinación.", "Only its team, the communities it was proposed to and the coordination team can see it.")}</p>
          {gestiona && !coord && (p.revision_pedida
            ? <p className="meta">{L("Has pedido que la coordinación lo revise y lo publique.", "You asked the coordination team to review and publish it.")}</p>
            : <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("proyectos", p.id, { revision_pedida: true }))}>{L("Pedir que se publique", "Ask for it to be published")}</button>)}
        </div>
      )}
      {gestiona && (
        <div className="caja gestion">
          <h3 className="sub">{L("Gestión del proyecto", "Project management")}</h3>
          <div className="row">
            <button type="button" className="btn" onClick={() => setEditar(true)}>{L("Editar la ficha", "Edit the page")}</button>
            {coord && <button type="button" className="btn-ghost" onClick={() => env.enviar(() => cambiar("proyectos", p.id, { publicado: !p.publicado }))}>{p.publicado ? L("Retirar de la web", "Unpublish") : L("Publicar", "Publish")}</button>}
            {coord && !p.ejemplo && <button type="button" className="btn-ghost" onClick={() => env.enviar(() => cambiar("proyectos", p.id, { acepta_donaciones: !p.acepta_donaciones }))}>{p.acepta_donaciones ? L("Desactivar donaciones", "Turn off donations") : L("Activar donaciones", "Turn on donations")}</button>}
            {(coord || !p.publicado) && <Confirmar texto={L("Borrar proyecto", "Delete project")} si={L("Sí, borrar el proyecto", "Yes, delete it")} onSi={() => env.enviar(() => borrar("proyectos", p.id), () => { window.location.hash = "#proyectos"; })} />}
          </div>
          {coord && !p.ejemplo && <p className="hint">{L("Las donaciones de un proyecto solo se pueden hacer si está publicado, buscando apoyo o activo, y con las donaciones activadas.", "Donations to a project are only possible when it is published, seeking support or active, and has donations turned on.")}</p>}
        </div>
      )}

      <div className="ficha-grid">
        <div className="ficha-main">
          {(p.descripcion || p.problema) && (
            <div className="caja texto-largo">
              {p.descripcion && <><h3 className="sub">{L("Descripción", "Description")}</h3><Parrafos texto={p.descripcion} /></>}
              {p.problema && <><h3 className="sub">{L("El problema ambiental", "The environmental problem")}</h3><Parrafos texto={p.problema} /></>}
            </div>
          )}
          {(objetivos.length > 0 || actividades.length > 0 || calendario.length > 0) && (
            <div className="caja">
              {objetivos.length > 0 && <><h3 className="sub">{L("Objetivos", "Goals")}</h3><ul className="lista-puntos">{objetivos.map((o, i) => <li key={i}>{o.texto}</li>)}</ul></>}
              {actividades.length > 0 && <><h3 className="sub">{L("Actividades previstas", "Planned activities")}</h3>
                <ul className="lista-check">{actividades.map((a, i) => <li key={i} className={a.hecha ? "hecha" : ""}><span aria-hidden="true">{a.hecha ? "✓" : "○"}</span> {a.texto}{a.hecha && <span className="sr"> ({L("hecha", "done")})</span>}</li>)}</ul></>}
              {calendario.length > 0 && <><h3 className="sub">{L("Calendario", "Timeline")}</h3>
                <ol className="calendario-p">{calendario.map((c, i) => <li key={i}><b>{c.fecha}</b><span>{c.hito}</span></li>)}</ol></>}
            </div>
          )}

          <Actualizaciones p={p} acts={datos.acts} vinculos={aceptadas} participa={participa} />

          {(p.resultados || datos.acts.some((a) => a.tipo === "resultado" && a.validada)) && (
            <div className="caja">
              <h3 className="sub">{L("Resultados obtenidos", "Results achieved")}</h3>
              <Parrafos texto={p.resultados} />
              {datos.acts.filter((a) => a.tipo === "resultado" && a.validada).map((a) => <p key={a.id} className="resultado-ok"><span className="tag tag-ok">{L("Validado", "Validated")}</span> {a.titulo}</p>)}
            </div>
          )}

          {(p.fotos || []).length > 0 || (p.documentos || []).length > 0 ? (
            <div className="caja">
              <h3 className="sub">{L("Fotografías y documentación", "Photos and documents")}</h3>
              <Galeria fotos={p.fotos} />
              <Archivos lista={p.documentos} />
            </div>
          ) : null}

          <InformesProyecto p={p} infs={datos.infs} participa={participa} />
          <Comentarios p={p} coms={datos.coms} gestiona={gestiona} />
        </div>

        <aside className="ficha-lado">
          <div className="caja">
            <h3 className="sub">{L("Financiación", "Funding")}</h3>
            {p.ejemplo ? (demo ? <FinanzasEjemplo p={p} demo={demo} /> : <p className="meta">{L("Un proyecto de ejemplo no recibe ni muestra dinero.", "An example project neither receives nor shows money.")}</p>) : (
              <>
                {p.meta_fondos > 0 ? (
                  <div className="dona-meta">
                    <p><b>{dinero(cifra.recaudado, p.moneda, en)}</b> {L("conseguidos de", "raised of")} <b>{dinero(p.meta_fondos, p.moneda, en)}</b></p>
                    <Barra valor={cifra.recaudado} total={p.meta_fondos} />
                    <p className="meta">{Math.min(100, Math.round((cifra.recaudado / p.meta_fondos) * 100))} % · {cifra.aportaciones} {cifra.aportaciones === 1 ? L("aportación", "contribution") : L("aportaciones", "contributions")}</p>
                  </div>
                ) : <p className="meta">{L("Este proyecto todavía no tiene un objetivo de financiación.", "This project has no funding goal yet.")}</p>}
                <dl className="datos-p">
                  {p.presupuesto > 0 && <div><dt>{L("Presupuesto estimado", "Estimated budget")}</dt><dd>{dinero(p.presupuesto, p.moneda, en)}</dd></div>}
                  {cifra.gastado > 0 && <div><dt>{L("Gastos verificados", "Verified spending")}</dt><dd>{dinero(cifra.gastado, p.moneda, en)}</dd></div>}
                </dl>
                {p.destino_fondos && <><h4>{L("A qué se destinan los fondos", "What the funds are for")}</h4><Parrafos texto={p.destino_fondos} /></>}
                <p className="hint">{L("Solo se cuentan pagos confirmados por la pasarela e ingresos verificados por la coordinación.", "Only payments confirmed by the payment provider and income verified by the coordination team are counted.")}</p>
                {donable && <button type="button" className="btn-acc btn-ancho" onClick={() => irDonar(p.id)}>{L("Apoyar este proyecto", "Support this project")}</button>}
              </>
            )}
          </div>

          <div className="caja">
            <h3 className="sub">{L("Quién participa", "Who takes part")}</h3>
            {p.responsable_org && <p><span className="meta">{L("Responsable: ", "Led by: ")}</span>{p.responsable_org}</p>}
            {aceptadas.length > 0 && (
              <ul className="lista-limpia">
                {aceptadas.map((v) => { const c = com(v.comunidad); return c ? <li key={v.id}><button type="button" className="linkbtn" onClick={() => irComunidad(c.id)}>{c.nombre}</button>{v.papel ? <span className="meta"> · {v.papel}</span> : null}</li> : null; })}
              </ul>
            )}
            {visibles.length > 0 && (
              <ul className="lista-limpia equipo">
                {visibles.map((e) => <li key={e.id}><Autor by={e.user_id} /> <span className="meta">· {e.rol === "responsable" ? L("Responsable", "Lead") : e.funcion ? et(CATEGORIAS_C, e.funcion) : L("Colabora", "Collaborator")}{!e.publico ? " · " + L("oculto en público", "hidden from the public") : ""}</span></li>)}
              </ul>
            )}
            {demo && <EquipoEjemplo demo={demo} />}
            {!p.responsable_org && !aceptadas.length && !visibles.length && !demo && <p className="meta">{L("Sin datos públicos todavía.", "No public details yet.")}</p>}
          </div>

          {(p.especies || p.ecosistemas) && (
            <div className="caja">
              <h3 className="sub">{L("Especies y ecosistemas", "Species and ecosystems")}</h3>
              <dl className="datos-p">
                {p.especies && <div><dt>{L("Especies", "Species")}</dt><dd>{p.especies}</dd></div>}
                {p.ecosistemas && <div><dt>{L("Ecosistemas", "Ecosystems")}</dt><dd>{p.ecosistemas}</dd></div>}
              </dl>
            </div>
          )}

          <div className="caja" id="p-colabora">
            <h3 className="sub">{L("Necesidades", "Needs")}</h3>
            {necesidades.length > 0 && (
              <ul className="lista-check">{necesidades.map((x, i) => <li key={i} className={x.cubierta ? "hecha" : ""}><span aria-hidden="true">{x.cubierta ? "✓" : "○"}</span> {x.texto} <span className="meta">· {et(TIPOS_NEC, x.tipo)}{x.cubierta ? " · " + L("cubierta", "covered") : ""}</span></li>)}</ul>
            )}
            {abiertas.length > 0 && (
              <>
                <h4>{L("Se busca colaboración", "Help wanted")}</h4>
                <ul className="lista-limpia">{abiertas.map((o) => <li key={o.id}><a href={"#colabora"} onClick={() => sessionStorage.setItem("hampatu-oportunidad", o.id)}>{o.titulo}</a> <span className="meta">· {et(CATEGORIAS_C, o.categoria)} · {et(ESTADOS_O, o.estado)}</span></li>)}</ul>
              </>
            )}
            {!necesidades.length && !abiertas.length && <p className="meta">{L("No hay necesidades publicadas.", "No needs published.")}</p>}
            {gestiona && p.publicado && <NuevaNecesidad p={p} />}
          </div>
        </aside>
      </div>

      {participa && <Vinculos p={p} vinculos={datos.vinculos} gestiona={gestiona} />}
      {!participa && meta.cuenta && permisos.representa && permisos.representa.size > 0 && <Vinculos p={p} vinculos={datos.vinculos} gestiona={false} />}
      {participa && <Equipo p={p} equipo={datos.equipo} gestiona={gestiona} demo={demo} />}
      {gestiona && !p.ejemplo && (
        <div className="caja">
          <h3 className="sub">{L("Ingresos y gastos del proyecto", "Project income and spending")}</h3>
          <p className="hint">{L("Los registra el equipo responsable y los verifica la coordinación. No se borran: si hay un error se anulan con un motivo. Solo lo verificado sale en las cifras públicas.", "The lead team records them and the coordination team verifies them. They are never deleted: mistakes are cancelled with a reason. Only verified entries appear in public figures.")}</p>
          <Movimientos proyecto={p} />
        </div>
      )}
    </section>
  );
}

/* ---------- Proyectos de ejemplo: equipo y cifras inventados, siempre marcados como ficticios ---------- */
function EquipoEjemplo({ demo }) {
  const L = useL();
  return (
    <>
      <ul className="lista-limpia equipo">
        {demo.equipo.map((e, i) => <li key={i}>{e.nombre} <span className="tag tag-ej">{L("Ficticio", "Fictional")}</span> <span className="meta">· {e.rol === "responsable" ? L("Responsable", "Lead") : L("Colabora", "Collaborator")} · {L(...e.funcion)}</span></li>)}
      </ul>
      <p className="hint">{L("Nombres inventados para el ejemplo: no son personas reales.", "Names made up for the example: they are not real people.")}</p>
    </>
  );
}

function FinanzasEjemplo({ p, demo }) {
  const { en } = useApp();
  const L = useL();
  const d = (c) => dinero(c, p.moneda, en);
  return (
    <>
      <p className="notice aviso-ejemplo"><span className="tag tag-ej">{L("Cifras ficticias", "Fictional figures")}</span> {L("Todo lo de este apartado es inventado para enseñar cómo se ve. Este proyecto no recibe dinero.", "Everything in this section is made up to show how it looks. This project does not receive money.")}</p>
      {demo.meta > 0 ? (
        <div className="dona-meta">
          <p><b>{d(demo.conseguido)}</b> {L("conseguidos de", "raised of")} <b>{d(demo.meta)}</b></p>
          <Barra valor={demo.conseguido} total={demo.meta} etiqueta={L("Financiación conseguida (cifra ficticia)", "Funding raised (fictional figure)")} />
          <p className="meta">{Math.min(100, Math.round((demo.conseguido / demo.meta) * 100))} % · {demo.aportaciones} {demo.aportaciones === 1 ? L("aportación", "contribution") : L("aportaciones", "contributions")}</p>
        </div>
      ) : <p className="meta">{L("Todavía no busca financiación: primero se cierra el presupuesto con la comunidad.", "Not fundraising yet: the budget is agreed with the community first.")}</p>}
      <dl className="datos-p">
        <div><dt>{L("Presupuesto estimado", "Estimated budget")}</dt><dd>{d(demo.presupuesto)}</dd></div>
        {demo.gastado > 0 && <div><dt>{L("Gastos verificados", "Verified spending")}</dt><dd>{d(demo.gastado)}</dd></div>}
      </dl>
      <h4>{L("Desglose del presupuesto", "Budget breakdown")}</h4>
      <ul className="lista-limpia desglose">
        {demo.partidas.map((x, i) => <li key={i}><span>{L(...x.concepto)}</span><b>{d(x.importe)}</b></li>)}
        <li className="desglose-total"><span>{L("Total", "Total")}</span><b>{d(demo.presupuesto)}</b></li>
      </ul>
      {p.destino_fondos && <><h4>{L("A qué se destinan los fondos", "What the funds are for")}</h4><Parrafos texto={p.destino_fondos} /></>}
    </>
  );
}

function NuevaNecesidad({ p }) {
  const L = useL();
  const [abierto, setAbierto] = useState(false);
  return abierto
    ? <OportunidadForm presetProyecto={p.id} onClose={() => setAbierto(false)} />
    : <button type="button" className="btn-ghost btn-sm" onClick={() => setAbierto(true)}>{L("Publicar una necesidad de colaboración", "Post a call for help")}</button>;
}

/* ---------- Actualizaciones (historial) ---------- */
function Actualizaciones({ p, acts, vinculos, participa }) {
  const { en, permisos, uid } = useApp();
  const L = useL(), et = useEt();
  const [form, setForm] = useState(false);
  const env = useEnviar();
  const coord = puede.coordinar(permisos);
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Actualizaciones", "Updates")}</h3>
        {participa && !form && <button type="button" className="btn-mini" onClick={() => setForm(true)}>{L("Contar un avance", "Post an update")}</button>}
      </div>
      {form && <ActualizacionForm p={p} vinculos={vinculos} onClose={() => setForm(false)} />}
      {acts.length ? (
        <ol className="historial">
          {acts.map((a) => (
            <li key={a.id}>
              <p className="historial-fecha">{fechaCorta(a.fecha, en)}</p>
              <div>
                <div className="row"><span className="tag">{et(TIPOS_ACT, a.tipo)}</span>
                  {a.validada ? <span className="tag tag-ok">{L("Validado por la coordinación", "Validated by the coordination team")}</span> : <span className="tag tag-ej">{L("Sin validar", "Not validated")}</span>}</div>
                <h4>{a.titulo}</h4>
                <Parrafos texto={a.texto} />
                <Galeria fotos={a.fotos} />
                <Archivos lista={a.documentos} />
                <p className="meta"><Autor by={a.by} /></p>
                <div className="row">
                  {coord && <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("proyecto_actualizaciones", a.id, { validada: !a.validada }))}>{a.validada ? L("Quitar validación", "Remove validation") : L("Validar", "Validate")}</button>}
                  {(a.by === uid || puede.gestionar(permisos, p.id)) && <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("proyecto_actualizaciones", a.id))} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="meta">{L("Todavía no hay actualizaciones. Aquí se irá contando lo que se hace y lo que se consigue.", "No updates yet. What is done and achieved will be told here.")}</p>}
      <Aviso texto={env.msg} />
    </div>
  );
}

function ActualizacionForm({ p, vinculos, onClose }) {
  const { data, permisos } = useApp();
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const mias = vinculos.filter((v) => puede.representar(permisos, v.comunidad) && !permisos.todo);
  const [f, setF] = useState({ tipo: "avance", titulo: "", texto: "", fecha: new Date().toISOString().slice(0, 10), comunidad: "", fotos: [], documentos: [] });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const guardar = (ev) => {
    ev.preventDefault();
    const d = { proyecto: p.id, tipo: f.tipo, titulo: str(f.titulo, 160), texto: str(f.texto, 6000) || null, fecha: f.fecha, comunidad: f.comunidad || null, fotos: f.fotos, documentos: f.documentos };
    if (d.titulo.length < 3) { setMsg(L("Escribe un título.", "Write a title.")); return; }
    if (COORD.test(d.titulo + " " + (d.texto || ""))) { setMsg(COORD_MSG); return; }
    enviar(() => crear("proyecto_actualizaciones", d), onClose);
  };
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <div className="fields">
        <div><label htmlFor="a-tipo">{L("Tipo", "Type")}</label>
          <select id="a-tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.keys(TIPOS_ACT).map((k) => <option key={k} value={k}>{et(TIPOS_ACT, k)}</option>)}</select>
          <p className="hint">{L("Las actividades y los resultados cuentan en «Nuestro impacto» cuando la coordinación los valida.", "Activities and results count in “Our impact” once the coordination team validates them.")}</p></div>
        <div><label htmlFor="a-fecha">{L("Fecha", "Date")}</label><input id="a-fecha" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div className="full"><label htmlFor="a-tit">{L("Título", "Title")}</label><input id="a-tit" maxLength={160} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div className="full"><label htmlFor="a-txt">{L("Qué se hizo o qué pasó", "What was done or what happened")}</label><textarea id="a-txt" rows={4} maxLength={6000} value={f.texto} onChange={(e) => set("texto", e.target.value)} /></div>
        {mias.length > 0 && (
          <div className="full"><label htmlFor="a-com">{L("Publicar en nombre de", "Post on behalf of")}</label>
            <select id="a-com" value={f.comunidad} onChange={(e) => set("comunidad", e.target.value)}>
              <option value="">{L("Solo con mi nombre", "Just my name")}</option>
              {mias.map((v) => <option key={v.comunidad} value={v.comunidad}>{(data.comunidades.find((c) => c.id === v.comunidad) || {}).nombre || v.comunidad}</option>)}
            </select></div>
        )}
        <div className="full"><span className="label">{L("Fotos", "Photos")}</span><SubirFotos id="a-fotos" fotos={f.fotos} onChange={(v) => set("fotos", v)} max={6} /></div>
        <div className="full"><span className="label">{L("Documentos", "Documents")}</span><SubirDocs id="a-docs" docs={f.documentos} onChange={(v) => set("documentos", v)} max={6} /></div>
      </div>
      <p className="hint">{L("Sin coordenadas exactas: indica solo la zona.", "No exact coordinates: give only the area.")}</p>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Publicar", "Post")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

/* ---------- Informes del proyecto ---------- */
function InformesProyecto({ p, infs, participa }) {
  const L = useL();
  const [form, setForm] = useState(false);
  if (!infs.length && !participa) return null;
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Informes", "Reports")}</h3>
        {participa && !form && <button type="button" className="btn-mini" onClick={() => setForm(true)}>{L("Preparar informe", "Prepare a report")}</button>}
      </div>
      {form && <InformeForm presetProyecto={p.id} onClose={() => setForm(false)} />}
      {infs.length ? <InformesLista lista={infs} compacto /> : <p className="meta">{L("Todavía no hay informes.", "No reports yet.")}</p>}
    </div>
  );
}

/* ---------- Comentarios ---------- */
function Comentarios({ p, coms, gestiona }) {
  const { en, uid, canPost, pedirCuenta } = useApp();
  const L = useL();
  const [txt, setTxt] = useState("");
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  if (!p.publicado && !coms.length) return null;
  const mandar = (ev) => {
    ev.preventDefault();
    if (!canPost) { pedirCuenta(L("Para comentar necesitas una cuenta. Es gratis y tarda un minuto.", "To comment you need an account. It is free and takes a minute.")); return; }
    const t = str(txt, 2000);
    if (!t) { setMsg(L("Escribe tu comentario.", "Write your comment.")); return; }
    if (COORD.test(t)) { setMsg(COORD_MSG); return; }
    enviar(() => crear("proyecto_comentarios", { proyecto: p.id, texto: t }), () => setTxt(""));
  };
  return (
    <div className="caja">
      <h3 className="sub">{L("Comentarios", "Comments")}</h3>
      {coms.length ? (
        <ul className="comentarios">
          {coms.map((c) => (
            <li key={c.id}>
              <p className="meta"><Autor by={c.by} /> · {fechaCorta(c.created_at, en)}</p>
              <Parrafos texto={c.texto} />
              {(c.by === uid || gestiona) && <Confirmar texto={L("Borrar", "Delete")} onSi={() => enviar(() => borrar("proyecto_comentarios", c.id))} />}
            </li>
          ))}
        </ul>
      ) : <p className="meta">{L("Nadie ha comentado todavía.", "No comments yet.")}</p>}
      {p.publicado && (
        <form className="comentar" onSubmit={mandar} noValidate>
          <label htmlFor="c-txt" className="sr">{L("Tu comentario", "Your comment")}</label>
          <textarea id="c-txt" rows={2} maxLength={2000} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={L("Pregunta, anima o cuenta algo que sepas", "Ask, cheer or share something you know")} />
          <button className="btn" type="submit" disabled={ocupado}>{L("Comentar", "Comment")}</button>
        </form>
      )}
      <Aviso texto={msg} />
    </div>
  );
}

/* ---------- Comunidades vinculadas: propone una parte y acepta la otra ---------- */
function Vinculos({ p, vinculos, gestiona }) {
  const { data, permisos, irComunidad } = useApp();
  const L = useL();
  const env = useEnviar();
  const [nueva, setNueva] = useState({ comunidad: "", papel: "" });
  const nombre = (id) => (data.comunidades.find((c) => c.id === id) || {}).nombre || L("Comunidad borrada", "Deleted community");
  const ya = new Set(vinculos.map((v) => v.comunidad));
  const mias = data.comunidades.filter((c) => puede.representar(permisos, c.id) && !ya.has(c.id));
  const opciones = gestiona ? data.comunidades.filter((c) => !ya.has(c.id)) : mias;
  const decideYo = (v) => puede.coordinar(permisos) || (v.propuesta_por === "proyecto" ? puede.representar(permisos, v.comunidad) : gestiona);
  const proponer = (ev) => {
    ev.preventDefault();
    if (!nueva.comunidad) { env.setMsg(L("Elige una comunidad.", "Choose a community.")); return; }
    env.enviar(() => crear("proyecto_comunidades", { proyecto: p.id, comunidad: nueva.comunidad, papel: str(nueva.papel, 120) || null, estado: "aceptada" }), () => setNueva({ comunidad: "", papel: "" }));
  };
  if (!gestiona && !mias.length && !vinculos.some((v) => puede.representar(permisos, v.comunidad))) return null;
  return (
    <div className="caja">
      <h3 className="sub">{L("Comunidades del proyecto", "Communities in the project")}</h3>
      <p className="hint">{L("Una comunidad solo aparece como participante cuando sus representantes lo aceptan. Si el proyecto la propone, decide la comunidad; si la comunidad pide entrar, decide el proyecto.", "A community only appears as a participant once its representatives accept. If the project proposes it, the community decides; if the community asks to join, the project decides.")}</p>
      {vinculos.length > 0 && (
        <ul className="lista-gestion">
          {vinculos.map((v) => (
            <li key={v.id}>
              <button type="button" className="linkbtn" onClick={() => irComunidad(v.comunidad)}>{nombre(v.comunidad)}</button>
              {v.papel && <span className="meta"> · {v.papel}</span>}
              <span className={"tag" + (v.estado === "aceptada" ? " tag-ok" : "")}>{v.estado === "aceptada" ? L("Participa", "Taking part") : v.estado === "rechazada" ? L("No participa", "Declined")
                : v.propuesta_por === "proyecto" ? L("Esperando a la comunidad", "Waiting for the community") : L("La comunidad pide participar", "The community asks to join")}</span>
              <span className="row">
                {v.estado === "propuesta" && decideYo(v) && <>
                  <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("proyecto_comunidades", v.id, { estado: "aceptada" }))}>{L("Aceptar", "Accept")}</button>
                  <button type="button" className="btn-mini claro" onClick={() => env.enviar(() => cambiar("proyecto_comunidades", v.id, { estado: "rechazada" }))}>{L("Rechazar", "Decline")}</button>
                </>}
                {(gestiona || puede.representar(permisos, v.comunidad)) && <Confirmar texto={L("Quitar", "Remove")} onSi={() => env.enviar(() => borrar("proyecto_comunidades", v.id))} />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {opciones.length > 0 && (
        <form className="row form-linea" onSubmit={proponer}>
          <label className="sr" htmlFor="v-com">{L("Comunidad", "Community")}</label>
          <select id="v-com" value={nueva.comunidad} onChange={(e) => setNueva({ ...nueva, comunidad: e.target.value })}>
            <option value="">{gestiona ? L("Proponer una comunidad…", "Propose a community…") : L("Que participe mi comunidad…", "Have my community join…")}</option>
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label className="sr" htmlFor="v-papel">{L("Papel", "Role")}</label>
          <input id="v-papel" maxLength={120} value={nueva.papel} placeholder={L("Papel (opcional): lidera, monitoreo…", "Role (optional): leads, monitoring…")} onChange={(e) => setNueva({ ...nueva, papel: e.target.value })} />
          <button className="btn-mini" type="submit" disabled={env.ocupado}>{L("Enviar", "Send")}</button>
        </form>
      )}
      <Aviso texto={env.msg} />
    </div>
  );
}

/* ---------- Equipo ---------- */
function Equipo({ p, equipo, gestiona, demo }) {
  const { data, uid, perfilDe } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const [nuevo, setNuevo] = useState({ q: "", user: "", rol: "colaborador", funcion: "" });
  const dentro = new Set(equipo.map((e) => e.user_id));
  const ql = nuevo.q.trim().toLowerCase();
  const candidatos = ql.length >= 2 ? data.perfiles.filter((x) => !dentro.has(x.id) && String(x.nombre || "").toLowerCase().includes(ql)).slice(0, 8) : [];
  const anadir = (ev) => {
    ev.preventDefault();
    if (!nuevo.user) { env.setMsg(L("Busca y elige a la persona.", "Search for and choose the person.")); return; }
    env.enviar(() => crear("proyecto_equipo", { proyecto: p.id, user_id: nuevo.user, rol: nuevo.rol, funcion: str(nuevo.funcion, 80) || null }), () => setNuevo({ q: "", user: "", rol: "colaborador", funcion: "" }));
  };
  return (
    <div className="caja">
      <h3 className="sub">{L("Equipo", "Team")}</h3>
      <p className="hint">{L("Cada persona decide si su nombre sale en la ficha pública.", "Each person decides whether their name appears on the public page.")}</p>
      {demo && (
        <ul className="lista-gestion">
          {demo.equipo.map((e, i) => (
            <li key={"ej" + i}>
              <span>{e.nombre}</span>
              <span className="meta"> · {e.rol === "responsable" ? L("Responsable", "Lead") : L(...e.funcion)}</span>
              <span className="tag tag-ej">{L("Ejemplo · ficticio", "Example · fictional")}</span>
            </li>
          ))}
        </ul>
      )}
      {demo && <p className="hint">{L("Las personas marcadas como ficticias son inventadas para el ejemplo: no tienen cuenta y no se pueden editar.", "People marked as fictional are made up for the example: they have no account and cannot be edited.")}</p>}
      <ul className="lista-gestion">
        {equipo.map((e) => (
          <li key={e.id}>
            <span>{(perfilDe(e.user_id) || {}).nombre || L("Persona", "Person")}</span>
            <span className="meta"> · {e.rol === "responsable" ? L("Responsable", "Lead") : e.funcion ? (CATEGORIAS_C[e.funcion] ? et(CATEGORIAS_C, e.funcion) : e.funcion) : L("Colabora", "Collaborator")}</span>
            <span className="tag">{e.publico ? L("Visible", "Visible") : L("Oculto", "Hidden")}</span>
            <span className="row">
              {e.user_id === uid && <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("proyecto_equipo", e.id, { publico: !e.publico }))}>{e.publico ? L("Ocultar mi nombre", "Hide my name") : L("Mostrar mi nombre", "Show my name")}</button>}
              {gestiona && e.user_id !== uid && <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("proyecto_equipo", e.id, { rol: e.rol === "responsable" ? "colaborador" : "responsable" }))}>{e.rol === "responsable" ? L("Pasar a colaborador", "Make collaborator") : L("Hacer responsable", "Make lead")}</button>}
              {(gestiona || e.user_id === uid) && <Confirmar texto={e.user_id === uid ? L("Salir del equipo", "Leave the team") : L("Quitar", "Remove")} onSi={() => env.enviar(() => borrar("proyecto_equipo", e.id))} />}
            </span>
          </li>
        ))}
      </ul>
      {gestiona && (
        <form className="panel panel-sm" onSubmit={anadir} noValidate>
          <div className="fields">
            <div className="full"><label htmlFor="eq-q">{L("Añadir a una persona con cuenta", "Add a person with an account")}</label>
              <input id="eq-q" value={nuevo.q} placeholder={L("Escribe su nombre", "Type their name")} onChange={(e) => setNuevo({ ...nuevo, q: e.target.value, user: "" })} />
              {candidatos.length > 0 && !nuevo.user && (
                <ul className="sugerencias">{candidatos.map((x) => <li key={x.id}><button type="button" className="linkbtn" onClick={() => setNuevo({ ...nuevo, q: x.nombre, user: x.id })}>{x.nombre}</button></li>)}</ul>
              )}</div>
            <div><label htmlFor="eq-rol">{L("Papel", "Role")}</label>
              <select id="eq-rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                <option value="colaborador">{L("Colaborador/a", "Collaborator")}</option><option value="responsable">{L("Responsable", "Lead")}</option>
              </select></div>
            <div><label htmlFor="eq-fun">{L("Función (opcional)", "Function (optional)")}</label><input id="eq-fun" maxLength={80} value={nuevo.funcion} onChange={(e) => setNuevo({ ...nuevo, funcion: e.target.value })} /></div>
          </div>
          <button className="btn-mini" type="submit" disabled={env.ocupado}>{L("Añadir al equipo", "Add to the team")}</button>
        </form>
      )}
      <Aviso texto={env.msg} />
    </div>
  );
}

/* ================= Formulario ================= */
export function ProjectForm({ p, onClose, onGuardado }) {
  const { t, en, data, permisos } = useApp();
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const ref = useRef(null);
  const coord = puede.coordinar(permisos);
  const mias = data.comunidades.filter((c) => puede.representar(permisos, c.id) && !permisos.todo && !coord);
  const [f, setF] = useState(() => ({
    nombre: p?.nombre || "", resumen: p?.resumen || "", estado: p?.estado || "preparacion", zona: p?.zona || "", region: p?.region || "",
    responsable_org: p?.responsable_org || "", descripcion: p?.descripcion || "", problema: p?.problema || "",
    especies: p?.especies || "", ecosistemas: p?.ecosistemas || "",
    objetivos: p?.objetivos || [], actividades: p?.actividades || [], calendario: p?.calendario || [], necesidades: p?.necesidades || [],
    moneda: p?.moneda || "pen", presupuesto: unidades(p?.presupuesto), meta_fondos: unidades(p?.meta_fondos), destino_fondos: p?.destino_fondos || "",
    resultados: p?.resultados || "", portada: p?.portada ? [p.portada] : [], fotos: p?.fotos || [], documentos: p?.documentos || [],
    lidera: mias.length === 1 ? mias[0].id : "",
  }));
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  useEffect(() => { ref.current?.scrollIntoView({ block: "start" }); ref.current?.querySelector("input")?.focus(); }, []);

  const guardar = (ev) => {
    ev.preventDefault();
    const d = {
      nombre: str(f.nombre, 140), resumen: str(f.resumen, 300) || null, estado: f.estado, zona: P[f.zona] ? f.zona : null, region: str(f.region, 120) || null,
      responsable_org: str(f.responsable_org, 140) || null, descripcion: str(f.descripcion, 8000) || null, problema: str(f.problema, 4000) || null,
      especies: str(f.especies, 600) || null, ecosistemas: str(f.ecosistemas, 600) || null,
      objetivos: lineas(f.objetivos).map((x) => ({ texto: str(x.texto, 240) })),
      actividades: lineas(f.actividades).map((x) => ({ texto: str(x.texto, 240), hecha: !!x.hecha })),
      calendario: lineas(f.calendario, "hito").map((x) => ({ fecha: str(x.fecha, 40), hito: str(x.hito, 240) })),
      necesidades: lineas(f.necesidades).map((x) => ({ texto: str(x.texto, 240), tipo: TIPOS_NEC[x.tipo] ? x.tipo : "otro", cubierta: !!x.cubierta })),
      moneda: f.moneda, presupuesto: centimos(f.presupuesto), meta_fondos: centimos(f.meta_fondos), destino_fondos: str(f.destino_fondos, 2000) || null,
      resultados: str(f.resultados, 4000) || null, portada: f.portada[0] || null, fotos: f.fotos.slice(0, 12), documentos: f.documentos.slice(0, 20),
    };
    if (d.nombre.length < 3) { setMsg(L("Escribe el nombre del proyecto.", "Write the project name.")); ref.current?.querySelector("#p-nombre")?.focus(); return; }
    if ((f.presupuesto && d.presupuesto == null) || (f.meta_fondos && d.meta_fondos == null)) { setMsg(L("Revisa las cantidades: solo números.", "Check the amounts: numbers only.")); return; }
    if (COORD.test([d.region, d.descripcion, d.problema, d.resultados, d.resumen].join(" "))) { setMsg(COORD_MSG); return; }
    enviar(async () => {
      if (p) return cambiar("proyectos", p.id, d);
      const n = await crear("proyectos", d);
      if (f.lidera) await crear("proyecto_comunidades", { proyecto: n.id, comunidad: f.lidera, papel: L("Lidera la iniciativa", "Leads the initiative"), estado: "aceptada" }).catch(() => {});
      return n;
    }, onGuardado);
  };

  return (
    <form className="panel form-largo" onSubmit={guardar} noValidate ref={ref}>
      <h2 className="panel-h">{p ? L("Editar proyecto", "Edit project") : L("Nuevo proyecto", "New project")}</h2>
      {!p && !coord && <p className="hint">{L("Se guarda como borrador. La coordinación lo revisa antes de publicarlo.", "It is saved as a draft. The coordination team reviews it before publishing.")}</p>}
      <fieldset className="grupo"><legend>{L("Lo esencial", "The essentials")}</legend>
        <div className="fields">
          <div className="full"><label htmlFor="p-nombre">{L("Nombre", "Name")}</label><input id="p-nombre" maxLength={140} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
          <div className="full"><label htmlFor="p-resumen">{L("En una frase", "In one sentence")}</label><input id="p-resumen" maxLength={300} value={f.resumen} onChange={(e) => set("resumen", e.target.value)} /></div>
          <div><label htmlFor="p-estado">{L("Estado", "Status")}</label>
            <select id="p-estado" value={f.estado} onChange={(e) => set("estado", e.target.value)}>{Object.keys(ESTADOS_P).map((k) => <option key={k} value={k}>{et(ESTADOS_P, k)}</option>)}</select></div>
          <div><label htmlFor="p-zona">{L("Zona", "Area")}</label>
            <select id="p-zona" value={f.zona} onChange={(e) => set("zona", e.target.value)}><option value="">{t("Elige la zona")}</option>{Object.keys(P).map((k) => <option key={k} value={k}>{t(P[k])}</option>)}</select></div>
          <div className="full"><label htmlFor="p-region">{L("Lugar (general)", "Place (general)")}</label><input id="p-region" maxLength={120} value={f.region} placeholder={L("Provincia o distrito", "Province or district")} onChange={(e) => set("region", e.target.value)} />
            <p className="hint">{L("Nunca coordenadas exactas: los traficantes de fauna buscan esos datos.", "Never exact coordinates: wildlife traffickers look for them.")}</p></div>
          <div className="full"><label htmlFor="p-org">{L("Persona u organización responsable", "Lead person or organisation")}</label><input id="p-org" maxLength={140} value={f.responsable_org} onChange={(e) => set("responsable_org", e.target.value)} /></div>
          {!p && mias.length > 0 && (
            <div className="full"><label htmlFor="p-lidera">{L("Comunidad que lo impulsa", "Community behind it")}</label>
              <select id="p-lidera" value={f.lidera} onChange={(e) => set("lidera", e.target.value)}>
                <option value="">{L("Ninguna por ahora", "None for now")}</option>{mias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select></div>
          )}
          <div className="full"><span className="label">{L("Foto de portada", "Cover photo")}</span><SubirFotos id="p-portada" fotos={f.portada} onChange={(v) => set("portada", v)} max={1} />
            <p className="hint">{L("Usa fotos reales del proyecto o del lugar. Si no tienes, se muestra un tejido.", "Use real photos of the project or the place. If you have none, a weave pattern is shown.")}</p></div>
        </div>
      </fieldset>
      <fieldset className="grupo"><legend>{L("El problema y la propuesta", "The problem and the plan")}</legend>
        <div className="fields">
          <div className="full"><label htmlFor="p-desc">{L("Descripción detallada", "Detailed description")}</label><textarea id="p-desc" rows={6} maxLength={8000} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></div>
          <div className="full"><label htmlFor="p-prob">{L("Problema ambiental que aborda", "Environmental problem it tackles")}</label><textarea id="p-prob" rows={4} maxLength={4000} value={f.problema} onChange={(e) => set("problema", e.target.value)} /></div>
          <div><label htmlFor="p-esp">{L("Especies relacionadas", "Related species")}</label><input id="p-esp" maxLength={600} value={f.especies} onChange={(e) => set("especies", e.target.value)} /></div>
          <div><label htmlFor="p-eco">{L("Ecosistemas", "Ecosystems")}</label><input id="p-eco" maxLength={600} value={f.ecosistemas} onChange={(e) => set("ecosistemas", e.target.value)} /></div>
          <div className="full"><span className="label">{L("Objetivos", "Goals")}</span><FilasEditor id="p-obj" items={f.objetivos} onChange={(v) => set("objetivos", v)} campos={{ texto: L("Objetivo", "Goal") }} /></div>
          <div className="full"><span className="label">{L("Actividades previstas", "Planned activities")}</span><FilasEditor id="p-act" items={f.actividades} onChange={(v) => set("actividades", v)} campos={{ texto: L("Actividad", "Activity"), check: { k: "hecha", label: L("Hecha", "Done") } }} /></div>
          <div className="full"><span className="label">{L("Calendario", "Timeline")}</span><FilasEditor id="p-cal" items={f.calendario} onChange={(v) => set("calendario", v)} campos={{ texto: L("Hito", "Milestone"), fecha: L("Cuándo", "When"), fechaPh: L("Mes o fecha", "Month or date") }} /></div>
          <div className="full"><span className="label">{L("Necesidades pendientes", "Outstanding needs")}</span><FilasEditor id="p-nec" items={f.necesidades} onChange={(v) => set("necesidades", v)} campos={{ texto: L("Necesidad", "Need"), tipo: { label: L("Tipo", "Type"), opciones: TIPOS_NEC }, check: { k: "cubierta", label: L("Cubierta", "Covered") } }} /></div>
        </div>
      </fieldset>
      <fieldset className="grupo"><legend>{L("Dinero", "Money")}</legend>
        <div className="fields">
          <div><label htmlFor="p-mon">{L("Moneda", "Currency")}</label>
            <select id="p-mon" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}><option value="pen">PEN · S/</option><option value="eur">EUR · €</option><option value="usd">USD · $</option></select></div>
          <div><label htmlFor="p-pres">{L("Presupuesto estimado", "Estimated budget")}</label><input id="p-pres" inputMode="decimal" value={f.presupuesto} onChange={(e) => set("presupuesto", e.target.value)} /></div>
          <div><label htmlFor="p-meta">{L("Objetivo de financiación", "Funding goal")}</label><input id="p-meta" inputMode="decimal" value={f.meta_fondos} onChange={(e) => set("meta_fondos", e.target.value)} /></div>
          <div className="full"><label htmlFor="p-dest">{L("A qué se destinarán los fondos", "What the funds will pay for")}</label><textarea id="p-dest" rows={3} maxLength={2000} value={f.destino_fondos} onChange={(e) => set("destino_fondos", e.target.value)} /></div>
        </div>
        <p className="hint">{L("Lo conseguido no se escribe a mano: se calcula con los pagos confirmados y los ingresos verificados. Las donaciones del proyecto las activa la coordinación.", "The amount raised is never typed in: it is calculated from confirmed payments and verified income. Project donations are turned on by the coordination team.")}</p>
      </fieldset>
      <fieldset className="grupo"><legend>{L("Fotos, documentos y resultados", "Photos, documents and results")}</legend>
        <div className="fields">
          <div className="full"><span className="label">{L("Fotografías", "Photos")}</span><SubirFotos id="p-fotos" fotos={f.fotos} onChange={(v) => set("fotos", v)} max={12} /></div>
          <div className="full"><span className="label">{L("Documentación", "Documents")}</span><SubirDocs id="p-docs" docs={f.documentos} onChange={(v) => set("documentos", v)} max={20} /></div>
          <div className="full"><label htmlFor="p-res">{L("Resultados obtenidos", "Results achieved")}</label><textarea id="p-res" rows={3} maxLength={4000} value={f.resultados} onChange={(e) => set("resultados", e.target.value)} />
            <p className="hint">{L("Solo resultados comprobables. Los resultados concretos se cuentan mejor como actualización de tipo «Resultado», que valida la coordinación.", "Only verifiable results. Specific results are best posted as a “Result” update, which the coordination team validates.")}</p></div>
        </div>
      </fieldset>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Guardar proyecto", "Save project")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}
