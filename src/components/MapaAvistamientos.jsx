/* Mapa de avistamientos (solo coordinación).
   Pone en el mapa los avistamientos que llegaron con coordenadas. Los datos son los mismos
   que ya lee la coordinación en «Avistamientos recibidos»: la base de datos solo se los da a ella.
   El mapa de fondo es OpenStreetMap (gratis, sin claves). Con «Difuminar» cada punto se
   convierte en una zona de ~1 km y no se ven las coordenadas, para poder enseñar la pantalla. */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../AppContext.jsx";
import { ES } from "../data/constants.js";
import { avistamientosCargados, cargarAvistamientos, ESTADOS, useAvistamientos } from "../lib/avistamientos.js";
import { cuandoTexto } from "../lib/utils.js";
import { Pestanas, useL } from "./Kit.jsx";

const COLOR = { nuevo: "#e8a42a", revisado: "#7a63a6", confirmado: "#3e7a3e", descartado: "#8c8070" };
const FONDOS = {
  mapa: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', 19],
  relieve: ["https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)', 17],
};
const CENTRO = [-9.3, -77.6]; /* Áncash, si aún no hay puntos */
const ZONA = 1000; /* metros del círculo difuminado */
const redondo = (v) => Math.round(v * 100) / 100; /* ~1 km: siempre el mismo, así no se puede adivinar el punto */
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function MapaAvistamientos() {
  const { en, t, lang, meta, abrirVisto } = useApp();
  const Lx = useL();
  const lista = useAvistamientos();
  const [filtro, setFiltro] = useState("");
  const [fondo, setFondo] = useState("relieve");
  const [difuminar, setDifuminar] = useState(false);
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const base = useRef(null);
  const encuadrado = useRef(false);

  useEffect(() => { if (!avistamientosCargados()) cargarAvistamientos(meta.uid, meta.admin).catch(() => {}); }, [meta.uid, meta.admin]);

  const conPunto = useMemo(() => lista.filter((a) => a.data && Number.isFinite(+a.data.lat) && Number.isFinite(+a.data.lng)), [lista]);
  const sinPunto = lista.length - conPunto.length;
  const vis = filtro ? conPunto.filter((a) => a.estado === filtro) : conPunto;
  const n = (e) => conPunto.filter((a) => a.estado === e).length;

  /* crear el mapa una vez */
  useEffect(() => {
    const m = L.map(caja.current, { center: CENTRO, zoom: 8, scrollWheelZoom: false, worldCopyJump: true });
    capa.current = L.layerGroup().addTo(m);
    L.control.scale({ imperial: false }).addTo(m);
    mapa.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(caja.current);
    return () => { ro.disconnect(); m.remove(); mapa.current = null; };
  }, []);

  /* mapa de fondo */
  useEffect(() => {
    const m = mapa.current; if (!m) return;
    if (base.current) base.current.remove();
    const [url, attribution, maxZoom] = FONDOS[fondo];
    base.current = L.tileLayer(url, { attribution, maxZoom }).addTo(m);
  }, [fondo]);

  /* los puntos */
  useEffect(() => {
    const m = mapa.current, g = capa.current; if (!m || !g) return;
    g.clearLayers();
    const pts = [];
    for (const a of vis) {
      const d = a.data, est = ESTADOS[a.estado] ? a.estado : "nuevo", c = COLOR[est];
      const lat = difuminar ? redondo(+d.lat) : +d.lat, lng = difuminar ? redondo(+d.lng) : +d.lng;
      pts.push([lat, lng]);
      const capaP = difuminar
        ? L.circle([lat, lng], { radius: ZONA, color: c, weight: 2, fillColor: c, fillOpacity: 0.25 })
        : L.circleMarker([lat, lng], { radius: 9, color: "#2b190b", weight: 2, fillColor: c, fillOpacity: 0.95 });
      const extra = [d.firma, ES[d.estado] ? t(ES[d.estado]) : "", d.cuantos > 1 ? d.cuantos + (en ? " toads" : " sapos") : ""].filter(Boolean).join(" · ");
      const html = '<div class="mapa-pop">'
        + "<b>" + esc(cuandoTexto(d.fecha, d.hora, lang)) + "</b>"
        + '<span class="mapa-est" style="--c:' + c + '">' + esc(ESTADOS[est][en ? 1 : 0]) + "</span>"
        + (d.lugar ? "<p>" + esc(d.lugar) + "</p>" : "")
        + (extra ? '<p class="meta">' + esc(extra) + "</p>" : "")
        + (difuminar ? '<p class="meta">' + esc(en ? "Approximate area (~1 km)" : "Zona aproximada (~1 km)") + "</p>"
          : '<p class="meta">' + esc(d.lat + ", " + d.lng) + (d.prec ? " (± " + esc(d.prec) + " m)" : "") + "</p>")
        + "</div>";
      capaP.bindPopup(html, { maxWidth: 260 }).addTo(g);
    }
    if (pts.length && !encuadrado.current) {
      encuadrado.current = true;
      if (pts.length === 1) m.setView(pts[0], 13); else m.fitBounds(pts, { padding: [30, 30], maxZoom: 13 });
    }
  }, [vis, difuminar, en, lang, t]);

  const encuadrar = () => {
    const m = mapa.current; if (!m || !vis.length) return;
    const pts = vis.map((a) => [+a.data.lat, +a.data.lng]);
    if (pts.length === 1) m.setView(pts[0], 13); else m.fitBounds(pts, { padding: [30, 30], maxZoom: 13 });
  };

  const chips = [["", Lx("Todos", "All"), conPunto.length], ...Object.keys(ESTADOS).map((e) => [e, ESTADOS[e][en ? 1 : 0], n(e), COLOR[e]])];
  return (
    <div className="caja mapa-avist">
      <div className="caja-tit">
        <h3 className="sub">{Lx("Mapa de avistamientos", "Sightings map")}</h3>
        <button type="button" className="btn-mini claro" onClick={abrirVisto}>{Lx("Ver la lista", "See the list")}</button>
      </div>
      <p className="hint">{Lx("Solo lo ve la coordinación. No hagas capturas ni lo compartas: los traficantes de fauna buscan estos sitios. Si tienes que enseñar la pantalla, activa «Difuminar».", "Only the coordination team sees this. Don't take screenshots or share it: wildlife traffickers look for these spots. If you have to show your screen, turn on “Blur”.")}</p>
      <Pestanas etiqueta={Lx("Filtrar por estado", "Filter by status")} valor={filtro} onCambio={setFiltro} opciones={chips} />
      <div className="mapa-ctrl">
        <div className="chips" role="group" aria-label={Lx("Mapa de fondo", "Base map")}>
          <button type="button" className="chipbtn" aria-pressed={fondo === "relieve"} onClick={() => setFondo("relieve")}>{Lx("Relieve", "Terrain")}</button>
          <button type="button" className="chipbtn" aria-pressed={fondo === "mapa"} onClick={() => setFondo("mapa")}>{Lx("Calles", "Streets")}</button>
        </div>
        <label className="mapa-dif"><input type="checkbox" checked={difuminar} onChange={(e) => setDifuminar(e.target.checked)} /> {Lx("Difuminar (zona de ~1 km)", "Blur (~1 km area)")}</label>
        <button type="button" className="linkbtn" onClick={encuadrar} disabled={!vis.length}>{Lx("Ver todos los puntos", "Fit all points")}</button>
      </div>
      <div className="mapa-w" ref={caja} role="region" aria-label={Lx("Mapa", "Map")} />
      <ul className="mapa-ley" aria-label={Lx("Leyenda", "Legend")}>
        {Object.keys(ESTADOS).map((e) => <li key={e}><span style={{ background: COLOR[e] }} aria-hidden="true" />{ESTADOS[e][en ? 1 : 0]}</li>)}
      </ul>
      {sinPunto > 0 && <p className="meta">{sinPunto === 1 ? Lx("1 avistamiento no tiene coordenadas y no sale en el mapa (solo el lugar escrito).", "1 sighting has no coordinates and is not on the map (only the place written).") : sinPunto + Lx(" avistamientos no tienen coordenadas y no salen en el mapa (solo el lugar escrito).", " sightings have no coordinates and are not on the map (only the place written).")}</p>}
      {!lista.length && <p className="meta">{Lx("Todavía no ha llegado ningún avistamiento.", "No sightings have arrived yet.")}</p>}
    </div>
  );
}
