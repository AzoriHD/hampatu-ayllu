import { useEffect, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { borrarEjemplos, hayEjemplos, REMOTE, salir, store } from "../lib/store.js";
import { cargarAvistamientos, useAvistamientos } from "../lib/avistamientos.js";
import { Msg } from "./Shared.jsx";

/* Top strip: demo notice, community status and the coordination bar. */
export default function AdminZone() {
  const { t, meta, write, reiniciar } = useApp();
  const [m, setM] = useState("");
  const [seguro, setSeguro] = useState(false);
  const avist = useAvistamientos();
  useEffect(() => { if (meta.admin && meta.cuenta) cargarAvistamientos(meta.uid, true).catch(() => {}); }, [meta.admin, meta.cuenta, meta.uid]);
  const nuevos = avist.filter((a) => a.estado === "nuevo").length;

  if (!REMOTE) {
    return (
      <p className="notice demo">
        {t("Versión de demostración: lo que publiques se guarda solo en este navegador. Para usarla como comunidad real necesita su propia base de datos.")}{" "}
        <button type="button" className="linkbtn" onClick={reiniciar}>{t("Restablecer los ejemplos")}</button>
      </p>
    );
  }
  return (
    <>
      {meta.status === "loading" && <p className="notice" id="red-estado">{t("Cargando la comunidad…")}</p>}
      {meta.status === "error" && <p className="notice" id="red-estado">{t("No se pudo conectar con la comunidad. Revisa la conexión y recarga la página.")}</p>}
      {meta.admin && (
        <div className="notice admin-bar" id="admin-bar">
          <p><strong>{t("Modo coordinación")}</strong> · {meta.email}</p>
          <p className="meta">{t("Puedes marcar fechas, verificar fotos y editar o borrar cualquier aviso o comunidad.")}</p>
          {nuevos > 0 && <p><a href="#visto"><strong>{nuevos === 1 ? t("1 avistamiento nuevo por revisar") : nuevos + " " + t("avistamientos nuevos por revisar")}</strong></a></p>}
          <div className="row">
            <button type="button" className="linkbtn" id="b-cargar-ej" onClick={() => write(setM, () => store.reset(), () => setM("Ejemplos cargados."))}>{t("Cargar ejemplos")}</button>
            {hayEjemplos() && (seguro
              ? <><button type="button" className="linkbtn danger" id="b-borrar-ej-si" onClick={() => write(setM, borrarEjemplos, () => { setSeguro(false); setM("Ejemplos borrados."); })}>{t("Sí, borrar los ejemplos")}</button>
                  <button type="button" className="linkbtn" onClick={() => setSeguro(false)}>{t("No")}</button></>
              : <button type="button" className="linkbtn danger" id="b-borrar-ej" onClick={() => setSeguro(true)}>{t("Borrar ejemplos")}</button>)}
            <button type="button" className="linkbtn" id="b-salir" onClick={() => salir()}>{t("Salir")}</button>
          </div>
          <Msg id="m-admin" text={m} role="status" />
        </div>
      )}
    </>
  );
}
