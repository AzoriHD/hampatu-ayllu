/* Piezas de clan: insignia de cómo se entra, botón para unirse y su ventana de solicitud. */
import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { crear, borrar } from "../lib/tablas.js";
import { INGRESOS, ingresoDe } from "../lib/clanes.js";
import { str } from "../lib/utils.js";
import { Simbolo } from "./Shared.jsx";
import { Aviso, Confirmar, useEnviar, useL } from "./Kit.jsx";

export function IngresoTag({ c }) {
  const { en } = useApp();
  const k = ingresoDe(c);
  return <span className={"tag tag-ingreso ing-" + k} title={INGRESOS[k][en ? 3 : 2]}>{INGRESOS[k][en ? 1 : 0]}</span>;
}

/* Estado de mi membresía o botón para entrar. «grande» en la cabecera de la ficha. */
export function Unirse({ c, mio, grande }) {
  const { canPost, pedirCuenta } = useApp();
  const L = useL();
  const env = useEnviar();
  const [abierto, setAbierto] = useState(false);
  const [hecho, setHecho] = useState("");
  const k = ingresoDe(c);
  const cls = grande ? "btn" : "btn-mini";

  if (mio) {
    const txt = mio.estado === "solicitada" ? L("Solicitud enviada", "Request sent")
      : mio.estado === "rechazada" ? L("Solicitud no aceptada", "Request declined")
      : mio.rol === "representante" ? L("Representas a esta comunidad", "You represent it") : L("Eres miembro", "You're a member");
    return (
      <span className="unirse-estado">
        <span className={"tag tag-mio est-" + mio.estado}>{txt}</span>
        {mio.estado === "solicitada" && <Confirmar texto={L("Retirar", "Withdraw")} onSi={() => env.enviar(() => borrar("comunidad_miembros", mio.id))} />}
        {hecho && <Aviso texto={hecho} tipo="ok" />}
        <Aviso texto={env.msg} />
      </span>
    );
  }
  if (k === "cerrada") return <span className="meta">{L("No admite miembros nuevos", "Not taking new members")}</span>;
  const abrir = () => {
    if (c.ejemplo) { env.setMsg(L("Es una comunidad de ejemplo: aquí no se puede entrar.", "This is an example community: you can't join it.")); return; }
    if (!canPost) { pedirCuenta(L("Para unirte a una comunidad necesitas una cuenta. Es gratis y tarda un minuto.", "To join a community you need an account. It is free and takes a minute.")); return; }
    setAbierto(true);
  };
  return (
    <span className="unirse-estado">
      <button type="button" className={cls + " btn-unirse"} onClick={abrir}>{k === "abierta" ? L("Unirse", "Join") : L("Solicitar unirse", "Request to join")}</button>
      <Aviso texto={env.msg} tipo="suave" />
      {abierto && <SolicitudDialogo c={c} onClose={() => setAbierto(false)} onHecho={setHecho} />}
    </span>
  );
}

function SolicitudDialogo({ c, onClose, onHecho }) {
  const { en } = useApp();
  const L = useL();
  const env = useEnviar();
  const k = ingresoDe(c);
  const [f, setF] = useState({ rol_pedido: "miembro", cargo: "", mensaje: "", publico: true });
  const caja = useRef(null);
  const directo = k === "abierta" && f.rol_pedido === "miembro";
  useEffect(() => {
    caja.current?.querySelector("input,textarea,button")?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = (ev) => {
    ev.preventDefault();
    const d = { comunidad: c.id, rol_pedido: f.rol_pedido, cargo: str(f.cargo, 80) || null, mensaje: str(f.mensaje, 500) || null };
    if (directo) Object.assign(d, { estado: "aceptada", rol: "miembro", publico: !!f.publico });
    env.enviar(() => crear("comunidad_miembros", d), (r) => {
      onHecho(r && r.estado === "aceptada" ? L("¡Ya formas parte de " + c.nombre + "!", "You're now part of " + c.nombre + "!")
        : L("Solicitud enviada. Sus representantes la verán en «Gestión».", "Request sent. Its representatives will see it under “Manage”."));
      onClose();
    });
  };
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="h-unirse" ref={caja}>
        <form className="panel dialogo-clan" onSubmit={enviar} noValidate>
          <div className="com-top">
            <Simbolo com={c} />
            <div>
              <h2 className="panel-h" id="h-unirse">{directo ? L("Unirse a ", "Join ") : L("Solicitar unirse a ", "Request to join ")}{c.nombre}</h2>
              {c.lema && <p className="lema">«{c.lema}»</p>}
              <p className="meta"><IngresoTag c={c} /> {INGRESOS[k][en ? 3 : 2]}</p>
            </div>
          </div>
          {c.requisitos && <div className="requisitos"><b>{L("Lo que pide esta comunidad", "What this community asks")}</b><p>{c.requisitos}</p></div>}
          <fieldset className="formas"><legend>{L("Quiero", "I want to")}</legend>
            <label className="check"><input type="radio" name="rp" checked={f.rol_pedido === "miembro"} onChange={() => setF({ ...f, rol_pedido: "miembro" })} />{L("Ser miembro", "Be a member")}</label>
            <label className="check"><input type="radio" name="rp" checked={f.rol_pedido === "representante"} onChange={() => setF({ ...f, rol_pedido: "representante" })} />{L("Representar a la comunidad (lo aprueban siempre)", "Represent the community (always needs approval)")}</label>
          </fieldset>
          <div><label htmlFor="un-cargo">{L("Cargo o papel (opcional)", "Position or role (optional)")}</label>
            <input id="un-cargo" maxLength={80} value={f.cargo} placeholder={L("Ej.: presidente de la comunidad, docente", "E.g. community president, teacher")} onChange={(e) => setF({ ...f, cargo: e.target.value })} /></div>
          {!directo && <div><label htmlFor="un-msg">{L("Mensaje para sus representantes (opcional)", "Message for its representatives (optional)")}</label>
            <textarea id="un-msg" rows={3} maxLength={500} value={f.mensaje} placeholder={L("Quién eres y por qué quieres unirte", "Who you are and why you want to join")} onChange={(e) => setF({ ...f, mensaje: e.target.value })} /></div>}
          {directo
            ? <label className="check-mini"><input type="checkbox" checked={f.publico} onChange={(e) => setF({ ...f, publico: e.target.checked })} />{L("Mostrar mi nombre entre sus miembros", "Show my name among its members")}</label>
            : <p className="hint">{L("Tu nombre solo saldrá en la ficha si tú lo activas cuando te acepten.", "Your name will only appear on the page if you turn it on once accepted.")}</p>}
          <Aviso texto={env.msg} />
          <div className="panel-actions">
            <button className="btn" type="submit" disabled={env.ocupado}>{directo ? L("Unirme", "Join") : L("Enviar solicitud", "Send request")}</button>
            <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
