import { useEffect, useMemo, useState } from "react";
import { renderSVG } from "uqr";
import { useApp } from "../AppContext.jsx";
import { compartirApp, enApp, esMovil, instalar, navegador, plataforma, puedeInstalar, recien, suscribir } from "../lib/pwa.js";
import { Svg } from "./Shared.jsx";
import { ICONO_APP } from "./Topbar.jsx";

const IC = {
  movil: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.8 18.6h2.4"/>',
  tableta: '<rect x="4" y="2.5" width="16" height="19" rx="2.4"/><path d="M10.8 18.6h2.4"/>',
  portatil: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.6"/><path d="M2.5 18.5h19l-1.6-3H4.1z"/>',
  pantalla: '<rect x="3" y="4" width="18" height="12.5" rx="1.8"/><path d="M9 20.5h6M12 16.5v4"/>',
  compartir: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.7 10.7 6.6-3.9M8.7 13.3l6.6 3.9"/>',
  hecho: '<path d="M5 12.5 10 17.5 19.5 7"/>',
};

/* Pasos por plataforma. «ol» si es una secuencia, «ul» si son alternativas. */
const PLAT = {
  android: {
    ic: "movil", es: "Android", en: "Android", lista: "ol",
    pasosEs: ["Abre esta página en Chrome.", "Pulsa «Instalar». Si no sale, abre el menú ⋮ y elige «Añadir a pantalla de inicio» y luego «Instalar».", "Busca el icono del sapo entre tus apps."],
    pasosEn: ["Open this page in Chrome.", "Tap «Install». If it does not show, open the ⋮ menu, choose «Add to Home screen» and then «Install».", "Look for the toad icon among your apps."],
    notaEs: "En Samsung Internet: menú ☰, «Añadir página a» y «Pantalla de inicio».",
    notaEn: "In Samsung Internet: menu ☰, «Add page to» and «Home screen».",
  },
  ios: {
    ic: "tableta", es: "iPhone y iPad", en: "iPhone and iPad", lista: "ol",
    pasosEs: ["Abre esta página en Safari.", "Pulsa Compartir, el cuadrado con la flecha hacia arriba. En iOS 26 está dentro del botón «⋯».", "Elige «Añadir a pantalla de inicio», deja activado «Abrir como app web» y pulsa «Añadir»."],
    pasosEn: ["Open this page in Safari.", "Tap Share, the square with the arrow pointing up. On iOS 26 it is inside the «⋯» button.", "Choose «Add to Home Screen», leave «Open as Web App» on and tap «Add»."],
  },
  windows: {
    ic: "portatil", es: "Windows", en: "Windows", lista: "ol",
    pasosEs: ["Abre esta página en Edge o Chrome.", "Pulsa «Instalar» o el icono de instalar que aparece en la barra de direcciones.", "La app queda en el menú Inicio y puedes anclarla a la barra de tareas."],
    pasosEn: ["Open this page in Edge or Chrome.", "Press «Install» or the install icon in the address bar.", "The app goes to the Start menu and you can pin it to the taskbar."],
  },
  mac: {
    ic: "portatil", es: "Mac", en: "Mac", lista: "ul",
    pasosEs: ["Con Safari: menú Archivo y «Añadir al Dock».", "Con Chrome o Edge: icono de instalar de la barra de direcciones y «Instalar»."],
    pasosEn: ["With Safari: File menu and «Add to Dock».", "With Chrome or Edge: the install icon in the address bar and «Install»."],
    notaEs: "Después la abres desde el Dock, como cualquier otra app.",
    notaEn: "Then open it from the Dock, like any other app.",
  },
  linux: {
    ic: "pantalla", es: "Linux y Chromebook", en: "Linux and Chromebook", lista: "ol",
    pasosEs: ["Abre esta página en Chrome, Edge o Chromium.", "Pulsa «Instalar» o el icono de instalar de la barra de direcciones.", "La encontrarás en el menú de aplicaciones."],
    pasosEn: ["Open this page in Chrome, Edge or Chromium.", "Press «Install» or the install icon in the address bar.", "You will find it in the applications menu."],
  },
};
const ORDEN = ["android", "ios", "windows", "mac", "linux"];

const PREGUNTAS = [
  ["¿Hace falta una tienda de apps?", "No. Se instala desde esta web, sin Play Store ni App Store, y no pide permisos especiales.",
    "Do I need an app store?", "No. It installs from this website, without Play Store or App Store, and asks for no special permissions."],
  ["¿Funciona sin internet?", "Se abre y muestra lo último que cargaste. Para publicar, responder o ver lo nuevo necesitas conexión.",
    "Does it work offline?", "It opens and shows what you last loaded. To post, reply or see what is new you need a connection."],
  ["¿Cómo se actualiza?", "Sola. Cada vez que la abres con conexión carga la última versión.",
    "How does it update?", "By itself. Every time you open it with a connection it loads the latest version."],
  ["¿Mi cuenta es la misma?", "Sí. Entras con el mismo correo y la misma contraseña que en la web.",
    "Is my account the same?", "Yes. You sign in with the same email and password as on the website."],
  ["¿Cómo la quito?", "Como cualquier app: mantén pulsado el icono y elige quitar o desinstalar. En la computadora, ábrela, entra en su menú ⋯ y elige «Desinstalar».",
    "How do I remove it?", "Like any app: press and hold the icon and choose remove or uninstall. On a computer, open it, go to its ⋯ menu and choose «Uninstall»."],
];

export default function AppPage() {
  const { en } = useApp();
  const [, refrescar] = useState(0);
  const [aviso, setAviso] = useState("");
  useEffect(() => suscribir(() => refrescar((n) => n + 1)), []);

  const pl = plataforma(), nav = navegador(), movil = esMovil();
  const tuya = PLAT[pl] ? pl : null;
  const qr = useMemo(() => (movil ? "" : renderSVG(window.location.origin + "/#app", { border: 1, ecc: "M", whiteColor: "#fff8e8", blackColor: "#2b190b" })), [movil]);

  const yaApp = enApp(), hecha = recien(), boton = puedeInstalar();
  const dondeEs = movil ? "este celular" : "esta computadora", dondeEn = movil ? "this phone" : "this computer";

  const pulsar = async () => {
    const ok = await instalar();
    setAviso(ok ? "" : en ? "Installation cancelled. You can try again whenever you like." : "Instalación cancelada. Puedes volver a intentarlo cuando quieras.");
  };
  const compartir = async () => {
    const r = await compartirApp(en ? "Install the Hampatu Ayllu app, the community that looks after the Peruvian harlequin toad." : "Instala la app de Hampatu Ayllu, la comunidad que cuida al sapo arlequín peruano.");
    if (r === "copiado") setAviso(en ? "Link copied. Paste it in WhatsApp or wherever you like." : "Enlace copiado. Pégalo en WhatsApp o donde quieras.");
    else if (r === "error") setAviso(en ? "Could not share. Copy the address from the browser bar." : "No se pudo compartir. Copia la dirección de la barra del navegador.");
  };

  /* Qué se ve en el bloque de instalar, según el dispositivo y el navegador */
  let estado;
  if (yaApp || hecha) {
    estado = (
      <p className="app-listo"><Svg width="2.6" d={IC.hecho} />
        {yaApp ? (en ? "You are already using the app." : "Ya estás usando la app.") : (en ? "Installed. You will find it with your other apps." : "Instalada. La encontrarás junto a tus otras apps.")}
      </p>
    );
  } else if (boton) {
    estado = (
      <button type="button" className="btn-instalar" id="b-instalar-app" onClick={pulsar}>
        <Svg width="2" d={ICONO_APP} />{en ? "Install on " + dondeEn : "Instalar en " + dondeEs}
      </button>
    );
  } else if (pl === "ios") {
    estado = (
      <div className="app-pasos-cortos">
        <p><strong>{en ? "On iPhone and iPad it installs from Safari:" : "En iPhone y iPad se instala desde Safari:"}</strong></p>
        <ol>{(en ? PLAT.ios.pasosEn : PLAT.ios.pasosEs).map((p) => <li key={p}>{p}</li>)}</ol>
      </div>
    );
  } else {
    const firefox = nav === "firefox" && !movil, safariMac = pl === "mac" && nav === "safari";
    let txt;
    if (firefox) txt = en ? "Firefox on a computer cannot install apps. Open this page in Chrome or Edge." : "Firefox de computadora no instala apps. Abre esta página en Chrome o Edge.";
    else if (safariMac) txt = en ? "In Safari: File menu and «Add to Dock»." : "En Safari: menú Archivo y «Añadir al Dock».";
    else if (pl === "android" && nav === "samsung") txt = en ? "In Samsung Internet: menu ☰, «Add page to» and «Home screen»." : "En Samsung Internet: menú ☰, «Añadir página a» y «Pantalla de inicio».";
    else if (pl === "android") txt = en ? "Open the browser menu ⋮ and choose «Add to Home screen» and then «Install»." : "Abre el menú ⋮ del navegador y elige «Añadir a pantalla de inicio» y luego «Instalar».";
    else txt = en ? "Install it from your browser's menu. Below are the steps for your device." : "Instálala desde el menú de tu navegador. Abajo tienes los pasos para tu dispositivo.";
    estado = <div className="app-pasos-cortos"><p><strong>{txt}</strong></p></div>;
  }

  return (
    <section id="v-app" className="app-vista" aria-labelledby="h-app">
      <header className="vista-head caja caja-cabeza">
        <div>
          <h2 className="vista-h" id="h-app">{en ? "The Hampatu Ayllu app" : "La app de Hampatu Ayllu"}</h2>
          <p className="intro">{en ? "The same community, with its own icon on your phone or computer. It installs from here, it is free and it takes up very little space." : "La misma comunidad, con su propio icono en tu celular o tu computadora. Se instala desde aquí, es gratis y ocupa muy poco."}</p>
        </div>
      </header>

      <div className="app-instalar">
        <div className="app-equipos" aria-hidden="true">
          <div className="pc"><div className="pc-pantalla"><img src="/img/app-computadora.webp?v=2" width="1280" height="800" alt="" loading="lazy" /></div><div className="pc-base"></div></div>
          <div className="cel"><div className="cel-pantalla"><img src="/img/app-celular.webp?v=2" width="824" height="1784" alt="" loading="lazy" /></div></div>
        </div>
        <div className="app-accion">
          <img className="app-icono" src="/img/icono-app.png?v=13" width="512" height="512" alt="" />
          <p className="app-nombre"><strong>Hampatu Ayllu</strong><span>{en ? "Free for Android, iPhone, Windows, Mac and Linux" : "Gratis para Android, iPhone, Windows, Mac y Linux"}</span></p>
          {estado}
          <p className="msg soft" role="status" hidden={!aviso}>{aviso}</p>
          <button type="button" className="btn-ghost compartir-app" onClick={compartir}><Svg width="2" d={IC.compartir} />{en ? "Share the app" : "Compartir la app"}</button>
          {qr && (
            <figure className="app-qr">
              <div dangerouslySetInnerHTML={{ __html: qr }} />
              <figcaption>{en ? "To install it on your phone, scan this code with the camera." : "Para instalarla en el celular, escanea este código con la cámara."}</figcaption>
            </figure>
          )}
        </div>
      </div>

      <div className="caja">
      <h3 className="app-sub">{en ? "Step by step on each device" : "Paso a paso en cada dispositivo"}</h3>
      <div className="app-plataformas">
        {ORDEN.map((k) => {
          const p = PLAT[k], L = p.lista;
          return (
            <article key={k} className={"plat" + (k === tuya ? " tuya" : "")} id={"plat-" + k}>
              <h4><Svg width="1.9" d={IC[p.ic]} />{en ? p.en : p.es}{k === tuya && <span className="tuya-marca">{en ? "Your device" : "Tu dispositivo"}</span>}</h4>
              <L>{(en ? p.pasosEn : p.pasosEs).map((s) => <li key={s}>{s}</li>)}</L>
              {p.notaEs && <p className="meta">{en ? p.notaEn : p.notaEs}</p>}
            </article>
          );
        })}
      </div>

      </div>

      <div className="caja">
      <h3 className="app-sub">{en ? "Questions" : "Preguntas"}</h3>
      <div className="app-preguntas">
        {PREGUNTAS.map(([qe, ae, qn, an]) => (
          <details key={qe}><summary>{en ? qn : qe}</summary><p>{en ? an : ae}</p></details>
        ))}
      </div>
      </div>
    </section>
  );
}
