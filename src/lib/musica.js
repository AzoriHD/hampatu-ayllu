/*
 * Música de Hampatu Ayllu (public/audio/musica-hampatu.mp3): los cuatro temas mezclados en una sola
 * pieza continua de casi 15 minutos que vuelve a empezar sola. Suena como una sola música: no hay temas
 * sueltos ni se puede saltar o adelantar, solo encender y apagar.
 *
 * Se toca con un <audio> normal (no con Web Audio) para que siga sonando con la pantalla apagada
 * o la app en segundo plano, y se anuncia con Media Session: en la pantalla de bloqueo y en el
 * centro de control salen el sapo, «Hampatu Ayllu» y el botón de pausa (sin siguiente, anterior ni barra).
 * Al encender y apagar, el volumen sube y baja poco a poco, y con la música puesta sale un deslizador
 * de volumen al lado del botón. En iPhone y iPad la web no puede tocar el volumen: allí empieza y para
 * en seco y no sale deslizador (se usan los botones del móvil).
 */
const ARCHIVO = "/audio/musica-hampatu.mp3";
const CLAVE_VOL = "hampatu-volumen";
const SUBIDA = 1.6; // segundos para encender o apagar suave

let audio = null, estado = "apagada", quiere = false, rampaId = 0, anunciada = false;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
const poner = (e) => { if (e !== estado) { estado = e; avisar(); } };

export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const estadoMusica = () => estado;

/* iPhone y iPad no dejan cambiar el volumen de un <audio>: allí no hay fundido */
const volumenFijo = (() => {
  try { const a = new Audio(); a.volume = 0.5; return a.volume !== 0.5; } catch (e) { return true; }
})();

/* Volumen elegido con el deslizador (0 a 1), guardado para la próxima vez. Se aplica en curva
   (al cuadrado) para que el deslizador se note parejo al oído en todo su recorrido. */
let nivel = (() => { try { const v = parseFloat(localStorage.getItem(CLAVE_VOL)); return v >= 0 && v <= 1 ? v : 0.75; } catch (e) { return 0.75; } })();
const real = () => nivel * nivel;
export const volumenAjustable = !volumenFijo;
export const volumenMusica = () => nivel;
export function ponerVolumen(v) {
  nivel = Math.max(0, Math.min(1, +v || 0));
  try { localStorage.setItem(CLAVE_VOL, String(nivel)); } catch (e) { /* sin almacenamiento */ }
  if (audio && quiere && !volumenFijo) { rampaId++; audio.volume = real(); } // al momento, sin fundido
  avisar();
}

const ms = typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;

function anunciarTema() {
  if (!ms || anunciada || typeof MediaMetadata === "undefined") return;
  anunciada = true;
  ms.metadata = new MediaMetadata({
    title: "Hampatu Ayllu",
    artist: "Comunidad del Sapo",
    album: "Música de Hampatu Ayllu",
    artwork: [
      { src: "/icon-maskable-192.png?v=11", sizes: "192x192", type: "image/png" },
      { src: "/icon-maskable-512.png?v=11", sizes: "512x512", type: "image/png" },
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
  // play/pausa desde fuera (auriculares, pantalla de bloqueo, otra app que toma el sonido)
  audio.addEventListener("play", () => { if (!quiere) { quiere = true; rampa(real()); poner("cargando"); } });
  audio.addEventListener("pause", () => { if (quiere) { quiere = false; rampaId++; poner("apagada"); } });
  audio.addEventListener("error", () => { quiere = false; poner("apagada"); });

  if (ms) {
    const accion = (n, f) => { try { ms.setActionHandler(n, f); } catch (e) { /* acción no soportada */ } };
    accion("play", () => encender());
    accion("pause", () => apagar(true));
    accion("stop", () => apagar(true));
    // ni saltar ni adelantar: es una sola música
    for (const n of ["nexttrack", "previoustrack", "seekto", "seekforward", "seekbackward"]) accion(n, null);
  }
}

export function encender() {
  if (!audio) crear();
  quiere = true;
  poner(audio.readyState >= 3 ? "sonando" : "cargando");
  anunciarTema();
  const p = audio.play(); // dentro del toque, para que el navegador deje sonar
  if (p && p.catch) p.catch(() => { quiere = false; poner("apagada"); });
  rampa(real());
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

export const alternarMusica = () => (estado === "apagada" ? encender() : apagar());

/* Clic del botón «He visto al hampatu» (public/audio/boton.mp3). Solo suena con la música puesta, al volumen
   de la música. Va por Web Audio y no por otro <audio>, para que en el iPhone no pare la música. */
let ctx = null, clic = null, cargandoClic = null;
export function prepararClic() {
  if (estado === "apagada") return;
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!clic && !cargandoClic) {
      cargandoClic = fetch("/audio/boton.mp3").then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, mal) => ctx.decodeAudioData(b, ok, mal)))
        .then((buf) => { clic = buf; }).catch(() => {}).finally(() => { cargandoClic = null; });
    }
  } catch (e) { /* sin sonido */ }
}
export function sonarClic() {
  if (estado === "apagada") return;
  prepararClic();
  const tocar = () => {
    if (!ctx || !clic) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    g.gain.value = volumenFijo ? 0.8 : Math.max(0.15, real());
    s.buffer = clic; s.connect(g).connect(ctx.destination); s.start();
  };
  if (clic) tocar(); else if (cargandoClic) cargandoClic.then(tocar);
}
