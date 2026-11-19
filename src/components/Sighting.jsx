import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { ES } from "../data/constants.js";
import { borrarAvistamiento, cambiarEstado, cargarAvistamientos, ESTADOS, enviarAvistamiento, urlFoto, useAvistamientos } from "../lib/avistamientos.js";
import { cuandoTexto, pad2, shrink, str, waEnlace, ymd } from "../lib/utils.js";
import { Msg } from "./Shared.jsx";

const MOTIVO = "Para mandar un avistamiento necesitas una cuenta: así la coordinación puede contestarte y, si la foto se verifica, darte la recompensa.";
const ahoraHora = () => { const d = new Date(); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };

/* «-8.1234, -77.5678» o «-8,1234 -77,5678» → [lat, lng] */
function leerCoords(txt) {
  const m = String(txt || "").match(/(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1].replace(",", ".")), lng = parseFloat(m[2].replace(",", "."));
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
const mapa = (lat, lng) => "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=16/" + lat + "/" + lng;

/* «He visto un sapo»: el aviso privado con el sitio exacto, solo para la coordinación. */
export default function Sighting() {
  const { en, meta, pedirCuenta } = useApp();
  const lista = useAvistamientos();
  const [enviado, setEnviado] = useState(false);
  useEffect(() => { if (meta.cuenta) cargarAvistamientos(meta.uid, meta.admin).catch(() => {}); }, [meta.cuenta, meta.uid, meta.admin]);
  const mios = lista.filter((a) => a.by === meta.uid);

  return (
    <section id="v-visto" className="visto" aria-labelledby="h-visto">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div><h2 className="vista-h" id="h-visto">{en ? "I've seen a toad" : "He visto un sapo"}</h2>
          <p className="intro">{en ? "Send the photo and the exact spot here. Only the coordination team sees the spot, never the board: wildlife traffickers look for that information. If the photo is verified, it can earn a reward." : "Manda aquí la foto y el sitio exacto. El sitio solo lo ve la coordinación, nunca el tablón: los traficantes de fauna buscan esos datos. Si la foto se verifica, puede tener recompensa."}</p></div>
        </header>
        <p className="regla">{en ? <><strong>Do not touch it or move it.</strong> Take the photo from where you are and clean your boots before going to another stream.</> : <><strong>No lo toques ni lo muevas.</strong> Hazle la foto desde donde estás y limpia las botas antes de ir a otra quebrada.</>}</p>
      </div>

      {!meta.cuenta ? (
        <div className="caja visto-cuenta">
          <p>{en ? "To send a sighting you need an account, so the coordination team can reply and, if the photo is verified, give you the reward. It is free." : "Para mandar un avistamiento necesitas una cuenta: así la coordinación puede contestarte y, si la foto se verifica, darte la recompensa. Es gratis."}</p>
          <button className="btn" type="button" onClick={() => pedirCuenta(MOTIVO)}>{en ? "Sign in or create an account" : "Entrar o crear una cuenta"}</button>
        </div>
      ) : enviado ? (
        <div className="caja visto-ok" role="status">
          <h3 className="sub">{en ? "Thank you! Sighting sent" : "¡Gracias! Avistamiento enviado"}</h3>
          <p>{en ? "The coordination team will check it. You can follow its status below." : "La coordinación lo revisará. Abajo puedes ver cómo va."}</p>
          <button className="btn-ghost" type="button" onClick={() => setEnviado(false)}>{en ? "Send another one" : "Mandar otro"}</button>
        </div>
      ) : (
        <SightingForm onDone={() => { setEnviado(true); window.scrollTo({ top: document.getElementById("v-visto")?.offsetTop || 0, behavior: "smooth" }); }} />
      )}

      {meta.cuenta && meta.admin && <Recibidos lista={lista} />}
      {meta.cuenta && !meta.admin && mios.length > 0 && (
        <div className="caja">
          <h3 className="sub">{en ? "Your sightings" : "Tus avistamientos"}</h3>
          <ul className="avist-lista">{mios.map((a) => <Avist key={a.id} a={a} />)}</ul>
        </div>
      )}
    </section>
  );
}

function SightingForm({ onDone }) {
  const { en, t, firma, keepFirma, perfilDe, uid, write } = useApp();
  const [f, setF] = useState(() => ({ fecha: ymd(new Date()), hora: ahoraHora(), lugar: "", coords: "", estado: "", cuantos: "1", nota: "", contacto: "", firma }));
  const [geo, setGeo] = useState(null); /* {lat, lng, prec} */
  const [buscando, setBuscando] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [m, setM] = useState("");
  const fotosRef = useRef(fotos); fotosRef.current = fotos;
  useEffect(() => () => fotosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  const ubicar = () => {
    if (!navigator.geolocation) { setM("Este móvil no deja leer la ubicación. Escribe el lugar o las coordenadas."); return; }
    setBuscando(true); setM("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setBuscando(false); setGeo({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), prec: Math.round(p.coords.accuracy || 0) }); },
      () => { setBuscando(false); setM("No se pudo leer la ubicación. Revisa que el GPS esté activado y que la web tenga permiso, o escribe el lugar."); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const elegirFotos = async (ev) => {
    const files = Array.from(ev.target.files || []); ev.target.value = "";
    let bad = 0, extra = 0; const nuevas = [];
    for (const file of files) {
      if (fotos.length + nuevas.length >= 3) { extra++; continue; }
      try { const b = await shrink(file, 1600); nuevas.push({ blob: b, url: URL.createObjectURL(b) }); } catch (e) { bad++; }
    }
    setFotos((o) => o.concat(nuevas));
    setM(bad ? "No se pudo leer alguna foto. Prueba con una imagen JPG o PNG." : extra ? "Solo caben 3 fotos por avistamiento." : "");
  };
  const quitarFoto = (i) => setFotos((o) => { URL.revokeObjectURL(o[i].url); return o.filter((_, j) => j !== i); });

  const enviar = (ev) => {
    ev.preventDefault();
    const el = ev.currentTarget.elements;
    const d = { fecha: /^\d{4}-\d{2}-\d{2}$/.test(f.fecha) ? f.fecha : ymd(new Date()), lugar: str(f.lugar, 200), nota: str(f.nota, 1200), firma: str(f.firma, 60), ts: Date.now() };
    if (/^\d{2}:\d{2}$/.test(f.hora)) d.hora = f.hora;
    if (ES[f.estado]) d.estado = f.estado;
    const n = parseInt(f.cuantos, 10); if (n > 0 && n < 1000) d.cuantos = n;
    const cto = str(f.contacto, 120); if (cto) d.contacto = cto;
    if (geo) { d.lat = geo.lat; d.lng = geo.lng; if (geo.prec) d.prec = geo.prec; d.gps = true; }
    else { const c = leerCoords(f.coords); if (c) { d.lat = c[0]; d.lng = c[1]; } }
    if (!fotos.length) { setM("Añade al menos una foto del sapo."); el.fotos.focus(); return; }
    if (d.lat == null && !d.lugar) { setM("Usa tu ubicación o escribe dónde lo viste."); el.lugar.focus(); return; }
    if (!d.firma) d.firma = str((perfilDe(uid) || {}).nombre, 60);
    write(setM, () => enviarAvistamiento(d, fotos.map((p) => p.blob)), () => {
      if (d.firma) keepFirma(d.firma);
      fotos.forEach((p) => URL.revokeObjectURL(p.url)); setFotos([]);
      onDone();
    });
  };

  return (
    <form className="panel" id="f-visto" noValidate onSubmit={enviar}>
      <h3 className="panel-h">{en ? "Send a sighting" : "Mandar un avistamiento"}</h3>
      <div className="fields">
        <div className="full"><label htmlFor="v-fotos">{en ? "Photos of the toad (up to 3)" : "Fotos del sapo (hasta 3)"}</label>
          <input id="v-fotos" name="fotos" type="file" accept="image/*" multiple onChange={elegirFotos} />
          <p className="hint">{en ? "Only the coordination team sees them." : "Solo las ve la coordinación."}</p>
          <div className="prev">
            {fotos.map((p, i) => (
              <figure key={p.url}><img src={p.url} alt={t("Foto") + " " + (i + 1) + " " + t("lista para subir")} />
                <button type="button" className="linkbtn danger" onClick={() => quitarFoto(i)}>{t("Quitar")}</button></figure>
            ))}
          </div></div>

        <fieldset className="full cuando-campo"><legend>{en ? "Where" : "Dónde"}</legend>
          <div className="geo">
            <button className="btn-ghost" type="button" onClick={ubicar} disabled={buscando}>{buscando ? (en ? "Finding you…" : "Buscando…") : geo ? (en ? "Update my location" : "Volver a leer la ubicación") : (en ? "Use my location" : "Usar mi ubicación")}</button>
            {geo && <p className="geo-ok">{en ? "Location saved" : "Ubicación guardada"}{geo.prec ? " (± " + geo.prec + " m)" : ""} · <a href={mapa(geo.lat, geo.lng)} target="_blank" rel="noopener noreferrer">{en ? "see on map" : "ver en el mapa"}</a> · <button type="button" className="linkbtn danger" onClick={() => setGeo(null)}>{t("Quitar")}</button></p>}
          </div>
          <p className="hint">{en ? "Best done right where you saw it. It works without signal if the phone's GPS is on." : "Mejor desde el mismo sitio donde lo viste. Funciona sin cobertura si el GPS del móvil está activado."}</p>
          <div className="fields">
            <div className="full"><label htmlFor="v-lugar">{en ? "Place" : "Lugar"}</label>
              <input id="v-lugar" name="lugar" maxLength={200} value={f.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder={en ? "Stream, community, landmark" : "Quebrada, comunidad, referencia"} /></div>
            {!geo && <div className="full"><label htmlFor="v-coords">{en ? "Coordinates, if you have them" : "Coordenadas, si las tienes"}</label>
              <input id="v-coords" name="coords" maxLength={60} inputMode="decimal" value={f.coords} onChange={(e) => set("coords", e.target.value)} placeholder="-8.1234, -77.5678" /></div>}
          </div>
        </fieldset>

        <div><label htmlFor="v-fecha">{en ? "Day" : "Día"}</label><input id="v-fecha" name="fecha" type="date" value={f.fecha} max={ymd(new Date())} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div><label htmlFor="v-hora">{en ? "Time" : "Hora"}</label><input id="v-hora" name="hora" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
        <div><label htmlFor="v-estado">{en ? "How was it?" : "¿Cómo estaba?"}</label>
          <select id="v-estado" name="estado" value={f.estado} onChange={(e) => set("estado", e.target.value)}>
            <option value="">{t("No lo sé")}</option>
            {Object.keys(ES).map((x) => <option key={x} value={x}>{t(ES[x])}</option>)}
          </select></div>
        <div><label htmlFor="v-cuantos">{en ? "How many?" : "¿Cuántos?"}</label>
          <input id="v-cuantos" name="cuantos" type="number" min="1" max="999" inputMode="numeric" value={f.cuantos} onChange={(e) => set("cuantos", e.target.value)} /></div>
        <div className="full"><label htmlFor="v-nota">{en ? "Anything else" : "Algo más"}</label>
          <textarea id="v-nota" name="nota" rows={3} maxLength={1200} value={f.nota} onChange={(e) => set("nota", e.target.value)} placeholder={en ? "What it was doing, the weather, whether there was water…" : "Qué hacía, qué tiempo hacía, si había agua…"} /></div>
        <div><label htmlFor="v-contacto">{en ? "Your WhatsApp or phone" : "Tu WhatsApp o teléfono"}</label>
          <input id="v-contacto" name="contacto" maxLength={120} value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="9xx xxx xxx" />
          <p className="hint">{en ? "Optional. Only the coordination team sees it." : "Si quieres. Solo lo ve la coordinación."}</p></div>
        <div><label htmlFor="v-firma">{en ? "Your name" : "Tu nombre"}</label>
          <input id="v-firma" name="firma" maxLength={60} value={f.firma} onChange={(e) => set("firma", e.target.value)} /></div>
      </div>
      <Msg id="m-visto" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{en ? "Send to the coordination team" : "Mandar a la coordinación"}</button>
      </div>
    </form>
  );
}

/* Coordinación: todo lo que ha llegado, lo nuevo primero. */
function Recibidos({ lista }) {
  const { en } = useApp();
  const [filtro, setFiltro] = useState("nuevo");
  const n = (e) => lista.filter((a) => a.estado === e).length;
  const vis = filtro ? lista.filter((a) => a.estado === filtro) : lista;
  return (
    <div className="caja">
      <h3 className="sub">{en ? "Sightings received" : "Avistamientos recibidos"}</h3>
      <div className="chips avist-filtro" role="group" aria-label={en ? "Filter by status" : "Filtrar por estado"}>
        <button type="button" className="chipbtn" aria-pressed={!filtro} onClick={() => setFiltro("")}>{en ? "All" : "Todos"} <span className="n">{lista.length}</span></button>
        {Object.keys(ESTADOS).map((e) => (
          <button key={e} type="button" className="chipbtn" aria-pressed={filtro === e} onClick={() => setFiltro(e)}>{ESTADOS[e][en ? 1 : 0]} <span className="n">{n(e)}</span></button>
        ))}
      </div>
      {vis.length ? <ul className="avist-lista">{vis.map((a) => <Avist key={a.id} a={a} admin />)}</ul>
        : <p className="meta">{en ? "Nothing here." : "Nada por aquí."}</p>}
    </div>
  );
}

function FotoPrivada({ path, i }) {
  const { t } = useApp();
  const [url, setUrl] = useState("");
  useEffect(() => { let vivo = true; urlFoto(path).then((u) => { if (vivo) setUrl(u); }).catch(() => {}); return () => { vivo = false; }; }, [path]);
  if (!url) return <span className="avist-foto cargando" />;
  return <a className="avist-foto" href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={t("Foto") + " " + (i + 1)} loading="lazy" /></a>;
}

function Avist({ a, admin }) {
  const { en, t, lang, write } = useApp();
  const [m, setM] = useState("");
  const [seguro, setSeguro] = useState(false);
  const d = a.data || {};
  const est = ESTADOS[a.estado] ? a.estado : "nuevo";
  const wa = admin && d.contacto ? waEnlace(d.contacto, en ? "Hello, about the toad sighting you sent to Hampatu Ayllu" : "Hola, te escribo por el avistamiento del sapo que mandaste a Hampatu Ayllu") : "";
  return (
    <li className={"avist e-" + est}>
      <div className="avist-cab">
        <strong>{cuandoTexto(d.fecha, d.hora, lang)}</strong>
        <span className="avist-estado">{ESTADOS[est][en ? 1 : 0]}</span>
      </div>
      <p className="meta">
        {[d.firma, ES[d.estado] ? t(ES[d.estado]) : "", d.cuantos > 1 ? d.cuantos + (en ? " toads" : " sapos") : ""].filter(Boolean).join(" · ")}
      </p>
      {d.lugar && <p>{d.lugar}</p>}
      {d.lat != null && (
        <p className="avist-geo">
          {d.lat}, {d.lng}{d.prec ? " (± " + d.prec + " m)" : ""}{d.gps ? (en ? " · phone GPS" : " · GPS del móvil") : ""} · <a href={mapa(d.lat, d.lng)} target="_blank" rel="noopener noreferrer">{en ? "map" : "mapa"}</a>
        </p>
      )}
      {d.nota && <p className="avist-nota">{d.nota}</p>}
      {(d.fotos || []).length > 0 && <div className="avist-fotos">{d.fotos.map((p, i) => <FotoPrivada key={p} path={p} i={i} />)}</div>}
      {admin && (
        <>
          {d.contacto && <p className="meta">{en ? "Contact: " : "Contacto: "}{wa ? <a href={wa} target="_blank" rel="noopener noreferrer">{d.contacto}</a> : d.contacto}</p>}
          <div className="row avist-acciones">
            <label className="vh" htmlFor={"ve-" + a.id}>{en ? "Status" : "Estado"}</label>
            <select id={"ve-" + a.id} value={est} onChange={(e) => write(setM, () => cambiarEstado(a.id, e.target.value))}>
              {Object.keys(ESTADOS).map((e) => <option key={e} value={e}>{ESTADOS[e][en ? 1 : 0]}</option>)}
            </select>
            {seguro
              ? <><button type="button" className="linkbtn danger" onClick={() => write(setM, () => borrarAvistamiento(a.id))}>{t("Sí, borrar")}</button>
                  <button type="button" className="linkbtn" onClick={() => setSeguro(false)}>{t("No")}</button></>
              : <button type="button" className="linkbtn danger" onClick={() => setSeguro(true)}>{t("Borrar")}</button>}
          </div>
          <Msg text={m} />
        </>
      )}
    </li>
  );
}
