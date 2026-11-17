/*
 * Música de Hampatu Ayllu (public/audio/musica-hampatu.mp3): los cuatro temas en una sola pista
 * de casi 15 minutos, enlazados con fundidos (Re menor → Re menor → Sol menor → Sol mayor → vuelta a empezar).
 *
 * Se toca con un <audio> normal (no con Web Audio) para que siga sonando con la pantalla apagada
 * o la app en segundo plano, y se anuncia con Media Session: en la pantalla de bloqueo y en el
 * centro de control salen el sapo, el nombre del tema y los botones de pausa, siguiente y anterior.
 * Al encender y apagar, el volumen sube y baja poco a poco (en iPhone el volumen no se puede tocar
 * desde la web, así que allí empieza y para en seco).
 */
const ARCHIVO = "/audio/musica-hampatu.mp3";
const TEMAS = [0, 215.65, 425.32, 653.43]; // segundo en que entra cada tema dentro de la pista
const NUMEROS = ["I", "II", "III", "IV"];
const VOLUMEN = 0.6;
const SUBIDA = 1.6; // segundos para encender o apagar suave

let audio = null, estado = "apagada", quiere = false, rampaId = 0, temaActual = -1;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
const poner = (e) => { if (e !== estado) { estado = e; avisar(); } };

export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const estadoMusica = () => estado;

/* iPhone y iPad no dejan cambiar el volumen de un <audio>: allí no hay fundido */
const volumenFijo = (() => {
  try { const a = new Audio(); a.volume = 0.5; return a.volume !== 0.5; } catch (e) { return true; }
})();

const ms = typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;

function temaEn(t) {
  let i = 0;
  while (i + 1 < TEMAS.length && t >= TEMAS[i + 1] - 0.5) i++;
  return i;
}

function anunciarTema() {
  if (!ms || !audio || typeof MediaMetadata === "undefined") return;
  const i = temaEn(audio.currentTime);
  if (i === temaActual) return;
  temaActual = i;
  ms.metadata = new MediaMetadata({
    title: "Hampatu Ayllu · " + NUMEROS[i],
    artist: "Comunidad del Sapo",
    album: "Música de Hampatu Ayllu",
    artwork: [
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
}

function rampa(hasta, alAcabar) {
  const id = ++rampaId;
  if (volumenFijo) { audio.volume = 1; if (alAcabar) alAcabar(); return; }
  const desde = audio.volume, t0 = performance.now();
  const paso = () => {
    if (id !== rampaId) return; // otra rampa la ha sustituido
    const k = Math.min(1, (performance.now() - t0) / (SUBIDA * 1000));
    audio.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * k * k * (3 - 2 * k)));
    if (k < 1) setTimeout(paso, 40); else if (alAcabar) alAcabar();
  };
  paso();
}

function crear() {
  audio = new Audio();
  audio.preload = "none";
  audio.loop = true;
  audio.src = ARCHIVO;
  audio.volume = volumenFijo ? 1 : 0;
  audio.addEventListener("waiting", () => { if (quiere) poner("cargando"); });
  audio.addEventListener("playing", () => { if (quiere) poner("sonando"); });
  audio.addEventListener("timeupdate", anunciarTema);
  // play/pausa desde fuera (auriculares, pantalla de bloqueo, otra app que toma el sonido)
  audio.addEventListener("play", () => { if (!quiere) { quiere = true; rampa(VOLUMEN); poner("cargando"); } });
  audio.addEventListener("pause", () => { if (quiere) { quiere = false; rampaId++; poner("apagada"); } });
  audio.addEventListener("error", () => { quiere = false; poner("apagada"); });

  if (ms) {
    const accion = (n, f) => { try { ms.setActionHandler(n, f); } catch (e) { /* acción no soportada */ } };
    accion("play", () => encender());
    accion("pause", () => apagar(true));
    accion("stop", () => apagar(true));
    accion("nexttrack", () => saltar(1));
    accion("previoustrack", () => saltar(-1));
    accion("seekto", (d) => { if (d && d.seekTime != null) audio.currentTime = d.seekTime; });
  }
}

export function encender() {
  if (!audio) crear();
  quiere = true;
  poner(audio.readyState >= 3 ? "sonando" : "cargando");
  anunciarTema();
  const p = audio.play(); // dentro del toque, para que el navegador deje sonar
  if (p && p.catch) p.catch(() => { quiere = false; poner("apagada"); });
  rampa(VOLUMEN);
  if (ms) ms.playbackState = "playing";
}

export function apagar(enSeco = false) {
  if (!audio) return;
  quiere = false;
  poner("apagada");
  if (ms) ms.playbackState = "paused";
  if (enSeco) { rampaId++; audio.pause(); return; }
  // ya en silencio, se pausa para no gastar batería ni datos; al encender sigue desde ahí
  rampa(0, () => { if (!quiere) audio.pause(); });
}

/* Siguiente o anterior tema (botones de la pantalla de bloqueo) */
function saltar(dir) {
  if (!audio) return;
  const t = audio.currentTime, i = temaEn(t);
  let j = i + dir;
  if (dir < 0 && t - TEMAS[i] > 4) j = i; // «anterior» a mitad de tema vuelve a su principio
  j = (j + TEMAS.length) % TEMAS.length;
  audio.currentTime = TEMAS[j];
  anunciarTema();
  if (!quiere) encender();
}

export const alternarMusica = () => (estado === "apagada" ? encender() : apagar());
