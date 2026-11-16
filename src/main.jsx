import "./lib/pwa.js"; /* primero: el navegador avisa muy pronto de que se puede instalar */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import InstallBanner from "./components/InstallBanner.jsx";
/* Letras propias (sin Google Fonts): cargan rápido y funcionan sin conexión en la app */
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/400-italic.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* App instalable: tarjeta «Instala la app» en su propia raíz */
const raiz = document.createElement("div");
raiz.id = "instalar-raiz";
raiz.style.display = "contents";
document.body.appendChild(raiz);
createRoot(raiz).render(<InstallBanner />);

/* Service worker (solo en la versión publicada): abre rápido y sin cobertura */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
