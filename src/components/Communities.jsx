import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG, P, SIMB, SIMB_K, TC, TCD, TONOS } from "../data/constants.js";
import { newId, store } from "../lib/store.js";
import { colorDe, coloresDe, plural, simboloDe, str } from "../lib/utils.js";
import ZonaRail from "./Rail.jsx";
import { CommunitiesHeader } from "./Headers.jsx";
import { CopyBtn, DelBtns, EmptyBox, Msg, Simbolo } from "./Shared.jsx";
import { SubirFotos } from "./Kit.jsx";

export default function Communities() {
  const { t, en, data, zona, setZona, q, setQ, canPost, canEdit, uid, zonaDe, pedirCuenta } = useApp();
  const [form, setForm] = useState(null); // {k, id}
  const ql = q.trim().toLowerCase();
  const nAv = {};
  data.avisos.forEach((a) => { if (a.com) nAv[a.com] = (nAv[a.com] || 0) + 1; });
  const list = data.comunidades.filter((c) => {
    if (zona && c.zona !== zona) return false;
    if (!ql) return true;
    return [c.nombre, c.region, c.zonaOtra, c.especies, c.ofrece, c.necesita, t(TC[c.tipo] || "")].join(" ").toLowerCase().includes(ql);
  }).sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

  return (
    <section id="v-comunidades" aria-labelledby="tab-comunidades">
      <div className="caja caja-cabeza">
      <CommunitiesHeader />
      <ZonaRail />
      <div className="bar">
        <div className="search"><label htmlFor="q" className="sr">{t("Buscar comunidad")}</label>
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Buscar nombre, lugar o necesidad")} /></div>
        <button className="btn" type="button" id="b-com" onClick={() => (canPost ? setForm(form ? null : { k: Date.now(), id: "" }) : pedirCuenta("Para añadir una comunidad necesitas una cuenta. Es gratis y tarda un minuto."))}>{t("Añadir comunidad")}</button>
      </div>
      </div>
      {form && canPost && <CommunityForm key={form.k} editId={form.id} onClose={() => setForm(null)} />}
      <div className="grid" id="lista-coms">
        {list.length ? list.map((c) => {
          const z = zonaDe(c), n = nAv[c.id] || 0;
          return (
            <article className="com" id={"c-" + c.id} key={c.id}>
              <div className="com-top">
                <Simbolo com={c} />
                <div>
                  <div className="row"><span className="pill">{t(TC[c.tipo] || TC.otro)}</span>{c.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}</div>
                  <h3><a href={"#comunidad-" + c.id}>{c.nombre}</a></h3>
                </div>
              </div>
              <p className="where">{z}{c.region ? (z ? " · " : "") + c.region : ""}</p>
              <dl>
                {c.especies && <div><dt>{t("Allí lo llaman")}</dt><dd>{c.especies}</dd></div>}
                {c.ofrece && <div><dt className="d-ofrece">{t("Ofrece")}</dt><dd>{c.ofrece}</dd></div>}
                {c.necesita && <div><dt className="d-necesita">{t("Necesita")}</dt><dd>{c.necesita}</dd></div>}
                {c.contacto && <div><dt>{t("Contacto")}</dt><dd>{c.contacto} <CopyBtn text={String(c.contacto)} id={"cp-" + c.id} /></dd></div>}
              </dl>
              <div className="row">
                <a className="btn-mini claro" href={"#comunidad-" + c.id}>{en ? "Open page" : "Ver ficha"}</a>
                {n > 0 && <span className="meta">{plural(t, n, "aviso", "avisos") + " " + t("en el tablón")}</span>}
                {canPost && (canEdit || c.by === uid) && (
                  <>
                    <button type="button" className="linkbtn" id={"e-" + c.id} onClick={() => setForm({ k: Date.now(), id: c.id })}>{t("Editar")}</button>
                    <DelBtns k={"com:" + c.id} />
                  </>
                )}
              </div>
            </article>
          );
        }) : <EmptyBox text={data.comunidades.length ? "Ninguna comunidad con este filtro." : "Todavía no hay comunidades. Añade la primera para que otras puedan encontrarla."}
            onClear={data.comunidades.length ? () => { setZona(""); setQ(""); } : null} />}
      </div>
    </section>
  );
}

/* Ficha de comunidad. «completo»: abre también la parte larga (presentación, naturaleza, fotos…). */
export function CommunityForm({ editId, onClose, completo }) {
  const { t, en, data, uid, write } = useApp();
  const prev = editId ? data.comunidades.find((c) => c.id === editId) : null;
  const [f, setF] = useState(() => ({
    nombre: prev?.nombre || "", tipo: TC[prev?.tipo] ? prev.tipo : "local", zona: P[prev?.zona] ? prev.zona : "", zonaotra: prev?.zonaOtra || "",
    region: prev?.region || "", especies: prev?.especies || "", ofrece: prev?.ofrece || "", necesita: prev?.necesita || "",
    contacto: prev?.contacto || "", simbolo: prev ? simboloDe(prev) : "", color: prev ? colorDe(prev) : 0, colores: prev ? coloresDe(prev) : null,
    presentacion: prev?.presentacion || "", ecosistemas: prev?.ecosistemas || "", biodiversidad: prev?.biodiversidad || "",
    actividades: prev?.actividades || "", apoyos: prev?.apoyos || "", resultados: prev?.resultados || "", fotos: Array.isArray(prev?.fotos) ? prev.fotos : [],
  }));
  const [m, setM] = useState("");
  const ref = useRef(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  useEffect(() => { ref.current?.scrollIntoView({ block: "start" }); ref.current?.querySelector("input")?.focus(); }, []);

  const enviar = (ev) => {
    ev.preventDefault();
    const el = ev.currentTarget.elements;
    const d = {
      nombre: str(f.nombre, 80), tipo: TC[f.tipo] ? f.tipo : "otro", zona: P[f.zona] ? f.zona : "",
      region: str(f.region, 80), especies: str(f.especies, 160), ofrece: str(f.ofrece, 300), necesita: str(f.necesita, 300),
      contacto: str(f.contacto, 120), simbolo: SIMB[f.simbolo] ? f.simbolo : "", color: Number.isInteger(f.color) && f.color >= 0 && f.color < TONOS.length ? f.color : 0, colores: coloresDe(f) || undefined,
      ts: prev ? Number(prev.ts) || Date.now() : Date.now(), by: prev ? String(prev.by || "") : uid,
      presentacion: str(f.presentacion, 1500), ecosistemas: str(f.ecosistemas, 300), biodiversidad: str(f.biodiversidad, 500),
      actividades: str(f.actividades, 1000), apoyos: str(f.apoyos, 800), resultados: str(f.resultados, 1000), fotos: f.fotos.slice(0, 6),
    };
    if (!d.colores) delete d.colores;
    ["presentacion", "ecosistemas", "biodiversidad", "actividades", "apoyos", "resultados"].forEach((k) => { if (!d[k]) delete d[k]; });
    if (!d.fotos.length) delete d.fotos;
    if (prev?.ejemplo) d.ejemplo = true;
    if (d.zona === "otra") d.zonaOtra = str(f.zonaotra, 60);
    if (!d.nombre) { setM("Escribe el nombre de la comunidad o grupo."); el.nombre.focus(); return; }
    if (!d.zona) { setM("Elige la zona."); el.zona.focus(); return; }
    if (d.zona === "otra" && !d.zonaOtra) { setM("Escribe qué zona es."); el.zonaotra.focus(); return; }
    if (COORD.test([d.zonaOtra || "", d.region, d.especies, d.ofrece, d.necesita, d.contacto, d.presentacion, d.ecosistemas, d.biodiversidad, d.actividades, d.apoyos, d.resultados].join(" "))) { setM(COORD_MSG); return; }
    /* Al editar se cambia la ficha existente (así también pueden hacerlo sus representantes) */
    if (editId && prev) {
      const quitar = {};
      ["presentacion", "ecosistemas", "biodiversidad", "actividades", "apoyos", "resultados", "fotos", "zonaOtra"].forEach((k) => { if (!(k in d) && k in prev) quitar[k] = k === "fotos" ? [] : ""; });
      write(setM, () => store.update("comunidades", editId, { ...quitar, ...d }), onClose);
    } else {
      write(setM, () => store.set("comunidades", editId || newId(), d), onClose);
    }
  };

  const L = (es, eng) => (en ? eng : es);
  return (
    <form className="panel" id="f-com" noValidate onSubmit={enviar} ref={ref}>
      <h2 className="panel-h" id="h-com">{t(editId ? "Editar comunidad" : "Nueva comunidad")}</h2>
      <div className="fields">
        <div className="full"><label htmlFor="c-nombre">{L("Nombre de la comunidad o grupo", "Name of the community or group")}</label>
          <input id="c-nombre" name="nombre" maxLength={80} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
        <div><label htmlFor="c-tipo">{L("Tipo", "Type")}</label>
          <select id="c-tipo" name="tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            {Object.keys(TC).map((k) => <option key={k} value={k}>{t(TC[k])}</option>)}
          </select>
          <p className="hint" id="c-tipo-exp">{t(TCD[f.tipo] || "")}</p></div>
        <div><label htmlFor="c-zona">{L("Zona", "Area")}</label>
          <select id="c-zona" name="zona" value={f.zona} onChange={(e) => set("zona", e.target.value)}>
            <option value="">{t("Elige la zona")}</option>
            {Object.keys(P).map((k) => <option key={k} value={k}>{t(P[k])}</option>)}
          </select></div>
        <fieldset className="full sim-campo"><legend>{L("Símbolo de tu grupo", "Your group's symbol")}</legend>
          <div className="simbolos" id="c-simbolos">
            {SIMB_K.map((k) => (
              <label className="sim-op" key={k} title={SIMB[k][en ? 1 : 0]}>
                <input type="radio" name="simbolo" value={k} checked={f.simbolo === k} onChange={() => set("simbolo", k)} />
                <Simbolo k={k} tono={f.color} colores={f.colores} /><span className="sr">{SIMB[k][en ? 1 : 0]}</span>
              </label>
            ))}
          </div>
          <div className="sim-colores" role="radiogroup" aria-label={L("Color del símbolo", "Symbol colour")}>
            {TONOS.map((n, i) => (
              <label className="sim-color" key={i} title={n[en ? 1 : 0]}>
                <input type="radio" name="color" value={i} checked={!f.colores && f.color === i} onChange={() => setF((o) => ({ ...o, color: i, colores: null }))} />
                <span className={"muestra tono-" + i} /><span className="sr">{n[en ? 1 : 0]}</span>
              </label>
            ))}
          </div>
          <div className="sim-propios">
            {[["f", L("Fondo", "Background"), 2], ["p", L("Color 1", "Colour 1"), 3], ["a", L("Color 2", "Colour 2"), 4]].map(([q, txt, j]) => (
              <label className="sim-picker" key={q}>
                <input type="color" value={(f.colores || {})[q] || TONOS[f.color][j]}
                  onChange={(e) => setF((o) => {
                    const base = o.colores || { f: TONOS[o.color][2], p: TONOS[o.color][3], a: TONOS[o.color][4] };
                    return { ...o, colores: { ...base, [q]: e.target.value } };
                  })} />
                <span>{txt}</span>
              </label>
            ))}
          </div>
          <p className="hint">{L("Sale en su ficha y junto a sus avisos en el tablón.", "It appears on your profile and next to your posts on the board.")}</p>
        </fieldset>
        {f.zona === "otra" && (
          <div className="full" id="w-zonaotra"><label htmlFor="c-zonaotra">{L("¿Qué zona?", "Which area?")}</label>
            <input id="c-zonaotra" name="zonaotra" maxLength={60} value={f.zonaotra} onChange={(e) => set("zonaotra", e.target.value)} placeholder={L("Departamento o región", "Department or region")} /></div>
        )}
        <div className="full"><label htmlFor="c-region">{L("Lugar", "Place")}</label>
          <input id="c-region" name="region" maxLength={80} value={f.region} onChange={(e) => set("region", e.target.value)} placeholder={L("Provincia o distrito", "Province or district")} />
          <p className="hint">{L("Indica solo la región, nunca coordenadas exactas.", "Give only the region, never exact coordinates.")}</p></div>
        <div className="full"><label htmlFor="c-especies">{L("Cómo llaman allí al sapo", "What the toad is called there")}</label>
          <input id="c-especies" name="especies" maxLength={160} value={f.especies} onChange={(e) => set("especies", e.target.value)} placeholder={L("El nombre que usa la gente del lugar", "The name local people use")} />
          <p className="hint">{L("Déjalo vacío si no tiene nombre propio. Ayuda a que otros pregunten por él con sus palabras.", "Leave it blank if it has no local name. It helps others ask about it in their own words.")}</p></div>
        <div><label htmlFor="c-ofrece">{L("Qué puede ofrecer", "What it can offer")}</label>
          <textarea id="c-ofrece" name="ofrece" rows={3} maxLength={300} value={f.ofrece} onChange={(e) => set("ofrece", e.target.value)} />
          <p className="hint">{L("Lo que tu grupo puede aportar: conocer el terreno, tiempo, material, movilidad.", "What your group can contribute: knowledge of the land, time, materials, transport.")}</p></div>
        <div><label htmlFor="c-necesita">{L("Qué necesita", "What it needs")}</label>
          <textarea id="c-necesita" name="necesita" rows={3} maxLength={300} value={f.necesita} onChange={(e) => set("necesita", e.target.value)} />
          <p className="hint">{L("Lo que le falta a tu grupo para ayudar al sapo. Otros lo verán y podrán ofrecerlo.", "What your group is missing to help the toad. Others will see it and can offer it.")}</p></div>
        <div className="full"><label htmlFor="c-contacto">{L("Contacto", "Contact")}</label>
          <input id="c-contacto" name="contacto" maxLength={120} value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder={L("WhatsApp, correo o persona de referencia", "WhatsApp, email or contact person")} />
          <p className="hint">{L("Lo verá toda la comunidad. Pon un contacto de la comunidad, no datos personales de nadie sin su permiso.", "The whole community will see it. Use a community contact, never anyone's personal details without their permission.")}</p></div>
      </div>
      <details className="grupo-det" open={!!completo}>
        <summary>{L("Ficha completa de la comunidad (opcional)", "Full community page (optional)")}</summary>
        <div className="fields">
          <div className="full"><label htmlFor="c-pres">{L("Presentación", "Introduction")}</label>
            <textarea id="c-pres" rows={4} maxLength={1500} value={f.presentacion} onChange={(e) => set("presentacion", e.target.value)} placeholder={L("Quiénes son, cómo se organizan, qué los mueve", "Who you are, how you organise, what drives you")} /></div>
          <div><label htmlFor="c-eco">{L("Ecosistemas presentes", "Ecosystems")}</label>
            <textarea id="c-eco" rows={2} maxLength={300} value={f.ecosistemas} onChange={(e) => set("ecosistemas", e.target.value)} placeholder={L("Quebradas, bofedales, pajonal, bosque de queñua…", "Streams, wetlands, grassland, polylepis woodland…")} /></div>
          <div><label htmlFor="c-bio">{L("Biodiversidad de interés", "Notable wildlife")}</label>
            <textarea id="c-bio" rows={2} maxLength={500} value={f.biodiversidad} onChange={(e) => set("biodiversidad", e.target.value)} /></div>
          <div className="full"><label htmlFor="c-act">{L("Actividades comunitarias", "Community activities")}</label>
            <textarea id="c-act" rows={3} maxLength={1000} value={f.actividades} onChange={(e) => set("actividades", e.target.value)} placeholder={L("Faenas, rondas, monitoreo, talleres…", "Work days, patrols, monitoring, workshops…")} /></div>
          <div><label htmlFor="c-apo">{L("Apoyos recibidos", "Support received")}</label>
            <textarea id="c-apo" rows={3} maxLength={800} value={f.apoyos} onChange={(e) => set("apoyos", e.target.value)} placeholder={L("Material, formación o visitas que ha recibido la comunidad", "Materials, training or visits the community has received")} /></div>
          <div><label htmlFor="c-resu">{L("Resultados de conservación", "Conservation results")}</label>
            <textarea id="c-resu" rows={3} maxLength={1000} value={f.resultados} onChange={(e) => set("resultados", e.target.value)} placeholder={L("Solo resultados comprobados", "Only verified results")} /></div>
          <div className="full"><span className="label">{L("Fotografías", "Photos")}</span>
            <SubirFotos id="c-fotos" fotos={f.fotos} onChange={(v) => set("fotos", v)} max={6} />
            <p className="hint">{L("Fotos reales de la comunidad o del lugar, con permiso de las personas que aparecen.", "Real photos of the community or the place, with the permission of anyone shown.")}</p></div>
        </div>
      </details>
      <Msg id="m-com" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{t("Guardar comunidad")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}
