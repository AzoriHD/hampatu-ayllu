/* Entidades colaboradoras: organizaciones que apoyan a Hampatu Ayllu (supabase.sql, bloque 20).
   Solo la coordinación las añade, edita y borra. Una entidad sin «publicada» (p. ej. aún en conversaciones)
   solo la ve la coordinación. */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { borrar, cambiar, crear, filas, useCarga } from "../lib/tablas.js";
import { uploadPhoto } from "../lib/store.js";
import { puede } from "../lib/permisos.js";
import { fotoSegura, iniciales, str } from "../lib/utils.js";
import { Aviso, Cargando, Confirmar, ErrorCarga, Parrafos, Pestanas, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export const TIPOS_E = {
  ong: ["ONG o fundación", "NGO or foundation"],
  asociacion: ["Asociación", "Association"],
  academica: ["Universidad o centro de investigación", "University or research centre"],
  publica: ["Institución pública", "Public institution"],
  area: ["Área protegida", "Protected area"],
  empresa: ["Empresa", "Company"],
  comunitaria: ["Organización comunitaria", "Community organisation"],
  otra: ["Otra", "Other"],
};
export const APOYOS_E = {
  financiacion: ["Financiación", "Funding"],
  asesoria: ["Asesoría científica", "Scientific advice"],
  campo: ["Trabajo de campo", "Fieldwork"],
  material: ["Material y equipo", "Materials and equipment"],
  permisos: ["Permisos y gestión", "Permits and management"],
  educacion: ["Educación", "Education"],
  difusion: ["Difusión", "Outreach"],
  donaciones: ["Recibe donaciones", "Receives donations"],
  otro: ["Otro apoyo", "Other support"],
};

/* Si aún no se ha creado la tabla en Supabase, la página sale vacía en vez de con un error */
const sinTabla = (e) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /entidades/.test(String(e.message || "")) && /exist|schema cache/i.test(String(e.message || "")));
const webSegura = (u) => (/^https:\/\/[^\s<>"']+$/i.test(String(u || "")) ? String(u) : "");
const dominio = (u) => String(u || "").replace(/^https:\/\/(www\.)?/i, "").replace(/\/.*$/, "");

/* Logos: se reducen a 600 px y se guardan en PNG para no perder la transparencia */
function logoPng(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? res(b) : rej({ code: "foto" })), "image/png");
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej({ code: "archivo" }); };
    im.src = u;
  });
}

export default function Partners() {
  const { meta, permisos } = useApp();
  const L = useL(), et = useEt();
  const coord = meta.cuenta && puede.coordinar(permisos);
  const [apoyo, setApoyo] = useState("");
  const [nueva, setNueva] = useState(false);
  const q = useCarga(() => filas("entidades", { orden: "orden", desc: false }).catch((e) => { if (sinTabla(e)) return null; throw e; }));
  const falta = q.datos === null && !q.cargando && !q.error;
  const todas = q.datos || [];
  const pub = todas.filter((e) => e.publicada);
  const borradores = coord ? todas.filter((e) => !e.publicada) : [];
  const apoyos = (e) => (Array.isArray(e.apoyos) ? e.apoyos : []);
  const n = (k) => pub.filter((e) => apoyos(e).includes(k)).length;
  const lista = pub.filter((e) => !apoyo || apoyos(e).includes(apoyo));

  return (
    <section id="v-entidades" aria-labelledby="h-entidades">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-entidades">{L("Entidades colaboradoras", "Partner organisations")}</h2>
            <p className="intro">{L("Organizaciones que apoyan a Hampatu Ayllu y a las comunidades que cuidan del sapo arlequín: con ciencia, material, permisos, difusión o fondos. Solo aparecen las que tienen un acuerdo de colaboración.", "Organisations that support Hampatu Ayllu and the communities looking after the harlequin toad: with science, materials, permits, outreach or funds. Only those with a collaboration agreement are listed.")}</p>
          </div>
        </header>
        <div className="bar">
          <a className="btn" href="#colabora" onClick={() => { try { sessionStorage.setItem("hampatu-propuesta", "organizacion"); } catch (x) { /* ignore */ } }}>{L("Mi organización quiere colaborar", "My organisation wants to help")}</a>
          {coord && !falta && <button type="button" className="btn-ghost" onClick={() => setNueva(!nueva)}>{L("Añadir una entidad", "Add an organisation")}</button>}
        </div>
      </div>
      {coord && falta && <p className="notice">{L("Falta crear la tabla «entidades» en Supabase (bloque 20 de supabase.sql). Hasta entonces no se pueden añadir entidades.", "The «entidades» table is missing in Supabase (block 20 of supabase.sql). Until then no organisations can be added.")}</p>}
      {nueva && <EntidadForm orden={todas.length} onClose={() => setNueva(false)} />}

      {pub.length > 1 && (
        <div className="caja">
          <Pestanas etiqueta={L("Tipo de apoyo", "Type of support")} valor={apoyo} onCambio={setApoyo}
            opciones={[["", L("Todas", "All"), pub.length], ...Object.keys(APOYOS_E).filter((k) => n(k)).map((k) => [k, et(APOYOS_E, k), n(k)])]} />
        </div>
      )}
      <ErrorCarga error={q.error} />
      {q.cargando && !q.datos ? <Cargando /> : lista.length ? (
        <div className="grid entidades">{lista.map((e) => <Entidad key={e.id} e={e} coord={coord} />)}</div>
      ) : (
        <Vacio med="med-quenua" titulo={L("Todavía no hay entidades colaboradoras", "No partner organisations yet")}
          texto={L("Estamos hablando con organizaciones de conservación y de investigación. En cuanto haya un acuerdo firmado, aparecerán aquí con su logo y lo que aportan.", "We are talking with conservation and research organisations. As soon as there is a signed agreement, they will appear here with their logo and what they contribute.")} />
      )}

      {borradores.length > 0 && (
        <div className="caja">
          <h3 className="sub">{L("Sin publicar", "Not published")}</h3>
          <p className="meta">{L("Solo las ve la coordinación. Publícalas cuando haya un acuerdo confirmado.", "Only the coordination team sees these. Publish them once there is a confirmed agreement.")}</p>
          <div className="grid entidades">{borradores.map((e) => <Entidad key={e.id} e={e} coord={coord} />)}</div>
        </div>
      )}
    </section>
  );
}

function Logo({ e }) {
  const src = fotoSegura(e.logo);
  return (
    <div className={"ent-logo" + (src ? "" : " sin")} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{iniciales(e.nombre)}</span>}
    </div>
  );
}

function Entidad({ e, coord }) {
  const L = useL(), et = useEt();
  const [editar, setEditar] = useState(false);
  const env = useEnviar();
  if (editar) return <EntidadForm e={e} onClose={() => setEditar(false)} />;
  const web = webSegura(e.web);
  const ap = Array.isArray(e.apoyos) ? e.apoyos : [];
  return (
    <article className={"com entidad" + (e.publicada ? "" : " borrador")} id={"e-" + e.id}>
      <div className="ent-cabeza">
        <Logo e={e} />
        <div>
          <h3>{e.nombre}</h3>
          <p className="meta">{[et(TIPOS_E, e.tipo), e.pais].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {!e.publicada && <p><span className="tag tag-ej">{L("Sin publicar · en conversaciones", "Not published · in talks")}</span></p>}
      {ap.length > 0 && <ul className="ent-apoyos" aria-label={L("Qué aporta", "What they contribute")}>{ap.map((k) => <li key={k} className="pill" style={{ "--c": "var(--offer)" }}>{et(APOYOS_E, k)}</li>)}</ul>}
      <Parrafos texto={e.descripcion} />
      {web && <p><a href={web} target="_blank" rel="noopener noreferrer">{dominio(web)} ↗</a></p>}
      {coord && (
        <div className="row">
          <button type="button" className="linkbtn" onClick={() => setEditar(true)}>{L("Editar", "Edit")}</button>
          <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("entidades", e.id, { publicada: !e.publicada }))}>{e.publicada ? L("Ocultar", "Hide") : L("Publicar", "Publish")}</button>
          <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("entidades", e.id))} />
        </div>
      )}
      <Aviso texto={env.msg} />
    </article>
  );
}

function EntidadForm({ e, orden = 0, onClose }) {
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const subida = useEnviar();
  const [f, setF] = useState(() => ({
    nombre: e?.nombre || "", pais: e?.pais || "", tipo: e?.tipo || "ong", web: e?.web || "", logo: e?.logo || "",
    descripcion: e?.descripcion || "", apoyos: Array.isArray(e?.apoyos) ? e.apoyos : [], publicada: !!e?.publicada,
    orden: e?.orden ?? orden,
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const marcar = (k) => set("apoyos", f.apoyos.includes(k) ? f.apoyos.filter((x) => x !== k) : [...f.apoyos, k]);
  const elegirLogo = (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type || "")) { subida.setMsg(L("El logo tiene que ser una imagen JPG, PNG o WebP.", "The logo must be a JPG, PNG or WebP image.")); return; }
    subida.enviar(async () => set("logo", await uploadPhoto(await logoPng(file))));
  };
  const guardar = (ev) => {
    ev.preventDefault();
    const d = {
      nombre: str(f.nombre, 140), pais: str(f.pais, 80) || null, tipo: f.tipo, web: str(f.web, 300) || null,
      logo: f.logo || null, descripcion: str(f.descripcion, 2000) || null, apoyos: f.apoyos, publicada: f.publicada,
      orden: Number.isFinite(+f.orden) ? Math.round(+f.orden) : 0,
    };
    if (d.nombre.length < 2) { setMsg(L("Escribe el nombre de la entidad.", "Write the organisation's name.")); return; }
    if (d.web && !webSegura(d.web)) { setMsg(L("La web tiene que empezar por https://", "The website must start with https://")); return; }
    enviar(() => (e ? cambiar("entidades", e.id, d) : crear("entidades", d)), onClose);
  };
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <h3 className="panel-h">{e ? L("Editar entidad", "Edit organisation") : L("Añadir una entidad colaboradora", "Add a partner organisation")}</h3>
      <div className="fields">
        <div className="full"><label htmlFor="e-nom">{L("Nombre", "Name")}</label><input id="e-nom" maxLength={140} value={f.nombre} onChange={(x) => set("nombre", x.target.value)} /></div>
        <div><label htmlFor="e-tipo">{L("Tipo de entidad", "Type of organisation")}</label>
          <select id="e-tipo" value={f.tipo} onChange={(x) => set("tipo", x.target.value)}>{Object.keys(TIPOS_E).map((k) => <option key={k} value={k}>{et(TIPOS_E, k)}</option>)}</select></div>
        <div><label htmlFor="e-pais">{L("País", "Country")}</label><input id="e-pais" maxLength={80} value={f.pais} placeholder={L("Ej.: Perú", "E.g. Peru")} onChange={(x) => set("pais", x.target.value)} /></div>
        <div className="full"><label htmlFor="e-web">{L("Página web", "Website")}</label><input id="e-web" maxLength={300} value={f.web} placeholder="https://…" onChange={(x) => set("web", x.target.value)} /></div>
        <fieldset className="full ent-marcas">
          <legend>{L("Qué aporta", "What they contribute")}</legend>
          {Object.keys(APOYOS_E).map((k) => <label key={k} className="check-mini"><input type="checkbox" checked={f.apoyos.includes(k)} onChange={() => marcar(k)} />{et(APOYOS_E, k)}</label>)}
        </fieldset>
        <div className="full"><label htmlFor="e-desc">{L("Descripción (qué hace y cómo colabora)", "Description (what they do and how they help)")}</label><textarea id="e-desc" rows={4} maxLength={2000} value={f.descripcion} onChange={(x) => set("descripcion", x.target.value)} /></div>
        <div className="full">
          <span className="label">{L("Logo", "Logo")}</span>
          <div className="row ent-logo-ed">
            <Logo e={{ nombre: f.nombre, logo: f.logo }} />
            <label className="btn-ghost btn-sm subir-btn">
              <input id="e-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirLogo} disabled={subida.ocupado} />
              {subida.ocupado ? L("Subiendo…", "Uploading…") : f.logo ? L("Cambiar logo", "Change logo") : L("Subir logo", "Upload logo")}
            </label>
            {f.logo && <button type="button" className="linkbtn danger" onClick={() => set("logo", "")}>{L("Quitar", "Remove")}</button>}
          </div>
          <Aviso texto={subida.msg} />
        </div>
        <div><label htmlFor="e-orden">{L("Orden en la lista", "Position in the list")}</label><input id="e-orden" type="number" min={0} max={999} value={f.orden} onChange={(x) => set("orden", x.target.value)} /></div>
        <label className="check full"><input type="checkbox" checked={f.publicada} onChange={(x) => set("publicada", x.target.checked)} />{L("Publicar en la web (hay un acuerdo de colaboración confirmado)", "Publish on the website (there is a confirmed collaboration agreement)")}</label>
      </div>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado || subida.ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Guardar", "Save")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}
