/* Panel de coordinación: proyectos, comunidades, candidaturas, finanzas, informes, resultados, permisos y registro.
   Lo ven la administración y la coordinación; la base de datos comprueba cada acción (supabase.sql). */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { PROYECTO_EJEMPLO, TIPOS_ACT } from "../data/proyectos.js";
import { REMOTE } from "../lib/store.js";
import { borrar, cambiar, crear, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero, estadoDonaciones } from "../lib/donaciones.js";
import { Autor } from "./People.jsx";
import { CandidaturasRecibidas } from "./Collaborate.jsx";
import { DonacionesLista, Movimientos } from "./Finance.jsx";
import { InformeForm, InformesLista } from "./Impact.jsx";
import { Aviso, Cargando, Confirmar, ErrorCarga, EstadoP, fechaCorta, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export default function Coordination() {
  const { meta, permisos } = useApp();
  const L = useL();
  const [tab, setTab] = useState("resumen");
  if (!puede.coordinar(permisos)) {
    return (
      <section id="v-coordinacion">
        <Vacio titulo={L("Solo para la coordinación", "Coordination team only")} texto={meta.cuenta ? L("Tu cuenta no tiene permisos de coordinación. Los da la administración.", "Your account has no coordination permissions. The administrators grant them.") : L("Entra con una cuenta de coordinación.", "Sign in with a coordination account.")} />
      </section>
    );
  }
  const tabs = [["resumen", L("Resumen", "Overview")], ["proyectos", L("Proyectos", "Projects")], ["comunidades", L("Comunidades", "Communities")],
    ["candidaturas", L("Candidaturas", "Applications")], ["finanzas", L("Financiación", "Funding")], ["informes", L("Informes", "Reports")],
    ["resultados", L("Validar", "Validate")], ...(permisos.admin ? [["permisos", L("Permisos", "Permissions")]] : []), ["registro", L("Registro", "Log")]];
  return (
    <section id="v-coordinacion" aria-labelledby="h-coord">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-coord">{L("Coordinación", "Coordination")}</h2>
            <p className="intro">{L("Revisar, publicar y verificar. Todo lo que se hace aquí queda en el registro de cambios.", "Review, publish and verify. Everything done here is kept in the change log.")}</p>
          </div>
        </header>
        <Pestanas etiqueta={L("Secciones", "Sections")} valor={tab} onCambio={setTab} opciones={tabs} />
      </div>
      {tab === "resumen" && <Resumen ir={setTab} />}
      {tab === "proyectos" && <TabProyectos />}
      {tab === "comunidades" && <TabComunidades />}
      {tab === "candidaturas" && <TabCandidaturas />}
      {tab === "finanzas" && <TabFinanzas />}
      {tab === "informes" && <TabInformes />}
      {tab === "resultados" && <TabResultados />}
      {tab === "permisos" && permisos.admin && <TabPermisos />}
      {tab === "registro" && <TabRegistro />}
    </section>
  );
}

function Resumen({ ir }) {
  const { en } = useApp();
  const L = useL();
  const cif = useCifras();
  const pas = useCarga(estadoDonaciones, []);
  const { datos, error } = useCarga(async () => {
    const [ps, miem, cands, movs, infs, acts] = await Promise.all([
      filas("proyectos", {}), filas("comunidad_miembros", { eq: { estado: "solicitada" } }), filas("candidaturas", { en: { estado: ["enviada", "en_revision"] } }),
      filas("movimientos", { eq: { estado: "registrado" } }), filas("informes", { eq: { publicado: false } }),
      filas("proyecto_actualizaciones", { eq: { validada: false }, en: { tipo: ["actividad", "resultado"] } }),
    ]);
    return { ps, miem, cands, movs, infs, acts };
  });
  const d = datos || { ps: [], miem: [], cands: [], movs: [], infs: [], acts: [] };
  const pend = [
    ["proyectos", L("Proyectos que piden publicarse", "Projects asking to be published"), d.ps.filter((p) => !p.publicado && p.revision_pedida).length],
    ["comunidades", L("Solicitudes para unirse a comunidades", "Requests to join communities"), d.miem.length],
    ["candidaturas", L("Candidaturas por decidir", "Applications to decide"), d.cands.length],
    ["finanzas", L("Ingresos y gastos por verificar", "Income and spending to verify"), d.movs.length],
    ["informes", L("Informes por publicar", "Reports to publish"), d.infs.length],
    ["resultados", L("Actividades y resultados por validar", "Activities and results to validate"), d.acts.length],
  ];
  const c = cif.datos || {};
  return (
    <>
      <ErrorCarga error={error} />
      <div className="tiles">
        {pend.map(([k, txt, n]) => (
          <button type="button" key={k} className={"tile tile-btn" + (n ? " pendiente" : "")} onClick={() => ir(k)}><p className="tile-n">{n}</p><p className="tile-l">{txt}</p></button>
        ))}
      </div>
      <div className="caja">
        <h3 className="sub">{L("Estado general", "General status")}</h3>
        <ul className="lista-puntos">
          <li>{L("Donaciones en línea: ", "Online donations: ")}<b>{pas.datos && pas.datos.activo ? L("activas", "active") + " · " + pas.datos.entidad : L("desactivadas (falta configurar la entidad receptora o las claves; ver README)", "off (receiving organisation or keys not configured; see README)")}</b></li>
          <li>{L("Comunidades registradas: ", "Registered communities: ")}<b>{c.comunidades || 0}</b> · {L("participando en proyectos: ", "in projects: ")}<b>{c.comunidades_participantes || 0}</b></li>
          <li>{L("Proyectos publicados: ", "Published projects: ")}<b>{Object.values(c.proyectos || {}).reduce((s, n) => s + n, 0)}</b> · {L("borradores: ", "drafts: ")}<b>{d.ps.filter((p) => !p.publicado).length}</b></li>
          {(c.fondos || []).map((f) => <li key={f.moneda}>{L("Recibido ", "Received ")}({f.moneda.toUpperCase()}): <b>{dinero(f.donaciones + f.otros, f.moneda, en)}</b></li>)}
          {!REMOTE && <li>{L("Versión de demostración: los datos se guardan solo en este navegador.", "Demo version: data is stored in this browser only.")}</li>}
        </ul>
      </div>
    </>
  );
}

function TabProyectos() {
  const { en } = useApp();
  const L = useL();
  const env = useEnviar();
  const { datos, error, cargando } = useCarga(() => filas("proyectos", { orden: "actualizado" }));
  const ps = datos || [];
  const hayEjemplo = ps.some((p) => p.ejemplo);
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Todos los proyectos", "All projects")}</h3>
        {hayEjemplo
          ? <Confirmar texto={L("Borrar el proyecto de ejemplo", "Delete the example project")} onSi={() => env.enviar(async () => { for (const p of ps.filter((x) => x.ejemplo)) await borrar("proyectos", p.id); })} />
          : <button type="button" className="btn-mini" onClick={() => env.enviar(() => crear("proyectos", PROYECTO_EJEMPLO))}>{L("Cargar el proyecto de ejemplo", "Load the example project")}</button>}
      </div>
      <p className="hint">{L("El proyecto de ejemplo enseña la estructura de una ficha. Sale marcado como ejemplo y no cuenta en ninguna cifra.", "The example project shows how a page is structured. It is marked as an example and is never counted in figures.")}</p>
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : ps.length ? (
        <ul className="lista-gestion">
          {ps.map((p) => (
            <li key={p.id}>
              <span><a href={"#proyecto-" + p.id}><b>{p.nombre}</b></a> <EstadoP estado={p.estado} />
                {p.ejemplo && <span className="tag tag-ej">{L("Ejemplo", "Example")}</span>}
                {!p.publicado && <span className="tag">{p.revision_pedida ? L("Pide publicarse", "Asks to be published") : L("Borrador", "Draft")}</span>}
                {p.meta_fondos > 0 && <span className="meta"> · {L("objetivo ", "goal ")}{dinero(p.meta_fondos, p.moneda, en)}</span>}</span>
              <span className="row">
                <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("proyectos", p.id, { publicado: !p.publicado }))}>{p.publicado ? L("Retirar", "Unpublish") : L("Publicar", "Publish")}</button>
                {!p.ejemplo && <label className="check-mini"><input type="checkbox" checked={p.acepta_donaciones} onChange={(e) => env.enviar(() => cambiar("proyectos", p.id, { acepta_donaciones: e.target.checked }))} />{L("Acepta donaciones", "Accepts donations")}</label>}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="meta">{L("No hay proyectos.", "No projects.")}</p>}
      <Aviso texto={env.msg} />
    </div>
  );
}

function TabComunidades() {
  const { data, perfilDe, irComunidad } = useApp();
  const L = useL();
  const env = useEnviar();
  const { datos, error, cargando } = useCarga(() => filas("comunidad_miembros", { orden: "created_at" }));
  const ms = datos || [];
  const pend = ms.filter((m) => m.estado === "solicitada");
  const nombreC = (id) => (data.comunidades.find((c) => c.id === id) || {}).nombre || id;
  const nombreP = (u) => (perfilDe(u) || {}).nombre || L("Persona", "Person");
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Solicitudes pendientes", "Pending requests")}</h3>
        <p className="hint">{L("Decide la coordinación solo cuando la comunidad todavía no tiene representantes. Si los tiene, mejor que decidan ellos.", "The coordination team should only decide when the community has no representatives yet. If it has, let them decide.")}</p>
        <ErrorCarga error={error} />
        {cargando && !datos ? <Cargando /> : pend.length ? (
          <ul className="lista-gestion">
            {pend.map((m) => {
              const tieneReps = ms.some((x) => x.comunidad === m.comunidad && x.rol === "representante" && x.estado === "aceptada");
              return (
                <li key={m.id}>
                  <span><b>{nombreP(m.user_id)}</b> → <button type="button" className="linkbtn" onClick={() => irComunidad(m.comunidad)}>{nombreC(m.comunidad)}</button>
                    <span className="meta"> · {m.rol_pedido === "representante" ? L("pide representar", "asks to represent") : L("pide ser miembro", "asks to be a member")}{m.cargo ? " · " + m.cargo : ""}{tieneReps ? " · " + L("ya tiene representantes", "already has representatives") : ""}</span></span>
                  {m.mensaje && <p className="meta nota">«{m.mensaje}»</p>}
                  <span className="row">
                    <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "aceptada", rol: m.rol_pedido }))}>{L("Aceptar", "Accept")}</button>
                    <button type="button" className="btn-mini claro" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "rechazada" }))}>{L("Rechazar", "Decline")}</button>
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
        <ul className="lista-gestion">
          {data.comunidades.filter((c) => !c.ejemplo).map((c) => {
            const reps = ms.filter((m) => m.comunidad === c.id && m.rol === "representante" && m.estado === "aceptada");
            return <li key={c.id}><button type="button" className="linkbtn" onClick={() => irComunidad(c.id)}><b>{c.nombre}</b></button>
              <span className="meta"> · {reps.length ? reps.map((m) => nombreP(m.user_id)).join(", ") : L("sin representantes", "no representatives")}</span></li>;
          })}
        </ul>
      </div>
    </>
  );
}

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
      {datos ? <CandidaturasRecibidas ops={datos.ops} proyectos={datos.ps} comunidades={data.comunidades} /> : <Cargando />}
    </div>
  );
}

function TabFinanzas() {
  const L = useL();
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Ingresos y gastos", "Income and spending")}</h3>
        <p className="hint">{L("Registra los gastos con su justificante y verifica lo que registran los proyectos. Nada se borra: los errores se anulan con un motivo y quedan en el registro.", "Record spending with its receipt and verify what projects record. Nothing is deleted: mistakes are cancelled with a reason and stay in the log.")}</p>
        <Movimientos proyecto={null} />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Donaciones por la pasarela", "Donations through the payment provider")}</h3>
        <DonacionesLista />
      </div>
      <div className="caja">
        <h3 className="sub">{L("Campañas de los proyectos", "Project campaigns")}</h3>
        <p className="hint">{L("Cada proyecto fija su objetivo y el destino de los fondos en su ficha. Aquí, en «Proyectos», se activan o desactivan sus donaciones.", "Each project sets its goal and use of funds on its page. Its donations are turned on or off under “Projects”.")}</p>
      </div>
    </>
  );
}

function TabInformes() {
  const L = useL();
  const [form, setForm] = useState(false);
  const { datos, cargando } = useCarga(async () => {
    const [infs, ps] = await Promise.all([filas("informes", { orden: "fecha" }), filas("proyectos", {})]);
    return { infs, ps };
  });
  return (
    <div className="caja">
      <div className="caja-tit">
        <h3 className="sub">{L("Informes", "Reports")}</h3>
        {!form && <button type="button" className="btn-mini" onClick={() => setForm(true)}>{L("Nuevo informe", "New report")}</button>}
      </div>
      {form && <InformeForm onClose={() => setForm(false)} />}
      {cargando && !datos ? <Cargando /> : datos.infs.length ? <InformesLista lista={datos.infs} proyectos={datos.ps} /> : <p className="meta">{L("No hay informes.", "No reports.")}</p>}
    </div>
  );
}

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
      <span><span className="tag">{et(TIPOS_ACT, a.tipo)}</span> <b>{a.titulo}</b> <span className="meta">· <a href={"#proyecto-" + a.proyecto}>{nombreP(a.proyecto)}</a> · {fechaCorta(a.fecha, en)} · <Autor by={a.by} /></span></span>
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

function TabPermisos() {
  const { data, perfilDe } = useApp();
  const L = useL();
  const env = useEnviar();
  const [q, setQ] = useState("");
  const { datos, cargando } = useCarga(() => filas("roles_usuario", { orden: "created_at" }));
  const roles = datos || [];
  const dentro = new Set(roles.map((r) => r.user_id));
  const ql = q.trim().toLowerCase();
  const cand = ql.length >= 2 ? data.perfiles.filter((p) => !dentro.has(p.id) && String(p.nombre || "").toLowerCase().includes(ql)).slice(0, 8) : [];
  return (
    <>
      <div className="caja">
        <h3 className="sub">{L("Coordinación", "Coordination team")}</h3>
        {cargando && !datos ? <Cargando /> : roles.length ? (
          <ul className="lista-gestion">{roles.map((r) => <li key={r.user_id}><span><b>{(perfilDe(r.user_id) || {}).nombre || r.user_id}</b> <span className="meta">· {L("desde ", "since ")}{fechaCorta(r.created_at)}</span></span>
            <Confirmar texto={L("Quitar permiso", "Remove permission")} onSi={() => env.enviar(() => borrar("roles_usuario", r.user_id, "user_id"))} /></li>)}</ul>
        ) : <p className="meta">{L("Nadie más tiene permisos de coordinación.", "Nobody else has coordination permissions.")}</p>}
        <label htmlFor="perm-q">{L("Dar permiso de coordinación a una persona con cuenta", "Give coordination permission to a person with an account")}</label>
        <input id="perm-q" value={q} placeholder={L("Escribe su nombre", "Type their name")} onChange={(e) => setQ(e.target.value)} />
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

function TabRegistro() {
  const { en, perfilDe } = useApp();
  const L = useL();
  const { datos, error, cargando } = useCarga(() => (REMOTE ? filas("auditoria", { orden: "created_at", limite: 150 }) : Promise.resolve([])));
  return (
    <div className="caja">
      <h3 className="sub">{L("Registro de cambios", "Change log")}</h3>
      <p className="hint">{L("Cada alta, cambio o baja en proyectos, comunidades, candidaturas, dinero, informes y permisos queda anotado aquí con quién y cuándo. Nadie puede borrarlo.", "Every creation, change or removal in projects, communities, applications, money, reports and permissions is recorded here with who and when. Nobody can delete it.")}</p>
      {!REMOTE && <p className="meta">{L("En la versión de demostración no hay registro.", "There is no log in the demo version.")}</p>}
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : (datos || []).length ? (
        <div className="tabla-w">
          <table className="tabla registro">
            <thead><tr><th>{L("Cuándo", "When")}</th><th>{L("Quién", "Who")}</th><th>{L("Qué", "What")}</th><th>{L("Cambios", "Changes")}</th></tr></thead>
            <tbody>
              {datos.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString(en ? "en-GB" : "es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{r.por ? (perfilDe(r.por) || {}).nombre || L("Cuenta", "Account") : L("Sistema", "System")}</td>
                  <td>{r.tabla} · {r.accion}</td>
                  <td className="registro-cambios">{r.accion === "update" ? Object.keys(r.cambios || {}).join(", ") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : REMOTE ? <p className="meta">{L("Sin cambios registrados.", "No changes recorded.")}</p> : null}
    </div>
  );
}
