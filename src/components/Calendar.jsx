import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG, TF } from "../data/constants.js";
import { newId, store } from "../lib/store.js";
import { deYmd, localeOf, mayus, pad2, plural, str, ymd } from "../lib/utils.js";
import { CalendarHeader, CalendarLegend } from "./Headers.jsx";
import { Datos, DelBtns, JoinBlock, JoinButton, Msg } from "./Shared.jsx";

export default function Calendar() {
  const { t, en, lang, data, canPost, canEdit, calMes, setCalMes, calSel, setCalSel, contactoDe, goAviso } = useApp();
  const [form, setForm] = useState(null); // {k, fecha}
  const selRef = useRef(null);
  const loc = localeOf(lang), hoy = ymd(new Date()), puede = canEdit && canPost;

  /* Dates marked in the calendar plus board posts that have a day. */
  const todas = data.fechas.concat(data.avisos.filter((a) => a.fecha && (a.tipo === "evento" || a.tipo === "ofrecemos")).map((a) => ({
    id: "av-" + a.id, aviso: a.id, avisoTipo: a.tipo, titulo: a.titulo, fecha: a.fecha, hora: a.hora || "", lugar: a.lugar || "", texto: "",
    ejemplo: a.ejemplo, com: a.com, contacto: a.contacto,
  })));
  const cuenta = {};
  todas.forEach((f) => { cuenta[f.fecha] = (cuenta[f.fecha] || 0) + 1; });
  const delDia = todas.filter((f) => f.fecha === calSel).sort((a, b) => String(a.hora || "99").localeCompare(String(b.hora || "99")));
  const prox = todas.filter((f) => f.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || ""))).slice(0, 8);

  const elegirDia = (ds, desdeToque) => {
    const d = deYmd(ds); if (!d) return;
    setCalSel(ds); setCalMes(new Date(d.getFullYear(), d.getMonth(), 1));
    setTimeout(() => {
      const hd = selRef.current; if (!hd) return;
      const r = hd.getBoundingClientRect();
      if (!desdeToque || r.top < 0 || r.bottom > window.innerHeight - 60) hd.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };
  const cambiarMes = (delta) => {
    const m = new Date(calMes.getFullYear(), calMes.getMonth() + delta, 1), h = new Date();
    const pref = m.getFullYear() + "-" + pad2(m.getMonth() + 1) + "-";
    const conAlgo = todas.map((f) => f.fecha).filter((f) => f && f.startsWith(pref)).sort();
    setCalSel(h.getFullYear() === m.getFullYear() && h.getMonth() === m.getMonth() ? ymd(h) : (conAlgo[0] || pref + "01"));
    setCalMes(m);
  };

  const y = calMes.getFullYear(), mo = calMes.getMonth();
  const nombres = en ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const blancos = (new Date(y, mo, 1).getDay() + 6) % 7, nDias = new Date(y, mo + 1, 0).getDate();
  const sd = deYmd(calSel);

  return (
    <section id="v-calendario" className="calendario" aria-labelledby="tab-calendario">
      <CalendarHeader />
      <div className="cal-wrap">
        <div className="cal">
          <div className="cal-head">
            <button type="button" className="cal-nav" id="cal-prev" aria-label={t("Mes anterior")} onClick={() => cambiarMes(-1)}>‹</button>
            <h3 id="cal-mes" aria-live="polite">{mayus(calMes.toLocaleDateString(loc, { month: "long", year: "numeric" }))}</h3>
            <button type="button" className="cal-nav" id="cal-next" aria-label={t("Mes siguiente")} onClick={() => cambiarMes(1)}>›</button>
            <button type="button" className="cal-hoy" id="cal-hoy" onClick={() => elegirDia(hoy, true)}>{t("Hoy")}</button>
          </div>
          <div className="cal-dias" id="cal-dias">
            {nombres.map((n) => <div className="cal-dia-n" aria-hidden="true" key={n}>{n}</div>)}
            {Array.from({ length: blancos }, (_, i) => <div aria-hidden="true" key={"b" + i} />)}
            {Array.from({ length: nDias }, (_, i) => {
              const ds = y + "-" + pad2(mo + 1) + "-" + pad2(i + 1), c = cuenta[ds] || 0;
              const etiqueta = new Date(y, mo, i + 1).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }) + (c ? ", " + plural(t, c, "fecha", "fechas") : "");
              return (
                <button type="button" key={ds} className={"dia" + (ds === hoy ? " hoy" : "") + (c ? " tiene" : "")} id={"dia-" + ds}
                  aria-pressed={ds === calSel} aria-label={etiqueta} onClick={() => elegirDia(ds, true)}>
                  {i + 1}{c > 0 && <span className="puntos">{Array.from({ length: Math.min(c, 3) }, (_, j) => <i key={j} />)}</span>}
                </button>
              );
            })}
          </div>
          <CalendarLegend hoy={new Date().getDate()} />
        </div>
        <div className="cal-lado">
          <h3 className="cal-sel-h" id="cal-sel-h" ref={selRef}>
            {(calSel === hoy ? t("Hoy") + " · " : "") + mayus(sd ? sd.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" }) : "")}
          </h3>
          <div id="cal-sel">
            {delDia.length ? delDia.map((f) => {
              const clave = f.aviso || "f:" + f.id, tipo = f.aviso ? f.avisoTipo : "evento", pas = f.fecha < hoy;
              return (
                <article className="fecha-item" key={f.id}>
                  <div className="row">
                    <span className="pill">{t(f.aviso ? "Evento del tablón" : (TF[f.tipo] || TF.otro))}</span>
                    {f.hora && <span className="tag">{f.hora}</span>}
                    {f.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}
                  </div>
                  <h4>{f.titulo}</h4>
                  {f.texto && <p className="txt">{f.texto}</p>}
                  <Datos x={f} clave={"f-" + f.id} titulo={f.titulo} />
                  <div className="row">
                    <JoinButton clave={clave} tipo={tipo} pasado={pas} />
                    {f.aviso && <button type="button" className="linkbtn" onClick={() => goAviso(f.aviso)}>{t("Ver aviso")}</button>}
                  </div>
                  <JoinBlock clave={clave} tipo={tipo} titulo={f.titulo} contacto={contactoDe(f)} ejemplo={f.ejemplo} />
                  {puede && !f.aviso && (
                    <div className="row">
                      <button type="button" className="linkbtn" id={"ef-" + f.id} onClick={() => setForm({ k: Date.now(), editar: f })}>{t("Editar")}</button>
                      <DelBtns k={"fecha:" + f.id} />
                    </div>
                  )}
                </article>
              );
            }) : <p className="meta">{t("No hay nada marcado este día.")}</p>}
          </div>
          {!puede && <p className="meta" id="cal-solo">{t("Solo quien coordina la red puede marcar fechas.")}</p>}
          {puede && <button className="btn" type="button" id="b-fecha" onClick={() => setForm(form ? null : { k: Date.now(), editar: null })}>{t("Marcar fecha")}</button>}
          {form && puede && <FechaForm key={form.k} editar={form.editar} onClose={() => setForm(null)} />}
        </div>
      </div>
      <h3 className="sub cal-prox-h">{t("Próximas fechas")}</h3>
      <ul className="proximas" id="cal-proximas">
        {prox.length ? prox.map((f) => {
          const d = deYmd(f.fecha) || new Date();
          return (
            <li key={f.id}>
              <button type="button" id={"px-" + f.id} onClick={() => elegirDia(f.fecha, false)}>
                <span className="cuando"><b>{d.getDate()}</b><span>{d.toLocaleDateString(loc, { month: "short" }).replace(".", "")}</span></span>
                <span className="que"><strong>{f.titulo}</strong>
                  <span className="meta">{t(f.aviso ? "Evento del tablón" : (TF[f.tipo] || TF.otro)) + (f.hora ? " · " + f.hora : "") + (f.lugar ? " · " + f.lugar : "")}</span></span>
              </button>
            </li>
          );
        }) : <li className="meta" style={{ padding: "10px 14px" }}>{t("Todavía no hay fechas próximas.")}</li>}
      </ul>
    </section>
  );
}

function FechaForm({ editar, onClose }) {
  const { t, en, uid, calSel, setCalSel, setCalMes, write } = useApp();
  const [f, setF] = useState(() => ({
    titulo: editar?.titulo || "", fecha: editar?.fecha || calSel, hora: editar?.hora || "", tipo: TF[editar?.tipo] ? editar.tipo : "faena",
    lugar: editar?.lugar || "", contacto: editar?.contacto || "", texto: editar?.texto || "",
  }));
  const [m, setM] = useState("");
  const ref = useRef(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  useEffect(() => { ref.current?.querySelector("input")?.focus(); }, []);
  /* Tapping another day while the form is open moves the new date there. */
  useEffect(() => { if (!editar) setF((o) => (o.fecha === calSel ? o : { ...o, fecha: calSel })); }, [calSel, editar]);
  const cambiarDia = (v) => {
    set("fecha", v);
    const d = deYmd(v); if (d) { setCalSel(v); setCalMes(new Date(d.getFullYear(), d.getMonth(), 1)); }
  };
  const enviar = (ev) => {
    ev.preventDefault();
    const el = ev.currentTarget.elements;
    const d = {
      titulo: str(f.titulo, 90), fecha: str(f.fecha, 10), hora: /^\d{2}:\d{2}$/.test(f.hora) ? f.hora : "",
      tipo: TF[f.tipo] ? f.tipo : "otro", lugar: str(f.lugar, 80), texto: str(f.texto, 600), contacto: str(f.contacto, 120), ts: Date.now(), by: uid,
    };
    if (editar?.ejemplo) d.ejemplo = true;
    if (!d.titulo) { setM("Escribe qué se hace ese día."); el.titulo.focus(); return; }
    if (!deYmd(d.fecha)) { setM("Elige el día."); el.fecha.focus(); return; }
    if (COORD.test(d.lugar + " " + d.texto)) { setM(COORD_MSG); return; }
    write(setM, () => store.set("fechas", editar ? editar.id : newId(), d), () => {
      const dd = deYmd(d.fecha); setCalSel(d.fecha); setCalMes(new Date(dd.getFullYear(), dd.getMonth(), 1)); onClose();
    });
  };
  const L = (es, eng) => (en ? eng : es);
  return (
    <form className="panel" id="f-fecha" noValidate onSubmit={enviar} ref={ref}>
      <h4 className="panel-h" id="h-fecha">{t(editar ? "Editar fecha" : "Nueva fecha")}</h4>
      <div className="fields">
        <div className="full"><label htmlFor="fe-titulo">{L("Qué se hace", "What is happening")}</label>
          <input id="fe-titulo" name="titulo" maxLength={90} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder={L("Faena en la quebrada", "Work day by the stream")} /></div>
        <div><label htmlFor="fe-fecha">{L("Día", "Day")}</label><input id="fe-fecha" name="fecha" type="date" value={f.fecha} onChange={(e) => cambiarDia(e.target.value)} /></div>
        <div><label htmlFor="fe-hora">{L("Hora (opcional)", "Time (optional)")}</label><input id="fe-hora" name="hora" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
        <div><label htmlFor="fe-tipo">{L("Tipo", "Type")}</label>
          <select id="fe-tipo" name="tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            {Object.keys(TF).map((k) => <option key={k} value={k}>{t(TF[k])}</option>)}
          </select></div>
        <div><label htmlFor="fe-lugar">{L("Lugar", "Place")}</label>
          <input id="fe-lugar" name="lugar" maxLength={80} value={f.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder={L("Local comunal, plaza…", "Community hall, square…")} /></div>
        <div className="full"><label htmlFor="fe-contacto">{L("Contacto para apuntarse", "Contact for people to join")}</label>
          <input id="fe-contacto" name="contacto" maxLength={120} value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder={L("WhatsApp 9xx xxx xxx, correo o persona", "WhatsApp number, email or person")} /></div>
        <div className="full"><label htmlFor="fe-texto">{L("Detalle", "Details")}</label>
          <textarea id="fe-texto" name="texto" rows={3} maxLength={600} value={f.texto} onChange={(e) => set("texto", e.target.value)} />
          <p className="hint">{L("Indica un punto de encuentro, nunca el sitio exacto del sapo.", "Give a meeting point, never the exact site of the toad.")}</p></div>
      </div>
      <Msg id="m-fecha" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{t("Guardar fecha")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}
