import { useEffect, useState } from "react";
import { enApp, instalar, plataforma, puedeInstalar, suscribir } from "../lib/pwa.js";
import "./install.css";

/*
 * «Instala la app»: tarjeta flotante que aparece al rato de entrar.
 * - Android y computadora (Chrome, Edge…): abre el aviso de instalación del navegador.
 * - iPhone/iPad: lleva a la página «App», con los pasos de Safari.
 * No sale si ya está instalada, si la persona la cerró o si ya está en la página «App».
 * Va en su propia raíz (main.jsx), así que lee el idioma de <html lang>.
 */
const CERRADO = "hampatu-instalar-no";
const ESPERA = 9000;
const TXT = {
  es: { titulo: "Instala la app de Hampatu Ayllu", sub: "Con su icono en tu pantalla, rápida y gratis.", boton: "Instalar", ios: "Ver cómo", cerrar: "Cerrar" },
  en: { titulo: "Install the Hampatu Ayllu app", sub: "With its own icon on your screen, fast and free.", boton: "Install", ios: "See how", cerrar: "Close" },
};
const idioma = () => (document.documentElement.lang === "en" ? "en" : "es");
const leerCerrado = () => { try { return localStorage.getItem(CERRADO) === "1"; } catch (e) { return false; } };

export default function InstallBanner() {
  const [, refrescar] = useState(0);
  const [lang, setLang] = useState(idioma);
  const [cerrado, setCerrado] = useState(leerCerrado);
  const [listo, setListo] = useState(false);
  const [enAppPage, setEnAppPage] = useState(() => window.location.hash === "#app");

  useEffect(() => {
    const quitar = suscribir(() => refrescar((n) => n + 1));
    const obs = new MutationObserver(() => setLang(idioma()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    const tm = setTimeout(() => setListo(true), ESPERA);
    /* la página «App» cambia el hash con replaceState: se mira cada poco */
    const mira = () => setEnAppPage(window.location.hash === "#app");
    const iv = setInterval(mira, 800);
    window.addEventListener("hashchange", mira);
    return () => { quitar(); obs.disconnect(); clearTimeout(tm); clearInterval(iv); window.removeEventListener("hashchange", mira); };
  }, []);

  const ios = plataforma() === "ios";
  if (!listo || cerrado || enAppPage || enApp() || (!puedeInstalar() && !ios)) return null;
  const T = TXT[lang];
  const cerrar = () => { try { localStorage.setItem(CERRADO, "1"); } catch (e) { /* ignore */ } setCerrado(true); };

  return (
    <div className="instalar-app" id="instalar" role="region" aria-label={T.titulo} lang={lang}>
      <img src="/apple-touch-icon.png" alt="" width="48" height="48" />
      <div className="instalar-txt">
        <strong>{T.titulo}</strong>
        <span>{T.sub}</span>
      </div>
      {ios
        ? <a className="instalar-si" href="#app" id="b-instalar">{T.ios}</a>
        : <button className="instalar-si" type="button" id="b-instalar" onClick={() => instalar()}>{T.boton}</button>}
      <button className="instalar-x" type="button" id="b-instalar-x" aria-label={T.cerrar} onClick={cerrar}>×</button>
    </div>
  );
}
