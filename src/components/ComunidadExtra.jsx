/* Piezas de comunidad para que se organice como un equipo: rangos con color, calendario de actividades con asistencia
   y normas de la comunidad (supabase.sql, bloque 18). */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { COORD, COORD_MSG } from "../data/constants.js";
import { borrar, cambiar, crear } from "../lib/tablas.js";
import { colorRango, RANGO_COLORES, TIPOS_EVENTO } from "../lib/clanes.js";
import { store } from "../lib/store.js";
import { cuandoTexto, deYmd, localeOf, str, ymd } from "../lib/utils.js";
import { Msg } from "./Shared.jsx";
import { Aviso, Confirmar, Parrafos, useEnviar, useEt, useL } from "./Kit.jsx";

/* ---------- rangos ---------- */

export function RangoPill({ rango }) {
  if (!rango) return null;
  return <span className="pill pill-rango" style={{ "--c": colorRango(rango) }}>{rango.nombre}</span>;
}

/* Para representantes: crear, ordenar, cambiar de color y borrar los rangos */
export function GestionRangos({ c, rangos, miembros }) {
  const { en } = useApp();
  const L = useL();
  const env = useEnviar();
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("bosque");
  const lista = [...rangos].sort((a, b) => a.orden - b.orden || String(a.nombre).localeCompare(String(b.nombre)));
  const cuantos = (r) => miembros.filter((m) => m.estado === "aceptada" && m.rango === r.id).length;
  const anadir = (ev) => {
    ev.preventDefault();
    const n = str(nombre, 40);
    if (!n) { env.setMsg(L("Escribe el nombre del rango.", "Write the rank's name.")); return; }
    if (lista.some((r) => r.nombre.toLowerCase() === n.toLowerCase())) { env.setMsg(L("Ya hay un rango con ese nombre.", "There is already a rank with that name.")); return; }
    const orden = lista.reduce((m, r) => Math.max(m, r.orden || 0), 0) + 1;
    env.enviar(() => crear("comunidad_rangos", { comunidad: c.id, nombre: n, color, orden }), () => setNombre(""));
  };
  /* Subir o bajar: intercambia el orden con el vecino */
  const mover = (i, d) => {
    const a = lista[i], b = lista[i + d];
    if (!a || !b) return;
    const oa = a.orden === b.orden ? i + 1 : a.orden, ob = a.orden === b.orden ? i + 1 + d : b.orden;
    env.enviar(async () => { await cambiar("comunidad_rangos", a.id, { orden: ob }); await cambiar("comunidad_rangos", b.id, { orden: oa }); });
  };
  return (
    <div className="caja">
      <h3 className="sub">{L("Rangos de la comunidad", "Community ranks")}</h3>
      <p className="hint">{L("Crea los papeles que hay en tu comunidad (por ejemplo «Guardaparque», «Tesorería» o «Vocal») y asígnalos a cada miembro más abajo. La lista de miembros sale ordenada por rangos.", "Create the roles your community has (for example “Ranger”, “Treasurer” or “Board member”) and assign them to each member below. The member list is ordered by rank.")}</p>
      {lista.length > 0 && (
        <ul className="lista-gestion lista-rangos">
          {lista.map((r, i) => (
            <li key={r.id}>
              <span><RangoPill rango={r} /> <span className="meta">· {cuantos(r) === 1 ? L("1 persona", "1 person") : L(cuantos(r) + " personas", cuantos(r) + " people")}</span></span>
              <span className="row">
                <label className="sr" htmlFor={"rg-color-" + r.id}>{L("Color", "Colour")}</label>
                <select id={"rg-color-" + r.id} className="sel-mini" value={r.color} disabled={!!c.ejemplo} onChange={(e) => { const v = e.target.value; env.enviar(() => cambiar("comunidad_rangos", r.id, { color: v })); }}>
                  {Object.keys(RANGO_COLORES).map((k) => <option key={k} value={k}>{RANGO_COLORES[k][en ? 1 : 0]}</option>)}
                </select>
                <button type="button" className="linkbtn" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={L("Subir", "Move up")}>↑</button>
                <button type="button" className="linkbtn" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label={L("Bajar", "Move down")}>↓</button>
                <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("comunidad_rangos", r.id))} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {c.ejemplo ? <p className="meta">{L("Es una comunidad de ejemplo: no se pueden crear rangos.", "This is an example community: ranks cannot be created.")}</p> : lista.length < 20 && (
        <form className="rango-nuevo" onSubmit={anadir} noValidate>
          <div><label htmlFor="rg-nombre">{L("Nuevo rango", "New rank")}</label>
            <input id="rg-nombre" maxLength={40} value={nombre} placeholder={L("Ej.: Guardaparque", "E.g. Ranger")} onChange={(e) => setNombre(e.target.value)} /></div>
          <div><label htmlFor="rg-color">{L("Color", "Colour")}</label>
            <select id="rg-color" value={color} onChange={(e) => setColor(e.target.value)}>
              {Object.keys(RANGO_COLORES).map((k) => <option key={k} value={k}>{RANGO_COLORES[k][en ? 1 : 0]}</option>)}
            </select></div>
          <button className="btn-mini" type="submit" disabled={env.ocupado}>{L("Crear rango", "Create rank")}</button>
        </form>
      )}
      <Aviso texto={env.msg} />
    </div>
  );
}

/* Selector de rango de un miembro (en «Gestión») */
export function ElegirRango({ m, rangos }) {
  const L = useL();
  const env = useEnviar();
  if (!rangos.length) return null;
  return (
    <span className="elegir-rango">
      <label className="sr" htmlFor={"rg-m-" + m.id}>{L("Rango", "Rank")}</label>
      <select id={"rg-m-" + m.id} className="sel-mini" value={m.rango || ""} disabled={env.ocupado}
        onChange={(e) => { const v = e.target.value || null; env.enviar(() => cambiar("comunidad_miembros", m.id, { rango: v })); }}>
        <option value="">{L("Sin rango", "No rank")}</option>
        {rangos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>
      <Aviso texto={env.msg} />
    </span>
  );
}

/* ---------- calendario ---------- */

const hoyYmd = () => ymd(new Date());

/* Fecha en una baldosa: día grande y mes */
function DiaBaldosa({ fecha }) {
  const { lang } = useApp();
  const d = deYmd(fecha);
  if (!d) return null;
  return (
    <span className="dia-baldosa" aria-hidden="true">
      <b>{d.getDate()}</b>
      <span>{d.toLocaleDateString(localeOf(lang), { month: "short" }).replace(".", "")}</span>
    </span>
  );
}

/* Archivo .ics para añadir la actividad al calendario del móvil */
function descargarIcs(ev, c) {
  const f = String(ev.fecha).replace(/-/g, "");
  const esc = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (x) => "\\" + x).replace(/\r?\n/g, "\\n");
  const hm = (h) => String(h).replace(":", "") + "00";
  let ini, fin;
  if (ev.hora) {
    ini = "DTSTART:" + f + "T" + hm(ev.hora);
    const hf = ev.hora_fin && ev.hora_fin > ev.hora ? ev.hora_fin : pad(Math.min(23, Number(ev.hora.slice(0, 2)) + 1)) + ev.hora.slice(2);
    fin = "DTEND:" + f + "T" + hm(hf);
  } else {
    const d = deYmd(ev.fecha); d.setDate(d.getDate() + 1);
    ini = "DTSTART;VALUE=DATE:" + f; fin = "DTEND;VALUE=DATE:" + ymd(d).replace(/-/g, "");
  }
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hampatu Ayllu//ES", "BEGIN:VEVENT",
    "UID:" + ev.id + "@hampatu-ayllu", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    ini, fin, "SUMMARY:" + esc(ev.titulo + " · " + c.nombre),
    ...(ev.lugar ? ["LOCATION:" + esc(ev.lugar)] : []), ...(ev.descripcion ? ["DESCRIPTION:" + esc(ev.descripcion)] : []),
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "actividad-" + ev.fecha + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const pad = (n) => (n < 10 ? "0" : "") + n;

export function CalendarioCom({ c, eventos, asistencias, representa, dentro }) {
  const L = useL();
  const [vista, setVista] = useState("proximas");
  const [form, setForm] = useState(null); /* null | "nuevo" | evento */
  const hoy = hoyYmd();
  const pasadas = vista === "pasadas";
  const lista = eventos.filter((e) => (pasadas ? e.fecha < hoy : e.fecha >= hoy))
    .sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")) * (pasadas ? -1 : 1));
  if (form) return <EventoForm c={c} ev={form === "nuevo" ? null : form} onClose={() => setForm(null)} />;
  return (
    <>
      <div className="row cal-com-barra">
        <div className="pestanas" role="group" aria-label={L("Qué actividades ver", "Which activities to show")}>
          <button type="button" className="chipbtn" aria-pressed={!pasadas ? "true" : "false"} onClick={() => setVista("proximas")}>{L("Próximas", "Upcoming")}</button>
          <button type="button" className="chipbtn" aria-pressed={pasadas ? "true" : "false"} onClick={() => setVista("pasadas")}>{L("Pasadas", "Past")}</button>
        </div>
        {representa && !c.ejemplo && <button type="button" className="btn-mini" onClick={() => setForm("nuevo")}>{L("Nueva actividad", "New activity")}</button>}
      </div>
      {lista.length ? (
        <ul className="eventos-com">
          {lista.map((e) => <EventoFila key={e.id} ev={e} c={c} asistencias={asistencias.filter((a) => a.evento === e.id)} representa={representa} dentro={dentro} pasado={pasadas} onEditar={() => setForm(e)} />)}
        </ul>
      ) : <p className="meta">{pasadas ? L("No hay actividades pasadas.", "No past activities.") : L("No hay actividades programadas.", "No activities scheduled.")}{!pasadas && representa && !c.ejemplo ? " " + L("Pulsa «Nueva actividad» para añadir la primera.", "Click “New activity” to add the first one.") : ""}</p>}
    </>
  );
}

function EventoFila({ ev, c, asistencias, representa, dentro, pasado, onEditar }) {
  const { lang, uid, meta } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const mia = meta.cuenta ? asistencias.find((a) => a.user_id === uid) : null;
  const n = asistencias.length;
  const hora = ev.hora ? ev.hora + (ev.hora_fin ? "–" + ev.hora_fin : "") : "";
  return (
    <li className={"evento-com ev-" + ev.tipo}>
      <DiaBaldosa fecha={ev.fecha} />
      <div className="evento-cuerpo">
        <div className="row"><span className="tag">{et(TIPOS_EVENTO, ev.tipo)}</span></div>
        <h4>{ev.titulo}</h4>
        <p className="meta">{cuandoTexto(ev.fecha, hora, lang)}{ev.lugar ? " · " + ev.lugar : ""}</p>
        {ev.descripcion && <div className="evento-desc"><Parrafos texto={ev.descripcion} /></div>}
        <div className="row evento-acciones">
          {dentro && !pasado && (mia
            ? <button type="button" className="btn-mini" aria-pressed="true" disabled={env.ocupado} onClick={() => env.enviar(() => borrar("comunidad_asistencias", mia.id))}>✓ {L("Asistiré", "I'll be there")}</button>
            : <button type="button" className="btn-mini claro" aria-pressed="false" disabled={env.ocupado || !!c.ejemplo} onClick={() => env.enviar(() => crear("comunidad_asistencias", { evento: ev.id }))}>{L("Asistiré", "I'll be there")}</button>)}
          {dentro && n > 0 && <span className="meta">{pasado ? (n === 1 ? L("1 persona dijo que iba", "1 person said they'd go") : L(n + " personas dijeron que iban", n + " people said they'd go")) : (n === 1 ? L("1 persona asistirá", "1 person going") : L(n + " personas asistirán", n + " people going"))}</span>}
          {!pasado && <button type="button" className="linkbtn" onClick={() => descargarIcs(ev, c)}>{L("Añadir a mi calendario", "Add to my calendar")}</button>}
          {representa && !c.ejemplo && <>
            <button type="button" className="linkbtn" onClick={onEditar}>{L("Editar", "Edit")}</button>
            <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("comunidad_eventos", ev.id))} />
          </>}
        </div>
        <Aviso texto={env.msg} />
      </div>
    </li>
  );
}

function EventoForm({ c, ev, onClose }) {
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const [f, setF] = useState(() => ({
    titulo: ev?.titulo || "", tipo: ev?.tipo || "reunion", fecha: ev?.fecha || hoyYmd(), hora: ev?.hora || "", hora_fin: ev?.hora_fin || "",
    lugar: ev?.lugar || "", descripcion: ev?.descripcion || "",
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = (e) => {
    e.preventDefault();
    const d = { titulo: str(f.titulo, 120), tipo: f.tipo, fecha: f.fecha, hora: f.hora || null, hora_fin: f.hora && f.hora_fin ? f.hora_fin : null,
      lugar: str(f.lugar, 160) || null, descripcion: str(f.descripcion, 2000) || null };
    if (d.titulo.length < 3) { setMsg(L("Escribe qué actividad es (al menos 3 letras).", "Write what the activity is (at least 3 characters).")); return; }
    if (!deYmd(d.fecha)) { setMsg(L("Elige el día.", "Choose the day.")); return; }
    if (d.hora_fin && d.hora_fin <= d.hora) { setMsg(L("La hora de fin tiene que ser después de la de inicio.", "The end time must be after the start time.")); return; }
    if (COORD.test([d.lugar, d.descripcion].join(" "))) { setMsg(COORD_MSG); return; }
    enviar(() => (ev ? cambiar("comunidad_eventos", ev.id, d) : crear("comunidad_eventos", { ...d, comunidad: c.id })), onClose);
  };
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <h3 className="panel-h">{ev ? L("Editar actividad", "Edit activity") : L("Nueva actividad de la comunidad", "New community activity")}</h3>
      <div className="fields">
        <div className="full"><label htmlFor="ev-tit">{L("Qué se hace", "What is it")}</label>
          <input id="ev-tit" maxLength={120} value={f.titulo} placeholder={L("Ej.: Asamblea de diciembre", "E.g. December assembly")} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div><label htmlFor="ev-tipo">{L("Tipo", "Type")}</label>
          <select id="ev-tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.keys(TIPOS_EVENTO).map((k) => <option key={k} value={k}>{et(TIPOS_EVENTO, k)}</option>)}</select></div>
        <div><label htmlFor="ev-fecha">{L("Día", "Day")}</label><input id="ev-fecha" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div><label htmlFor="ev-hora">{L("Hora de inicio (opcional)", "Start time (optional)")}</label><input id="ev-hora" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
        <div><label htmlFor="ev-fin">{L("Hora de fin (opcional)", "End time (optional)")}</label><input id="ev-fin" type="time" value={f.hora_fin} disabled={!f.hora} onChange={(e) => set("hora_fin", e.target.value)} /></div>
        <div className="full"><label htmlFor="ev-lugar">{L("Lugar", "Place")}</label>
          <input id="ev-lugar" maxLength={160} value={f.lugar} placeholder={L("Ej.: Local comunal, o la escuela", "E.g. Community hall, or the school")} onChange={(e) => set("lugar", e.target.value)} />
          <p className="hint">{L("No pongas coordenadas de dónde vive el sapo.", "Don't write coordinates of where the toad lives.")}</p></div>
        <div className="full"><label htmlFor="ev-desc">{L("Detalles (opcional)", "Details (optional)")}</label>
          <textarea id="ev-desc" rows={4} maxLength={2000} value={f.descripcion} placeholder={L("Qué hay que llevar, quién lo organiza, temas a tratar…", "What to bring, who organises it, topics…")} onChange={(e) => set("descripcion", e.target.value)} /></div>
      </div>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ev ? L("Guardar cambios", "Save changes") : L("Publicar actividad", "Publish activity")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

/* La próxima actividad, en la portada de la ficha */
export function ProximaActividad({ eventos, onVer }) {
  const { lang } = useApp();
  const L = useL(), et = useEt();
  const hoy = hoyYmd();
  const ev = eventos.filter((e) => e.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")))[0];
  if (!ev) return null;
  return (
    <div className="caja proxima-act">
      <h3 className="sub">{L("Próxima actividad", "Next activity")}</h3>
      <div className="proxima-fila">
        <DiaBaldosa fecha={ev.fecha} />
        <div>
          <b>{ev.titulo}</b>
          <p className="meta">{et(TIPOS_EVENTO, ev.tipo)} · {cuandoTexto(ev.fecha, ev.hora || "", lang)}{ev.lugar ? " · " + ev.lugar : ""}</p>
        </div>
      </div>
      <button type="button" className="linkbtn" onClick={onVer}>{L("Ver el calendario", "See the calendar")}</button>
    </div>
  );
}

/* ---------- normas ---------- */

export function Normas({ c }) {
  const L = useL();
  if (!c.normas) return null;
  return <div className="caja"><h3 className="sub">{L("Normas y acuerdos", "Rules and agreements")}</h3><Parrafos texto={c.normas} /></div>;
}

export function NormasEditor({ c }) {
  const { write } = useApp();
  const L = useL();
  const [txt, setTxt] = useState(c.normas || "");
  const [m, setM] = useState("");
  const [ok, setOk] = useState(false);
  const cambiado = txt.trim() !== String(c.normas || "").trim();
  const guardar = (e) => {
    e.preventDefault();
    const v = str(txt, 4000);
    if (COORD.test(v)) { setM(COORD_MSG); return; }
    write(setM, () => store.update("comunidades", c.id, { normas: v }), () => { setOk(true); setTimeout(() => setOk(false), 2000); });
  };
  return (
    <form className="caja" onSubmit={guardar} noValidate>
      <h3 className="sub">{L("Normas y acuerdos", "Rules and agreements")}</h3>
      <p className="hint">{L("Los acuerdos de la comunidad: cómo se toman las decisiones, cada cuánto hay asamblea, qué se espera de cada miembro… Salen en la portada de la ficha.", "The community's agreements: how decisions are made, how often there is an assembly, what is expected of each member… They appear on the page's overview.")}</p>
      <label className="sr" htmlFor="normas-txt">{L("Normas y acuerdos", "Rules and agreements")}</label>
      <textarea id="normas-txt" rows={6} maxLength={4000} value={txt} disabled={!!c.ejemplo} onChange={(e) => setTxt(e.target.value)}
        placeholder={L("Ej.: 1. La asamblea se reúne el primer domingo de cada mes.\n2. Las faenas son obligatorias para todos los miembros.", "E.g. 1. The assembly meets on the first Sunday of each month.\n2. Work days are compulsory for all members.")} />
      <div className="panel-actions">
        <button className="btn-mini" type="submit" disabled={!cambiado || !!c.ejemplo}>{L("Guardar normas", "Save rules")}</button>
        {ok && <span className="meta" role="status">{L("Guardado", "Saved")}</span>}
      </div>
      <Msg id="m-normas" text={m} role="status" />
    </form>
  );
}
