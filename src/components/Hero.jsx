import { useApp } from "../AppContext.jsx";
import { SIMB } from "../data/constants.js";
import { plural } from "../lib/utils.js";
import { HeroText } from "./Headers.jsx";
import { Svg } from "./Shared.jsx";

export default function Hero() {
  const { t, en, data, oscuro, cambiarTema, cambiarIdioma } = useApp();
  return (
    <header className="hero">
      <div className="hero-art">
        <div className="wrap hero-top">
          <button className="lang tema" type="button" id="b-tema" onClick={cambiarTema}>
            <Svg width="2" d={SIMB[oscuro ? "sol" : "luna"][2]} /><span>{t(oscuro ? "Modo claro" : "Modo oscuro")}</span>
          </button>
          <button className="lang" type="button" id="b-lang" lang={en ? "es" : "en"} onClick={cambiarIdioma}>{en ? "Español" : "English"}</button>
        </div>
      </div>
      <div className="wrap card-wrap">
        <div className="hero-card">
          <div className="paseo" aria-hidden="true">
            <div className="andarin"><div className="brinco">
              <picture>
                <source media="(prefers-reduced-motion: reduce)" srcSet="/img/sapo-lado.webp" />
                <img src="/img/sapo-anda.webp" width="240" height="181" alt="" />
              </picture>
            </div></div>
          </div>
          <img className="hero-logo" src="/img/logo.webp" width="440" height="423"
            alt={en ? "Hampatu Ayllu logo: a harlequin toad on a rock, with hills and a stream behind it" : "Logo de Hampatu Ayllu: un sapo arlequín sobre una piedra, con cerros y una quebrada al fondo"} />
          <div className="hero-text">
            <HeroText />
            <p className="stats" id="stats" aria-live="polite">
              {plural(t, data.comunidades.length, "comunidad", "comunidades") + " · " + plural(t, data.avisos.length, "aviso", "avisos")}
            </p>
            <a className="btn-acc" href="#recompensas">{en ? "Rewards for those who protect" : "Recompensas para quien protege"}</a>
          </div>
        </div>
      </div>
    </header>
  );
}
