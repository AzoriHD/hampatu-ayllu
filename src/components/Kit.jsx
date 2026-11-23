/* Piezas comunes de Proyectos, Comunidades, Colabora, Apoya, Impacto y Coordinación. */
import { useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COLOR_P, ESTADOS_P } from "../data/proyectos.js";
import { errTexto, subirArchivo, subirFoto } from "../lib/tablas.js";
import { fotoSegura } from "../lib/utils.js";

export function useL() {
  const { en } = useApp();
  return (es, eng) => (en ? eng : es);
}
/* Etiqueta [es, en] de una tabla de textos */
export function useEt() {
  const { en } = useApp();
  return (tabla, k) => (tabla[k] ? tabla[k][en ? 1 : 0] : k || "");
}

/* Guardar con mensaje de «Guardando…» y errores en palabras. Evita el doble clic. */
export function useEnviar() {
  const { en } = useApp();
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const enviar = (fn, ok) => {
    if (bloqueo.current) return Promise.resolve();
    bloqueo.current = true; setOcupado(true); setMsg("");
    return Promise.resolve().then(fn)
      .then((r) => { setMsg(""); if (ok) ok(r); }, (e) => { console.error(e); setMsg(errTexto(e, en)); })
      .finally(() => { bloqueo.current = false; setOcupado(false); });
  };
  return { msg, setMsg, ocupado, enviar };
}

export function Aviso({ texto, tipo = "error" }) {
  if (!texto) return null;
  return <p className={"msg" + (tipo === "ok" ? " msg-ok" : tipo === "suave" ? " soft" : "")} role={tipo === "error" ? "alert" : "status"}>{texto}</p>;
}

export function Cargando() {
  const L = useL();
  return <p className="cargando" role="status"><span className="punto" aria-hidden="true"></span>{L("Cargando…", "Loading…")}</p>;
}

export function ErrorCarga({ error }) {
  const { en } = useApp();
  if (!error) return null;
  return <p className="notice">{errTexto(error, en)}</p>;
}

/* Estado vacío: medallón tejido y una explicación, sin cifras inventadas */
export function Vacio({ titulo, texto, children, med = "med-laguna" }) {
  return (
    <div className="vacio">
      <img src={"/img/" + med + ".webp"} width="88" height="114" alt="" loading="lazy" />
      <div>
        {titulo && <h3>{titulo}</h3>}
        {texto && <p>{texto}</p>}
        {children}
      </div>
    </div>
  );
}

export function EstadoP({ estado }) {
  const et = useEt();
  return <span className="pill" style={{ "--c": COLOR_P[estado] || "var(--muted)" }}>{et(ESTADOS_P, estado)}</span>;
}

export function Barra({ valor, total, etiqueta }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return <div className="barra" role="img" aria-label={etiqueta || pct + "%"}><span style={{ width: pct + "%" }} /></div>;
}

export function Pestanas({ opciones, valor, onCambio, etiqueta }) {
  return (
    <div className="pestanas" role="group" aria-label={etiqueta}>
      {opciones.map(([k, txt, n]) => (
        <button key={k} type="button" className="chipbtn" aria-pressed={valor === k ? "true" : "false"} onClick={() => onCambio(k)}>
          {txt}{n ? <span className="n">{n}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* Botón que pide confirmación antes de hacer algo que no se puede deshacer */
export function Confirmar({ texto, si, onSi, peligro = true, className = "linkbtn" }) {
  const L = useL();
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={className + (peligro ? " danger" : "")} onClick={() => setAsk(true)}>{texto}</button>;
  return (
    <span className="confirmar">
      <button type="button" className={"linkbtn" + (peligro ? " danger" : "")} onClick={() => { setAsk(false); onSi(); }}>{si || L("Sí", "Yes")}</button>
      <button type="button" className="linkbtn" onClick={() => setAsk(false)}>{L("No", "No")}</button>
    </span>
  );
}

/*
 * Lista editable (objetivos, actividades, calendario, necesidades).
 * campos: { texto: "Etiqueta", fecha?: "Etiqueta", check?: "Etiqueta", tipo?: {opciones} }
 */
export function FilasEditor({ id, items, onChange, campos, max = 20, placeholder }) {
  const L = useL(), et = useEt();
  const lista = Array.isArray(items) ? items : [];
  const vacio = () => ({ texto: "", ...(campos.fecha ? { fecha: "", hito: "" } : {}), ...(campos.check ? { [campos.check.k]: false } : {}), ...(campos.tipo ? { tipo: Object.keys(campos.tipo.opciones)[0] } : {}) });
  const poner = (i, k, v) => onChange(lista.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const clave = campos.fecha ? "hito" : "texto";
  return (
    <div className="filas-ed" id={id}>
      {lista.map((x, i) => (
        <div className="fila-ed" key={i}>
          {campos.fecha && <input aria-label={campos.fecha} className="f-fecha" maxLength={40} value={x.fecha || ""} placeholder={campos.fechaPh || ""} onChange={(e) => poner(i, "fecha", e.target.value)} />}
          <input aria-label={campos.texto} maxLength={240} value={x[clave] || ""} placeholder={placeholder || ""} onChange={(e) => poner(i, clave, e.target.value)} />
          {campos.tipo && (
            <select aria-label={campos.tipo.label} value={x.tipo || ""} onChange={(e) => poner(i, "tipo", e.target.value)}>
              {Object.keys(campos.tipo.opciones).map((k) => <option key={k} value={k}>{et(campos.tipo.opciones, k)}</option>)}
            </select>
          )}
          {campos.check && (
            <label className="check-mini"><input type="checkbox" checked={!!x[campos.check.k]} onChange={(e) => poner(i, campos.check.k, e.target.checked)} />{campos.check.label}</label>
          )}
          <button type="button" className="linkbtn danger" aria-label={L("Quitar", "Remove")} onClick={() => onChange(lista.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {lista.length < max && <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...lista, vacio()])}>+ {L("Añadir", "Add")}</button>}
    </div>
  );
}

/* Fotos: se reducen y pierden el GPS antes de subirse */
export function SubirFotos({ id, fotos, onChange, max = 6 }) {
  const L = useL();
  const { msg, ocupado, enviar } = useEnviar();
  const lista = Array.isArray(fotos) ? fotos : [];
  const elegir = (e) => {
    const fs = [...(e.target.files || [])].slice(0, max - lista.length);
    e.target.value = "";
    if (!fs.length) return;
    enviar(async () => { const urls = []; for (const f of fs) urls.push(await subirFoto(f)); onChange([...lista, ...urls]); });
  };
  return (
    <div className="subir">
      {lista.length > 0 && (
        <ul className="miniaturas">
          {lista.map((u, i) => (
            <li key={u + i}><img src={fotoSegura(u)} alt="" /><button type="button" className="quitar" aria-label={L("Quitar foto", "Remove photo")} onClick={() => onChange(lista.filter((_, j) => j !== i))}>×</button></li>
          ))}
        </ul>
      )}
      {lista.length < max && (
        <label className="btn-ghost btn-sm subir-btn">
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={elegir} disabled={ocupado} />
          {ocupado ? L("Subiendo…", "Uploading…") : L("Añadir fotos", "Add photos")}
        </label>
      )}
      <Aviso texto={msg} />
    </div>
  );
}

/* Documentos: PDF o imágenes al almacén público «documentos», o un enlace https */
export function SubirDocs({ id, docs, onChange, max = 10 }) {
  const L = useL();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const [enl, setEnl] = useState({ nombre: "", url: "" });
  const lista = Array.isArray(docs) ? docs : [];
  const elegir = (e) => {
    const fs = [...(e.target.files || [])].slice(0, max - lista.length);
    e.target.value = "";
    if (!fs.length) return;
    enviar(async () => { const n = []; for (const f of fs) { const r = await subirArchivo(f, "documentos"); n.push({ nombre: r.nombre, url: r.url, tipo: r.tipo }); } onChange([...lista, ...n]); });
  };
  const anadirEnlace = () => {
    const url = enl.url.trim();
    if (!/^https:\/\/[^\s<>"']+$/i.test(url)) { setMsg(L("El enlace tiene que empezar por https://", "The link must start with https://")); return; }
    onChange([...lista, { nombre: enl.nombre.trim().slice(0, 120) || url.replace(/^https:\/\//, "").slice(0, 60), url, tipo: "enlace" }]);
    setEnl({ nombre: "", url: "" }); setMsg("");
  };
  return (
    <div className="subir">
      {lista.length > 0 && (
        <ul className="docs-lista">
          {lista.map((d, i) => (
            <li key={d.url + i}><span className="doc-ico" aria-hidden="true">{d.tipo === "pdf" ? "PDF" : d.tipo === "imagen" ? "IMG" : "URL"}</span>
              <span className="doc-nombre">{d.nombre}</span>
              <button type="button" className="linkbtn danger" onClick={() => onChange(lista.filter((_, j) => j !== i))}>{L("Quitar", "Remove")}</button></li>
          ))}
        </ul>
      )}
      {lista.length < max && (
        <div className="row">
          <label className="btn-ghost btn-sm subir-btn">
            <input id={id} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={elegir} disabled={ocupado} />
            {ocupado ? L("Subiendo…", "Uploading…") : L("Subir PDF o imagen", "Upload PDF or image")}
          </label>
          <details className="enlace-doc">
            <summary>{L("o añadir un enlace", "or add a link")}</summary>
            <div className="row">
              <input aria-label={L("Nombre del documento", "Document name")} placeholder={L("Nombre", "Name")} value={enl.nombre} maxLength={120} onChange={(e) => setEnl({ ...enl, nombre: e.target.value })} />
              <input aria-label={L("Enlace", "Link")} placeholder="https://…" value={enl.url} maxLength={500} onChange={(e) => setEnl({ ...enl, url: e.target.value })} />
              <button type="button" className="btn-ghost btn-sm" onClick={anadirEnlace}>{L("Añadir", "Add")}</button>
            </div>
          </details>
        </div>
      )}
      <Aviso texto={msg} />
    </div>
  );
}

const urlSegura = (u) => (/^(https:\/\/|data:(image\/(jpeg|png|webp)|application\/pdf);)/.test(String(u || "")) ? String(u) : "");

/* Documentos y fotos publicados */
export function Archivos({ lista }) {
  const L = useL();
  const l = (Array.isArray(lista) ? lista : []).filter((d) => urlSegura(d.url));
  if (!l.length) return null;
  const imgs = l.filter((d) => d.tipo === "imagen"), docs = l.filter((d) => d.tipo !== "imagen");
  return (
    <div className="archivos">
      {imgs.length > 0 && <Galeria fotos={imgs.map((d) => d.url)} />}
      {docs.length > 0 && (
        <ul className="docs-lista">
          {docs.map((d, i) => (
            <li key={i}><span className="doc-ico" aria-hidden="true">{d.tipo === "pdf" ? "PDF" : "URL"}</span>
              <a href={urlSegura(d.url)} target="_blank" rel="noopener noreferrer" download={d.tipo === "pdf" && d.url.startsWith("data:") ? d.nombre : undefined}>{d.nombre || L("Documento", "Document")}</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Galeria({ fotos }) {
  const L = useL();
  const l = (Array.isArray(fotos) ? fotos : []).map(fotoSegura).filter(Boolean);
  const [abierta, setAbierta] = useState(-1);
  if (!l.length) return null;
  return (
    <>
      <ul className="galeria">
        {l.map((u, i) => (
          <li key={u + i}><button type="button" onClick={() => setAbierta(i)} aria-label={L("Ver foto ", "View photo ") + (i + 1)}><img src={u} alt="" loading="lazy" /></button></li>
        ))}
      </ul>
      {abierta >= 0 && (
        <div className="visor" role="dialog" aria-modal="true" aria-label={L("Foto", "Photo")} onClick={() => setAbierta(-1)} onKeyDown={(e) => e.key === "Escape" && setAbierta(-1)}>
          <img src={l[abierta]} alt="" />
          <button type="button" className="icono-btn visor-cerrar" autoFocus aria-label={L("Cerrar", "Close")} onClick={() => setAbierta(-1)}>×</button>
        </div>
      )}
    </>
  );
}

/* Texto con saltos de línea */
export function Parrafos({ texto }) {
  const t = String(texto || "").trim();
  if (!t) return null;
  return <>{t.split(/\n{2,}/).map((p, i) => <p key={i}>{p.split("\n").map((l, j) => (j ? [<br key={j} />, l] : l))}</p>)}</>;
}

export const fechaCorta = (iso, en) => {
  if (!iso) return "";
  const d = new Date(String(iso).length === 10 ? iso + "T12:00:00" : iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString(en ? "en-GB" : "es-PE", { day: "numeric", month: "short", year: "numeric" });
};
