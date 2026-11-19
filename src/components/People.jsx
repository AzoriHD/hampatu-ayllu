import { Fragment, useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG, TA } from "../data/constants.js";
import { salir, store, uploadPhoto } from "../lib/store.js";
import { correoValido, enlaceRed, fotoSegura, iniciales, localeOf, shrink, simboloDe, str, waEnlace } from "../lib/utils.js";
import { DelBtns, EmptyBox, Msg, Simbolo } from "./Shared.jsx";
import { AVATARES, avatarUrl, avatarValido } from "../data/avatares.js";

const REDES = [["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X"]];

/* Foto subida, dibujo elegido o, si no hay ninguno, las iniciales */
export function Avatar({ p, size = 56 }) {
  const src = fotoSegura(p && p.foto) || avatarUrl(p && p.avatar);
  const st = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  return src
    ? <img className="avatar" src={src} alt="" width={size} height={size} style={st} loading="lazy" />
    : <span className="avatar" aria-hidden="true" style={st}>{iniciales(p && p.nombre)}</span>;
}

/* A post's or reply's signature, linked to the author's profile when there is one. */
export function Autor({ by, firma }) {
  const { t, perfilDe, irPerfil } = useApp();
  const p = by && perfilDe(by), txt = firma || (p && p.nombre) || t("Sin firma");
  if (!p) return <>{txt}</>;
  return <button type="button" className="linkbtn autor" onClick={() => irPerfil(by)}><Avatar p={p} size={20} />{txt}</button>;
}

export function People() {
  const { t, en, data, meta, uid, perfilDe, irPerfil, setCuentaPanel } = useApp();
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const nAv = {};
  data.avisos.forEach((a) => { if (a.by) nAv[a.by] = (nAv[a.by] || 0) + 1; });
  const comDe = (id) => data.comunidades.find((c) => c.id === id);
  const list = data.perfiles.filter((p) => {
    if (!ql) return true;
    return [p.nombre, p.rol, p.lugar, p.sobre, comDe(p.com)?.nombre].join(" ").toLowerCase().includes(ql);
  }).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  return (
    <section id="v-personas" aria-labelledby="tab-personas">
      <div className="caja caja-cabeza">
      <header className="vista-head">
        <div><h2 className="vista-h">{en ? "The people in the community" : "La gente de la comunidad"}</h2>
          <p className="intro">{en ? "Guides, farmers, teachers, rangers, students and researchers. Each person says who they are, where they are and how to reach them." : "Guías, comuneros, maestras, guardaparques, estudiantes e investigadores. Cada persona cuenta quién es, dónde está y cómo contactarla."}</p></div>
      </header>
      <div className="bar">
        <div className="search"><label htmlFor="q-personas" className="sr">{t("Buscar persona")}</label>
          <input id="q-personas" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Buscar nombre, lugar o a qué se dedica")} /></div>
        {meta.cuenta
          ? <button className="btn" type="button" id="b-mi-perfil" onClick={() => irPerfil(uid)}>{t(perfilDe(uid) ? "Ver mi perfil" : "Mi perfil")}</button>
          : <button className="btn" type="button" id="b-crear-perfil" onClick={() => setCuentaPanel({ modo: "crear", k: Date.now() })}>{t("Crear mi perfil")}</button>}
      </div>
      </div>
      <div className="grid" id="lista-personas">
        {list.length ? list.map((p) => {
          const c = comDe(p.com), n = nAv[p.id] || 0;
          return (
            <button type="button" className="com persona" id={"pe-" + p.id} key={p.id} onClick={() => irPerfil(p.id)}>
              <span className="com-top">
                <Avatar p={p} />
                <span className="persona-txt">
                  <span className="persona-n">{p.nombre || t("Sin nombre")}</span>
                  {p.rol && <span className="meta">{p.rol}</span>}
                </span>
              </span>
              {(p.lugar || c) && <span className="where">{[p.lugar, c && c.nombre].filter(Boolean).join(" · ")}</span>}
              <span className="row">
                {p.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}
                {n > 0 && <span className="meta">{n + " " + t(n === 1 ? "aviso" : "avisos")}</span>}
                {p.id === uid && <span className="tag">{t("Tú")}</span>}
              </span>
            </button>
          );
        }) : <EmptyBox text={data.perfiles.length ? "Nadie coincide con esa búsqueda." : "Todavía no hay nadie. Crea tu cuenta y sé la primera persona de la comunidad."}
            onClear={data.perfiles.length ? () => setQ("") : null} />}
      </div>
    </section>
  );
}

export function Profile({ id, editar }) {
  const { t, en, lang, data, meta, uid, canEdit, irVista, goAviso, goCom, ago, escribirA } = useApp();
  const [editando, setEditando] = useState(!!editar);
  const p = data.perfiles.find((x) => x.id === id);
  const mio = meta.cuenta && id === uid;
  const volver = <button type="button" className="linkbtn volver" onClick={() => irVista("personas")}>← {t("Toda la gente")}</button>;

  if (!p) {
    return (
      <section id="v-perfil">
        {volver}
        <p className="notice">{t(meta.status === "loading" ? "Cargando la comunidad…" : "Este perfil no existe o se ha borrado.")}</p>
      </section>
    );
  }
  const c = data.comunidades.find((x) => x.id === p.com);
  const avisos = data.avisos.filter((a) => a.by === id).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const desde = p.ts ? new Date(p.ts).toLocaleDateString(localeOf(lang), { month: "long", year: "numeric" }) : "";
  const wa = waEnlace(p.whatsapp, t("Hola, te escribo desde Hampatu Ayllu."), p.ejemplo);
  const web = enlaceRed("web", p.web);
  const redes = REDES.map(([k, n]) => [k, n, enlaceRed(k, p[k])]).filter((r) => r[2]);
  const tel = String(p.telefono || "").replace(/[^\d+]/g, "");
  const hay = p.whatsapp || p.telefono || p.correo || web;

  return (
    <section id="v-perfil" aria-label={p.nombre}>
      {volver}
      <article className="com perfil" id={"perfil-" + id}>
        <div className="perfil-top">
          <Avatar p={p} size={104} />
          <div>
            <div className="row">
              {p.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}
              {mio && <span className="tag">{t("Tu perfil")}</span>}
            </div>
            <h2 className="perfil-h">{p.nombre || t("Sin nombre")}</h2>
            {p.rol && <p className="perfil-rol">{p.rol}</p>}
            <p className="meta">
              {p.lugar}{p.lugar && c && " · "}
              {c && <span className="nowrap-ini"><Simbolo k={simboloDe(c)} mini /><button type="button" className="linkbtn" onClick={() => goCom(c.id)}>{c.nombre}</button></span>}
              {desde && <>{(p.lugar || c) && " · "}{t("En la comunidad desde")} {desde}</>}
            </p>
          </div>
        </div>
        {p.sobre && <p className="txt">{p.sobre}</p>}
        {hay && (
          <dl className="datos">
            {p.whatsapp && <div><dt>WhatsApp</dt><dd>{p.whatsapp}{wa && <span className="acc"><a className="btn-mini" href={wa} target="_blank" rel="noopener noreferrer">{t("Escribir")}</a></span>}</dd></div>}
            {p.telefono && <div><dt>{t("Teléfono")}</dt><dd>{tel && !p.ejemplo ? <a href={"tel:" + tel}>{p.telefono}</a> : p.telefono}</dd></div>}
            {p.correo && <div><dt>{t("Correo")}</dt><dd>{correoValido(p.correo) && !p.ejemplo ? <a href={"mailto:" + p.correo.trim()}>{p.correo}</a> : p.correo}</dd></div>}
            {web && <div><dt>{t("Web")}</dt><dd><a href={web} target="_blank" rel="noopener noreferrer nofollow">{String(p.web).replace(/^https?:\/\//, "")}</a></dd></div>}
          </dl>
        )}
        {redes.length > 0 && (
          <div className="redes">
            {redes.map(([k, n, u]) => <a key={k} className="btn-mini claro" href={u} target="_blank" rel="noopener noreferrer nofollow">{n}</a>)}
          </div>
        )}
        {p.ejemplo && hay && <p className="meta">{t("Perfil de ejemplo: los datos de contacto no son reales.")}</p>}
        {!hay && !redes.length && !p.sobre && <p className="meta">{t(mio ? "Tu perfil está casi vacío. Cuenta quién eres y cómo pueden contactarte." : "Esta persona todavía no ha completado su perfil.")}</p>}
        <div className="row">
          {mio && !editando && <button type="button" className="btn" id="b-editar-perfil" onClick={() => setEditando(true)}>{t("Editar perfil")}</button>}
          {mio && <button type="button" className="linkbtn" id="b-salir-cuenta" onClick={() => salir()}>{t("Salir de la cuenta")}</button>}
          {!mio && !p.ejemplo && <button type="button" className="btn" id="b-mensaje-perfil" onClick={() => escribirA(id, { nombre: p.nombre })}>{en ? "Send a private message" : "Mandar un mensaje privado"}</button>}
          {!mio && canEdit && meta.cuenta && <DelBtns k={"perfil:" + id} />}
        </div>
      </article>
      {editando && mio && <ProfileForm p={p} onClose={() => setEditando(false)} />}
      <div className="caja">
      <h3 className="sub cal-prox-h">{en ? "Posts" : "Avisos publicados"}</h3>
      <ul className="proximas" id="perfil-avisos">
        {avisos.length ? avisos.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => goAviso(a.id)}>
              <span className="que"><strong>{a.titulo}</strong><span className="meta">{t(TA[a.tipo] || TA.pregunta) + " · " + ago(a.ts)}</span></span>
            </button>
          </li>
        )) : <li className="meta" style={{ padding: "10px 14px" }}>{t("Todavía no ha publicado nada.")}</li>}
      </ul>
      </div>
      {mio && <Gustados />}
    </section>
  );
}

/* Solo en tu propio perfil: los anuncios a los que diste «me gusta», para escribirles después */
function Gustados() {
  const { t, en, data, uid, goAviso, escribirA, votar, perfilDe } = useApp();
  const votosDe = {};
  data.votos.forEach((v) => { votosDe[v.aviso] = (votosDe[v.aviso] || 0) + 1; });
  const mios = data.votos.filter((v) => v.by === uid).sort((x, y) => (y.ts || 0) - (x.ts || 0));
  const lista = mios.map((v) => data.avisos.find((a) => a.id === v.aviso)).filter(Boolean);
  const autor = (a) => { const p = a.by && perfilDe(a.by); return (p && p.nombre) || a.firma || ""; };
  return (
    <div className="caja" id="perfil-gustados">
      <h3 className="sub cal-prox-h">{en ? "Posts you liked" : "Anuncios que te gustaron"} {lista.length > 0 && <span className="n">{lista.length}</span>}</h3>
      {lista.length ? (
        <ul className="gustados lista-gustados">
          {lista.map((a) => {
            const puede = !a.ejemplo && a.by && a.by !== uid;
            return (
              <li className="gustado" key={a.id}>
                <button type="button" className="gustado-main" onClick={() => goAviso(a.id)}>
                  <span><strong>{a.titulo}</strong><span className="meta">{t(TA[a.tipo] || TA.pregunta)}{autor(a) && " · " + autor(a)} · ♥ {votosDe[a.id] || 0}</span></span>
                </button>
                <span className="gustado-acc">
                  {puede && <button type="button" className="btn-mini" onClick={() => escribirA(a.by, { nombre: autor(a), ref: { aviso: a.id, titulo: a.titulo } })}>{en ? "Write" : "Escribir"}</button>}
                  <button type="button" className="linkbtn" onClick={() => votar(a.id)} title={en ? "Remove like" : "Quitar me gusta"}>{en ? "Remove" : "Quitar"}</button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : <p className="meta">{en ? "When you like a post in Discover it is saved here so you can write to them later." : "Cuando des «me gusta» a un anuncio en Descubre, se guarda aquí para que puedas escribirle después."}</p>}
    </div>
  );
}

function ProfileForm({ p, onClose }) {
  const { t, en, data, uid, write } = useApp();
  const [f, setF] = useState(() => {
    const o = { nombre: p.nombre || "", rol: p.rol || "", lugar: p.lugar || "", com: p.com || "", sobre: p.sobre || "", whatsapp: p.whatsapp || "", telefono: p.telefono || "", correo: p.correo || "", web: p.web || "" };
    REDES.forEach(([k]) => { o[k] = p[k] || ""; });
    return o;
  });
  const [foto, setFoto] = useState(() => ({ url: fotoSegura(p.foto), blob: null }));
  const [avatar, setAvatar] = useState(() => (fotoSegura(p.foto) ? "" : avatarValido(p.avatar) ? p.avatar : ""));
  const [m, setM] = useState("");
  const ref = useRef(null);
  const L = (es, eng) => (en ? eng : es);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  useEffect(() => { ref.current?.scrollIntoView({ block: "start" }); ref.current?.querySelector("input")?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => { if (foto.blob) URL.revokeObjectURL(foto.url); }, [foto]);
  const coms = data.comunidades.slice().sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  const elegirFoto = async (ev) => {
    const file = ev.target.files && ev.target.files[0]; ev.target.value = "";
    if (!file) return;
    try { const b = await shrink(file, 400); setFoto({ url: URL.createObjectURL(b), blob: b }); setAvatar(""); setM(""); }
    catch (e) { setM("No se pudo leer alguna foto. Prueba con una imagen JPG o PNG."); }
  };

  const enviar = (ev) => {
    ev.preventDefault();
    const el = ev.currentTarget.elements;
    const d = {
      nombre: str(f.nombre, 60), rol: str(f.rol, 90), lugar: str(f.lugar, 80), com: str(f.com, 80), sobre: str(f.sobre, 1000),
      whatsapp: str(f.whatsapp, 40), telefono: str(f.telefono, 40), correo: str(f.correo, 120), web: str(f.web, 200),
      ts: p.ts || Date.now(), editado: Date.now(), by: uid,
    };
    REDES.forEach(([k]) => { d[k] = str(f[k], 200); });
    Object.keys(d).forEach((k) => { if (d[k] === "") delete d[k]; });
    if (!d.nombre) { setM("Escribe tu nombre."); el.nombre.focus(); return; }
    if (COORD.test((d.lugar || "") + " " + (d.sobre || ""))) { setM(COORD_MSG); return; }
    if (d.correo && !correoValido(d.correo)) { setM("Revisa el correo: parece que está mal escrito."); el.correo.focus(); return; }
    for (const k of ["web"].concat(REDES.map((r) => r[0]))) {
      if (d[k] && !enlaceRed(k, d[k])) { setM("Revisa ese enlace: pon tu nombre de usuario o la dirección completa (https://…)."); el[k].focus(); return; }
    }
    write(setM, async () => {
      if (foto.blob) d.foto = await uploadPhoto(foto.blob);
      else if (foto.url) d.foto = foto.url;
      else if (avatar) d.avatar = avatar;
      await store.set("perfiles", uid, d);
    }, onClose);
  };

  const campo = (k, label, extra = {}) => (
    <div className={extra.full ? "full" : undefined}><label htmlFor={"pf-" + k}>{label}</label>
      <input id={"pf-" + k} name={k} maxLength={extra.max || 120} type={extra.type || "text"} inputMode={extra.inputMode} autoComplete={extra.ac || "off"}
        value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={extra.ph || ""} /></div>
  );

  return (
    <form className="panel" id="f-perfil" noValidate onSubmit={enviar} ref={ref}>
      <h2 className="panel-h">{t("Editar perfil")}</h2>
      <p className="notice aviso-privado">{L("Todo lo que pongas aquí lo verá cualquiera que entre en la web. Rellena solo lo que quieras compartir.", "Anyone who visits the site will see what you put here. Only fill in what you want to share.")}</p>
      <div className="fields">
        <fieldset className="full imagen-campo">
          <legend>{L("Tu imagen (opcional)", "Your picture (optional)")}</legend>
          <div className="perfil-foto">
            <Avatar p={{ nombre: f.nombre, foto: foto.url, avatar }} size={88} />
            <div>
              <label className="btn-ghost subir-foto" htmlFor="pf-foto">{foto.url ? L("Cambiar la foto", "Change photo") : L("Subir una foto", "Upload a photo")}</label>
              <input id="pf-foto" className="sr" type="file" accept="image/*" onChange={elegirFoto} />
              {(foto.url || avatar) && <button type="button" className="linkbtn danger" onClick={() => { setFoto({ url: "", blob: null }); setAvatar(""); }}>{L("Quitar imagen", "Remove picture")}</button>}
              <p className="hint">{L("Si no quieres poner una foto tuya, elige un dibujo de la comunidad.", "If you would rather not use a photo of yourself, choose a drawing from the community.")}</p>
            </div>
          </div>
          <div className="avatares" role="radiogroup" aria-label={L("Dibujos para tu perfil", "Drawings for your profile")}>
            {AVATARES.map(([k, es, eng]) => (
              <label key={k} className="avatar-op" title={en ? eng : es}>
                <input type="radio" name="avatar" value={k} checked={avatar === k}
                  onChange={() => { setFoto({ url: "", blob: null }); setAvatar(k); }} />
                <img src={avatarUrl(k)} width="200" height="200" alt={en ? eng : es} loading="lazy" />
              </label>
            ))}
          </div>
        </fieldset>
        {campo("nombre", L("Nombre", "Name"), { max: 60, ac: "name" })}
        {campo("rol", L("A qué te dedicas", "What you do"), { max: 90, ph: L("Guía local, maestra, comunero…", "Local guide, teacher, farmer…") })}
        {campo("lugar", L("Dónde estás", "Where you are"), { max: 80, ph: L("Distrito o provincia", "District or province") })}
        <div><label htmlFor="pf-com">{L("Comunidad o grupo", "Community or group")}</label>
          <select id="pf-com" name="com" value={f.com} onChange={(e) => set("com", e.target.value)}>
            <option value="">{t("Ninguna")}</option>
            {coms.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></div>
        <div className="full"><label htmlFor="pf-sobre">{L("Sobre ti", "About you")}</label>
          <textarea id="pf-sobre" name="sobre" rows={4} maxLength={1000} value={f.sobre} onChange={(e) => set("sobre", e.target.value)}
            placeholder={L("Qué haces por el sapo o por tu quebrada, qué sabes hacer, en qué puedes ayudar…", "What you do for the toad or your stream, what you are good at, how you can help…")} />
          <p className="hint">{L("Indica solo la región, nunca coordenadas exactas.", "Give only the region, never exact coordinates.")}</p></div>
      </div>
      <fieldset className="cuando-campo"><legend>{L("Contacto", "Contact")}</legend>
        <div className="fields">
          {campo("whatsapp", "WhatsApp", { max: 40, type: "tel", inputMode: "tel", ph: "9xx xxx xxx" })}
          {campo("telefono", L("Teléfono", "Phone"), { max: 40, type: "tel", inputMode: "tel" })}
          {campo("correo", L("Correo de contacto", "Contact email"), { max: 120, type: "email", ph: L("Puede ser distinto del de tu cuenta", "Can differ from your account email") })}
          {campo("web", L("Página web", "Website"), { max: 200, ph: "https://…" })}
        </div>
      </fieldset>
      <fieldset className="cuando-campo"><legend>{L("Redes sociales", "Social media")}</legend>
        <div className="fields">
          {REDES.map(([k, n]) => <Fragment key={k}>{campo(k, n, { max: 200, ph: L("usuario o enlace", "user name or link") })}</Fragment>)}
        </div>
      </fieldset>
      <Msg id="m-perfil" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{t("Guardar perfil")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{t("Cancelar")}</button>
      </div>
    </form>
  );
}
