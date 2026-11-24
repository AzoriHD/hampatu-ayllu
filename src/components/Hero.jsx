import { useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { prepararClic, sonarClic } from "../lib/musica.js";
import { HeroText } from "./Headers.jsx";
import { Svg } from "./Shared.jsx";
import { ICONO_APP } from "./Topbar.jsx";
import Paseo from "./Paseo.jsx";

/* Portada: el tejido de rombos de fondo y, encima, la «manta» con el nombre. */
export default function Hero() {
  const { t, en, data, esApp } = useApp();
  const nc = data.comunidades.length, na = data.avisos.length;
  return (
    <section className="portada" aria-labelledby="h-portada">
      <div className="wrap portada-in">
        <div className="manta">
          {/* El sapo verde pasea por el borde de arriba: va, se sienta (y a veces caza una mosca), se da la vuelta y vuelve */}
          <Paseo color="verde" />
          <img className="manta-logo" src="/img/logo.webp" width="440" height="365"
            alt={en ? "Hampatu Ayllu logo: a heart embracing the map of Peru, with a harlequin toad on it" : "Logo de Hampatu Ayllu: un corazón que abraza el mapa de Perú, con un sapo arlequín encima"} />
          <HeroText />
          <p className="cifras" id="stats" aria-live="polite">
            <span><b>{nc}</b> {t(nc === 1 ? "comunidad" : "comunidades")}</span>
            <span><b>{na}</b> {t(na === 1 ? "aviso" : "avisos")}</span>
          </p>
          <div className="portada-cta">
            <BotonHampatu />
            <a className="btn-linea" href="#recompensas">{en ? "Rewards for those who protect" : "Recompensas para quien protege"}</a>
            <a className="btn-linea btn-apoya" href="#apoya"><Svg width="2" d='<path d="M12 20.3s-7.8-4.6-7.8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.2-7.8 10.2z"/>' />{en ? "Support the cause" : "Apoya la causa"}</a>
            {!esApp && <a className="btn-linea" href="#app"><Svg width="2" d={ICONO_APP} />{en ? "Get the app" : "Descarga la app"}</a>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* El botón de «He visto al hampatu»: se hunde al pulsarlo (con clic si la música está puesta) y luego abre el formulario */
function BotonHampatu() {
  const { en, abrirVisto } = useApp();
  const [abajo, setAbajo] = useState(false);
  const yendo = useRef(false), dedo = useRef(null);
  /* Es un <button> y no un enlace: así el móvil no saca la vista previa del enlace ni selecciona texto al
     mantenerlo pulsado. Se hunde al tocarlo, se abre al soltarlo (aunque se haya mantenido) y, si el dedo
     se desliza para bajar la página, se cancela. */
  const disparar = () => {
    if (yendo.current) return;
    yendo.current = true;
    sonarClic();
    setAbajo(true);
    setTimeout(() => { abrirVisto(); requestAnimationFrame(() => { setAbajo(false); yendo.current = false; }); }, 240);
  };
  const tocar = (e) => { if (e.button > 0 || yendo.current) return; dedo.current = e.pointerId; prepararClic(); setAbajo(true); };
  const soltar = (e) => { if (dedo.current !== e.pointerId) return; dedo.current = null; disparar(); };
  const cancelar = () => { dedo.current = null; if (!yendo.current) setAbajo(false); };
  const src = (p) => "/img/boton-" + (en ? "en-" : "") + p + ".webp";
  return (
    <button type="button" className={"boton-hampatu" + (abajo ? " hundido" : "")}
      onPointerDown={tocar} onPointerUp={soltar} onPointerCancel={cancelar} onPointerLeave={cancelar}
      onClick={(e) => { if (e.detail === 0) disparar(); }} onContextMenu={(e) => e.preventDefault()}
      aria-label={en ? "I saw the hampatu: send a sighting" : "He visto al hampatu: mandar un avistamiento"}>
      <img className="b-arriba" src={src("arriba")} width="300" height="315" alt="" draggable="false" />
      <img className="b-abajo" src={src("abajo")} width="300" height="315" alt="" draggable="false" />
    </button>
  );
}

/* Faja de ranas tejidas entre la portada y el contenido */
export function FajaRanas() {
  return <div className="faja-ranas" aria-hidden="true"></div>;
}
