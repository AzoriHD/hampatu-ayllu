/* Ficha de cada comunidad, por apartados como un clan (inicio, miembros, proyectos, pide ayuda, avisos, calendario, gestión): presentación, naturaleza, proyectos, necesidades, apoyos, resultados y representantes.
   La comunidad decide quién la representa y qué se publica (supabase.sql, bloque 10), y pone candado a cada apartado
   para que sea público o solo para sus miembros (bloque 17). Rangos, calendario y normas: bloque 18 (ComunidadExtra.jsx). */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { P, TC } from "../data/constants.js";
import { CATEGORIAS_C, ESTADOS_O } from "../data/proyectos.js";
import { borrar, cambiar, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero } from "../lib/donaciones.js";
import { copiar, ymd } from "../lib/utils.js";
import { store } from "../lib/store.js";
import { APARTADOS, CANDADO, CANDADO_ABIERTO, cuentasMiembros, INGRESOS, ingresoDe, privadoDe } from "../lib/clanes.js";
import { Msg, Simbolo, Svg } from "./Shared.jsx";
import { Post, PostForm } from "./Board.jsx";
import { IngresoTag, Unirse } from "./Clan.jsx";
import { Autor } from "./People.jsx";
import { CommunityForm } from "./Communities.jsx";
import { OportunidadForm } from "./Collaborate.jsx";
import { InformesLista } from "./Impact.jsx";
import { CalendarioCom, ElegirRango, GestionRangos, Normas, NormasEditor, ProximaActividad, RangoPill } from "./ComunidadExtra.jsx";
import { Aviso, Cargando, Confirmar, EstadoP, Galeria, Parrafos, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export default function CommunityPage({ id }) {
  const { t, en, data, meta, uid, canPost, permisos, zonaDe, write, pedirCuenta } = useApp();
  const L = useL(), et = useEt();
  const [editar, setEditar] = useState(false);
  const [necesidad, setNecesidad] = useState(false);
  const [nuevoAviso, setNuevoAviso] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pestana, setPestana] = useState(() => { const v = sessionStorage.getItem("hampatu-pestana") || "inicio"; sessionStorage.removeItem("hampatu-pestana"); return v; });
  const [mIng, setMIng] = useState("");
  const env = useEnviar();
  const c = data.comunidades.find((x) => x.id === id);
  const { datos, cargando } = useCarga(async () => {
    if (!c) return null;
    const [miembros, vinculos, ops, infs, cuentas, rangos, eventos] = await Promise.all([
      filas("comunidad_miembros", { eq: { comunidad: id }, orden: "created_at", desc: false }),
      filas("proyecto_comunidades", { eq: { comunidad: id } }),
      filas("oportunidades", { eq: { comunidad: id } }),
      filas("informes", { eq: { comunidad: id }, orden: "fecha" }),
      cuentasMiembros(),
      filas("comunidad_rangos", { eq: { comunidad: id }, orden: "orden", desc: false }).catch(() => []),
      filas("comunidad_eventos", { eq: { comunidad: id }, orden: "fecha", desc: false }).catch(() => []),
    ]);
    const asistencias = eventos.length ? await filas("comunidad_asistencias", { en: { evento: eventos.map((e) => e.id) }, orden: null }).catch(() => []) : [];
    const ids = [...new Set(vinculos.map((v) => v.proyecto))];
    const [ps, res] = ids.length ? await Promise.all([
      filas("proyectos", { en: { id: ids } }),
      filas("proyecto_actualizaciones", { en: { proyecto: ids }, eq: { tipo: "resultado", validada: true }, orden: "fecha" }),
    ]) : [[], []];
    return { miembros, vinculos, ops, infs, ps, res, rangos, eventos, asistencias, total: cuentas[id] || 0 };
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

  const d = datos || { miembros: [], vinculos: [], ops: [], infs: [], ps: [], res: [], rangos: [], eventos: [], asistencias: [], total: 0 };
  const rangoDe = (m) => d.rangos.find((r) => r.id === m.rango) || null;
  const aceptados = d.vinculos.filter((v) => v.estado === "aceptada");
  const proy = (pid) => d.ps.find((p) => p.id === pid);
  const reps = d.miembros.filter((m) => m.estado === "aceptada" && m.rol === "representante");
  const otrosPublicos = d.miembros.filter((m) => m.estado === "aceptada" && m.rol === "miembro");
  /* Los miembros, agrupados por rango (en el orden que decide la comunidad); al final, quien no tiene rango */
  const porRango = d.rangos.map((r) => [r, otrosPublicos.filter((m) => m.rango === r.id)]).filter((x) => x[1].length);
  const sinRango = otrosPublicos.filter((m) => !rangoDe(m));
  const proximas = d.eventos.filter((e) => e.fecha >= ymd(new Date())).length;
  const ocultos = Math.max(0, d.total - reps.length - otrosPublicos.length);
  const mio = meta.cuenta ? d.miembros.find((m) => m.user_id === uid) : null;
  const pend = d.miembros.filter((m) => m.estado === "solicitada" && m.user_id !== uid).length;
  const abiertas = d.ops.filter((o) => o.estado === "abierta" || o.estado === "en_curso");
  const avisosCom = data.avisos.filter((a) => a.com === c.id).sort((x, y) => (y.ts || 0) - (x.ts || 0));
  const nAvisos = avisosCom.length;
  const votosDe = {}, misVotos = {};
  data.votos.forEach((v) => { votosDe[v.aviso] = (votosDe[v.aviso] || 0) + 1; if (v.by === uid) misVotos[v.aviso] = 1; });
  /* Candados: lo privado solo lo ven sus miembros y la coordinación (la base de datos tampoco se lo manda a nadie más) */
  const dentro = !!(mio && mio.estado === "aceptada") || representa;
  const ver = (k) => !privadoDe(c, k) || dentro;
  const rotulo = (k) => <>{L(APARTADOS[k][0], APARTADOS[k][1])}{privadoDe(c, k) && <span className="candadito" title={L("Privado", "Private")}><Svg width="2.4" d={CANDADO} /></span>}</>;
  const presetAviso = { com: c.id, zona: P[c.zona] ? c.zona : "", zonaotra: c.zona === "otra" ? String(c.zonaOtra || "") : "", ...(c.contacto && !c.ejemplo ? { contacto: String(c.contacto) } : {}) };
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
    ["miembros", rotulo("miembros"), d.total],
    ["proyectos", rotulo("proyectos"), ver("proyectos") ? aceptados.length : 0],
    ["ayuda", rotulo("ayuda"), ver("ayuda") ? abiertas.length : 0],
    ["avisos", rotulo("avisos"), ver("avisos") ? nAvisos : 0],
    ["calendario", rotulo("calendario"), ver("calendario") ? proximas : 0],
    ...(representa ? [["gestion", L("Gestión", "Manage"), pend]] : []),
  ];
  const vista = PEST.some((x) => x[0] === pestana) ? pestana : pestana === "necesidades" ? "ayuda" : "inicio";
  const CIFRAS = { miembros: d.total, proyectos: aceptados.length, ayuda: abiertas.length, avisos: nAvisos, calendario: proximas };
  /* Las cifras de arriba llevan a su apartado */
  const irA = (k) => {
    setPestana(k);
    requestAnimationFrame(() => document.getElementById("com-apartado")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
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
        <div className="clan-stats" role="group" aria-label={L("Lo que hay en la comunidad", "What's in the community")}>
          {Object.keys(APARTADOS).map((k) => {
            const tapado = k !== "miembros" && !ver(k);
            return (
              <button key={k} type="button" className="clan-stat" aria-pressed={vista === k ? "true" : "false"} onClick={() => irA(k)}>
                <span className="st-t">{rotulo(k)}</span>
                <span className="st-n">{tapado ? <span className="st-candado" aria-label={L("Solo miembros", "Members only")}><Svg width="2" d={CANDADO} /></span> : CIFRAS[k]}</span>
              </button>
            );
          })}
        </div>
        {c.requisitos && <div className="requisitos"><b>{L("Lo que pide a quien quiera unirse", "What it asks of new members")}</b><p>{c.requisitos}</p></div>}
        <div className="row ficha-acciones">
          <Unirse c={c} mio={mio} grande />
          {editable && <button type="button" className="btn-ghost" onClick={() => setEditar(true)}>{L("Editar la ficha", "Edit the page")}</button>}
          <button type="button" className="btn-ghost" onClick={compartir}>{copiado ? L("Enlace copiado", "Link copied") : L("Compartir", "Share")}</button>
        </div>
        <Pestanas opciones={PEST} valor={vista} onCambio={setPestana} etiqueta={L("Apartados de la comunidad", "Community sections")} />
      </article>

      <div id="com-apartado" className="com-apartado">
      {vista === "inicio" && (
        <div className="ficha-grid">
          <div className="ficha-main">
            <div className="caja">
              <h3 className="sub">{L("Presentación", "Introduction")}</h3>
              <Parrafos texto={c.presentacion} />
              {!c.presentacion && <p className="meta">{editable ? L("Añade una presentación, fotos, la naturaleza del lugar y lo que hace la comunidad: «Editar la ficha».", "Add an introduction, photos, the nature of the place and what the community does: “Edit the page”.") : L("Todavía sin presentación.", "No introduction yet.")}</p>}
              <Galeria fotos={c.fotos} />
            </div>
            <Normas c={c} />
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
            {ver("calendario") && <ProximaActividad eventos={d.eventos} onVer={() => irA("calendario")} />}
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
              {!ver("miembros") ? <p className="meta con-candado"><Svg width="2.2" d={CANDADO} />{L("La comunidad tiene sus miembros en privado.", "The community keeps its members private.")}</p>
                : reps.length ? <ul className="lista-limpia equipo">{reps.map((m) => <li key={m.id}><Autor by={m.user_id} />{m.cargo && <span className="meta"> · {m.cargo}</span>}</li>)}</ul>
                : <p className="meta">{L("Sus representantes aún no se muestran en público.", "Its representatives are not shown publicly yet.")}</p>}
              {c.contacto && <p><span className="meta">{t("Contacto")}: </span>{c.contacto}</p>}
            </div>
          </aside>
        </div>
      )}

      {vista === "miembros" && (
        <Apartado c={c} k="miembros" ve={ver("miembros")} gestiona={representa} mio={mio} titulo={<>{L("Miembros", "Members")} <span className="meta">· {d.total}</span></>}>
          {cargando && !datos ? <Cargando /> : (
            <>
              <h4 className="rango">{L("Representantes", "Representatives")}</h4>
              {reps.length ? <ul className="roster">{reps.map((m) => <FilaMiembro key={m.id} m={m} rango={rangoDe(m)} />)}</ul> : <p className="meta">{L("Aún no se muestran en público.", "Not shown publicly yet.")}</p>}
              {porRango.map(([r, l]) => (
                <div key={r.id}>
                  <h4 className="rango"><RangoPill rango={r} /> <span className="meta">· {l.length}</span></h4>
                  <ul className="roster">{l.map((m) => <FilaMiembro key={m.id} m={m} rango={r} />)}</ul>
                </div>
              ))}
              {(sinRango.length > 0 || !porRango.length) && <h4 className="rango">{porRango.length ? L("Otros miembros", "Other members") : L("Miembros", "Members")}</h4>}
              {sinRango.length ? <ul className="roster">{sinRango.map((m) => <FilaMiembro key={m.id} m={m} />)}</ul> : null}
              {ocultos > 0 && <p className="meta">{ocultos === 1 ? L("Y 1 persona más que prefiere no salir en público.", "And 1 more person who prefers not to be shown.") : L("Y " + ocultos + " personas más que prefieren no salir en público.", "And " + ocultos + " more people who prefer not to be shown.")}</p>}
              {!otrosPublicos.length && !ocultos && <p className="meta">{L("Todavía no hay miembros.", "No members yet.")}</p>}
            </>
          )}
          <MiEstado c={c} mio={mio} miembros={d.miembros} />
        </Apartado>
      )}

      {vista === "proyectos" && (
        <Apartado c={c} k="proyectos" ve={ver("proyectos")} gestiona={representa} mio={mio}>
          {cargando && !datos ? <Cargando /> : aceptados.length ? (
            <ul className="lista-gestion">
              {aceptados.map((v) => { const p = proy(v.proyecto); return p ? <li key={v.id}><a href={"#proyecto-" + p.id}><b>{p.nombre}</b></a><EstadoP estado={p.estado} />{v.papel && <span className="meta">{v.papel}</span>}</li> : null; })}
            </ul>
          ) : <p className="meta">{L("Todavía no participa en ningún proyecto publicado.", "Not taking part in any published project yet.")}</p>}
          {representa && <Propuestas vinculos={d.vinculos.filter((v) => v.estado === "propuesta")} proy={proy} />}
        </Apartado>
      )}

      {vista === "ayuda" && (
        <div className="ficha-grid">
          <Apartado c={c} k="ayuda" ve={ver("ayuda")} gestiona={representa} mio={mio} className="ficha-main caja">
            {cargando && !datos ? <Cargando /> : abiertas.length ? (
              <ul className="lista-limpia">{abiertas.map((o) => <li key={o.id}><a href="#colabora" onClick={() => sessionStorage.setItem("hampatu-oportunidad", o.id)}>{o.titulo}</a> <span className="meta">· {et(CATEGORIAS_C, o.categoria)} · {et(ESTADOS_O, o.estado)}</span></li>)}</ul>
            ) : <p className="meta">{L("Ahora no pide ayuda.", "Not asking for help right now.")}</p>}
            {representa && (necesidad ? <OportunidadForm presetComunidad={c.id} onClose={() => setNecesidad(false)} />
              : <button type="button" className="btn-ghost btn-sm" onClick={() => setNecesidad(true)}>{L("Pedir ayuda", "Ask for help")}</button>)}
          </Apartado>
          <aside className="ficha-lado">
            <div className="caja">
              <h3 className="sub">{L("Necesita y ofrece", "Needs and offers")}</h3>
              <dl className="datos-p">
                {c.necesita && <div><dt className="d-necesita">{t("Necesita")}</dt><dd>{c.necesita}</dd></div>}
                {c.ofrece && <div><dt className="d-ofrece">{t("Ofrece")}</dt><dd>{c.ofrece}</dd></div>}
              </dl>
              {!c.necesita && !c.ofrece && <p className="meta">{L("Sin necesidades ni ofertas en su ficha.", "No needs or offers on its page.")}</p>}
            </div>
            <div className="caja">
              <h3 className="sub">{L("Apoyos recibidos", "Support received")}</h3>
              <Parrafos texto={c.apoyos} />
              {Object.keys(apoyos).length > 0 && <p>{L("Fondos verificados de sus proyectos: ", "Verified funds for its projects: ")}<b>{Object.entries(apoyos).map(([m, v]) => dinero(v, m, en)).join(" · ")}</b></p>}
              {!c.apoyos && !Object.keys(apoyos).length && <p className="meta">{L("Sin apoyos registrados todavía.", "No support recorded yet.")}</p>}
            </div>
          </aside>
        </div>
      )}

      {vista === "avisos" && (
        <Apartado c={c} k="avisos" ve={ver("avisos")} gestiona={representa} mio={mio}>
          {dentro && (nuevoAviso && canPost
            ? <PostForm preset={presetAviso} onDone={() => setNuevoAviso(false)} onCancel={() => setNuevoAviso(false)} />
            : <button type="button" className="btn-ghost btn-sm" onClick={() => (canPost ? setNuevoAviso(true) : pedirCuenta(L("Para publicar necesitas una cuenta. Es gratis y tarda un minuto.", "To post you need an account. It is free and takes a minute.")))}>{L("Publicar un aviso de la comunidad", "Post for the community")}</button>)}
          {avisosCom.length ? <div className="lista lista-com">{avisosCom.map((a) => <Post key={a.id} a={a} votos={votosDe[a.id] || 0} mio={!!misVotos[a.id]} />)}</div>
            : <p className="meta">{L("Todavía no hay avisos de esta comunidad.", "No posts from this community yet.")}</p>}
        </Apartado>
      )}

      {vista === "calendario" && (
        <Apartado c={c} k="calendario" ve={ver("calendario")} gestiona={representa} mio={mio}>
          {cargando && !datos ? <Cargando /> : <CalendarioCom c={c} eventos={d.eventos} asistencias={d.asistencias} representa={representa} dentro={dentro} />}
        </Apartado>
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
          <div className="caja">
            <h3 className="sub">{L("Qué es público y qué es privado", "What is public and what is private")}</h3>
            <p className="hint">{L("Con el candado, cada apartado solo lo ven los miembros de la comunidad (y la coordinación). La presentación y la ficha siempre son públicas.", "With the padlock, each section is only visible to the community's members (and the coordination). The introduction and the page itself are always public.")}</p>
            <ul className="lista-candados">
              {Object.keys(APARTADOS).map((k) => (
                <li key={k}><span><b>{L(APARTADOS[k][0], APARTADOS[k][1])}</b> <span className="meta">· {L(APARTADOS[k][2], APARTADOS[k][3])}</span></span><CandadoBtn c={c} k={k} /></li>
              ))}
            </ul>
          </div>
          <GestionRangos c={c} rangos={d.rangos} miembros={d.miembros} />
          <GestionMiembros c={c} miembros={d.miembros} rangos={d.rangos} />
          <NormasEditor key={c.id + ":" + (c.normas || "")} c={c} />
        </>
      )}
      </div>
      <Aviso texto={env.msg} />
    </section>
  );
}

/* Un apartado de la ficha con su candado. Si es privado y quien mira no es de la comunidad, solo ve el candado. */
function Apartado({ c, k, ve, gestiona, mio, titulo, className = "caja", children }) {
  const L = useL();
  const priv = privadoDe(c, k);
  return (
    <div className={className + " apartado"}>
      <div className="apartado-cab">
        <h3 className="sub">{titulo || L(APARTADOS[k][0], APARTADOS[k][1])}</h3>
        {gestiona ? <CandadoBtn c={c} k={k} />
          : priv && ve ? <span className="tag tag-candado"><Svg width="2.2" d={CANDADO} />{L("Solo miembros", "Members only")}</span> : null}
      </div>
      {ve ? children : <Bloqueado c={c} k={k} mio={mio} />}
    </div>
  );
}

/* El candado: lo cambian sus representantes y la coordinación */
function CandadoBtn({ c, k }) {
  const { write } = useApp();
  const L = useL();
  const [m, setM] = useState("");
  const priv = privadoDe(c, k);
  const cambiar = () => write(setM, () => store.update("comunidades", c.id, { privado: { ...(c.privado || {}), [k]: !priv } }));
  return (
    <span className="candado-w">
      <button type="button" className={"candado" + (priv ? " on" : "")} aria-pressed={priv ? "true" : "false"} onClick={cambiar} disabled={!!c.ejemplo}
        title={c.ejemplo ? L("Es una comunidad de ejemplo", "This is an example community") : priv ? L("Pulsa para que lo vea todo el mundo", "Click so everyone can see it") : L("Pulsa para que solo lo vean sus miembros", "Click so only its members can see it")}>
        <Svg width="2.2" d={priv ? CANDADO : CANDADO_ABIERTO} />{priv ? L("Privado", "Private") : L("Público", "Public")}
      </button>
      <Msg id={"m-candado-" + k} text={m} role="status" />
    </span>
  );
}

function Bloqueado({ c, k, mio }) {
  const { meta } = useApp();
  const L = useL();
  const A = APARTADOS[k];
  return (
    <div className="bloqueado">
      <span className="bloqueado-ico"><Svg width="1.8" d={CANDADO} /></span>
      <p><b>{L("Solo para miembros", "Members only")}</b></p>
      <p className="meta">{meta.cuenta
        ? L("La comunidad tiene en privado " + A[2] + ". Solo lo ven sus miembros.", "The community keeps " + A[3] + " private. Only its members can see it.")
        : L("La comunidad tiene en privado " + A[2] + ". Si formas parte de ella, entra con tu cuenta.", "The community keeps " + A[3] + " private. If you are a member, sign in.")}</p>
      <Unirse c={c} mio={mio} />
    </div>
  );
}

function FilaMiembro({ m, rango }) {
  const L = useL();
  return (
    <li className={"rol-" + m.rol}>
      <Autor by={m.user_id} />
      <span className="meta">{m.rol === "representante" ? L("Representante", "Representative") : rango ? rango.nombre : L("Miembro", "Member")}{m.cargo ? " · " + m.cargo : ""}</span>
      {m.rol === "representante" && rango && <span><RangoPill rango={rango} /></span>}
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
function MiEstado({ c, mio, miembros = [] }) {
  const { perfilDe } = useApp();
  const L = useL();
  const env = useEnviar();
  if (!mio || mio.estado !== "aceptada") return null;
  /* Si se va el único representante, la base de datos pasa el cargo al miembro más antiguo (bloque 19) */
  const otros = miembros.filter((m) => m.estado === "aceptada" && m.id !== mio.id);
  const unico = mio.rol === "representante" && !otros.some((m) => m.rol === "representante");
  const llegada = (m) => m.decidido_en || m.created_at || "";
  const relevo = unico ? [...otros].sort((a, b) => (llegada(a) < llegada(b) ? -1 : llegada(a) > llegada(b) ? 1 : 0))[0] : null;
  const nombreRelevo = relevo ? (perfilDe(relevo.user_id) || {}).nombre || L("el miembro más antiguo", "the longest-standing member") : "";
  return (
    <div className="mi-membresia">
      <p className="meta">{mio.rol === "representante" ? L("Representas a esta comunidad.", "You represent this community.") : L("Formas parte de esta comunidad.", "You are a member of this community.")}</p>
      {unico && <p className="hint">{relevo
        ? L("Eres su único representante: si te vas, pasará a representarla ", "You are its only representative: if you leave, the community will be represented by ") + nombreRelevo + L(" (el miembro más antiguo).", " (the longest-standing member).")
        : L("Eres su único miembro: si te vas, la comunidad se quedará sin representantes y decidirá la coordinación.", "You are its only member: if you leave, the community will have no representatives and the coordination team will decide.")}</p>}
      <Confirmar texto={L("Dejar la comunidad", "Leave the community")} onSi={() => env.enviar(() => borrar("comunidad_miembros", mio.id))} />
      <Aviso texto={env.msg} />
    </div>
  );
}

/* Para representantes y coordinación: quién entra, con qué papel */
function GestionMiembros({ c, miembros, rangos }) {
  const { uid, perfilDe, escribirA } = useApp();
  const L = useL();
  const env = useEnviar();
  const pend = miembros.filter((m) => m.estado === "solicitada");
  const dentro = miembros.filter((m) => m.estado === "aceptada");
  const nombre = (m) => (perfilDe(m.user_id) || {}).nombre || L("Persona", "Person");
  return (
    <div className="caja">
      <h3 className="sub">{L("Miembros y representación", "Members and representation")}</h3>
      <p className="hint">{L("La comunidad decide quién la representa. Sus miembros salen en la lista de la ficha; los datos de contacto nunca se publican sin su permiso.", "The community decides who represents it. Its members appear on the page's list; contact details are never published without permission.")}</p>
      {pend.length > 0 && (
        <>
          <h4>{L("Solicitudes", "Requests")}</h4>
          <ul className="lista-gestion">
            {pend.map((m) => (
              <li key={m.id}>
                <span><b>{nombre(m)}</b> <span className="meta">· {m.rol_pedido === "representante" ? L("pide representar", "asks to represent") : L("pide ser miembro", "asks to be a member")}{m.cargo ? " · " + m.cargo : ""}</span></span>
                {m.mensaje ? <p className="msg-solicitud"><b>{L("Su mensaje:", "Their message:")}</b> {m.mensaje}</p>
                  : <p className="meta nota">{L("No ha escrito ningún mensaje.", "They did not write a message.")}</p>}
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
              <span><b>{nombre(m)}</b> <span className="meta">· {m.rol === "representante" ? L("Representante", "Representative") : L("Miembro", "Member")}{m.cargo ? " · " + m.cargo : ""}</span></span>
              <ElegirRango m={m} rangos={rangos} />
              {m.mensaje && m.user_id !== c.by && <p className="msg-solicitud"><b>{L("Al entrar escribió:", "When joining they wrote:")}</b> {m.mensaje}</p>}
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

