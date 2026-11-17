import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { cancelarRecuperacion, entrar, nuevaClave, recuperarClave, registrarse, REMOTE } from "../lib/store.js";
import { correoValido, str } from "../lib/utils.js";
import { Avatar } from "./People.jsx";
import { Msg } from "./Shared.jsx";

function Caja({ onClose, children }) {
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-caja" role="dialog" aria-modal="true" aria-labelledby="h-cuenta">{children}</div>
    </div>
  );
}

/* Sign in, create an account, forgotten password and, after the reset email, a new password. */
export function AccountPanel() {
  const { t, en, meta, cuentaPanel, setCuentaPanel, write } = useApp();
  const [modo, setModo] = useState(meta.recovery ? "nueva" : cuentaPanel?.modo || "entrar");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nombre, setNombre] = useState("");
  const [m, setM] = useState("");
  const ref = useRef(null);
  const L = (es, eng) => (en ? eng : es);

  useEffect(() => { (ref.current?.querySelector("input") || ref.current?.querySelector("button"))?.focus(); }, [modo]);
  const ir = (x) => { setModo(x); setM(""); setPass(""); };
  const cerrar = () => { if (modo === "nueva") cancelarRecuperacion(); setCuentaPanel(null); };
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", esc);
    document.body.classList.add("con-modal");
    return () => { document.removeEventListener("keydown", esc); document.body.classList.remove("con-modal"); };
  });

  const enviar = (ev) => {
    ev.preventDefault();
    const correo = email.trim().toLowerCase();
    if (modo === "nueva") {
      if (pass.length < 8) { setM("Elige una contraseña más larga, de 8 letras o números como mínimo."); return; }
      write(setM, () => nuevaClave(pass), () => { setPass(""); setCuentaPanel(null); });
      return;
    }
    if (!correoValido(correo)) { setM("Revisa el correo: parece que está mal escrito."); return; }
    if (modo === "olvido") { write(setM, () => recuperarClave(correo), () => ir("enviado")); return; }
    if (!pass) { setM("Escribe tu correo y tu contraseña."); return; }
    if (modo === "entrar") { write(setM, () => entrar(correo, pass), () => { setPass(""); setCuentaPanel(null); }); return; }
    const n = str(nombre, 60);
    if (!n) { setM("Escribe tu nombre."); return; }
    if (pass.length < 8) { setM("Elige una contraseña más larga, de 8 letras o números como mínimo."); return; }
    let r = "";
    write(setM, async () => { r = await registrarse(correo, pass, n); }, () => { setPass(""); if (r === "revisa") ir("revisa"); else setCuentaPanel(null); });
  };

  if (modo === "revisa" || modo === "enviado") {
    return (
      <Caja onClose={cerrar}><div className="panel cuenta" id="f-cuenta" ref={ref}>
        <h2 className="panel-h" id="h-cuenta">{t(modo === "revisa" ? "Revisa tu correo" : "Correo enviado")}</h2>
        <p>{modo === "revisa"
          ? L("Te hemos enviado un enlace a " + email.trim() + ". Ábrelo para activar tu cuenta y volverás aquí con la sesión iniciada. Si no lo ves, mira en la carpeta de spam.",
            "We have sent a link to " + email.trim() + ". Open it to activate your account and you will come back here signed in. If you can't see it, check your spam folder.")
          : L("Si hay una cuenta con " + email.trim() + ", te llegará un enlace para elegir una contraseña nueva.",
            "If there is an account for " + email.trim() + ", you will get a link to choose a new password.")}</p>
        <div className="panel-actions"><button className="btn-ghost" type="button" onClick={cerrar}>{t("Cerrar")}</button></div>
      </div></Caja>
    );
  }

  const titulo = { entrar: "Entrar", crear: "Crear una cuenta", olvido: "Recuperar la contraseña", nueva: "Elige una contraseña nueva" }[modo];
  return (
    <Caja onClose={cerrar}><form className="panel cuenta" id="f-cuenta" noValidate onSubmit={enviar} ref={ref}>
      <h2 className="panel-h" id="h-cuenta">{t(titulo)}</h2>
      {cuentaPanel?.motivo && modo !== "nueva" && <p className="meta">{t(cuentaPanel.motivo)}</p>}
      {modo === "crear" && <p className="meta">{L("Con tu cuenta puedes publicar, responder, votar, apuntarte y tener tu propio perfil, con quién eres, cómo contactarte y tus redes.", "With an account you can post, reply, vote, sign up and have your own profile with who you are, how to reach you and your social media.")}</p>}
      {!REMOTE && modo !== "nueva" && <p className="meta">{L("Versión de demostración: la cuenta se guarda solo en este navegador.", "Demo version: the account is only kept in this browser.")}</p>}
      <div className="fields">
        {modo === "crear" && (
          <div className="full"><label htmlFor="cu-nombre">{L("Tu nombre", "Your name")}</label>
            <input id="cu-nombre" maxLength={60} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={L("Rosa Quispe", "Rosa Quispe")} /></div>
        )}
        {modo !== "nueva" && (
          <div className="full"><label htmlFor="cu-email">{t("Correo")}</label>
            <input id="cu-email" type="email" autoComplete={modo === "crear" ? "email" : "username"} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        )}
        {modo !== "olvido" && (
          <div className="full"><label htmlFor="cu-pass">{t(modo === "nueva" ? "Contraseña nueva" : "Contraseña")}</label>
            <input id="cu-pass" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={pass} onChange={(e) => setPass(e.target.value)} />
            {modo !== "entrar" && <p className="hint">{L("8 letras o números como mínimo.", "At least 8 letters or numbers.")}</p>}</div>
        )}
      </div>
      <Msg id="m-cuenta" text={m} />
      <div className="panel-actions">
        <button className="btn" type="submit">{t({ entrar: "Entrar", crear: "Crear cuenta", olvido: "Enviar enlace", nueva: "Guardar contraseña" }[modo])}</button>
        <button className="btn-ghost" type="button" onClick={cerrar}>{t("Cancelar")}</button>
      </div>
      {modo === "entrar" && (
        <div className="row">
          <button type="button" className="linkbtn" id="b-ir-crear" onClick={() => ir("crear")}>{t("¿No tienes cuenta? Créala")}</button>
          {REMOTE && <button type="button" className="linkbtn" id="b-ir-olvido" onClick={() => ir("olvido")}>{t("He olvidado mi contraseña")}</button>}
        </div>
      )}
      {(modo === "crear" || modo === "olvido") && (
        <div className="row"><button type="button" className="linkbtn" id="b-ir-entrar" onClick={() => ir("entrar")}>{t("Ya tengo cuenta: entrar")}</button></div>
      )}
    </form></Caja>
  );
}

/* Hero button: «Entrar» or, once signed in, the person's own picture and name. */
export function AccountButton() {
  const { t, meta, uid, perfilDe, irPerfil, setCuentaPanel } = useApp();
  if (meta.cuenta) {
    const p = perfilDe(uid) || { nombre: meta.email };
    return (
      <button className="lang yo" type="button" id="b-yo" onClick={() => irPerfil(uid)}>
        <Avatar p={p} size={26} /><span>{String(p.nombre || "").split(" ")[0] || t("Mi perfil")}</span>
      </button>
    );
  }
  return <button className="lang" type="button" id="b-entrar" onClick={() => setCuentaPanel({ modo: "entrar", k: Date.now() })}>{t("Entrar")}</button>;
}
