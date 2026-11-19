import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { conversaciones, enviarMensaje, marcarLeidos, useMensajes } from "../lib/mensajes.js";
import { localeOf } from "../lib/utils.js";
import { Msg, Svg } from "./Shared.jsx";
import { Avatar } from "./People.jsx";

const ENVIAR = '<path d="M4 12 20 4l-5 16-3.5-6.5L4 12z"/><path d="m11.5 13.5 3-3"/>';
const ATRAS = '<path d="M15 18l-6-6 6-6"/>';

function dia(iso, lang) {
  const d = new Date(iso), h = new Date();
  const ayer = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (d.toDateString() === h.toDateString()) return lang === "en" ? "Today" : "Hoy";
  if (d.toDateString() === ayer.toDateString()) return lang === "en" ? "Yesterday" : "Ayer";
  return d.toLocaleDateString(localeOf(lang), { day: "numeric", month: "long", year: d.getFullYear() === h.getFullYear() ? undefined : "numeric" });
}
const hora = (iso, lang) => new Date(iso).toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" });
function corto(iso, lang) {
  const d = new Date(iso), h = new Date();
  return d.toDateString() === h.toDateString() ? hora(iso, lang) : d.toLocaleDateString(localeOf(lang), { day: "numeric", month: "short" });
}

/* Nombre y foto de la otra persona: su perfil o, si no tiene, la firma de sus mensajes */
export function useOtro() {
  const { perfilDe, t } = useApp();
  return (id, nombre) => {
    const p = perfilDe(id);
    return { p: p || { nombre: nombre || t("Sin nombre") }, nombre: (p && p.nombre) || nombre || t("Sin nombre"), conPerfil: !!p };
  };
}

/* Mensajes privados: conversaciones a la izquierda, la abierta a la derecha (en el móvil, una u otra). */
export default function Messages() {
  const { en, meta, uid, chat, setChat, pedirCuenta } = useApp();
  const lista = useMensajes();
  const otroDe = useOtro();
  if (!meta.cuenta) {
    return (
      <section id="v-mensajes" className="mensajes" aria-labelledby="h-mensajes">
        <div className="caja caja-cabeza"><header className="vista-head"><div>
          <h2 className="vista-h" id="h-mensajes">{en ? "Messages" : "Mensajes"}</h2>
          <p className="intro">{en ? "Private messages between people in the community. You need an account to send and receive them." : "Mensajes privados entre la gente de la comunidad. Para mandarlos y recibirlos necesitas una cuenta."}</p>
          <button className="btn" type="button" onClick={() => pedirCuenta("Para mandar mensajes privados necesitas una cuenta. Es gratis y tarda un minuto.")}>{en ? "Sign in or create an account" : "Entrar o crear una cuenta"}</button>
        </div></header></div>
      </section>
    );
  }
  const convs = conversaciones(lista, uid);
  const abierta = chat && chat.con;
  if (abierta && !convs.some((c) => c.otro === abierta)) convs.unshift({ otro: abierta, ultimo: null, sinLeer: 0, nombre: chat.nombre || "" });

  return (
    <section id="v-mensajes" className={"mensajes" + (abierta ? " con-chat" : "")} aria-labelledby="h-mensajes">
      <div className="chat-marco caja">
        <aside className="chat-lista" aria-label={en ? "Conversations" : "Conversaciones"}>
          <h2 className="chat-lista-h" id="h-mensajes">{en ? "Messages" : "Mensajes"}</h2>
          {convs.length ? (
            <ul>
              {convs.map((c) => {
                const o = otroDe(c.otro, c.nombre), u = c.ultimo;
                return (
                  <li key={c.otro}>
                    <button type="button" className="chat-conv" aria-current={abierta === c.otro ? "true" : undefined} onClick={() => setChat({ con: c.otro, nombre: c.nombre, k: Date.now() })}>
                      <Avatar p={o.p} size={44} />
                      <span className="chat-conv-txt">
                        <span className="chat-conv-top"><strong>{o.nombre}</strong>{u && <span className="chat-conv-hora">{corto(u.created_at, en ? "en" : "es")}</span>}</span>
                        <span className={"chat-conv-ult" + (c.sinLeer ? " nuevo" : "")}>{u ? (u.de === uid ? (en ? "You: " : "Tú: ") : "") + u.texto : (en ? "New conversation" : "Conversación nueva")}</span>
                      </span>
                      {c.sinLeer > 0 && <span className="chat-badge" aria-label={c.sinLeer + (en ? " unread" : " sin leer")}>{c.sinLeer}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="chat-vacio-lista">
              <p>{en ? "You have no messages yet." : "Todavía no tienes mensajes."}</p>
              <p className="meta">{en ? "Write to someone from their profile, from a post or from Discover." : "Escribe a alguien desde su perfil, desde un aviso o desde Descubre."}</p>
              <a className="btn-ghost" href="#descubre">{en ? "Go to Discover" : "Ir a Descubre"}</a>
            </div>
          )}
        </aside>
        {abierta
          ? <Hilo key={abierta} otro={abierta} conv={convs.find((c) => c.otro === abierta)} />
          : <div className="chat-hilo chat-hilo-vacio"><Svg width="1.4" d='<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>' /><p>{en ? "Choose a conversation" : "Elige una conversación"}</p></div>}
      </div>
    </section>
  );
}

function Hilo({ otro, conv }) {
  const { en, lang, uid, firma, perfilDe, irPerfil, goAviso, chat, setChat, data } = useApp();
  const lista = useMensajes();
  const otroDe = useOtro();
  const o = otroDe(otro, conv && conv.nombre);
  const msgs = lista.filter((m) => (m.de === uid && m.para === otro) || (m.de === otro && m.para === uid));
  const ref = chat && chat.con === otro ? chat.ref : null;
  const [txt, setTxt] = useState(() => (chat && chat.con === otro && chat.borrador) || "");
  const [m, setM] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null), area = useRef(null);
  const sinLeer = msgs.some((x) => x.de === otro && !x.leido);

  useEffect(() => { if (sinLeer && document.visibilityState === "visible") marcarLeidos(otro).catch(() => {}); }, [sinLeer, otro]);
  useLayoutEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  useEffect(() => { if (window.matchMedia("(min-width: 721px)").matches) area.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { const a = area.current; if (a) { a.style.height = "auto"; a.style.height = Math.min(a.scrollHeight, 160) + "px"; } }, [txt]);

  const mandar = (ev) => {
    ev?.preventDefault();
    const t = txt.trim();
    if (!t || enviando) return;
    setEnviando(true); setM("");
    const yo = perfilDe(uid);
    enviarMensaje(otro, t, ref, (yo && yo.nombre) || firma)
      .then(() => { setTxt(""); if (ref) setChat({ con: otro, nombre: conv && conv.nombre }); area.current?.focus({ preventScroll: true }); },
        () => setM(en ? "The message could not be sent. Check the connection and try again." : "No se pudo mandar el mensaje. Revisa la conexión e inténtalo otra vez."))
      .finally(() => setEnviando(false));
  };
  const tecla = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) mandar(e); };

  let ultDia = "";
  const ultimoMio = [...msgs].reverse().find((x) => x.de === uid);
  const avisoExiste = (id) => data.avisos.some((a) => a.id === id);
  return (
    <div className="chat-hilo">
      <header className="chat-cab">
        <button type="button" className="icono-btn chat-atras" onClick={() => setChat(null)} aria-label={en ? "Back to conversations" : "Volver a las conversaciones"}><Svg width="2.2" d={ATRAS} /></button>
        {o.conPerfil
          ? <button type="button" className="chat-quien" onClick={() => irPerfil(otro)}><Avatar p={o.p} size={40} /><span><strong>{o.nombre}</strong><span className="meta">{o.p.rol || (en ? "See profile" : "Ver perfil")}</span></span></button>
          : <span className="chat-quien"><Avatar p={o.p} size={40} /><span><strong>{o.nombre}</strong></span></span>}
      </header>
      <div className="chat-msgs" role="log" aria-live="polite" aria-label={(en ? "Conversation with " : "Conversación con ") + o.nombre}>
        {!msgs.length && <p className="chat-aviso">{en ? "Start the conversation. Only the two of you can read it." : "Empieza la conversación. Solo la podéis leer vosotros dos."}</p>}
        {msgs.map((x) => {
          const d = dia(x.created_at, lang), sep = d !== ultDia; ultDia = d;
          const mio = x.de === uid;
          return (
            <div key={x.id} className="chat-fila-w">
              {sep && <div className="chat-dia"><span>{d}</span></div>}
              <div className={"chat-burbuja" + (mio ? " mia" : "")}>
                {x.ref && x.ref.titulo && (
                  avisoExiste(x.ref.aviso)
                    ? <button type="button" className="chat-ref" onClick={() => goAviso(x.ref.aviso)}>{x.ref.tipo === "donar" ? (en ? "Offer to help · " : "Oferta de ayuda · ") : (en ? "About · " : "Sobre · ")}<b>{x.ref.titulo}</b></button>
                    : <span className="chat-ref">{en ? "About · " : "Sobre · "}<b>{x.ref.titulo}</b></span>
                )}
                <p>{x.texto}</p>
                <span className="chat-hora">{hora(x.created_at, lang)}{mio && x === ultimoMio && <> · {x.leido ? (en ? "Read" : "Leído") : (en ? "Sent" : "Enviado")}</>}</span>
              </div>
            </div>
          );
        })}
        <div ref={fin} />
      </div>
      <form className="chat-escribir" onSubmit={mandar}>
        {ref && ref.titulo && <p className="chat-ref-borrador">{en ? "About: " : "Sobre: "}<b>{ref.titulo}</b> <button type="button" className="linkbtn" onClick={() => setChat({ con: otro, nombre: conv && conv.nombre })} aria-label={en ? "Remove" : "Quitar"}>×</button></p>}
        <div className="chat-escribir-fila">
          <label className="vh" htmlFor="chat-txt">{en ? "Message" : "Mensaje"}</label>
          <textarea id="chat-txt" ref={area} rows={1} maxLength={2000} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={tecla} placeholder={en ? "Write a message…" : "Escribe un mensaje…"} />
          <button type="submit" className="chat-enviar" disabled={!txt.trim() || enviando} aria-label={en ? "Send" : "Enviar"}><Svg width="2" d={ENVIAR} /></button>
        </div>
        <Msg text={m} />
      </form>
    </div>
  );
}
