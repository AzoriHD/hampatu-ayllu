/* Ficha de cada comunidad, por apartados como un clan (inicio, miembros, proyectos, necesidades, gestión): presentación, naturaleza, proyectos, necesidades, apoyos, resultados y representantes.
   La comunidad decide quién la representa y qué se publica (supabase.sql, bloque 10). */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { TC } from "../data/constants.js";
import { CATEGORIAS_C, ESTADOS_O } from "../data/proyectos.js";
import { borrar, cambiar, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero } from "../lib/donaciones.js";
import { copiar } from "../lib/utils.js";
import { store } from "../lib/store.js";
import { cuentasMiembros, INGRESOS, ingresoDe } from "../lib/clanes.js";
import { Msg, Simbolo } from "./Shared.jsx";
import { IngresoTag, Unirse } from "./Clan.jsx";
import { Autor } from "./People.jsx";
import { CommunityForm } from "./Communities.jsx";
import { OportunidadForm } from "./Collaborate.jsx";
import { InformesLista } from "./Impact.jsx";
import { Aviso, Cargando, Confirmar, EstadoP, Galeria, Parrafos, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export default function CommunityPage({ id }) {
  const { t, en, data, meta, uid, canPost, permisos, zonaDe, write } = useApp();
  const L = useL(), et = useEt();
  const [editar, setEditar] = useState(false);
  const [necesidad, setNecesidad] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pestana, setPestana] = useState(() => { const v = sessionStorage.getItem("hampatu-pestana") || "inicio"; sessionStorage.removeItem("hampatu-pestana"); return v; });
  const [mIng, setMIng] = useState("");
  const env = useEnviar();
  const c = data.comunidades.find((x) => x.id === id);
  const { datos, cargando } = useCarga(async () => {
    if (!c) return null;
    const [miembros, vinculos, ops, infs, cuentas] = await Promise.all([
      filas("comunidad_miembros", { eq: { comunidad: id }, orden: "created_at", desc: false }),
      filas("proyecto_comunidades", { eq: { comunidad: id } }),
      filas("oportunidades", { eq: { comunidad: id } }),
      filas("informes", { eq: { comunidad: id }, orden: "fecha" }),
      cuentasMiembros(),
    ]);
    const ids = [...new Set(vinculos.map((v) => v.proyecto))];
    const [ps, res] = ids.length ? await Promise.all([
      filas("proyectos", { en: { id: ids } }),
      filas("proyecto_actualizaciones", { en: { proyecto: ids }, eq: { tipo: "resultado", validada: true }, orden: "fecha" }),
    ]) : [[], []];
    return { miembros, vinculos, ops, infs, ps, res, total: cuentas[id] || 0 };
  }, [id, !!c]);
  const cif = useCifras();

  if (!c && meta.status === "loading") return <section className="ficha-p"><Cargando /></section>;
  if (!c) {
    return (
      <section className="ficha-p">
        <Vacio titulo={L("No encontramos esta comunidad", "We could not find this community")} texto={L("Puede que se haya borrado.", "It may have been deleted.")}>
          <a className="btn-ghost" href="#comunidades">{L("Ver todas las comunidades", "See all communities")}</a>
        </Vacio>
      </section>
    );
  }
  const representa = puede.representar(permisos, c.id);
  const editable = canPost && (meta.admin || c.by === uid || representa);
  if (editar) return <section className="ficha-p"><CommunityForm editId={c.id} onClose={() => setEditar(false)} completo /></section>;

  const d = datos || { miembros: [], vinculos: [], ops: [], infs: [], ps: [], res: [], total: 0 };
  const aceptados = d.vinculos.filter((v) => v.estado === "aceptada");
  const proy = (pid) => d.ps.find((p) => p.id === pid);
  const reps = d.miembros.filter((m) => m.estado === "aceptada" && m.rol === "representante" && m.publico);
  const otrosPublicos = d.miembros.filter((m) => m.estado === "aceptada" && m.rol === "miembro" && m.publico);
  const ocultos = Math.max(0, d.total - reps.length - otrosPublicos.length);
  const mio = meta.cuenta ? d.miembros.find((m) => m.user_id === uid) : null;
  const pend = d.miembros.filter((m) => m.estado === "solicitada" && m.user_id !== uid).length;
  const abiertas = d.ops.filter((o) => o.estado === "abierta" || o.estado === "en_curso");
  const nAvisos = data.avisos.filter((a) => a.com === c.id).length;
  /* Apoyos verificados que han recibido sus proyectos, por moneda */
  const apoyos = {};
  aceptados.forEach((v) => {
    const x = cif.datos && (cif.datos.por_proyecto || []).find((y) => y.id === v.proyecto);
    if (x && x.recaudado) apoyos[x.moneda] = (apoyos[x.moneda] || 0) + x.recaudado;
  });
  const compartir = () => {
    const url = window.location.origin + window.location.pathname + "#comunidad-" + c.id;
    if (navigator.share) navigator.share({ title: c.nombre, url }).catch(() => {});
    else copiar(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1600); }, () => {});
  };
  const z = zonaDe(c);
  const PEST = [
    ["inicio", L("Inicio", "Overview")],
    ["miembros", L("Miembros", "Members"), d.total],
    ["proyectos", L("Proyectos", "Projects"), aceptados.length],
    ["necesidades", L("Necesidades", "Needs"), abiertas.length],
    ...(representa ? [["gestion", L("Gestión", "Manage"), pend]] : []),
  ];
  const vista = PEST.some((x) => x[0] === pestana) ? pestana : "inicio";
  const cambiarIngreso = (k) => write(setMIng, () => store.update("comunidades", c.id, { ingreso: k }));

  return (
    <section id="v-comunidad" className="ficha-p" aria-labelledby="h-comunidad">
      <article className="caja ficha-com clan-cabeza">
        <p className="volver"><a href="#comunidades">← {L("Comunidades", "Communities")}</a></p>
        <div className="com-top">
          <Simbolo com={c} grande />
          <div>
            <div className="row"><span className="pill">{t(TC[c.tipo] || TC.otro)}</span><IngresoTag c={c} />{c.ejemplo && <span className="tag tag-ej">{L("Ejemplo", "Example")}</span>}</div>
            <h2 className="vista-h" id="h-comunidad">{c.nombre}</h2>
            {c.lema && <p className="lema lema-xl">«{c.lema}»</p>}
            <p className="meta">{z}{c.region ? (z ? " · " : "") + c.region : ""}</p>
          </div>
        </div>
        <dl className="clan-stats">
          <div><dt>{L("Miembros", "Members")}</dt><dd>{d.total}</dd></div>
          <div><dt>{L("Proyectos", "Projects")}</dt><dd>{aceptados.length}</dd></div>
          <div><dt>{L("Pide ayuda", "Help wanted")}</dt><dd>{abiertas.length}</dd></div>
          <div><dt>{L("Avisos", "Posts")}</dt><dd>{nAvisos}</dd></div>
        </dl>
        {c.requisitos && <div className="requisitos"><b>{L("Lo que pide a quien quiera unirse", "What it asks of new members")}</b><p>{c.requisitos}</p></div>}
        <div className="row ficha-acciones">
          <Unirse c={c} mio={mio} grande />
          {editable && <button type="button" className="btn-ghost" onClick={() => setEditar(true)}>{L("Editar la ficha", "Edit the page")}</button>}
          <button type="button" className="btn-ghost" onClick={compartir}>{copiado ? L("Enlace copiado", "Link copied") : L("Compartir", "Share")}</button>
        </div>
        <Pestanas opciones={PEST} valor={vista} onCambio={setPestana} etiqueta={L("Apartados de la comunidad", "Community sections")} />
      </article>

      {vista === "inicio" && (
        <div className="ficha-grid">
          <div className="ficha-main">
            <div className="caja">
              <h3 className="sub">{L("Presentación", "Introduction")}</h3>
              <Parrafos texto={c.presentacion} />
              {!c.presentacion && <p className="meta">{editable ? L("Añade una presentación, fotos, la naturaleza del lugar y lo que hace la comunidad: «Editar la ficha».", "Add an introduction, photos, the nature of the place and what the community does: “Edit the page”.") : L("Todavía sin presentación.", "No introduction yet.")}</p>}
              <Galeria fotos={c.fotos} />
            </div>
            {c.actividades && <div className="caja"><h3 className="sub">{L("Actividades comunitarias", "Community activities")}</h3><Parrafos texto={c.actividades} /></div>}
            {(c.resultados || d.res.length > 0) && (
              <div className="caja">
                <h3 className="sub">{L("Resultados de conservación", "Conservation results")}</h3>
                <Parrafos texto={c.resultados} />
                {d.res.map((a) => <p key={a.id} className="resultado-ok"><span className="tag tag-ok">{L("Validado", "Validated")}</span> {a.titulo} <span className="meta">· <a href={"#proyecto-" + a.proyecto}>{(proy(a.proyecto) || {}).nombre}</a></span></p>)}
              </div>
            )}
            {d.infs.length > 0 && <div className="caja"><h3 className="sub">{L("Informes", "Reports")}</h3><InformesLista lista={d.infs} compacto /></div>}
          </div>
          <aside className="ficha-lado">
            {(c.ecosistemas || c.biodiversidad || c.especies) && (
              <div className="caja">
                <h3 className="sub">{L("Naturaleza", "Nature")}</h3>
                <dl className="datos-p">
                  {c.ecosistemas && <div><dt>{L("Ecosistemas presentes", "Ecosystems")}</dt><dd>{c.ecosistemas}</dd></div>}
                  {c.biodiversidad && <div><dt>{L("Biodiversidad de interés", "Notable wildlife")}</dt><dd>{c.biodiversidad}</dd></div>}
                  {c.especies && <div><dt>{t("Allí lo llaman")}</dt><dd>{c.especies}</dd></div>}
                </dl>
              </div>
            )}
            <div className="caja">
              <h3 className="sub">{L("Quién la representa", "Who represents it")}</h3>
              {reps.length ? <ul className="lista-limpia equipo">{reps.map((m) => <li key={m.id}><Autor by={m.user_id} />{m.cargo && <span className="meta"> · {m.cargo}</span>}</li>)}</ul>
                : <p className="meta">{L("Sus representantes aún no se muestran en público.", "Its representatives are not shown publicly yet.")}</p>}
              {c.contacto && <p><span className="meta">{t("Contacto")}: </span>{c.contacto}</p>}
            </div>
          </aside>
        </div>
      )}

      {vista === "miembros" && (
        <div className="caja">
          <h3 className="sub">{L("Miembros", "Members")} <span className="meta">· {d.total}</span></h3>
          {cargando && !datos ? <Cargando /> : (
            <>
              <h4 className="rango">{L("Representantes", "Representatives")}</h4>
              {reps.length ? <ul className="roster">{reps.map((m) => <FilaMiembro key={m.id} m={m} />)}</ul> : <p className="meta">{L("Aún no se muestran en público.", "Not shown publicly yet.")}</p>}
              <h4 className="rango">{L("Miembros", "Members")}</h4>
              {otrosPublicos.length ? <ul className="roster">{otrosPublicos.map((m) => <FilaMiembro key={m.id} m={m} />)}</ul> : null}
              {ocultos > 0 && <p className="meta">{ocultos === 1 ? L("Y 1 persona más que prefiere no salir en público.", "And 1 more person who prefers not to be shown.") : L("Y " + ocultos + " personas más que prefieren no salir en público.", "And " + ocultos + " more people who prefer not to be shown.")}</p>}
              {!otrosPublicos.length && !ocultos && <p className="meta">{L("Todavía no hay miembros.", "No members yet.")}</p>}
            </>
          )}
          <MiEstado c={c} mio={mio} />
        </div>
      )}

      {vista === "proyectos" && (
        <div className="caja">
          <h3 className="sub">{L("Proyectos", "Projects")}</h3>
          {cargando && !datos ? <Cargando /> : aceptados.length ? (
            <ul className="lista-gestion">
              {aceptados.map((v) => { const p = proy(v.proyecto); return p ? <li key={v.id}><a href={"#proyecto-" + p.id}><b>{p.nombre}</b></a><EstadoP estado={p.estado} />{v.papel && <span className="meta">{v.papel}</span>}</li> : null; })}
            </ul>
          ) : <p className="meta">{L("Todavía no participa en ningún proyecto publicado.", "Not taking part in any published project yet.")}</p>}
          {representa && <Propuestas vinculos={d.vinculos.filter((v) => v.estado === "propuesta")} proy={proy} />}
        </div>
      )}

      {vista === "necesidades" && (
        <div className="ficha-grid">
          <div className="ficha-main caja">
            <h3 className="sub">{L("Necesidades y ofertas", "Needs and offers")}</h3>
            <dl className="datos-p">
              {c.necesita && <div><dt className="d-necesita">{t("Necesita")}</dt><dd>{c.necesita}</dd></div>}
              {c.ofrece && <div><dt className="d-ofrece">{t("Ofrece")}</dt><dd>{c.ofrece}</dd></div>}
            </dl>
            {abiertas.length > 0 && (
              <>
                <h4>{L("Se busca colaboración", "Help wanted")}</h4>
                <ul className="lista-limpia">{abiertas.map((o) => <li key={o.id}><a href="#colabora" onClick={() => sessionStorage.setItem("hampatu-oportunidad", o.id)}>{o.titulo}</a> <span className="meta">· {et(CATEGORIAS_C, o.categoria)} · {et(ESTADOS_O, o.estado)}</span></li>)}</ul>
              </>
            )}
            {!c.necesita && !c.ofrece && !abiertas.length && <p className="meta">{L("Sin necesidades publicadas.", "No needs published.")}</p>}
            {representa && (necesidad ? <OportunidadForm presetComunidad={c.id} onClose={() => setNecesidad(false)} />
              : <button type="button" className="btn-ghost btn-sm" onClick={() => setNecesidad(true)}>{L("Publicar una necesidad de colaboración", "Post a call for help")}</button>)}
          </div>
          <aside className="ficha-lado caja">
            <h3 className="sub">{L("Apoyos recibidos", "Support received")}</h3>
            <Parrafos texto={c.apoyos} />
            {Object.keys(apoyos).length > 0 && <p>{L("Fondos verificados de sus proyectos: ", "Verified funds for its projects: ")}<b>{Object.entries(apoyos).map(([m, v]) => dinero(v, m, en)).join(" · ")}</b></p>}
            {!c.apoyos && !Object.keys(apoyos).length && <p className="meta">{L("Sin apoyos registrados todavía.", "No support recorded yet.")}</p>}
          </aside>
        </div>
      )}

      {vista === "gestion" && representa && (
        <>
          <div className="caja">
            <h3 className="sub">{L("Reclutamiento", "Recruitment")}</h3>
            <div className="ingresos">
              {Object.keys(INGRESOS).map((k) => (
                <label className={"ingreso-op ing-" + k} key={k}>
                  <input type="radio" name="g-ingreso" checked={ingresoDe(c) === k} onChange={() => cambiarIngreso(k)} disabled={!!c.ejemplo} />
                  <b>{INGRESOS[k][en ? 1 : 0]}</b><span>{INGRESOS[k][en ? 3 : 2]}</span>
                </label>
              ))}
            </div>
            <Msg id="m-ingreso" text={mIng} role="status" />
          </div>
          <GestionMiembros c={c} miembros={d.miembros} />
        </>
      )}
      <Aviso texto={env.msg} />
    </section>
  );
}

function FilaMiembro({ m }) {
  const L = useL();
  return (
    <li className={"rol-" + m.rol}>
      <Autor by={m.user_id} />
      <span className="meta">{m.rol === "representante" ? L("Representante", "Representative") : L("Miembro", "Member")}{m.cargo ? " · " + m.cargo : ""}</span>
    </li>
  );
}

function Propuestas({ vinculos, proy }) {
  const L = useL();
  const env = useEnviar();
  const mias = vinculos.filter((v) => v.propuesta_por === "proyecto");
  if (!mias.length) return null;
  return (
    <div className="pendientes">
      <h4>{L("Proyectos que proponen a la comunidad participar", "Projects inviting the community")}</h4>
      <ul className="lista-gestion">
        {mias.map((v) => { const p = proy(v.proyecto); return (
          <li key={v.id}>
            <span>{p ? <a href={"#proyecto-" + p.id}>{p.nombre}</a> : L("Proyecto", "Project")}{v.papel && <span className="meta"> · {v.papel}</span>}</span>
            <span className="row">
              <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("proyecto_comunidades", v.id, { estado: "aceptada" }))}>{L("Participar", "Take part")}</button>
              <button type="button" className="btn-mini claro" onClick={() => env.enviar(() => cambiar("proyecto_comunidades", v.id, { estado: "rechazada" }))}>{L("No participar", "Decline")}</button>
            </span>
          </li>); })}
      </ul>
      <Aviso texto={env.msg} />
    </div>
  );
}

/* Lo mío en esta comunidad: salir o no en público y dejarla */
function MiEstado({ c, mio }) {
  const L = useL();
  const env = useEnviar();
  if (!mio || mio.estado !== "aceptada") return null;
  return (
    <div className="mi-membresia">
      <p className="meta">{mio.rol === "representante" ? L("Representas a esta comunidad.", "You represent this community.") : L("Formas parte de esta comunidad.", "You are a member of this community.")}</p>
      <label className="check-mini"><input type="checkbox" checked={mio.publico} onChange={(e) => env.enviar(() => cambiar("comunidad_miembros", mio.id, { publico: e.target.checked }))} />{L("Mostrar mi nombre en esta ficha", "Show my name on this page")}</label>
      <Confirmar texto={L("Dejar la comunidad", "Leave the community")} onSi={() => env.enviar(() => borrar("comunidad_miembros", mio.id))} />
      <Aviso texto={env.msg} />
    </div>
  );
}

/* Para representantes y coordinación: quién entra, con qué papel */
function GestionMiembros({ c, miembros }) {
  const { uid, perfilDe, escribirA } = useApp();
  const L = useL();
  const env = useEnviar();
  const pend = miembros.filter((m) => m.estado === "solicitada");
  const dentro = miembros.filter((m) => m.estado === "aceptada");
  const nombre = (m) => (perfilDe(m.user_id) || {}).nombre || L("Persona", "Person");
  return (
    <div className="caja">
      <h3 className="sub">{L("Miembros y representación", "Members and representation")}</h3>
      <p className="hint">{L("La comunidad decide quién la representa. Cada persona decide si su nombre sale en público; los datos de contacto nunca se publican sin su permiso.", "The community decides who represents it. Each person decides whether their name is public; contact details are never published without permission.")}</p>
      {pend.length > 0 && (
        <>
          <h4>{L("Solicitudes", "Requests")}</h4>
          <ul className="lista-gestion">
            {pend.map((m) => (
              <li key={m.id}>
                <span><b>{nombre(m)}</b> <span className="meta">· {m.rol_pedido === "representante" ? L("pide representar", "asks to represent") : L("pide ser miembro", "asks to be a member")}{m.cargo ? " · " + m.cargo : ""}</span></span>
                {m.mensaje && <p className="meta nota">«{m.mensaje}»</p>}
                <span className="row">
                  <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "aceptada", rol: m.rol_pedido }))}>{m.rol_pedido === "representante" ? L("Aceptar como representante", "Accept as representative") : L("Aceptar", "Accept")}</button>
                  {m.rol_pedido === "representante" && <button type="button" className="btn-mini claro" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "aceptada", rol: "miembro" }))}>{L("Solo como miembro", "Only as member")}</button>}
                  <button type="button" className="btn-mini claro" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { estado: "rechazada" }))}>{L("Rechazar", "Decline")}</button>
                  <button type="button" className="linkbtn" onClick={() => escribirA(m.user_id, { ref: { titulo: c.nombre } })}>{L("Escribir", "Message")}</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <h4>{L("Miembros", "Members")}</h4>
      {dentro.length ? (
        <ul className="lista-gestion">
          {dentro.map((m) => (
            <li key={m.id}>
              <span><b>{nombre(m)}</b> <span className="meta">· {m.rol === "representante" ? L("Representante", "Representative") : L("Miembro", "Member")}{m.cargo ? " · " + m.cargo : ""} · {m.publico ? L("visible", "visible") : L("oculto", "hidden")}</span></span>
              {m.user_id !== uid && (
                <span className="row">
                  <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("comunidad_miembros", m.id, { rol: m.rol === "representante" ? "miembro" : "representante" }))}>{m.rol === "representante" ? L("Quitar representación", "Remove representation") : L("Hacer representante", "Make representative")}</button>
                  <Confirmar texto={L("Quitar", "Remove")} onSi={() => env.enviar(() => borrar("comunidad_miembros", m.id))} />
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="meta">{L("Todavía no hay miembros.", "No members yet.")}</p>}
      <Aviso texto={env.msg} />
    </div>
  );
}

