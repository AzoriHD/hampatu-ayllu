import { useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { JOIN, SIMB, SIMB_K } from "../data/constants.js";
import { colorDe, copiar, cuandoTexto, simboloDe, str, waEnlace, waNumero } from "../lib/utils.js";

export function Svg({ d, width = "1.8" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
}

/* Pasa com={comunidad}, o k y tono sueltos (selector). */
export function Simbolo({ k, com, tono, mini }) {
  const key = com ? simboloDe(com) : SIMB[k] ? k : SIMB_K[0];
  const t = com ? colorDe(com) : Number.isInteger(tono) ? tono : 0;
  return <span className={(mini ? "simbolo-mini" : "simbolo") + " tono-" + t} aria-hidden="true"><Svg d={SIMB[key][2]} /></span>;
}

export function Msg({ id, text, role = "alert" }) {
  const { t } = useApp();
  return <p className={"msg" + (text === "Guardando…" ? " soft" : "")} id={id} role={role} hidden={!text}>{text ? t(text) : ""}</p>;
}

export function Chip({ id, label, n, on, onClick }) {
  return <button type="button" className="chipbtn" id={id} aria-pressed={on ? "true" : "false"} onClick={onClick}>{label} <span className="n">{n}</span></button>;
}

/* A button that copies some text and says so for a moment. */
export function CopyBtn({ text, id, className = "linkbtn", label = "Copiar" }) {
  const { t } = useApp();
  const [l, setL] = useState(label);
  const tm = useRef(null);
  const marca = (x) => { setL(x); clearTimeout(tm.current); tm.current = setTimeout(() => setL(label), 1500); };
  return <button type="button" className={className} id={id} onClick={() => copiar(text).then(() => marca(label === "Copiar enlace" ? "Enlace copiado" : "Copiado"), () => marca("No se pudo copiar"))}>{t(l)}</button>;
}

export function DelBtns({ k }) {
  const { confirmar, setConfirmar, borrar, t } = useApp();
  if (confirmar === k) {
    return (
      <>
        <button type="button" className="linkbtn danger" id={"d-" + k} onClick={() => borrar(k)}>{t("Sí, borrar")}</button>
        <button type="button" className="linkbtn" onClick={() => setConfirmar("")}>{t("No")}</button>
      </>
    );
  }
  return <button type="button" className="linkbtn danger" id={"d-" + k} onClick={() => setConfirmar(k)}>{t("Borrar")}</button>;
}

export function EmptyBox({ text, onClear }) {
  const { t } = useApp();
  return (
    <div className="empty">
      <img className="sapo-vacio" src="/img/sapo-frente.webp" width="380" height="294" alt="" />
      <div>
        <p>{t(text)}</p>
        {onClear && <button type="button" className="linkbtn" onClick={onClear}>{t("Quitar filtros")}</button>}
      </div>
    </div>
  );
}

/* When, where and who to contact, with WhatsApp and copy buttons. */
export function Datos({ x, clave, titulo }) {
  const { t, lang, contactoDe } = useApp();
  const cont = contactoDe(x);
  if (!x.fecha && !x.lugar && !cont) return null;
  const wa = cont ? waEnlace(cont, t("Hola, vi en Hampatu Ayllu") + " «" + String(titulo || "") + "». ", x.ejemplo) : "";
  return (
    <dl className="datos">
      {x.fecha && <div><dt>{t("Cuándo")}</dt><dd>{cuandoTexto(x.fecha, x.hora, lang)}</dd></div>}
      {x.lugar && <div><dt>{t("Dónde")}</dt><dd>{x.lugar}</dd></div>}
      {cont && (
        <div>
          <dt>{t("Contacto")}</dt>
          <dd>
            {cont}
            <span className="acc">
              {wa && <a className="btn-mini" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              <CopyBtn text={cont} id={"cc-" + clave} className="btn-mini claro" />
            </span>
            {x.ejemplo && waNumero(cont) && <span className="meta" style={{ display: "block", fontWeight: 400 }}>{t("Contacto de ejemplo: no es un número real.")}</span>}
          </dd>
        </div>
      )}
    </dl>
  );
}

/* «Me apunto», «Me interesa», «Puedo ayudar», «Puedo hacerlo», «Lo quiero». */
export function JoinButton({ clave, tipo, pasado }) {
  const { t, uid, canPost, pedirCuenta, apuntesDe, quitarApunte, setApuntando } = useApp();
  const txt = JOIN[tipo];
  if (!txt || pasado) return null;
  const lista = apuntesDe(clave), mio = lista.some((a) => a.by === uid);
  const pulsar = () => {
    if (!canPost) pedirCuenta("Para apuntarte necesitas una cuenta. Es gratis y tarda un minuto.");
    else if (mio) quitarApunte(clave);
    else {
      setApuntando((s) => ({ ...s, [clave]: 1 }));
      setTimeout(() => { const i = document.getElementById("an-" + clave); if (i) { i.focus(); i.select(); } }, 0);
    }
  };
  return (
    <button type="button" className="apunte" id={"ap-" + clave} aria-pressed={mio} onClick={pulsar}>
      <Svg width="2.4" d={mio ? '<path d="M5 12.5 10 17 19 7"/>' : '<path d="M12 5v14M5 12h14"/>'} />
      {t(mio ? "Apuntado" : txt[0])} <b>{lista.length}</b>
    </button>
  );
}

export function JoinBlock({ clave, tipo, titulo, contacto, ejemplo }) {
  const { t, uid, firma, keepFirma, apuntesDe, apuntar, apuntando, setApuntando, recien, setRecien, setMsg } = useApp();
  const txt = JOIN[tipo];
  if (!txt) return null;
  const lista = apuntesDe(clave), yo = lista.find((a) => a.by === uid);
  const cerrar = () => setApuntando((s) => { const n = { ...s }; delete n[clave]; return n; });
  const enviar = (ev) => {
    ev.preventDefault();
    const inp = ev.currentTarget.querySelector("input"), nombre = str(inp.value, 60);
    if (!nombre) { setMsg("Escribe tu nombre o el de tu comunidad."); inp.focus(); return; }
    keepFirma(nombre);
    apuntar(clave, nombre).then(() => { cerrar(); setRecien((r) => ({ ...r, [clave]: 1 })); }, () => setMsg("No se pudo guardar. Revisa la conexión e inténtalo otra vez."));
  };
  const wa = yo && recien[clave] && contacto
    ? waEnlace(contacto, t("Hola, vi en Hampatu Ayllu") + " «" + String(titulo || "") + "». " + t(txt[0]) + (yo.firma ? ". " + t("Soy") + " " + yo.firma + "." : "."), ejemplo)
    : "";
  return (
    <>
      {apuntando[clave] && !yo && (
        <form className="apunte-form" noValidate onSubmit={enviar}>
          <div><label htmlFor={"an-" + clave}>{t("Tu nombre o comunidad")}</label><input id={"an-" + clave} maxLength={60} defaultValue={firma} /></div>
          <button className="btn" type="submit">{t("Confirmar")}</button>
          <button className="btn-ghost" type="button" onClick={cerrar}>{t("Cancelar")}</button>
        </form>
      )}
      {yo && recien[clave] && contacto && (
        <div className="listo">
          <span>{t("Listo. Avisa también a quien lo organiza para que cuente contigo.")}</span>
          {wa && <a className="btn-mini" href={wa} target="_blank" rel="noopener noreferrer">{t("Avisa por WhatsApp")}</a>}
        </div>
      )}
      {lista.length > 0 && (
        <p className="apuntados"><b>{t(txt[1])}:</b> {lista.map((a) => (a.firma || t("Sin firma")) + (a.by === uid ? " (" + t("tú") + ")" : "")).join(", ")}</p>
      )}
    </>
  );
}
