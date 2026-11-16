import { useApp } from "../AppContext.jsx";
import { HeroText } from "./Headers.jsx";
import { Svg } from "./Shared.jsx";
import { ICONO_APP } from "./Topbar.jsx";

/* Portada: el tejido de rombos de fondo y, encima, la «manta» con el nombre. */
export default function Hero() {
  const { t, en, data } = useApp();
  const nc = data.comunidades.length, na = data.avisos.length;
  return (
    <section className="portada" aria-labelledby="h-portada">
      <div className="wrap portada-in">
        <div className="manta">
          <div className="paseo" aria-hidden="true">
            <div className="andarin"><div className="brinco">
              <picture>
                <source media="(prefers-reduced-motion: reduce)" srcSet="/img/sapo-lado.webp" />
                <img src="/img/sapo-anda.webp" width="240" height="181" alt="" />
              </picture>
            </div></div>
          </div>
          <img className="manta-logo" src="/img/logo.webp" width="440" height="423"
            alt={en ? "Hampatu Ayllu logo: a harlequin toad on a rock, with hills and a stream behind it" : "Logo de Hampatu Ayllu: un sapo arlequín sobre una piedra, con cerros y una quebrada al fondo"} />
          <HeroText />
          <p className="cifras" id="stats" aria-live="polite">
            <span><b>{nc}</b> {t(nc === 1 ? "comunidad" : "comunidades")}</span>
            <span><b>{na}</b> {t(na === 1 ? "aviso" : "avisos")}</span>
          </p>
          <div className="portada-cta">
            <a className="btn-acc" href="#recompensas">{en ? "Rewards for those who protect" : "Recompensas para quien protege"}</a>
            <a className="btn-linea" href="#app"><Svg width="2" d={ICONO_APP} />{en ? "Get the app" : "Descarga la app"}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Faja de ranas tejidas entre la portada y el contenido */
export function FajaRanas() {
  return <div className="faja-ranas" aria-hidden="true"></div>;
}
