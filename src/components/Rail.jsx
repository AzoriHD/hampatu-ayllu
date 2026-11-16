import { useApp } from "../AppContext.jsx";
import { P } from "../data/constants.js";

/* Filtro por zona: va dentro de la cabecera del Tablón y de Comunidades. */
export default function ZonaRail() {
  const { t, en, data, view, zona, setZona } = useApp();
  const items = view === "tablon" ? data.avisos : data.comunidades;
  const cuenta = {};
  items.forEach((x) => { if (P[x.zona]) cuenta[x.zona] = (cuenta[x.zona] || 0) + 1; });
  return (
    <nav className="rail" id="railnav" aria-label={en ? "Filter by area" : "Filtrar por zona"}>
      <p className="eyebrow">{en ? "Filter by area (applies to the board and the communities)" : "Filtrar por zona (vale para el tablón y las comunidades)"}</p>
      <div className="rail-scroll" id="rail">
        <button type="button" className="chipbtn" id="rp-all" aria-pressed={!zona} onClick={() => setZona("")}>{t("Toda la red")} <span className="n">{items.length}</span></button>
        {Object.keys(P).map((k) => (
          <button key={k} type="button" className="chipbtn" id={"rp-" + k} aria-pressed={zona === k} onClick={() => setZona(k)}>{t(P[k])} <span className="n">{cuenta[k] || 0}</span></button>
        ))}
      </div>
    </nav>
  );
}
