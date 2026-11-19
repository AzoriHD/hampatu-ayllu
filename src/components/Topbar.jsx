import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { alternarMusica, estadoMusica, ponerVolumen, suscribir as oirMusica, volumenAjustable, volumenMusica } from "../lib/musica.js";
import { useApp } from "../AppContext.jsx";
import { SIMB } from "../data/constants.js";
import { Svg } from "./Shared.jsx";
import { AccountButton } from "./Account.jsx";
import { sinLeerTotal, useMensajes } from "../lib/mensajes.js";

/* Secciones: [vista, español, inglés, icono]. En el móvil van todas en la barra de abajo, que se desliza. */
export const SECCIONES = [
  ["tablon", "Tablón", "Board", '<path d="M4 4.5h16v11.5H9.5L4 20.5z"/><path d="M8 8.6h8M8 12h5"/>'],
  ["descubre", "Descubre", "Discover", '<rect x="6" y="3" width="12" height="17" rx="2.5"/><path d="M3 7.5 6 7M21 7.5 18 7M12 14.6s-2.6-1.5-2.6-3.3a1.4 1.4 0 0 1 2.6-.8 1.4 1.4 0 0 1 2.6.8c0 1.8-2.6 3.3-2.6 3.3z"/>'],
  ["comunidades", "Comunidades", "Communities", '<path d="M2.5 19.5 9 8.5l4 6.2 3-4.2 5.5 9z"/><path d="M7.2 11.6 9 13.2l1.8-1.6"/>'],
  ["calendario", "Calendario", "Calendar", '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2.5M13.5 14H16M8 17h2.5"/>'],
  ["personas", "Personas", "People", '<circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.5c.6-3.5 2.9-5.4 5.6-5.4s5 1.9 5.6 5.4"/><circle cx="17.1" cy="9.4" r="2.4"/><path d="M15.7 14.2c2.4.2 4.1 1.9 4.7 5"/>'],
  ["artesania", "Artesanía", "Crafts", '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 7.6 16.4 12 12 16.4 7.6 12z"/><path d="M12 11v2"/>'],
  ["especie", "La especie", "The species", SIMB.sapo[2]],
  ["apoya", "Apoya", "Support", '<path d="M12 20.3s-7.8-4.6-7.8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.2-7.8 10.2z"/>'],
  ["recompensas", "Recompensas", "Rewards", '<circle cx="12" cy="9" r="5.6"/><path d="M8.7 13.4 7.2 21l4.8-2.6 4.8 2.6-1.5-7.6"/><path d="m12 6.4.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z"/>'],
];
export const ICONO_APP = '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M12 7v7.2M9.1 11.4 12 14.3l2.9-2.9M10.6 18.4h2.8"/>';

/* Nota musical; apagada lleva una raya encima */
const ICONO_MUSICA = '<path d="M9 17.5V5.2l10-2v12.1"/><circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.4" r="2.6"/>';
const ICONO_SILENCIO = ICONO_MUSICA + '<path d="M3.5 3.5l17 17"/>';

/* Botón de la música: enciende y apaga los temas de Hampatu Ayllu (siguen con la pantalla apagada).
   Con la música puesta, el botón se alarga en una píldora con el deslizador de volumen. En el móvil no cabe:
   el deslizador cuelga debajo y se esconde solo; con la música puesta, el primer toque lo vuelve a sacar
   y el segundo apaga. */
const ESPERA_VOL = 4000;
const esMovil = () => typeof window !== "undefined" && window.matchMedia("(max-width:760px)").matches;
function BotonMusica() {
  const { t } = useApp();
  const estado = useSyncExternalStore(oirMusica, estadoMusica, estadoMusica);
  const vol = useSyncExternalStore(oirMusica, volumenMusica, volumenMusica);
  const activa = estado !== "apagada";
  const rotulo = t(activa ? "Apagar música ambiental" : "Música ambiental");
  const conVol = activa && volumenAjustable;
  const [ver, setVer] = useState(false);
  const reloj = useRef(0);
  const mostrar = () => { setVer(true); clearTimeout(reloj.current); reloj.current = setTimeout(() => setVer(false), ESPERA_VOL); };
  useEffect(() => () => clearTimeout(reloj.current), []);
  const pulsar = () => {
    const movil = volumenAjustable && esMovil();
    if (!activa) { alternarMusica(); if (movil) mostrar(); return; }
    if (movil && !ver) { mostrar(); return; }
    setVer(false);
    alternarMusica();
  };
  return (
    <div className={"musica-grupo" + (conVol ? " abierta" : "") + (ver ? " ver" : "")}>
      <button className="icono-btn musica" type="button" id="b-musica" aria-pressed={activa} aria-label={rotulo} title={rotulo}
        data-estado={estado} onClick={pulsar}>
        <Svg width="2" d={activa ? ICONO_MUSICA : ICONO_SILENCIO} />
      </button>
      {volumenAjustable && (
        <input className="musica-vol" type="range" min="0" max="1" step="0.01" value={vol}
          aria-label={t("Volumen de la música")} title={t("Volumen de la música")} tabIndex={conVol ? 0 : -1} aria-hidden={!conVol}
          style={{ "--v": Math.round(vol * 100) + "%" }} onPointerDown={mostrar} onChange={(e) => { ponerVolumen(e.target.value); mostrar(); }} />
      )}
    </div>
  );
}

function enlace(view, v) {
  return view === v || (v === "personas" && view === "perfil") ? "page" : undefined;
}

/* Cabecera fija: marca, secciones (ordenador), descargar la app (solo en la web), cuenta, tema e idioma. */
export function Topbar() {
  const { en, view, irVista, oscuro, cambiarTema, cambiarIdioma, t, esApp } = useApp();
  const navRef = useRef(null);

  /* Mantiene a la vista la sección activa cuando la fila de secciones no cabe */
  useEffect(() => {
    const w = navRef.current, a = document.getElementById("tab-" + (view === "perfil" ? "personas" : view));
    if (!w || !a || w.scrollWidth <= w.clientWidth) return;
    if (a.offsetLeft < w.scrollLeft || a.offsetLeft + a.offsetWidth > w.scrollLeft + w.clientWidth) w.scrollLeft = Math.max(0, a.offsetLeft - 24);
  }, [view]);

  const inicio = (ev) => { ev.preventDefault(); irVista("tablon"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
    <div className="faja-top" aria-hidden="true"></div>
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
          {!esApp && (
            <a className="btn-descarga" href="#app" id="b-app" aria-current={view === "app" ? "page" : undefined}>
              <Svg width="2" d={ICONO_APP} /><span>{en ? "Get the app" : "Descargar app"}</span>
            </a>
          )}
          <BotonMensajes />
          <AccountButton />
          <BotonMusica />
          <button className="icono-btn" type="button" id="b-tema" aria-label={t(oscuro ? "Modo claro" : "Modo oscuro")} title={t(oscuro ? "Modo claro" : "Modo oscuro")} onClick={cambiarTema}>
            <Svg width="2" d={SIMB[oscuro ? "sol" : "luna"][2]} />
          </button>
          <button className="icono-btn idioma" type="button" id="b-lang" lang={en ? "es" : "en"} aria-label={en ? "Ver en español" : "View in English"} onClick={cambiarIdioma}>{en ? "ES" : "EN"}</button>
        </div>
      </div>
    </header>
    </>
  );
}

/* Mensajes privados, con el número de los que no se han leído */
function BotonMensajes() {
  const { en, meta, uid, view } = useApp();
  const lista = useMensajes();
  if (!meta.cuenta) return null;
  const n = sinLeerTotal(lista, uid);
  const txt = (en ? "Messages" : "Mensajes") + (n ? " (" + n + (en ? " unread)" : " sin leer)") : "");
  return (
    <a className="icono-btn b-mensajes" href="#mensajes" id="b-mensajes" aria-label={txt} title={txt} aria-current={view === "mensajes" ? "page" : undefined}>
      <Svg width="2" d='<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>' />
      {n > 0 && <span className="badge-n" aria-hidden="true">{n > 99 ? "99+" : n}</span>}
    </a>
  );
}

/* Barra de abajo en el móvil, como en una app: todas las secciones en una fila que se desliza
   a izquierda y derecha. Los bordes se difuminan cuando quedan secciones por ver. */
export function BottomNav() {
  const { en, view } = useApp();
  const fila = useRef(null);
  const [bordes, setBordes] = useState({ izq: false, der: false });

  const medir = useCallback(() => {
    const n = fila.current;
    if (!n) return;
    const max = n.scrollWidth - n.clientWidth;
    setBordes((b) => {
      const nuevo = { izq: n.scrollLeft > 4, der: n.scrollLeft < max - 4 };
      return nuevo.izq === b.izq && nuevo.der === b.der ? b : nuevo;
    });
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  /* La sección abierta se queda centrada en la fila */
  useEffect(() => {
    const n = fila.current, a = n && n.querySelector('[aria-current="page"]');
    if (!n || !a || n.scrollWidth <= n.clientWidth) return;
    const objetivo = a.offsetLeft - (n.clientWidth - a.offsetWidth) / 2;
    n.scrollTo({ left: Math.max(0, objetivo), behavior: "smooth" });
  }, [view]);

  return (
    <nav className="abajo" aria-label={en ? "Sections" : "Secciones"}>
      <div className="abajo-fila" ref={fila} onScroll={medir} data-izq={bordes.izq ? "" : undefined} data-der={bordes.der ? "" : undefined}>
        {SECCIONES.map(([v, es, enl, d]) => (
          <a key={v} href={"#" + v} id={"bn-" + v} aria-current={enlace(view, v)}><Svg width="1.9" d={d} /><span>{en ? enl : es}</span></a>
        ))}
      </div>
    </nav>
  );
}
