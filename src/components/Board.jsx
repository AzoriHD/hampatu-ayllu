import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG, ES, P, TA, TD } from "../data/constants.js";
import { newId, store, uploadPhoto } from "../lib/store.js";
import { deYmd, plural, shrink, simboloDe, str, ymd } from "../lib/utils.js";
import { BoardHeader } from "./Headers.jsx";
import { Chip, CopyBtn, Datos, DelBtns, EmptyBox, JoinBlock, JoinButton, Msg, Simbolo, Svg } from "./Shared.jsx";

const tipoDe = (a) => (TA[a.tipo] ? a.tipo : "pregunta");

export default function Board() {
  const { t, data, zona, setZona, formAviso, setFormAviso, uid } = useApp();
  const [tipo, setTipo] = useState("");
  const [orden, setOrden] = useState("recientes");
  const inZona = (x) => !zona || x.zona === zona || !P[x.zona];

  const base = data.avisos.filter(inZona), cnt = {};
  base.forEach((a) => { const k = tipoDe(a); cnt[k] = (cnt[k] || 0) + 1; });
  const votosDe = {}, misVotos = {};
  data.votos.forEach((v) => { votosDe[v.aviso] = (votosDe[v.aviso] || 0) + 1; if (v.by === uid) misVotos[v.aviso] = 1; });
  let list = base.filter((a) => !tipo || tipoDe(a) === tipo).sort((x, y) => (y.ts || 0) - (x.ts || 0));
  if (orden === "votados") list = list.slice().sort((x, y) => ((votosDe[y.id] || 0) - (votosDe[x.id] || 0)) || ((y.ts || 0) - (x.ts || 0)));
  const k = TA[tipo] ? tipo : "";

  const alPublicar = (d) => { setFormAviso(null); setTipo(""); if (zona && d.zona && d.zona !== zona) setZona(""); };

  return (
    <section id="v-tablon" aria-labelledby="tab-tablon">
      <BoardHeader />
      <div className="bar">
        <div className="chips" id="tipos" role="group" aria-label={t("Filtrar por tipo de aviso")}>
          <Chip id="tp-all" label={t("Todos")} n={base.length} on={!tipo} onClick={() => setTipo("")} />
          {Object.keys(TA).map((x) => <Chip key={x} id={"tp-" + x} label={t(TA[x])} n={cnt[x] || 0} on={tipo === x} onClick={() => setTipo(x)} />)}
        </div>
        <button className="btn" type="button" id="b-aviso" onClick={() => setFormAviso(formAviso ? null : { k: Date.now(), preset: {} })}>{t("Publicar aviso")}</button>
      </div>
      <p className={"explica" + (k ? " t-" + k : "")} id="tipo-exp" aria-live="polite">{t(TD[k])}</p>
      <div className="orden" role="group" aria-label={t("Ordenar avisos")}>
        <button type="button" className="chipbtn" id="o-rec" aria-pressed={orden !== "votados"} onClick={() => setOrden("recientes")}>{t("Recientes")}</button>
        <button type="button" className="chipbtn" id="o-vot" aria-pressed={orden === "votados"} onClick={() => setOrden("votados")}>{t("Más votados")}</button>
      </div>
      {formAviso && <PostForm key={formAviso.k} preset={formAviso.preset} enfocar={formAviso.enfocar} onDone={alPublicar} onCancel={() => setFormAviso(null)} />}
      <div className="lista" id="lista-avisos">
        {list.length ? list.map((a) => <Post key={a.id} a={a} votos={votosDe[a.id] || 0} mio={!!misVotos[a.id]} />)
          : <EmptyBox text={data.avisos.length ? "Ningún aviso con este filtro." : "Todavía no hay avisos. Publica el primero: un avistamiento, algo que tu comunidad necesita o algo que puede ofrecer."}
              onClear={data.avisos.length ? () => { setZona(""); setTipo(""); } : null} />}
      </div>
    </section>
  );
}

function PostForm({ preset, enfocar, onDone, onCancel }) {
  const { t, en, data, uid, firma, keepFirma, write } = useApp();
  const [f, setF] = useState(() => ({ tipo: "avistamiento", estado: "", titulo: "", texto: "", com: "", zona: "", zonaotra: "", fecha: "", hora: "", lugar: "", contacto: "", firma, ...preset }));
  const [fotos, setFotos] = useState([]);
  const [m, setM] = useState("");
  const ref = useRef(null), titulo = useRef(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const fotosRef = useRef(fotos); fotosRef.current = fotos;

  useEffect(() => {
    if (enfocar) { ref.current?.scrollIntoView({ block: "start" }); const i = titulo.current; if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    else ref.current?.querySelector("select")?.focus();
    return () => fotosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, [enfocar]);

  const coms = data.comunidades.slice().sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
  const elegirCom = (id) => {
    const c = data.comunidades.find((x) => x.id === id);
    setF((o) => {
      const n = { ...o, com: id };
      if (c && !o.contacto && c.contacto && !c.ejemplo) n.contacto = String(c.contacto);
      if (c && P[c.zona]) { n.zona = c.zona; n.zonaotra = c.zona === "otra" ? String(c.zonaOtra || "") : ""; }
      return n;
    });
  };

  const elegirFotos = async (ev) => {
    const files = Array.from(ev.target.files || []); ev.target.value = "";
    let bad = 0, extra = 0; const nuevas = [];
    for (const file of files) {
      if (fotos.length + nuevas.length >= 3) { extra++; continue; }
      try { const b = await shrink(file); nuevas.push({ blob: b, url: URL.createObjectURL(b) }); } catch (e) { bad++; }
    }
    setFotos((o) => o.concat(nuevas));
    setM(bad ? "No se pudo leer alguna foto. Prueba con una imagen JPG o PNG." : extra ? "Solo caben 3 fotos por aviso." : "");
  };
  const quitarFoto = (i) => setFotos((o) => { URL.revokeObjectURL(o[i].url); return o.filter((_, j) => j !== i); });

  const enviar = (ev) => {
    ev.preventDefault();
    const el = ev.currentTarget.elements;
    const tipo = TA[f.tipo] ? f.tipo : "pregunta";
    const d = { tipo, titulo: str(f.titulo, 90), texto: str(f.texto, 1200), firma: str(f.firma, 60), com: str(f.com, 80), zona: P[f.zona] ? f.zona : "", ts: Date.now(), by: uid };
    if (tipo === "avistamiento" && ES[f.estado]) d.estado = f.estado;
    const cto = str(f.contacto, 120); if (cto) d.contacto = cto;
    if (tipo === "evento" || tipo === "ofrecemos") {
      if (deYmd(f.fecha)) d.fecha = f.fecha;
      if (/^\d{2}:\d{2}$/.test(f.hora)) d.hora = f.hora;
      const lg = str(f.lugar, 80); if (lg) d.lugar = lg;
    }
    if (tipo === "evento" && !d.fecha) { setM("Pon el día del evento."); el.fecha.focus(); return; }
    if (d.zona === "otra") d.zonaOtra = str(f.zonaotra, 60);
    if (d.zona === "otra" && !d.zonaOtra) { setM("Escribe qué zona es."); el.zonaotra.focus(); return; }
    if (!d.titulo) { setM("Escribe un título para el aviso."); el.titulo.focus(); return; }
    if (!d.firma) { setM("Firma el aviso para que sepan quién lo publica."); el.firma.focus(); return; }
    if (COORD.test(d.titulo + " " + d.texto + " " + (d.zonaOtra || "") + " " + (d.lugar || ""))) { setM(COORD_MSG); return; }
    write(setM, async () => {
      const ids = [];
      for (const p of fotos.slice(0, 3)) ids.push(await uploadPhoto(p.blob));
      if (ids.length) d.fotos = ids;
      try { await store.set("avisos", newId(), d); }
      catch (e) { if (ids.length && e.code === "quota_exceeded") throw { code: "foto_grande" }; throw e; }
    }, () => { keepFirma(d.firma); onDone(d); });
  };

  const conFecha = f.tipo === "evento" || f.tipo === "ofrecemos";
  return (
    <form className="panel" id="f-aviso" noValidate onSubmit={enviar} ref={ref}>
      <h2 className="panel-h">{en ? "New post" : "Nuevo aviso"}</h2>
      <div className="fields">
        <div><label htmlFor="a-tipo">{en ? "Type" : "Tipo"}</label>
          <select id="a-tipo" name="tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            {Object.keys(TA).map((x) => <option key={x} value={x}>{t(TA[x])}</option>)}
          </select></div>
        {f.tipo === "avistamiento" && (
          <div id="w-estado"><label htmlFor="a-estado">{en ? "How was the animal?" : "¿Cómo estaba el animal?"}</label>
            <select id="a-estado" name="estado" value={f.estado} onChange={(e) => set("estado", e.target.value)}>
              <option value="">{t("No lo sé")}</option>
              {Object.keys(ES).map((x) => <option key={x} value={x}>{t(ES[x])}</option>)}
            </select></div>
        )}
        <p className="hint full" id="a-tipo-exp">{t(TD[f.tipo] || "")}</p>
        <div className="full"><label htmlFor="a-titulo">{en ? "Title" : "Título"}</label>
          <input id="a-titulo" name="titulo" ref={titulo} maxLength={90} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder={en ? "An adult seen by the canal" : "Un adulto visto junto al canal"} /></div>
        <div className="full"><label htmlFor="a-texto">{en ? "Details" : "Detalle"}</label>
          <textarea id="a-texto" name="texto" rows={4} maxLength={1200} value={f.texto} onChange={(e) => set("texto", e.target.value)} />
          <p className="hint">{en ? "Give only the region, never exact coordinates." : "Indica solo la región, nunca coordenadas exactas."}</p></div>
        <div className="full" id="w-fotos"><label htmlFor="a-fotos">{en ? "Photos (up to 3)" : "Fotos (hasta 3)"}</label>
          <input id="a-fotos" type="file" accept="image/*" multiple onChange={elegirFotos} />
          <p className="hint">{en ? "Saved without the phone's location data." : "Se guardan sin los datos de ubicación del móvil."}</p>
          <div className="prev" id="a-prev">
            {fotos.map((p, i) => (
              <figure key={p.url}><img src={p.url} alt={t("Foto") + " " + (i + 1) + " " + t("lista para subir")} />
                <button type="button" className="linkbtn danger" onClick={() => quitarFoto(i)}>{t("Quitar")}</button></figure>
            ))}
          </div></div>
        <div><label htmlFor="a-com">{en ? "Community" : "Comunidad"}</label>
          <select id="a-com" name="com" value={f.com} onChange={(e) => elegirCom(e.target.value)}>
            <option value="">{t("Ninguna, a título personal")}</option>
            {coms.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></div>
        <div><label htmlFor="a-zona">{en ? "Area" : "Zona"}</label>
          <select id="a-zona" name="zona" value={f.zona} onChange={(e) => set("zona", e.target.value)}>
            <option value="">{t("Toda la red")}</option>
            {Object.keys(P).map((x) => <option key={x} value={x}>{t(P[x])}</option>)}
          </select></div>
        {f.zona === "otra" && (
          <div className="full" id="w-a-zonaotra"><label htmlFor="a-zonaotra">{en ? "Which area?" : "¿Qué zona?"}</label>
            <input id="a-zonaotra" name="zonaotra" maxLength={60} value={f.zonaotra} onChange={(e) => set("zonaotra", e.target.value)} placeholder={en ? "Department or region" : "Departamento o región"} /></div>
        )}
        {conFecha && (
          <fieldset className="full cuando-campo" id="w-cuando"><legend id="a-cuando-leg">{t(f.tipo === "evento" ? "Cuándo y dónde" : "Cuándo y dónde (si tiene fecha)")}</legend>
            <div className="fields">
              <div><label htmlFor="a-fecha">{en ? "Day" : "Día"}</label><input id="a-fecha" name="fecha" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
              <div><label htmlFor="a-hora">{en ? "Time" : "Hora"}</label><input id="a-hora" name="hora" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
              <div className="full"><label htmlFor="a-lugar">{en ? "Meeting point" : "Punto de encuentro"}</label>
                <input id="a-lugar" name="lugar" maxLength={80} value={f.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder={en ? "Community hall, bridge, square…" : "Local comunal, puente, plaza…"} /></div>
            </div>
            <p className="hint">{en ? "Events with a day appear in the calendar by themselves. Give a meeting point, never the exact site of the toad." : "Si pones el día, sale solo en el calendario. Indica un punto de encuentro, nunca el sitio exacto del sapo."}</p>
          </fieldset>
        )}
        <div className="full"><label htmlFor="a-contacto">{en ? "Contact for people to join" : "Contacto para apuntarse"}</label>
          <input id="a-contacto" name="contacto" maxLength={120} value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder={en ? "WhatsApp number, email or person" : "WhatsApp 9xx xxx xxx, correo o persona"} />
          <p className="hint">{en ? "The whole network will see it. If you leave it empty, your community's contact is used." : "Lo verá toda la red. Si lo dejas vacío, se usa el de tu comunidad."}</p></div>
        <div className="full"><label htmlFor="a-firma">{en ? "Your name" : "Tu firma"}</label>
          <input id="a-firma" name="firma" maxLength={60} value={f.firma} onChange={(e) => set("firma", e.target.value)} placeholder={en ? "Rosa, local guide" : "Rosa, guía local"} /></div>
      </div>
      <Msg id="m-aviso" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{en ? "Post" : "Publicar"}</button>
        <button className="btn-ghost" type="button" onClick={onCancel}>{en ? "Cancel" : "Cancelar"}</button>
      </div>
    </form>
  );
}

function Foto({ src, i }) {
  const { t } = useApp();
  const [zoom, setZoom] = useState(false);
  return (
    <button type="button" className={"foto" + (zoom ? " zoom" : "")} aria-label={t("Ampliar o reducir la foto") + " " + (i + 1)} onClick={() => setZoom(!zoom)}>
      <img src={src} alt={t("Foto") + " " + (i + 1) + " " + t("del aviso")} loading="lazy" />
    </button>
  );
}

function Post({ a, votos, mio }) {
  const { t, data, uid, canPost, canEdit, ago, zonaDe, contactoDe, goCom, abiertos, setAbiertos, votar, enlaceAviso, write, setMsg } = useApp();
  const [compartir, setCompartir] = useState(false);
  const tp = tipoDe(a), id = a.id;
  const rs = data.respuestas.filter((r) => r.aviso === id).sort((x, y) => (x.ts || 0) - (y.ts || 0));
  const abierto = !!abiertos[id];
  const c = data.comunidades.find((x) => x.id === a.com);
  const pasado = tp === "evento" && a.fecha && a.fecha < ymd(new Date());
  const puedeBorrar = canPost && (canEdit || a.by === uid);
  const fotos = Array.isArray(a.fotos) ? a.fotos.slice(0, 3) : [];
  const enl = enlaceAviso(id), txt = t("Mira este aviso en Hampatu Ayllu") + ": " + String(a.titulo || "") + "\n" + enl;
  const firmaEsCom = c && String(a.firma || "").trim() === String(c.nombre || "").trim();
  const enlaceCom = c && <><Simbolo k={simboloDe(c)} mini /><button type="button" className="linkbtn" onClick={() => goCom(c.id)}>{c.nombre}</button></>;
  const verificar = (on) => write(setMsg, () => store.update("avisos", id, on ? { verificada: true, verificadaTs: Date.now() } : { verificada: false }));

  return (
    <article className={"aviso t-" + tp} id={"a-" + id}>
      <div className="row">
        <span className="pill">{t(TA[tp])}</span>
        {tp === "avistamiento" && ES[a.estado] && <span className="tag">{t(ES[a.estado])}</span>}
        {a.verificada && <span className="tag tag-ok">{t("Foto verificada")}</span>}
        {a.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}
        {pasado && <span className="tag tag-pasado">{t("Ya pasó")}</span>}
        <span className="when">{ago(a.ts)}</span>
      </div>
      <h3>{a.titulo}</h3>
      {a.texto && <p className="txt">{a.texto}</p>}
      {fotos.length > 0 && <div className="fotos">{fotos.map((src, i) => <Foto key={i} src={src} i={i} />)}</div>}
      <Datos x={a} clave={id} titulo={a.titulo} />
      {!pasado && JOIN_TIPOS.includes(tp) && (
        <>
          <div className="row"><JoinButton clave={id} tipo={tp} pasado={pasado} /></div>
          <JoinBlock clave={id} tipo={tp} titulo={a.titulo} contacto={contactoDe(a)} ejemplo={a.ejemplo} />
        </>
      )}
      <p className="meta">
        {firmaEsCom ? enlaceCom : <>{a.firma || t("Sin firma")}{c && <> · {enlaceCom}</>}</>}
        {" · " + (P[a.zona] ? zonaDe(a) : t("Toda la red"))}
      </p>
      <div className="row">
        <button type="button" className="linkbtn" id={"t-" + id} aria-expanded={abierto}
          onClick={() => setAbiertos((o) => { const n = { ...o }; if (n[id]) delete n[id]; else n[id] = 1; return n; })}>
          {rs.length ? plural(t, rs.length, "respuesta", "respuestas") : t("Responder")}
        </button>
        <button type="button" className="voto" id={"vt-" + id} aria-pressed={mio} disabled={!canPost} onClick={() => votar(id)}>
          <Svg width="2.2" d='<path d="M12 19V5M5 12l7-7 7 7"/>' />{t(mio ? "Votado" : "Votar")} <b>{votos}</b>
        </button>
        <button type="button" className="linkbtn" id={"sh-" + id} aria-expanded={compartir} onClick={() => setCompartir(!compartir)}>{t("Compartir")}</button>
        {canEdit && canPost && tp === "avistamiento" && fotos.length > 0 && a.estado !== "muerto" && (
          <button type="button" className="linkbtn" id={"v-" + id} onClick={() => verificar(!a.verificada)}>{t(a.verificada ? "Quitar verificación" : "Marcar foto verificada")}</button>
        )}
        {puedeBorrar && <DelBtns k={"aviso:" + id} />}
      </div>
      {compartir && (
        <div className="compartir">
          <a className="btn-mini" href={"https://wa.me/?text=" + encodeURIComponent(txt)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <CopyBtn text={enl} id={"cl-" + id} className="btn-mini claro" label="Copiar enlace" />
          {typeof navigator !== "undefined" && navigator.share && (
            <button type="button" className="btn-mini claro" onClick={() => navigator.share({ title: "Hampatu Ayllu", text: String(a.titulo || ""), url: enl }).catch(() => {})}>{t("Otras apps")}</button>
          )}
        </div>
      )}
      {abierto && (
        <div className="thread">
          {rs.map((r) => (
            <div className="resp" key={r.id}>
              <p>{r.texto}</p>
              <p className="meta">{(r.firma || t("Sin firma")) + " · " + ago(r.ts)}</p>
              {canPost && (canEdit || r.by === uid) && <DelBtns k={"resp:" + r.id} />}
            </div>
          ))}
          {canPost ? <ReplyForm id={id} /> : !rs.length && <p className="meta">{t("Aún sin respuestas.")}</p>}
        </div>
      )}
    </article>
  );
}

const JOIN_TIPOS = ["evento", "ofrecemos", "necesitamos"];

function ReplyForm({ id }) {
  const { t, uid, firma, keepFirma, write, setMsg } = useApp();
  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState(firma);
  const enviar = (ev) => {
    ev.preventDefault();
    const d = { aviso: id, texto: str(texto, 600), firma: str(nombre, 60), ts: Date.now(), by: uid };
    const el = ev.currentTarget.elements;
    if (!d.texto) { el[0].focus(); return; }
    if (!d.firma) { setMsg("Firma la respuesta para que sepan quién contesta."); el[1].focus(); return; }
    if (COORD.test(d.texto)) { setMsg(COORD_MSG); return; }
    write(setMsg, () => store.set("respuestas", newId(), d), () => { keepFirma(d.firma); setTexto(""); });
  };
  return (
    <form className="reply" noValidate onSubmit={enviar}>
      <div><label htmlFor={"r-" + id}>{t("Tu respuesta")}</label><textarea id={"r-" + id} rows={2} maxLength={600} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
      <div><label htmlFor={"rf-" + id}>{t("Tu firma")}</label><input id={"rf-" + id} maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
      <button className="btn" type="submit">{t("Responder")}</button>
    </form>
  );
}
