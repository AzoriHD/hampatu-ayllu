import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { P } from "../data/constants.js";
import { enviarMensaje } from "../lib/mensajes.js";
import { fotoSegura, simboloDe } from "../lib/utils.js";
import { Msg, Simbolo, Svg } from "./Shared.jsx";
import { Avatar } from "./People.jsx";

/*
 * Descubre: los anuncios de «Necesitamos» (piden) y «Ofrecemos» (ofrecen) de comunidades y personas,
 * de uno en uno, como cartas. Se deslizan a la derecha (me gusta) o a la izquierda (paso), o con los botones.
 * Me gusta = el voto del aviso. Mensaje = mensaje privado al autor. Donar (solo en piden) = una oferta de
 * ayuda por mensaje privado, y queda apuntada como «Puedo ayudar». En ofrecen: «Me interesa».
 */
const IC = {
  paso: '<path d="M6 6l12 12M18 6 6 18"/>',
  gusta: '<path d="M12 20.3s-7.8-4.6-7.8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.8 2.5c0 5.6-7.8 10.2-7.8 10.2z"/>',
  mensaje: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  donar: '<path d="M20 12v8H4v-8M2 7h20v5H2zM12 20V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
  interesa: '<path d="M7 11v9H4v-9h3zM7 11l4-7a2 2 0 0 1 3 2l-1 4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>',
  deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
};
const MAZOS = {
  necesitamos: ["Piden", "Asking", "Comunidades y personas que necesitan algo para cuidar al sapo.", "Communities and people who need something to look after the toad."],
  ofrecemos: ["Ofrecen", "Offering", "Gente que ofrece talleres, material, tiempo o transporte.", "People offering workshops, materials, time or transport."],
};
const CLAVE = "hampatu-descubre";
function leerVistos() { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch (e) { return {}; } }
function guardarVistos(v) { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

export default function Discover() {
  const { en, t, data, uid, canPost, pedirCuenta, votar, apuntesDe } = useApp();
  const [mazo, setMazo] = useState("necesitamos");
  const [vistos, setVistos] = useState(leerVistos); /* {id: "paso" | "gusta"} */
  const [hist, setHist] = useState([]);              /* para deshacer */
  const [salida, setSalida] = useState(null);         /* {id, dir} mientras la carta se va */
  const [dialogo, setDialogo] = useState(null);       /* {modo: "mensaje" | "donar", a} */
  const [aviso, setAviso] = useState("");

  const votosDe = useMemo(() => { const m = {}; data.votos.forEach((v) => { m[v.aviso] = (m[v.aviso] || 0) + 1; }); return m; }, [data.votos]);
  const misVotos = useMemo(() => new Set(data.votos.filter((v) => v.by === uid).map((v) => v.aviso)), [data.votos, uid]);
  const todas = useMemo(() => data.avisos.filter((a) => a.tipo === mazo && !(a.by && a.by === uid)).sort((x, y) => (y.ts || 0) - (x.ts || 0)), [data.avisos, mazo, uid]);
  const quedan = todas.filter((a) => !vistos[a.id] || (salida && salida.id === a.id));
  const cartas = quedan.slice(0, 3);
  const actual = cartas[0];

  useEffect(() => { if (!aviso) return undefined; const tm = setTimeout(() => setAviso(""), 2600); return () => clearTimeout(tm); }, [aviso]);

  const decidir = (a, dir) => {
    if (!a || salida) return;
    if (dir === "gusta") {
      if (!canPost) { pedirCuenta("Para dar me gusta necesitas una cuenta. Es gratis y tarda un minuto."); return false; }
      if (!misVotos.has(a.id)) votar(a.id);
    }
    setSalida({ id: a.id, dir });
    setTimeout(() => {
      setVistos((v) => { const n = { ...v, [a.id]: dir }; guardarVistos(n); return n; });
      setHist((h) => h.concat(a.id).slice(-20));
      setSalida(null);
    }, 320);
    return true;
  };
  const deshacer = () => {
    const id = hist[hist.length - 1];
    if (!id) return;
    setHist((h) => h.slice(0, -1));
    setVistos((v) => { const n = { ...v }; delete n[id]; guardarVistos(n); return n; });
  };
  const empezarDeNuevo = () => {
    setVistos((v) => { const n = { ...v }; todas.forEach((a) => { if (n[a.id] === "paso") delete n[a.id]; }); guardarVistos(n); return n; });
    setHist([]);
  };
  const abrir = (modo, a) => {
    if (!canPost) { pedirCuenta(modo === "donar" ? "Para ofrecer ayuda necesitas una cuenta. Es gratis y tarda un minuto." : "Para mandar mensajes privados necesitas una cuenta. Es gratis y tarda un minuto."); return; }
    setDialogo({ modo, a });
  };

  useEffect(() => {
    const f = (e) => {
      if (dialogo || !actual || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") decidir(actual, "paso");
      if (e.key === "ArrowRight") decidir(actual, "gusta");
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  const piden = mazo === "necesitamos";
  const gustados = todas.filter((a) => vistos[a.id] === "gusta");
  return (
    <section id="v-descubre" className="descubre" aria-labelledby="h-descubre">
      <div className="caja caja-cabeza">
        <header className="vista-head"><div>
          <h2 className="vista-h" id="h-descubre">{en ? "Discover" : "Descubre"}</h2>
          <p className="intro">{en ? "Posts from communities and people, one at a time. Swipe right if you like it, left to pass. You can write to them privately or offer your help." : "Los anuncios de comunidades y personas, de uno en uno. Desliza a la derecha si te gusta y a la izquierda para pasar. Puedes escribirles en privado u ofrecer tu ayuda."}</p>
        </div></header>
        <div className="mazo-tabs" role="tablist" aria-label={en ? "What to see" : "Qué ver"}>
          {Object.keys(MAZOS).map((k) => {
            const n = data.avisos.filter((a) => a.tipo === k && !(a.by && a.by === uid) && !vistos[a.id]).length;
            return <button key={k} type="button" role="tab" aria-selected={mazo === k} className="chipbtn" onClick={() => { setMazo(k); setHist([]); }}>{MAZOS[k][en ? 1 : 0]} <span className="n">{n}</span></button>;
          })}
        </div>
        <p className="meta mazo-sub">{MAZOS[mazo][en ? 3 : 2]}</p>
      </div>

      <div className="mazo-zona caja">
        <div className="mazo" aria-live="polite">
          {cartas.length ? cartas.slice().reverse().map((a) => {
            const i = cartas.indexOf(a);
            return <Carta key={a.id} a={a} nivel={i} arriba={i === 0} saliendo={salida && salida.id === a.id ? salida.dir : ""}
              votos={votosDe[a.id] || 0} ayudan={apuntesDe(a.id).length} onDecidir={(dir) => decidir(a, dir)} />;
          }) : (
            <div className="mazo-fin">
              <Svg width="1.5" d={IC.gusta} />
              <h3>{en ? "You have seen them all" : "Ya los has visto todos"}</h3>
              <p>{todas.length ? (en ? "New posts will appear here." : "Los anuncios nuevos aparecerán aquí.") : (en ? "There are no posts of this kind yet." : "Todavía no hay anuncios de este tipo.")}</p>
              {todas.some((a) => vistos[a.id] === "paso") && <button type="button" className="btn" onClick={empezarDeNuevo}>{en ? "See the ones I passed again" : "Volver a ver los que pasé"}</button>}
              <a className="btn-ghost" href="#tablon">{en ? "Go to the board" : "Ir al tablón"}</a>
            </div>
          )}
        </div>

        {actual && (
          <div className="mazo-botones" role="group" aria-label={en ? "Actions" : "Acciones"}>
            <button type="button" className="redondo r-deshacer" onClick={deshacer} disabled={!hist.length} title={en ? "Undo" : "Deshacer"} aria-label={en ? "Undo" : "Deshacer"}><Svg width="2.2" d={IC.deshacer} /></button>
            <button type="button" className="redondo r-paso" onClick={() => decidir(actual, "paso")} title={en ? "Pass" : "Paso"} aria-label={en ? "Pass" : "Paso"}><Svg width="2.6" d={IC.paso} /></button>
            <button type="button" className="redondo r-mensaje" onClick={() => abrir("mensaje", actual)} disabled={!!actual.ejemplo} title={en ? "Private message" : "Mensaje privado"} aria-label={en ? "Private message" : "Mensaje privado"}><Svg width="2.1" d={IC.mensaje} /></button>
            {piden
              ? <button type="button" className="redondo r-donar" onClick={() => abrir("donar", actual)} disabled={!!actual.ejemplo} title={en ? "Donate or help" : "Donar o ayudar"} aria-label={en ? "Donate or help" : "Donar o ayudar"}><Svg width="2" d={IC.donar} /></button>
              : <button type="button" className="redondo r-donar" onClick={() => abrir("interesa", actual)} disabled={!!actual.ejemplo} title={en ? "I'm interested" : "Me interesa"} aria-label={en ? "I'm interested" : "Me interesa"}><Svg width="2" d={IC.interesa} /></button>}
            <button type="button" className="redondo r-gusta" onClick={() => decidir(actual, "gusta")} aria-pressed={misVotos.has(actual.id)} title={en ? "Like" : "Me gusta"} aria-label={en ? "Like" : "Me gusta"}><Svg width="2.2" d={IC.gusta} /></button>
          </div>
        )}
        {actual && actual.ejemplo && <p className="meta mazo-nota">{en ? "Sample post: you cannot write to it." : "Anuncio de ejemplo: no se le puede escribir."}</p>}
        {actual && <p className="meta mazo-nota solo-raton">{en ? "Tip: use ← and → on the keyboard." : "Truco: también con ← y → del teclado."}</p>}
        <p className="mazo-toast" role="status">{aviso}</p>
      </div>

      {gustados.length > 0 && (
        <div className="caja">
          <h3 className="sub">{en ? "You liked" : "Te gustaron"} <span className="n">{gustados.length}</span></h3>
          <ul className="gustados">
            {gustados.map((a) => <Mini key={a.id} a={a} onMensaje={() => abrir("mensaje", a)} onAyuda={() => abrir(piden ? "donar" : "interesa", a)} piden={piden} />)}
          </ul>
        </div>
      )}

      {dialogo && <Dialogo {...dialogo} onClose={() => setDialogo(null)} onHecho={(txt) => { setDialogo(null); setAviso(txt); }} />}
    </section>
  );
}

/* Quién lo publica: la comunidad (con su símbolo) o la persona (con su foto) */
function useQuien() {
  const { data, perfilDe, t } = useApp();
  return (a) => {
    const c = data.comunidades.find((x) => x.id === a.com);
    const p = a.by && perfilDe(a.by);
    if (c && (!p || String(a.firma || "").trim() === String(c.nombre || "").trim())) return { tipo: "com", c, nombre: c.nombre, sub: p ? p.nombre : a.firma };
    return { tipo: "persona", p: p || { nombre: a.firma }, nombre: (p && p.nombre) || a.firma || t("Sin firma"), sub: (p && p.rol) || (c && c.nombre) || "" };
  };
}

function Carta({ a, nivel, arriba, saliendo, votos, ayudan, onDecidir }) {
  const { en, t, zonaDe } = useApp();
  const quien = useQuien()(a);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [arrastra, setArrastra] = useState(false);
  const ini = useRef(null);
  const foto = fotoSegura(Array.isArray(a.fotos) && a.fotos[0]);

  const abajo = (e) => {
    if (!arriba || saliendo || e.button > 0 || e.target.closest("button,a")) return;
    ini.current = { x: e.clientX, y: e.clientY, id: e.pointerId, mueve: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const mueve = (e) => {
    const s = ini.current; if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x, y = e.clientY - s.y;
    if (!s.mueve && Math.abs(x) < 6) return;
    s.mueve = true; setArrastra(true); setDx(x); setDy(y * 0.35);
  };
  const arriba_ = (e) => {
    const s = ini.current; ini.current = null;
    if (!s || s.id !== e.pointerId) return;
    setArrastra(false);
    const umbral = Math.min(120, window.innerWidth * 0.25);
    if (dx > umbral) { if (onDecidir("gusta") === false) { setDx(0); setDy(0); } return; }
    if (dx < -umbral) { onDecidir("paso"); return; }
    setDx(0); setDy(0);
  };

  const sale = saliendo === "gusta" ? 1 : saliendo === "paso" ? -1 : 0;
  const x = sale ? sale * (window.innerWidth * 0.9 + 200) : dx;
  const rot = sale ? sale * 24 : dx / 16;
  const estilo = arriba
    ? { transform: `translate(${x}px, ${sale ? dy - 40 : dy}px) rotate(${rot}deg)`, transition: arrastra ? "none" : "transform .32s cubic-bezier(.2,.8,.3,1), opacity .32s", opacity: sale ? 0 : 1 }
    : { transform: `translateY(${nivel * 12}px) scale(${1 - nivel * 0.045})`, transition: "transform .3s" };
  const gusta = Math.max(0, Math.min(1, (sale > 0 ? 120 : dx) / 110)), paso = Math.max(0, Math.min(1, (sale < 0 ? 120 : -dx) / 110));

  return (
    <article className={"carta t-" + a.tipo + (arriba ? " arriba" : "")} style={estilo} aria-hidden={!arriba}
      onPointerDown={abajo} onPointerMove={mueve} onPointerUp={arriba_} onPointerCancel={arriba_}>
      <div className={"carta-img" + (foto ? "" : " sin-foto")}>
        {foto ? <img src={foto} alt="" draggable="false" loading="lazy" /> : quien.tipo === "com" ? <Simbolo k={simboloDe(quien.c)} /> : <Avatar p={quien.p} size={96} />}
        <span className="pill">{t(a.tipo === "necesitamos" ? "Necesitamos" : "Ofrecemos")}</span>
        {a.ejemplo && <span className="tag tag-ej">{t("Ejemplo")}</span>}
      </div>
      <span className="sello sello-gusta" style={{ opacity: gusta }}>{en ? "LIKE" : "ME GUSTA"}</span>
      <span className="sello sello-paso" style={{ opacity: paso }}>{en ? "PASS" : "PASO"}</span>
      <div className="carta-cuerpo">
        <div className="carta-quien">
          {quien.tipo === "com" ? <Simbolo k={simboloDe(quien.c)} mini /> : <Avatar p={quien.p} size={30} />}
          <span><strong>{quien.nombre}</strong>{quien.sub && <span className="meta"> · {quien.sub}</span>}</span>
        </div>
        <h3>{a.titulo}</h3>
        {a.texto && <p className="carta-txt">{a.texto}</p>}
        <p className="meta carta-pie">
          {P[a.zona] ? zonaDe(a) : t("Toda la comunidad")}
          {votos > 0 && <> · ♥ {votos}</>}
          {ayudan > 0 && <> · {ayudan} {a.tipo === "necesitamos" ? (en ? "can help" : (ayudan === 1 ? "puede ayudar" : "pueden ayudar")) : (en ? "interested" : (ayudan === 1 ? "interesado" : "interesados"))}</>}
        </p>
      </div>
    </article>
  );
}

function Mini({ a, onMensaje, onAyuda, piden }) {
  const { en, goAviso } = useApp();
  const quien = useQuien()(a);
  return (
    <li className="gustado">
      <button type="button" className="gustado-main" onClick={() => goAviso(a.id)}>
        {quien.tipo === "com" ? <Simbolo k={simboloDe(quien.c)} mini /> : <Avatar p={quien.p} size={32} />}
        <span><strong>{a.titulo}</strong><span className="meta">{quien.nombre}</span></span>
      </button>
      {!a.ejemplo && <span className="gustado-acc">
        <button type="button" className="redondo mini r-mensaje" onClick={onMensaje} aria-label={en ? "Private message" : "Mensaje privado"} title={en ? "Private message" : "Mensaje privado"}><Svg width="2.1" d={IC.mensaje} /></button>
        <button type="button" className="redondo mini r-donar" onClick={onAyuda} aria-label={piden ? (en ? "Donate or help" : "Donar o ayudar") : (en ? "I'm interested" : "Me interesa")} title={piden ? (en ? "Donate or help" : "Donar o ayudar") : (en ? "I'm interested" : "Me interesa")}><Svg width="2" d={piden ? IC.donar : IC.interesa} /></button>
      </span>}
    </li>
  );
}

const FORMAS = { dinero: ["Dinero", "Money"], material: ["Material", "Materials"], tiempo: ["Mi tiempo", "My time"], transporte: ["Transporte", "Transport"] };

/* Mensaje rápido, oferta de ayuda (piden) o «me interesa» (ofrecen), sin salir de Descubre */
function Dialogo({ modo, a, onClose, onHecho }) {
  const { en, uid, firma, perfilDe, apuntar, keepFirma, irVista, setChat } = useApp();
  const quien = useQuien()(a);
  const yo = perfilDe(uid);
  const nombre = (yo && yo.nombre) || firma;
  const [forma, setForma] = useState("dinero");
  const [cuanto, setCuanto] = useState("");
  const [txt, setTxt] = useState(() => modo === "mensaje"
    ? (en ? `Hello! I saw your post «${a.titulo}». ` : `¡Hola! He visto tu anuncio «${a.titulo}». `)
    : modo === "interesa" ? (en ? `Hello! I'm interested in «${a.titulo}». ` : `¡Hola! Me interesa «${a.titulo}». `) : "");
  const [m, setM] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caja = useRef(null);
  useEffect(() => {
    document.body.classList.add("con-modal");
    caja.current?.querySelector("textarea,input")?.focus();
    const f = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", f);
    return () => { document.body.classList.remove("con-modal"); document.removeEventListener("keydown", f); };
  }, [onClose]);

  const enviar = async (ev) => {
    ev.preventDefault();
    if (enviando) return;
    let texto = txt.trim();
    if (modo === "donar") {
      const que = FORMAS[forma][en ? 1 : 0] + (cuanto.trim() ? ": " + cuanto.trim() : "");
      if (!cuanto.trim() && !texto) { setM(en ? "Say what you can give or write a few words." : "Di qué puedes aportar o escribe unas palabras."); return; }
      texto = (en ? "I'd like to help with «" + a.titulo + "». I can give: " : "Quiero ayudar con «" + a.titulo + "». Puedo aportar: ") + que + (texto ? "\n\n" + texto : "");
    }
    if (!texto) { setM(en ? "Write a message." : "Escribe un mensaje."); return; }
    setEnviando(true); setM("");
    try {
      await enviarMensaje(a.by, texto, { aviso: a.id, titulo: String(a.titulo || "").slice(0, 120), tipo: modo }, nombre);
      if (modo !== "mensaje" && nombre) { try { await apuntar(a.id, nombre); keepFirma(nombre); } catch (e) { /* ya apuntado o sin conexión: el mensaje sí llegó */ } }
      onHecho(modo === "donar" ? (en ? "Offer sent. They will reply in Messages." : "Oferta enviada. Te contestarán en Mensajes.") : (en ? "Message sent." : "Mensaje enviado."));
    } catch (e) {
      setM(en ? "It could not be sent. Check the connection and try again." : "No se pudo enviar. Revisa la conexión e inténtalo otra vez.");
    } finally { setEnviando(false); }
  };
  const verChat = () => { setChat({ con: a.by, nombre: quien.nombre, ref: { aviso: a.id, titulo: a.titulo }, k: Date.now() }); irVista("mensajes", true); };

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="h-dialogo" ref={caja}>
        <form className="panel dialogo" onSubmit={enviar}>
          <h2 className="panel-h" id="h-dialogo">{modo === "donar" ? (en ? "Donate or help" : "Donar o ayudar") : modo === "interesa" ? (en ? "I'm interested" : "Me interesa") : (en ? "Private message" : "Mensaje privado")}</h2>
          <p className="meta">{en ? "To " : "Para "}<strong>{quien.nombre}</strong>{en ? " · about " : " · sobre "}«{a.titulo}»</p>
          {modo === "donar" && (
            <>
              <fieldset className="formas"><legend>{en ? "What can you give?" : "¿Qué puedes aportar?"}</legend>
                <div className="chips">{Object.keys(FORMAS).map((k) => (
                  <button key={k} type="button" className="chipbtn" aria-pressed={forma === k} onClick={() => setForma(k)}>{FORMAS[k][en ? 1 : 0]}</button>
                ))}</div>
              </fieldset>
              <div><label htmlFor="d-cuanto">{forma === "dinero" ? (en ? "How much (optional)" : "Cuánto (si quieres)") : (en ? "What exactly" : "Qué exactamente")}</label>
                <input id="d-cuanto" maxLength={120} value={cuanto} onChange={(e) => setCuanto(e.target.value)} placeholder={forma === "dinero" ? "S/ 50" : forma === "material" ? (en ? "2 pairs of boots" : "2 pares de botas") : forma === "tiempo" ? (en ? "A Saturday in December" : "Un sábado de diciembre") : (en ? "Pick-up truck from Huaraz" : "Camioneta desde Huaraz")} /></div>
            </>
          )}
          <div><label htmlFor="d-txt">{modo === "donar" ? (en ? "Message (optional)" : "Mensaje (si quieres)") : (en ? "Message" : "Mensaje")}</label>
            <textarea id="d-txt" rows={4} maxLength={1800} value={txt} onChange={(e) => setTxt(e.target.value)} /></div>
          {modo === "donar" && <p className="hint">{en ? "It reaches them as a private message and you appear as «Can help». You arrange the details between you: Hampatu Ayllu does not collect or keep money." : "Le llega como mensaje privado y apareces en «Pueden ayudar». Los detalles los acordáis entre vosotros: Hampatu Ayllu no cobra ni guarda dinero."}</p>}
          {modo === "interesa" && <p className="hint">{en ? "It reaches them as a private message and you appear as «Interested»." : "Le llega como mensaje privado y apareces en «Interesados»."}</p>}
          <Msg text={m} />
          <div className="panel-actions">
            <button className="btn" type="submit" disabled={enviando}>{enviando ? (en ? "Sending…" : "Enviando…") : modo === "donar" ? (en ? "Send offer" : "Enviar oferta") : (en ? "Send" : "Enviar")}</button>
            <button className="btn-ghost" type="button" onClick={onClose}>{en ? "Cancel" : "Cancelar"}</button>
            {modo === "mensaje" && <button className="linkbtn" type="button" onClick={verChat}>{en ? "Open full conversation" : "Abrir la conversación"}</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
