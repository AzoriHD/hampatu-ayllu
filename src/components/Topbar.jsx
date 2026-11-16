import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { SIMB } from "../data/constants.js";
import { Svg } from "./Shared.jsx";
import { AccountButton } from "./Account.jsx";

/* Secciones: [vista, español, inglés, icono]. Las cuatro primeras van en la barra de abajo del móvil. */
export const SECCIONES = [
  ["tablon", "Tablón", "Board", '<path d="M4 4.5h16v11.5H9.5L4 20.5z"/><path d="M8 8.6h8M8 12h5"/>'],
  ["comunidades", "Comunidades", "Communities", '<path d="M2.5 19.5 9 8.5l4 6.2 3-4.2 5.5 9z"/><path d="M7.2 11.6 9 13.2l1.8-1.6"/>'],
  ["calendario", "Calendario", "Calendar", '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2.5M13.5 14H16M8 17h2.5"/>'],
  ["personas", "Personas", "People", '<circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.5c.6-3.5 2.9-5.4 5.6-5.4s5 1.9 5.6 5.4"/><circle cx="17.1" cy="9.4" r="2.4"/><path d="M15.7 14.2c2.4.2 4.1 1.9 4.7 5"/>'],
  ["artesania", "Artesanía", "Crafts", '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 7.6 16.4 12 12 16.4 7.6 12z"/><path d="M12 11v2"/>'],
  ["especie", "La especie", "The species", SIMB.sapo[2]],
  ["recompensas", "Recompensas", "Rewards", '<circle cx="12" cy="9" r="5.6"/><path d="M8.7 13.4 7.2 21l4.8-2.6 4.8 2.6-1.5-7.6"/><path d="m12 6.4.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z"/>'],
];
export const ICONO_APP = '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M12 7v7.2M9.1 11.4 12 14.3l2.9-2.9M10.6 18.4h2.8"/>';
const ICONO_MAS = '<circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/>';
const MAS = ["artesania", "especie", "recompensas", "app"];

function enlace(view, v) {
  return view === v || (v === "personas" && view === "perfil") ? "page" : undefined;
}

/* Cabecera fija: marca, secciones (ordenador), descargar la app, cuenta, tema e idioma. */
export function Topbar() {
  const { en, view, irVista, oscuro, cambiarTema, cambiarIdioma, t } = useApp();
  const navRef = useRef(null);

  /* Mantiene a la vista la sección activa cuando la fila de secciones no cabe */
  useEffect(() => {
    const w = navRef.current, a = document.getElementById("tab-" + (view === "perfil" ? "personas" : view));
    if (!w || !a || w.scrollWidth <= w.clientWidth) return;
    if (a.offsetLeft < w.scrollLeft || a.offsetLeft + a.offsetWidth > w.scrollLeft + w.clientWidth) w.scrollLeft = Math.max(0, a.offsetLeft - 24);
  }, [view]);

  const inicio = (ev) => { ev.preventDefault(); irVista("tablon"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <header className="topbar">
      <div className="topbar-in">
        <a className="marca" href="#tablon" onClick={inicio} aria-label={en ? "Hampatu Ayllu, home" : "Hampatu Ayllu, inicio"}>
          <img src="/img/logo.webp" width="44" height="42" alt="" />
          <span>Hampatu Ayllu</span>
        </a>
        <nav className="nav" ref={navRef} aria-label={en ? "Sections" : "Secciones"}>
          {SECCIONES.map(([v, es, enl]) => (
            <a key={v} href={"#" + v} id={"tab-" + v} aria-current={enlace(view, v)}>{en ? enl : es}</a>
          ))}
        </nav>
        <div className="acciones">
          <a className="btn-descarga" href="#app" id="b-app" aria-current={view === "app" ? "page" : undefined}>
            <Svg width="2" d={ICONO_APP} /><span>{en ? "Get the app" : "Descargar app"}</span>
          </a>
          <AccountButton />
          <button className="icono-btn solo-ancho" type="button" id="b-tema" aria-label={t(oscuro ? "Modo claro" : "Modo oscuro")} title={t(oscuro ? "Modo claro" : "Modo oscuro")} onClick={cambiarTema}>
            <Svg width="2" d={SIMB[oscuro ? "sol" : "luna"][2]} />
          </button>
          <button className="icono-btn idioma solo-ancho" type="button" id="b-lang" lang={en ? "es" : "en"} aria-label={en ? "Ver en español" : "View in English"} onClick={cambiarIdioma}>{en ? "ES" : "EN"}</button>
        </div>
      </div>
    </header>
  );
}

/* Barra de abajo en el móvil, como en una app: cuatro secciones y «Más». */
export function BottomNav() {
  const { en, view, oscuro, cambiarTema, cambiarIdioma, t } = useApp();
  const [abierta, setAbierta] = useState(false);
  const hoja = useRef(null);
  useEffect(() => { setAbierta(false); }, [view]);
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (ev) => { if (!ev.target.closest?.(".hoja, #bn-mas")) setAbierta(false); };
    const esc = (ev) => { if (ev.key === "Escape") setAbierta(false); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    hoja.current?.querySelector("a")?.focus();
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierta]);

  const nombre = (v) => { const s = SECCIONES.find((x) => x[0] === v); return s ? (en ? s[2] : s[1]) : (en ? "Get the app" : "Descargar la app"); };
  const icono = (v) => { const s = SECCIONES.find((x) => x[0] === v); return s ? s[3] : ICONO_APP; };

  return (
    <>
      <nav className="abajo" aria-label={en ? "Sections" : "Secciones"}>
        {SECCIONES.slice(0, 4).map(([v, es, enl, d]) => (
          <a key={v} href={"#" + v} id={"bn-" + v} aria-current={enlace(view, v)}><Svg width="1.9" d={d} /><span>{en ? enl : es}</span></a>
        ))}
        <button type="button" id="bn-mas" aria-expanded={abierta} aria-controls="hoja-mas" aria-current={MAS.includes(view) ? "page" : undefined} onClick={() => setAbierta((a) => !a)}>
          <Svg width="2.2" d={ICONO_MAS} /><span>{en ? "More" : "Más"}</span>
        </button>
      </nav>
      <div className="hoja" id="hoja-mas" ref={hoja} hidden={!abierta}>
        <ul>
          {MAS.map((v) => (
            <li key={v}><a href={"#" + v} aria-current={view === v ? "page" : undefined} className={v === "app" ? "hoja-app" : undefined}><Svg width="1.9" d={icono(v)} />{nombre(v)}</a></li>
          ))}
        </ul>
        <div className="hoja-ajustes">
          <button type="button" className="btn-ghost" onClick={cambiarTema}><Svg width="2" d={SIMB[oscuro ? "sol" : "luna"][2]} />{t(oscuro ? "Modo claro" : "Modo oscuro")}</button>
          <button type="button" className="btn-ghost" lang={en ? "es" : "en"} onClick={cambiarIdioma}>{en ? "Español" : "English"}</button>
        </div>
      </div>
    </>
  );
}
