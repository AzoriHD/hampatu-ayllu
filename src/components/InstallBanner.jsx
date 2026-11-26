import { useEffect, useState } from "react";
import { AYUDA_INSTALAR, descargarApp, enApp, enOtraApp, navegador, plataforma, puedeInstalar, recien, suscribir } from "../lib/pwa.js";
import "./install.css";

/*
 * «Instala la app»: tarjeta flotante que aparece al rato de entrar.
 * - Android y computadora (Chrome, Edge…): abre el aviso de instalación del navegador.
 * - iPhone/iPad o si el navegador no deja: abre una ventanita con los pasos (sin salir de la página).
 * La misma ventanita la abren los botones «Descargar app» (descargarApp en pwa.js).
 * No sale si ya está instalada, si la persona la cerró o si ya está en la página «App».
 * Va en su propia raíz (main.jsx), así que lee el idioma de <html lang>.
 */
const CERRADO = "hampatu-instalar-no";
const ESPERA = 9000;
const TXT = {
  es: { titulo: "Instala la app de Hampatu Ayllu", sub: "Con su icono en tu pantalla, rápida y gratis.", boton: "Instalar", ios: "Ver cómo", cerrar: "Cerrar" },
  en: { titulo: "Install the Hampatu Ayllu app", sub: "With its own icon on your screen, fast and free.", boton: "Install", ios: "See how", cerrar: "Close" },
};
/* Pasos cortos según el dispositivo, cuando el navegador no deja instalar con un toque */
function pasos(en) {
  const pl = plataforma(), nav = navegador();
  if (recien()) return [en ? "It is already installed. Look for the toad icon among your apps." : "Ya está instalada. Busca el icono del sapo entre tus apps."];
  if (enOtraApp()) return en
    ? ["This page is open inside another app (WhatsApp, Facebook…), which cannot install apps.", pl === "ios" ? "Open it in Safari: tap ⋯ or the compass and choose «Open in Safari»." : "Open it in Chrome: tap ⋮ and choose «Open in Chrome» (or «Open in browser»).", "Then tap «Get the app» again."]
    : ["Esta página está abierta dentro de otra app (WhatsApp, Facebook…), que no deja instalar.", pl === "ios" ? "Ábrela en Safari: toca ⋯ o la brújula y elige «Abrir en Safari»." : "Ábrela en Chrome: toca ⋮ y elige «Abrir en Chrome» (o «Abrir en el navegador»).", "Luego vuelve a tocar «Descargar app»."];
  if (pl === "ios") return en
    ? ["Tap the Share button (square with an arrow) at the bottom or top of the screen.", "Choose «Add to Home Screen» and then «Add».", "The toad icon will appear on your screen."]
    : ["Toca el botón Compartir (el cuadrado con una flecha), abajo o arriba de la pantalla.", "Elige «Añadir a pantalla de inicio» y luego «Añadir».", "El icono del sapo aparecerá en tu pantalla."];
  if (pl === "android") return en
    ? ["Open the browser menu ⋮ (top right).", "Choose «Install app» or «Add to Home screen» and then «Install».", "The toad icon will appear among your apps."]
    : ["Abre el menú ⋮ del navegador (arriba a la derecha).", "Elige «Instalar aplicación» o «Añadir a pantalla de inicio» y luego «Instalar».", "El icono del sapo aparecerá entre tus apps."];
  if (nav === "firefox" || nav === "safari" && pl !== "mac") return [en ? "This browser cannot install apps. Open this page in Chrome or Edge and press «Get the app»." : "Este navegador no instala apps. Abre esta página en Chrome o Edge y pulsa «Descargar app»."];
  if (nav === "safari") return [en ? "In Safari: File menu and «Add to Dock»." : "En Safari: menú Archivo y «Añadir al Dock»."];
  return en
    ? ["Press the install icon at the right of the address bar.", "Or open the browser menu ⋮ and choose «Install Hampatu Ayllu»."]
    : ["Pulsa el icono de instalar a la derecha de la barra de direcciones.", "O abre el menú ⋮ del navegador y elige «Instalar Hampatu Ayllu»."];
}

function Ayuda({ lang, cerrar }) {
  const en = lang === "en";
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [cerrar]);
  return (
    <div className="instalar-fondo" onClick={cerrar}>
      <div className="instalar-ayuda" role="dialog" aria-modal="true" aria-labelledby="instalar-ayuda-t" lang={lang} onClick={(e) => e.stopPropagation()}>
        <img src="/icon-192.png?v=11" alt="" width="56" height="56" />
        <strong id="instalar-ayuda-t">{en ? "Install Hampatu Ayllu" : "Instala Hampatu Ayllu"}</strong>
        <ol>{pasos(en).map((p) => <li key={p}>{p}</li>)}</ol>
        <button className="instalar-si" type="button" onClick={cerrar} autoFocus>{en ? "Got it" : "Entendido"}</button>
      </div>
    </div>
  );
}

const idioma = () => (document.documentElement.lang === "en" ? "en" : "es");
const leerCerrado = () => { try { return localStorage.getItem(CERRADO) === "1"; } catch (e) { return false; } };

export default function InstallBanner() {
  const [, refrescar] = useState(0);
  const [lang, setLang] = useState(idioma);
  const [cerrado, setCerrado] = useState(leerCerrado);
  const [listo, setListo] = useState(false);
  const [enAppPage, setEnAppPage] = useState(() => window.location.hash === "#app");
  const [ayuda, setAyuda] = useState(false);

  useEffect(() => {
    const quitar = suscribir(() => refrescar((n) => n + 1));
    const obs = new MutationObserver(() => setLang(idioma()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    const tm = setTimeout(() => setListo(true), ESPERA);
    /* la página «App» cambia el hash con replaceState: se mira cada poco */
    const mira = () => setEnAppPage(window.location.hash === "#app");
    const iv = setInterval(mira, 800);
    window.addEventListener("hashchange", mira);
    const abre = () => setAyuda(true);
    window.addEventListener(AYUDA_INSTALAR, abre);
    return () => { quitar(); obs.disconnect(); clearTimeout(tm); clearInterval(iv); window.removeEventListener("hashchange", mira); window.removeEventListener(AYUDA_INSTALAR, abre); };
  }, []);

  const ios = plataforma() === "ios";
  if (ayuda) return <Ayuda lang={lang} cerrar={() => setAyuda(false)} />;
  if (!listo || cerrado || enAppPage || enApp() || (!puedeInstalar() && !ios)) return null;
  const T = TXT[lang];
  const cerrar = () => { try { localStorage.setItem(CERRADO, "1"); } catch (e) { /* ignore */ } setCerrado(true); };

  return (
    <div className="instalar-app" id="instalar" role="region" aria-label={T.titulo} lang={lang}>
      <img src="/icon-192.png?v=11" alt="" width="48" height="48" />
      <div className="instalar-txt">
        <strong>{T.titulo}</strong>
        <span>{T.sub}</span>
      </div>
      <button className="instalar-si" type="button" id="b-instalar" onClick={() => descargarApp()}>{ios ? T.ios : T.boton}</button>
      <button className="instalar-x" type="button" id="b-instalar-x" aria-label={T.cerrar} onClick={cerrar}>×</button>
    </div>
  );
}
