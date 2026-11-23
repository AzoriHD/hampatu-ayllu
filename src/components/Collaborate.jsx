/* Colabora: necesidades reales de colaboración y candidaturas (supabase.sql, bloque 12). */
import { useEffect, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG } from "../data/constants.js";
import { CATEGORIAS_C, ESTADOS_CAND, ESTADOS_O, TIPOS_CAND } from "../data/proyectos.js";
import { borrar, cambiar, crear, filas, useCarga } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { str } from "../lib/utils.js";
import { Autor } from "./People.jsx";
import { Aviso, Cargando, Confirmar, ErrorCarga, fechaCorta, Parrafos, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export default function Collaborate() {
  const { data, meta, uid, canPost, pedirCuenta, permisos } = useApp();
  const L = useL(), et = useEt();
  const [cat, setCat] = useState("");
  const [todas, setTodas] = useState(false);
  const [form, setForm] = useState(""); // "necesidad" | "propuesta"
  const { datos, error, cargando } = useCarga(async () => {
    const [ops, ps] = await Promise.all([filas("oportunidades", { orden: "actualizado" }), filas("proyectos", { orden: "nombre", desc: false })]);
    return { ops, ps };
  });
  const ops = (datos && datos.ops) || [];
  const abiertas = (o) => o.estado === "abierta" || o.estado === "en_curso";
  const lista = ops.filter((o) => (todas || abiertas(o)) && (!cat || o.categoria === cat));
  const nCat = (k) => ops.filter((o) => (todas || abiertas(o)) && o.categoria === k).length;

  /* Si se llega desde un proyecto, se lleva a esa necesidad */
  useEffect(() => {
    if (!datos) return;
    let id = "";
    try { id = sessionStorage.getItem("hampatu-oportunidad") || ""; sessionStorage.removeItem("hampatu-oportunidad"); } catch (e) { /* ignore */ }
    if (id) setTimeout(() => { const el = document.getElementById("o-" + id); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); } }, 0);
  }, [datos]);

  const abrir = (k) => {
    if (!canPost) { pedirCuenta(L("Para colaborar necesitas una cuenta. Es gratis y tarda un minuto.", "To get involved you need an account. It is free and takes a minute.")); return; }
    setForm(form === k ? "" : k);
  };

  return (
    <section id="v-colabora" aria-labelledby="h-colabora">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-colabora">{L("Colabora", "Get involved")}</h2>
            <p className="intro">{L("Lo que necesitan de verdad los proyectos y las comunidades: manos en el campo, ciencia, educación, material, transporte, tecnología, traducción… Elige una necesidad y ofrécete, o propón tu propia colaboración.", "What projects and communities really need: hands in the field, science, education, materials, transport, technology, translation… Pick a need and offer yourself, or propose your own collaboration.")}</p>
          </div>
        </header>
        <p className="regla"><strong>{L("Voluntariado, no empleo.", "Volunteering, not employment.")}</strong> {L("Las colaboraciones son voluntarias o en especie. Hampatu Ayllu no publica ofertas de trabajo ni promete pagos.", "Collaborations are voluntary or in kind. Hampatu Ayllu does not post job offers or promise payment.")}</p>
        <div className="bar">
          <button type="button" className="btn" onClick={() => abrir("propuesta")}>{L("Proponer una colaboración", "Propose a collaboration")}</button>
          {meta.cuenta && puede.publicarNecesidad(permisos) && <button type="button" className="btn-ghost" onClick={() => abrir("necesidad")}>{L("Publicar una necesidad", "Post a need")}</button>}
        </div>
      </div>
      {form === "necesidad" && <OportunidadForm onClose={() => setForm("")} />}
      {form === "propuesta" && <CandidaturaForm proyectos={((datos && datos.ps) || []).filter((p) => p.publicado && !p.ejemplo)} onClose={() => setForm("")} />}

      <div className="caja">
        <Pestanas etiqueta={L("Tipo de ayuda", "Type of help")} valor={cat} onCambio={setCat}
          opciones={[["", L("Todas", "All"), ops.filter((o) => todas || abiertas(o)).length], ...Object.keys(CATEGORIAS_C).filter((k) => nCat(k)).map((k) => [k, et(CATEGORIAS_C, k), nCat(k)])]} />
        <label className="check-mini centro"><input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} />{L("Ver también las cubiertas y cerradas", "Also show filled and closed ones")}</label>
      </div>
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <div className="grid">{lista.map((o) => <Oportunidad key={o.id} o={o} proyectos={datos.ps} />)}</div>
      ) : (
        <Vacio titulo={L("No hay necesidades abiertas ahora mismo", "No open needs right now")}
          texto={L("Aquí solo se publican necesidades reales de proyectos y comunidades. Mientras tanto, puedes proponer tu colaboración y la coordinación te contestará.", "Only real needs from projects and communities are posted here. Meanwhile, you can propose your collaboration and the coordination team will reply.")}>
          {(cat || !todas) && ops.length > 0 && <button type="button" className="linkbtn" onClick={() => { setCat(""); setTodas(true); }}>{L("Ver todas", "Show all")}</button>}
        </Vacio>
      )}
      {meta.cuenta && <MisCandidaturas uid={uid} ops={ops} proyectos={(datos && datos.ps) || []} />}
      {meta.cuenta && puede.publicarNecesidad(permisos) && (
        <div className="caja">
          <h3 className="sub">{L("Candidaturas recibidas", "Applications received")}</h3>
          <CandidaturasRecibidas ops={ops} proyectos={(datos && datos.ps) || []} comunidades={data.comunidades} />
        </div>
      )}
    </section>
  );
}

function Oportunidad({ o, proyectos }) {
  const { uid, canPost, pedirCuenta, permisos, irComunidad, data } = useApp();
  const L = useL(), et = useEt();
  const [quiero, setQuiero] = useState(false);
  const [editar, setEditar] = useState(false);
  const env = useEnviar();
  const p = o.proyecto ? proyectos.find((x) => x.id === o.proyecto) : null;
  const c = o.comunidad ? data.comunidades.find((x) => x.id === o.comunidad) : null;
  const gestiona = puede.coordinar(permisos) || o.by === uid || (o.proyecto && puede.gestionar(permisos, o.proyecto)) || (o.comunidad && puede.representar(permisos, o.comunidad));
  const abierta = o.estado === "abierta" || o.estado === "en_curso";
  if (editar) return <OportunidadForm o={o} onClose={() => setEditar(false)} />;
  return (
    <article className="com oportunidad" id={"o-" + o.id}>
      <div className="row"><span className="pill" style={{ "--c": "var(--offer)" }}>{et(CATEGORIAS_C, o.categoria)}</span><span className={"tag" + (abierta ? " tag-ok" : "")}>{et(ESTADOS_O, o.estado)}</span></div>
      <h3>{o.titulo}</h3>
      <Parrafos texto={o.descripcion} />
      <dl>
        {p && <div><dt>{L("Proyecto", "Project")}</dt><dd><a href={"#proyecto-" + p.id}>{p.nombre}</a></dd></div>}
        {c && <div><dt>{L("Comunidad", "Community")}</dt><dd><button type="button" className="linkbtn" onClick={() => irComunidad(c.id)}>{c.nombre}</button></dd></div>}
        {o.ubicacion && <div><dt>{L("Dónde", "Where")}</dt><dd>{o.ubicacion}</dd></div>}
        {o.duracion && <div><dt>{L("Duración", "Duration")}</dt><dd>{o.duracion}</dd></div>}
        {o.requisitos && <div><dt>{L("Requisitos", "Requirements")}</dt><dd>{o.requisitos}</dd></div>}
        <div><dt>{L("Responsable", "Contact")}</dt><dd>{o.responsable_texto || <Autor by={o.by} />}</dd></div>
      </dl>
      <div className="row">
        {abierta && !quiero && <button type="button" className="btn-mini" onClick={() => (canPost ? setQuiero(true) : pedirCuenta(L("Para ofrecerte necesitas una cuenta. Es gratis y tarda un minuto.", "To offer your help you need an account. It is free and takes a minute.")))}>{L("Quiero colaborar", "I want to help")}</button>}
        {gestiona && <>
          <button type="button" className="linkbtn" onClick={() => setEditar(true)}>{L("Editar", "Edit")}</button>
          <label className="sr" htmlFor={"oe-" + o.id}>{L("Estado", "Status")}</label>
          <select id={"oe-" + o.id} className="select-mini" value={o.estado} onChange={(e) => env.enviar(() => cambiar("oportunidades", o.id, { estado: e.target.value }))}>
            {Object.keys(ESTADOS_O).map((k) => <option key={k} value={k}>{et(ESTADOS_O, k)}</option>)}
          </select>
          <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("oportunidades", o.id))} />
        </>}
      </div>
      {quiero && <CandidaturaForm oportunidad={o} onClose={() => setQuiero(false)} />}
      <Aviso texto={env.msg} />
    </article>
  );
}

/* Publicar una necesidad: tiene que estar ligada a un proyecto que gestionas o a una comunidad que representas */
export function OportunidadForm({ o, presetProyecto, presetComunidad, onClose }) {
  const { data, permisos } = useApp();
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const coord = puede.coordinar(permisos);
  const proyectosQ = useCarga(() => filas("proyectos", { orden: "nombre", desc: false }));
  const misP = ((proyectosQ.datos) || []).filter((p) => !p.ejemplo && puede.gestionar(permisos, p.id));
  const misC = data.comunidades.filter((c) => puede.representar(permisos, c.id));
  const [f, setF] = useState(() => ({
    titulo: o?.titulo || "", descripcion: o?.descripcion || "", categoria: o?.categoria || "voluntariado",
    vinculo: o ? (o.proyecto ? "p:" + o.proyecto : o.comunidad ? "c:" + o.comunidad : "") : presetProyecto ? "p:" + presetProyecto : presetComunidad ? "c:" + presetComunidad : "",
    ubicacion: o?.ubicacion || "", duracion: o?.duracion || "", requisitos: o?.requisitos || "", responsable_texto: o?.responsable_texto || "", voluntaria: !!o,
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = (ev) => {
    ev.preventDefault();
    const d = {
      titulo: str(f.titulo, 140), descripcion: str(f.descripcion, 4000), categoria: f.categoria,
      proyecto: f.vinculo.startsWith("p:") ? f.vinculo.slice(2) : null, comunidad: f.vinculo.startsWith("c:") ? f.vinculo.slice(2) : null,
      ubicacion: str(f.ubicacion, 120) || null, duracion: str(f.duracion, 120) || null, requisitos: str(f.requisitos, 2000) || null, responsable_texto: str(f.responsable_texto, 140) || null,
    };
    if (d.titulo.length < 5) { setMsg(L("Escribe un título (al menos 5 letras).", "Write a title (at least 5 characters).")); return; }
    if (d.descripcion.length < 10) { setMsg(L("Explica qué se necesita.", "Explain what is needed.")); return; }
    if (!coord && !d.proyecto && !d.comunidad) { setMsg(L("Elige el proyecto o la comunidad que lo necesita.", "Choose the project or community that needs it.")); return; }
    if (!f.voluntaria) { setMsg(L("Confirma que es una colaboración voluntaria y real.", "Confirm it is a real, voluntary collaboration.")); return; }
    if (COORD.test([d.descripcion, d.ubicacion, d.requisitos].join(" "))) { setMsg(COORD_MSG); return; }
    enviar(() => (o ? cambiar("oportunidades", o.id, d) : crear("oportunidades", d)), onClose);
  };
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <h3 className="panel-h">{o ? L("Editar necesidad", "Edit need") : L("Publicar una necesidad de colaboración", "Post a call for help")}</h3>
      <div className="fields">
        <div className="full"><label htmlFor="o-tit">{L("Qué se necesita (título)", "What is needed (title)")}</label><input id="o-tit" maxLength={140} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div><label htmlFor="o-cat">{L("Tipo de ayuda", "Type of help")}</label>
          <select id="o-cat" value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>{Object.keys(CATEGORIAS_C).map((k) => <option key={k} value={k}>{et(CATEGORIAS_C, k)}</option>)}</select></div>
        <div><label htmlFor="o-vin">{L("Para", "For")}</label>
          <select id="o-vin" value={f.vinculo} onChange={(e) => set("vinculo", e.target.value)}>
            <option value="">{coord ? L("Hampatu Ayllu en general", "Hampatu Ayllu in general") : L("Elige…", "Choose…")}</option>
            {misP.length > 0 && <optgroup label={L("Proyectos", "Projects")}>{misP.map((p) => <option key={p.id} value={"p:" + p.id}>{p.nombre}</option>)}</optgroup>}
            {misC.length > 0 && <optgroup label={L("Comunidades", "Communities")}>{misC.map((c) => <option key={c.id} value={"c:" + c.id}>{c.nombre}</option>)}</optgroup>}
          </select></div>
        <div className="full"><label htmlFor="o-desc">{L("Descripción", "Description")}</label><textarea id="o-desc" rows={4} maxLength={4000} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></div>
        <div><label htmlFor="o-ubi">{L("Ubicación general", "General location")}</label><input id="o-ubi" maxLength={120} value={f.ubicacion} placeholder={L("Provincia, o «A distancia»", "Province, or “Remote”")} onChange={(e) => set("ubicacion", e.target.value)} /></div>
        <div><label htmlFor="o-dur">{L("Duración estimada", "Estimated duration")}</label><input id="o-dur" maxLength={120} value={f.duracion} placeholder={L("Ej.: 2 fines de semana", "E.g. 2 weekends")} onChange={(e) => set("duracion", e.target.value)} /></div>
        <div className="full"><label htmlFor="o-req">{L("Requisitos", "Requirements")}</label><textarea id="o-req" rows={2} maxLength={2000} value={f.requisitos} onChange={(e) => set("requisitos", e.target.value)} /></div>
        <div className="full"><label htmlFor="o-resp">{L("Persona u organización responsable", "Person or organisation in charge")}</label><input id="o-resp" maxLength={140} value={f.responsable_texto} placeholder={L("Si lo dejas vacío, sale tu nombre", "If left blank, your name is shown")} onChange={(e) => set("responsable_texto", e.target.value)} /></div>
        <label className="check full"><input type="checkbox" checked={f.voluntaria} onChange={(e) => set("voluntaria", e.target.checked)} />{L("Es una necesidad real y la colaboración es voluntaria o en especie, no un empleo.", "It is a real need and the collaboration is voluntary or in kind, not a job.")}</label>
      </div>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Publicar", "Post")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

/* Ofrecerse a una necesidad o proponer una colaboración libre */
export function CandidaturaForm({ oportunidad, proyectos = [], onClose }) {
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const [hecho, setHecho] = useState(false);
  const [f, setF] = useState({ tipo: "persona", organizacion: "", categoria: "voluntariado", proyecto: "", mensaje: "", experiencia: "", disponibilidad: "", contacto: "", aparecer: false, acepto: false });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = (ev) => {
    ev.preventDefault();
    const d = {
      oportunidad: oportunidad ? oportunidad.id : null, proyecto: oportunidad ? null : f.proyecto || null, categoria: oportunidad ? null : f.categoria,
      tipo: f.tipo, organizacion: f.tipo === "persona" ? null : str(f.organizacion, 140) || null,
      mensaje: str(f.mensaje, 3000), experiencia: str(f.experiencia, 2000) || null, disponibilidad: str(f.disponibilidad, 300) || null,
      contacto: str(f.contacto, 160) || null, aparecer: !!f.aparecer,
    };
    if (d.mensaje.length < 10) { setMsg(L("Cuenta en unas líneas cómo puedes ayudar.", "Tell us in a few lines how you can help.")); return; }
    if (f.tipo !== "persona" && !d.organizacion) { setMsg(L("Escribe el nombre de la organización.", "Write the organisation's name.")); return; }
    if (!f.acepto) { setMsg(L("Marca la casilla para enviar.", "Tick the box to send.")); return; }
    enviar(() => crear("candidaturas", d), () => setHecho(true));
  };
  if (hecho) {
    return (
      <div className="panel">
        <p className="msg-ok"><strong>{L("¡Enviada!", "Sent!")}</strong> {L("Quien coordina esta necesidad la revisará y te escribirá por mensaje privado. Puedes ver cómo va en «Mis candidaturas».", "Whoever coordinates this need will review it and write to you by private message. You can follow it in “My applications”.")}</p>
        <button type="button" className="btn-ghost" onClick={onClose}>{L("Cerrar", "Close")}</button>
      </div>
    );
  }
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <h3 className="panel-h">{oportunidad ? L("Ofrecerme para: ", "Offer to help with: ") + oportunidad.titulo : L("Proponer una colaboración", "Propose a collaboration")}</h3>
      <div className="fields">
        <div><label htmlFor="k-tipo">{L("Colaboras como", "You are")}</label>
          <select id="k-tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.keys(TIPOS_CAND).map((k) => <option key={k} value={k}>{et(TIPOS_CAND, k)}</option>)}</select></div>
        {f.tipo !== "persona" ? (
          <div><label htmlFor="k-org">{L("Organización", "Organisation")}</label><input id="k-org" maxLength={140} value={f.organizacion} onChange={(e) => set("organizacion", e.target.value)} /></div>
        ) : <div />}
        {!oportunidad && <>
          <div><label htmlFor="k-cat">{L("Tipo de ayuda", "Type of help")}</label>
            <select id="k-cat" value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>{Object.keys(CATEGORIAS_C).map((k) => <option key={k} value={k}>{et(CATEGORIAS_C, k)}</option>)}</select></div>
          <div><label htmlFor="k-proy">{L("Para un proyecto (opcional)", "For a project (optional)")}</label>
            <select id="k-proy" value={f.proyecto} onChange={(e) => set("proyecto", e.target.value)}>
              <option value="">{L("Para Hampatu Ayllu en general", "For Hampatu Ayllu in general")}</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select></div>
        </>}
        <div className="full"><label htmlFor="k-msg">{L("Cómo puedes ayudar", "How you can help")}</label><textarea id="k-msg" rows={4} maxLength={3000} value={f.mensaje} onChange={(e) => set("mensaje", e.target.value)} /></div>
        <div className="full"><label htmlFor="k-exp">{L("Experiencia o formación (opcional)", "Experience or training (optional)")}</label><textarea id="k-exp" rows={2} maxLength={2000} value={f.experiencia} onChange={(e) => set("experiencia", e.target.value)} /></div>
        <div><label htmlFor="k-disp">{L("Disponibilidad", "Availability")}</label><input id="k-disp" maxLength={300} value={f.disponibilidad} placeholder={L("Ej.: fines de semana de marzo", "E.g. weekends in March")} onChange={(e) => set("disponibilidad", e.target.value)} /></div>
        <div><label htmlFor="k-cont">{L("Contacto (opcional)", "Contact (optional)")}</label><input id="k-cont" maxLength={160} value={f.contacto} placeholder={L("Correo o WhatsApp", "Email or WhatsApp")} onChange={(e) => set("contacto", e.target.value)} />
          <p className="hint">{L("Solo lo ve quien revisa tu candidatura. También te pueden escribir por mensaje privado.", "Only the reviewers see it. They can also write to you by private message.")}</p></div>
        <label className="check full"><input type="checkbox" checked={f.aparecer} onChange={(e) => set("aparecer", e.target.checked)} />{L("Si me aceptan en un proyecto, puede aparecer mi nombre en su ficha.", "If I am accepted into a project, my name may appear on its page.")}</label>
        <label className="check full"><input type="checkbox" checked={f.acepto} onChange={(e) => set("acepto", e.target.checked)} />{L("Entiendo que es una colaboración voluntaria (no un empleo) y que mis datos solo los verá quien revise la candidatura.", "I understand this is voluntary (not a job) and that my details will only be seen by those reviewing the application.")}</label>
      </div>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Enviando…", "Sending…") : L("Enviar", "Send")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

function MisCandidaturas({ uid, ops, proyectos }) {
  const { en } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const { datos } = useCarga(() => filas("candidaturas", { eq: { by: uid } }), [uid]);
  if (!datos || !datos.length) return null;
  const sobre = (c) => (c.oportunidad && (ops.find((o) => o.id === c.oportunidad) || {}).titulo) || (c.proyecto && (proyectos.find((p) => p.id === c.proyecto) || {}).nombre) || L("Propuesta a Hampatu Ayllu", "Proposal to Hampatu Ayllu");
  return (
    <div className="caja">
      <h3 className="sub">{L("Mis candidaturas", "My applications")}</h3>
      <ul className="lista-gestion">
        {datos.map((c) => (
          <li key={c.id}>
            <span><b>{sobre(c)}</b> <span className="meta">· {fechaCorta(c.created_at, en)}</span></span>
            <span className={"tag" + (c.estado === "aceptada" ? " tag-ok" : "")}>{et(ESTADOS_CAND, c.estado)}</span>
            {c.nota && <p className="meta nota">{L("Respuesta: ", "Reply: ")}{c.nota}</p>}
            {(c.estado === "enviada" || c.estado === "en_revision") && <Confirmar texto={L("Retirar", "Withdraw")} onSi={() => env.enviar(() => cambiar("candidaturas", c.id, { estado: "retirada" }))} />}
          </li>
        ))}
      </ul>
      <Aviso texto={env.msg} />
    </div>
  );
}

/* Revisar candidaturas: quien publicó la necesidad, los responsables del proyecto, los representantes de la comunidad y la coordinación */
export function CandidaturasRecibidas({ ops, proyectos, comunidades }) {
  const { uid, permisos } = useApp();
  const L = useL();
  const [filtro, setFiltro] = useState("pendientes");
  const { datos, error, cargando } = useCarga(() => filas("candidaturas", {}));
  const todas = ((datos) || []).filter((c) => c.by !== uid || permisos.todo);
  const grupos = { pendientes: (c) => c.estado === "enviada" || c.estado === "en_revision", aceptadas: (c) => c.estado === "aceptada", otras: (c) => c.estado === "rechazada" || c.estado === "retirada" };
  const lista = todas.filter(grupos[filtro]);
  return (
    <div>
      <Pestanas etiqueta={L("Estado", "Status")} valor={filtro} onCambio={setFiltro}
        opciones={[["pendientes", L("Por decidir", "To decide"), todas.filter(grupos.pendientes).length], ["aceptadas", L("Aceptadas", "Accepted"), todas.filter(grupos.aceptadas).length], ["otras", L("Cerradas", "Closed")]]} />
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length
        ? <ul className="candidaturas">{lista.map((c) => <Candidatura key={c.id} c={c} ops={ops} proyectos={proyectos} comunidades={comunidades} />)}</ul>
        : <p className="meta">{L("No hay candidaturas en este grupo.", "No applications in this group.")}</p>}
    </div>
  );
}

function Candidatura({ c, ops, proyectos, comunidades }) {
  const { en, escribirA, perfilDe } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const [nota, setNota] = useState(c.nota || "");
  const o = c.oportunidad && ops.find((x) => x.id === c.oportunidad);
  const p = c.proyecto && proyectos.find((x) => x.id === c.proyecto);
  const com = c.comunidad && comunidades.find((x) => x.id === c.comunidad);
  const titulo = (o && o.titulo) || (p && p.nombre) || (com && com.nombre) || L("Propuesta a Hampatu Ayllu", "Proposal to Hampatu Ayllu");
  const decidir = (estado) => env.enviar(() => cambiar("candidaturas", c.id, { estado, nota: str(nota, 1000) || null }));
  const abierta = c.estado === "enviada" || c.estado === "en_revision";
  return (
    <li className="candidatura">
      <div className="row"><b>{(perfilDe(c.by) || {}).nombre || L("Persona", "Person")}</b>
        <span className="meta">· {et(TIPOS_CAND, c.tipo)}{c.organizacion ? " · " + c.organizacion : ""} · {fechaCorta(c.created_at, en)}</span>
        <span className={"tag" + (c.estado === "aceptada" ? " tag-ok" : "")}>{et(ESTADOS_CAND, c.estado)}</span></div>
      <p className="meta">{L("Sobre: ", "About: ")}<b>{titulo}</b>{c.categoria ? " · " + et(CATEGORIAS_C, c.categoria) : ""}</p>
      <Parrafos texto={c.mensaje} />
      <dl className="datos-p">
        {c.experiencia && <div><dt>{L("Experiencia", "Experience")}</dt><dd>{c.experiencia}</dd></div>}
        {c.disponibilidad && <div><dt>{L("Disponibilidad", "Availability")}</dt><dd>{c.disponibilidad}</dd></div>}
        {c.contacto && <div><dt>{L("Contacto", "Contact")}</dt><dd>{c.contacto}</dd></div>}
        <div><dt>{L("Si se acepta", "If accepted")}</dt><dd>{c.aparecer ? L("Puede salir su nombre en el proyecto", "Their name may appear on the project") : L("Prefiere no salir en público", "Prefers not to appear publicly")}</dd></div>
      </dl>
      {abierta && (
        <>
          <label className="sr" htmlFor={"nota-" + c.id}>{L("Respuesta para la persona", "Reply to the person")}</label>
          <textarea id={"nota-" + c.id} rows={2} maxLength={1000} value={nota} placeholder={L("Respuesta (la verá la persona)", "Reply (the person will see it)")} onChange={(e) => setNota(e.target.value)} />
        </>
      )}
      <div className="row">
        {abierta && <>
          <button type="button" className="btn-mini" onClick={() => decidir("aceptada")}>{L("Aceptar", "Accept")}</button>
          {c.estado === "enviada" && <button type="button" className="btn-mini claro" onClick={() => decidir("en_revision")}>{L("En revisión", "Under review")}</button>}
          <button type="button" className="btn-mini claro" onClick={() => decidir("rechazada")}>{L("No seleccionar", "Not select")}</button>
        </>}
        <button type="button" className="linkbtn" onClick={() => escribirA(c.by, { ref: { titulo: L("Candidatura: ", "Application: ") + titulo } })}>{L("Escribir", "Message")}</button>
      </div>
      {c.estado === "aceptada" && c.proyecto && <p className="hint">{L("Ya forma parte del equipo del proyecto.", "They are now part of the project team.")}</p>}
      <Aviso texto={env.msg} />
    </li>
  );
}
