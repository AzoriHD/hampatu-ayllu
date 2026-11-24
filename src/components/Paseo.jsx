import { useEffect, useRef } from "react";

/* Sapo que pasea por el borde de arriba de una caja (portada y pie). Anda (webp animado), se sienta y,
   de vez en cuando, caza una mosca. La caza se dibuja en un <canvas> con la hoja de frames del sapo
   (sapo-<color>-caza.webp, 4×2) y la de la mosca (mosca.webp: alas a medio subir, en reposo y pegadas).
   El paseo lo lleva el CSS (.andarin, 66 s); aquí solo se mira en qué punto va para cazar sentado. */
const CICLO = 66000;
const SENTADO = [0.453, 0.953];          // inicio de cada rato sentado y mirando fijo (≈6 s cada uno)
const PROB = 0.1;                        // caza más o menos 1 de cada 10 paradas (a un lado o al otro; nunca dos seguidas)
const PASO = 80;                         // ms por frame de la caza
const ALAS = [1, 2, 3, 2], ALETEO = 55;   // aleteo de la mosca mientras vuela (medio, reposo, pegadas)
const FW = 293, FH = 188, OY = 40, CW = 358, CH = 228;
const MW = 40, MH = 32, AX = 18.6, AY = 13.2;
/* Por frame: [frame del sapo, x de la mosca, y de la mosca, alas (9 = volando, 3 = pegadas, -1 = no hay mosca), opacidad] */
const CAZA = {"amarillo":[[0,333.8,29.6,9,0.2],[0,334.2,27.5,9,0.4],[0,334.2,20.0,9,0.6],[0,318.5,29.0,3,0.8],[0,316.7,37.8,9,1],[0,329.9,27.4,9,1],[0,329.6,36.2,9,1],[0,327.9,51.4,9,1],[0,308.1,47.2,9,1],[0,310.1,50.6,3,1],[0,317.9,66.9,9,1],[0,316.1,69.7,9,1],[0,311.5,70.3,9,1],[0,296.0,83.6,9,1],[0,299.7,91.4,9,1],[0,302.8,92.0,3,1],[0,300.7,100.8,9,1],[0,295.3,110.2,9,1],[0,285.6,112.1,9,1],[0,289.2,116.6,9,1],[0,290.0,124.5,9,1],[0,288.6,127.3,3,1],[0,284.4,128.5,9,1],[0,279.4,132.9,9,1],[0,283.4,135.1,9,1],[0,284.5,133.4,9,1],[1,280.8,139.0,9,1],[2,278.8,140.8,3,1],[3,277.2,142.0,3,1],[3,277.2,142.0,3,1],[4,259.5,129.3,3,1],[5,241.7,116.6,3,1],[1,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0]],"verde":[[0,333.8,29.6,9,0.2],[0,334.2,27.5,9,0.4],[0,334.2,20.0,9,0.6],[0,318.5,29.0,3,0.8],[0,316.7,37.8,9,1],[0,329.9,27.4,9,1],[0,329.7,36.1,9,1],[0,327.9,51.4,9,1],[0,308.2,47.1,9,1],[0,310.2,50.5,3,1],[0,318.0,66.8,9,1],[0,316.2,69.6,9,1],[0,311.6,70.2,9,1],[0,296.2,83.5,9,1],[0,299.8,91.3,9,1],[0,303.0,91.9,3,1],[0,300.9,100.6,9,1],[0,295.5,110.0,9,1],[0,285.8,111.9,9,1],[0,289.4,116.4,9,1],[0,290.2,124.3,9,1],[0,288.9,127.1,3,1],[0,284.7,128.2,9,1],[0,279.7,132.7,9,1],[0,283.7,134.9,9,1],[0,284.8,133.2,9,1],[1,281.0,138.8,9,1],[2,279.0,140.5,3,1],[3,277.5,141.8,3,1],[3,277.5,141.8,3,1],[4,259.6,129.3,3,1],[5,241.7,116.8,3,1],[1,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[7,-12.5,15.0,-1,0],[6,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0],[0,-12.5,15.0,-1,0]]};

export default function Paseo({ color = "amarillo", className = "" }) {
  const giro = useRef(null), sienta = useRef(null), lienzo = useRef(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pasos = CAZA[color];
    let hoja, mosca, listo = false, ultima = -1, antes = false, raf = 0, vivo = true;
    const cargar = () => {
      if (hoja) return;
      hoja = new Image(); hoja.src = `/img/sapo-${color}-caza.webp`;
      mosca = new Image(); mosca.src = "/img/mosca.webp";
      Promise.all([hoja.decode(), mosca.decode()]).then(() => { listo = true; }).catch(() => {});
    };
    const espera = setTimeout(cargar, 2500);
    const pintar = (i, now) => {
      const ctx = lienzo.current?.getContext("2d"); if (!ctx) return;
      const [f, x, y, m, al] = pasos[i];
      ctx.clearRect(0, 0, CW, CH);
      ctx.drawImage(hoja, (f % 4) * FW, Math.floor(f / 4) * FH, FW, FH, 0, OY, FW, FH);
      if (m >= 0) {
        const a = m === 9 ? ALAS[Math.floor(now / ALETEO) % ALAS.length] : m;
        ctx.globalAlpha = al; ctx.drawImage(mosca, a * MW, 0, MW, MH, x - AX, y - AY, MW, MH); ctx.globalAlpha = 1;
      }
    };
    const cazar = () => {
      const s = sienta.current; if (!s) return;
      const t0 = performance.now();
      pintar(0, t0); s.classList.add("cazando");
      const tic = (now) => {
        if (!vivo) return;
        const i = Math.floor((now - t0) / PASO);
        if (i >= pasos.length) { s.classList.remove("cazando"); return; }
        pintar(i, now);
        raf = requestAnimationFrame(tic);
      };
      raf = requestAnimationFrame(tic);
    };
    const vigila = setInterval(() => {
      const el = giro.current?.parentElement;
      const an = el?.getAnimations?.().find((a) => a.animationName === "pasear");
      if (!an || an.currentTime == null || document.hidden) return;
      const t = Number(an.currentTime) - (an.effect?.getComputedTiming?.().delay || 0), p = (t % CICLO) / CICLO;
      SENTADO.forEach((ini, k) => {
        const d = (p - ini + 1) % 1;                     // cuánto lleva sentado (en fracción del ciclo)
        if (d < 0.012 || d > 0.03) return;               // entre 0,8 y 2 s después de sentarse
        const id = Math.floor((t - ini * CICLO) / CICLO) * 2 + k;
        if (id === ultima) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return; // si no se ve, guarda la caza para otra parada
        ultima = id;
        cargar();
        if (listo && !antes && Math.random() < PROB) { antes = true; cazar(); } else antes = false;
      });
    }, 250);
    return () => { vivo = false; clearTimeout(espera); clearInterval(vigila); cancelAnimationFrame(raf); };
  }, [color]);
  return (
    <div className={"paseo " + className} aria-hidden="true">
      <div className="andarin"><div className="giro" ref={giro}>
        <img className="sapo-anda" src={`/img/sapo-${color}-anda.webp`} width={FW} height={FH} alt="" />
        <div className="sapo-sienta" ref={sienta}>
          <img src={`/img/sapo-${color}-sentado.webp`} width={FW} height={FH} alt="" />
          <canvas ref={lienzo} width={CW} height={CH} />
        </div>
      </div></div>
    </div>
  );
}
