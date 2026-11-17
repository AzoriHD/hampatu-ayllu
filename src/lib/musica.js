/*
 * Música ambiental (public/audio/ambiente.mp3): sonidos de la jalca en bucle sin fin.
 * El archivo ya está preparado para que su final se funda con su principio, y se toca con
 * Web Audio (no con <audio loop>) porque así no queda ningún silencio entre una vuelta y otra.
 * Sube y baja el volumen poco a poco al encender y apagar, y se calla si la pestaña queda oculta.
 */
const ARCHIVO = "/audio/ambiente.mp3";
const VOLUMEN = 0.55;
const SUBIDA = 2.5; // segundos para encender o apagar suave

let ctx = null, ganancia = null, fuente = null, buffer = null, cargando = null;
let sonando = false, estado = "apagada"; // apagada | cargando | sonando
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
const poner = (e) => { estado = e; avisar(); };

export const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
export const estadoMusica = () => estado;

/* El mp3 trae unas milésimas de silencio al principio y al final (relleno del codificador):
   el bucle salta por encima para no oír un corte. */
function bordesConSonido(b) {
  const umbral = 1e-4, max = Math.min(b.length >> 2, 8192);
  const canales = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
  const hay = (n) => canales.some((c) => Math.abs(c[n]) > umbral);
  let ini = 0, fin = b.length;
  while (ini < max && !hay(ini)) ini++;
  while (fin > b.length - max && !hay(fin - 1)) fin--;
  return [ini / b.sampleRate, fin / b.sampleRate];
}

function cargar() {
  if (!cargando) {
    cargando = fetch(ARCHIVO)
      .then((r) => { if (!r.ok) throw new Error("audio " + r.status); return r.arrayBuffer(); })
      .then((datos) => new Promise((ok, mal) => ctx.decodeAudioData(datos, ok, mal)))
      .then((b) => { buffer = b; return b; })
      .catch((e) => { cargando = null; throw e; });
  }
  return cargando;
}

function rampa(hasta) {
  const ahora = ctx.currentTime;
  ganancia.gain.cancelScheduledValues(ahora);
  ganancia.gain.setValueAtTime(ganancia.gain.value, ahora);
  ganancia.gain.linearRampToValueAtTime(hasta, ahora + SUBIDA);
}

export async function encender() {
  sonando = true;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { sonando = false; return; }
    ctx = new AC();
    ganancia = ctx.createGain();
    ganancia.gain.value = 0;
    ganancia.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {}); // dentro del toque, para que el navegador deje sonar
  if (!buffer) poner("cargando");
  try { await cargar(); } catch (e) { sonando = false; poner("apagada"); return; }
  if (!sonando) return; // la apagaron mientras cargaba
  if (!fuente) {
    const [ini, fin] = bordesConSonido(buffer);
    fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    fuente.loopStart = ini;
    fuente.loopEnd = fin;
    fuente.connect(ganancia);
    fuente.start(0, ini);
  }
  rampa(VOLUMEN);
  poner("sonando");
}

export function apagar() {
  sonando = false;
  if (ctx && ganancia) {
    rampa(0);
    // ya en silencio, se pausa para no gastar batería; al encender sigue desde ahí
    setTimeout(() => { if (!sonando) ctx.suspend().catch(() => {}); }, SUBIDA * 1000 + 100);
  }
  poner("apagada");
}

export const alternarMusica = () => (estado === "apagada" ? encender() : apagar());

/* Pestaña oculta o móvil bloqueado: pausa; al volver, sigue donde iba */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (sonando) ctx.resume().catch(() => {});
  });
}
