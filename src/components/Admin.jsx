import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { borrarEjemplos, entrarCoordinacion, hayEjemplos, REMOTE, salirCoordinacion, store } from "../lib/store.js";
import { Msg } from "./Shared.jsx";

/* Top strip: demo notice, network status, coordination bar and sign-in. */
export default function AdminZone() {
  const { t, meta, login, setLogin, write, reiniciar } = useApp();
  const [m, setM] = useState("");
  const [seguro, setSeguro] = useState(false);

  if (!REMOTE) {
    return (
      <p className="notice demo">
        {t("Versión de demostración: lo que publiques se guarda solo en este navegador. Para usarla como red real necesita su propia base de datos.")}{" "}
        <button type="button" className="linkbtn" onClick={reiniciar}>{t("Restablecer los ejemplos")}</button>
      </p>
    );
  }
  return (
    <>
      {meta.status === "loading" && <p className="notice" id="red-estado">{t("Cargando la red…")}</p>}
      {meta.status === "error" && <p className="notice" id="red-estado">{t("No se pudo conectar con la red. Revisa la conexión y recarga la página.")}</p>}
      {meta.admin && (
        <div className="notice admin-bar" id="admin-bar">
          <p><strong>{t("Modo coordinación")}</strong> · {meta.email}</p>
          <p className="meta">{t("Puedes marcar fechas, verificar fotos y editar o borrar cualquier aviso o comunidad.")}</p>
          <div className="row">
            <button type="button" className="linkbtn" id="b-cargar-ej" onClick={() => write(setM, () => store.reset(), () => setM("Ejemplos cargados."))}>{t("Cargar ejemplos")}</button>
            {hayEjemplos() && (seguro
              ? <><button type="button" className="linkbtn danger" id="b-borrar-ej-si" onClick={() => write(setM, borrarEjemplos, () => { setSeguro(false); setM("Ejemplos borrados."); })}>{t("Sí, borrar los ejemplos")}</button>
                  <button type="button" className="linkbtn" onClick={() => setSeguro(false)}>{t("No")}</button></>
              : <button type="button" className="linkbtn danger" id="b-borrar-ej" onClick={() => setSeguro(true)}>{t("Borrar ejemplos")}</button>)}
            <button type="button" className="linkbtn" id="b-salir" onClick={() => salirCoordinacion()}>{t("Salir")}</button>
          </div>
          <Msg id="m-admin" text={m} role="status" />
        </div>
      )}
      {!meta.admin && login && <LoginForm onClose={() => setLogin(false)} />}
    </>
  );
}

function LoginForm({ onClose }) {
  const { t, write } = useApp();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [m, setM] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: "center" }); ref.current?.querySelector("input")?.focus({ preventScroll: true }); }, []);
  const enviar = (ev) => {
    ev.preventDefault();
    if (!email.trim() || !pass) { setM("Escribe tu correo y tu contraseña."); return; }
    write(setM, () => entrarCoordinacion(email.trim(), pass), () => { setPass(""); onClose(); });
  };
  return (
    <form className="panel" id="f-login" noValidate onSubmit={enviar} ref={ref}>
      <h2 className="panel-h">{t("Acceso de coordinación")}</h2>
      <p className="meta">{t("Solo para quien coordina la red. El resto puede publicar sin entrar.")}</p>
      <div className="fields">
        <div className="full"><label htmlFor="lg-email">{t("Correo")}</label>
          <input id="lg-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="full"><label htmlFor="lg-pass">{t("Contraseña")}</label>
          <input id="lg-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
      </div>
      <Msg id="m-login" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{t("Entrar")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{t("Cancelar")}</button>
      </div>
    </form>
  );
}

/* Small link for the footer. */
export function AdminLink() {
  const { t, meta, setLogin } = useApp();
  if (!REMOTE || meta.admin) return null;
  return (
    <p className="admin-link">
      <button type="button" className="linkbtn" id="b-acceso" onClick={() => setLogin(true)}>{t("Acceso de coordinación")}</button>
    </p>
  );
}
