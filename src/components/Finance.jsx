/* Ingresos, gastos y donaciones (supabase.sql, bloque 13). Lo ven la coordinación y los responsables de cada proyecto. */
import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { CAT_GASTO, CAT_INGRESO, CATEGORIAS_M, ESTADOS_D, ESTADOS_M, MONEDAS } from "../data/proyectos.js";
import { cambiar, crear, enlaceJustificante, filas, subirArchivo, useCarga } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero } from "../lib/donaciones.js";
import { str } from "../lib/utils.js";
import { Autor } from "./People.jsx";
import { Aviso, Cargando, ErrorCarga, fechaCorta, Pestanas, useEnviar, useEt, useL } from "./Kit.jsx";

const centimos = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return !Number.isFinite(n) || n <= 0 ? 0 : Math.round(n * 100); };

/* Totales por moneda de una lista de movimientos */
function totales(l) {
  const m = {};
  l.forEach((x) => {
    if (x.estado === "anulado") return;
    const k = x.moneda; m[k] = m[k] || { ing: 0, gas: 0, pend: 0 };
    if (x.estado === "registrado") m[k].pend += x.importe;
    else if (x.tipo === "ingreso") m[k].ing += x.importe; else m[k].gas += x.importe;
  });
  return m;
}

export function Movimientos({ proyecto, abrir }) {
  const { en, permisos } = useApp();
  const L = useL(), et = useEt();
  const [form, setForm] = useState(!!abrir);
  const [filtro, setFiltro] = useState("");
  const { datos, error, cargando } = useCarga(async () => {
    const [movs, ps] = await Promise.all([
      filas("movimientos", { eq: proyecto ? { proyecto: proyecto.id } : {}, orden: "fecha" }),
      proyecto ? Promise.resolve([proyecto]) : filas("proyectos", { orden: "nombre", desc: false }),
    ]);
    return { movs, ps };
  }, [proyecto && proyecto.id]);
  const movs = (datos && datos.movs) || [];
  const nombreP = (id) => (id ? ((datos && datos.ps.find((p) => p.id === id)) || {}).nombre || "—" : L("Fondo general", "General fund"));
  const lista = movs.filter((m) => !filtro || m.estado === filtro || m.tipo === filtro);
  const tot = totales(movs);
  return (
    <div className="finanzas">
      {Object.keys(tot).length > 0 && (
        <div className="cifras-fila">
          {Object.entries(tot).map(([mon, x]) => (
            <div key={mon} className="cifra-mini">
              <p className="meta">{et(MONEDAS, mon)}</p>
              <p><span className="meta">{L("Ingresos verificados", "Verified income")}</span> <b>{dinero(x.ing, mon, en)}</b></p>
              <p><span className="meta">{L("Gastos verificados", "Verified spending")}</span> <b>{dinero(x.gas, mon, en)}</b></p>
              {x.pend > 0 && <p><span className="meta">{L("Pendiente de verificar", "Awaiting check")}</span> {dinero(x.pend, mon, en)}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn-mini" onClick={() => setForm((v) => !v)}>{form ? L("Cerrar", "Close") : L("Registrar ingreso o gasto", "Record income or spending")}</button>
      </div>
      {form && <MovimientoForm proyecto={proyecto} proyectos={(datos && datos.ps) || []} onClose={() => setForm(false)} />}
      <Pestanas etiqueta={L("Filtrar", "Filter")} valor={filtro} onCambio={setFiltro} opciones={[["", L("Todo", "All")], ["registrado", L("Por verificar", "To check")], ["gasto", L("Gastos", "Spending")], ["ingreso", L("Ingresos", "Income")], ["anulado", L("Anulados", "Cancelled")]]} />
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <ul className="movs">
          {lista.map((m) => <Movimiento key={m.id} m={m} nombreP={nombreP} coord={puede.coordinar(permisos)} mostrarFondo={!proyecto} />)}
        </ul>
      ) : <p className="meta">{L("No hay movimientos registrados.", "No entries recorded.")}</p>}
    </div>
  );
}

function Movimiento({ m, nombreP, coord, mostrarFondo }) {
  const { en, uid } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const [anular, setAnular] = useState(false);
  const [motivo, setMotivo] = useState("");
  const ver = () => env.enviar(async () => { const u = await enlaceJustificante(m.justificante); window.open(u, "_blank", "noopener"); });
  const subir = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (f) env.enviar(async () => { const r = await subirArchivo(f, "justificantes"); await cambiar("movimientos", m.id, { justificante: r.ruta }); });
  };
  return (
    <li className={"mov mov-" + m.tipo + (m.estado === "anulado" ? " anulado" : "")}>
      <div className="mov-top">
        <span className={"tag " + (m.tipo === "ingreso" ? "tag-ok" : "")}>{m.tipo === "ingreso" ? L("Ingreso", "Income") : L("Gasto", "Spending")}</span>
        <b className="mov-imp">{m.tipo === "gasto" ? "−" : "+"}{dinero(m.importe, m.moneda, en)}</b>
        <span className={"tag" + (m.estado === "verificado" ? " tag-ok" : m.estado === "anulado" ? " tag-ej" : "")}>{et(ESTADOS_M, m.estado)}</span>
      </div>
      <p><b>{m.concepto}</b> · {et(CATEGORIAS_M, m.categoria)}{m.contraparte ? " · " + m.contraparte : ""}</p>
      <p className="meta">{fechaCorta(m.fecha, en)}{mostrarFondo ? " · " + nombreP(m.proyecto) : ""} · {L("Registró: ", "Recorded by: ")}<Autor by={m.registrado_por} />
        {m.verificado_por && <> · {L("Verificó: ", "Checked by: ")}<Autor by={m.verificado_por} /></>}</p>
      {m.estado === "anulado" && <p className="meta">{L("Anulado: ", "Cancelled: ")}{m.motivo_anulacion}</p>}
      <div className="row">
        {m.justificante ? <button type="button" className="linkbtn" onClick={ver}>{L("Ver justificante", "View receipt")}</button>
          : m.estado === "registrado" && (coord || m.registrado_por === uid) && (
            <label className="linkbtn subir-btn"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={subir} />{L("Añadir justificante", "Add receipt")}</label>)}
        {coord && m.estado === "registrado" && <button type="button" className="btn-mini" onClick={() => env.enviar(() => cambiar("movimientos", m.id, { estado: "verificado" }))}>{L("Verificar", "Verify")}</button>}
        {m.estado !== "anulado" && (coord || (m.estado === "registrado" && m.registrado_por === uid)) && !anular && <button type="button" className="linkbtn danger" onClick={() => setAnular(true)}>{L("Anular", "Cancel")}</button>}
      </div>
      {anular && (
        <div className="row form-linea">
          <label className="sr" htmlFor={"mot-" + m.id}>{L("Motivo", "Reason")}</label>
          <input id={"mot-" + m.id} maxLength={500} value={motivo} placeholder={L("Motivo de la anulación (obligatorio)", "Reason for cancelling (required)")} onChange={(e) => setMotivo(e.target.value)} />
          <button type="button" className="btn-mini" disabled={!motivo.trim() || env.ocupado} onClick={() => env.enviar(() => cambiar("movimientos", m.id, { estado: "anulado", motivo_anulacion: str(motivo, 500) }), () => setAnular(false))}>{L("Anular", "Cancel it")}</button>
          <button type="button" className="linkbtn" onClick={() => setAnular(false)}>{L("Volver", "Back")}</button>
        </div>
      )}
      <Aviso texto={env.msg} />
    </li>
  );
}

function MovimientoForm({ proyecto, proyectos, onClose }) {
  const { permisos } = useApp();
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const coord = puede.coordinar(permisos);
  const [f, setF] = useState({ tipo: "gasto", proyecto: proyecto ? proyecto.id : "", concepto: "", categoria: "material", importe: "", moneda: proyecto ? proyecto.moneda : "pen",
    fecha: new Date().toISOString().slice(0, 10), contraparte: "", archivo: null });
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const cats = f.tipo === "ingreso" ? CAT_INGRESO : CAT_GASTO;
  const guardar = (ev) => {
    ev.preventDefault();
    const importe = centimos(f.importe);
    if (!coord && !f.proyecto) { setMsg(L("Elige el proyecto.", "Choose the project.")); return; }
    if (str(f.concepto, 200).length < 3) { setMsg(L("Escribe el concepto.", "Write what it is for.")); return; }
    if (!importe) { setMsg(L("Escribe el importe.", "Write the amount.")); return; }
    enviar(async () => {
      let justificante = null;
      if (f.archivo) justificante = (await subirArchivo(f.archivo, "justificantes")).ruta;
      await crear("movimientos", { tipo: f.tipo, proyecto: f.proyecto || null, concepto: str(f.concepto, 200), categoria: cats.includes(f.categoria) ? f.categoria : "otro",
        importe, moneda: f.moneda, fecha: f.fecha, contraparte: str(f.contraparte, 160) || null, justificante });
    }, onClose);
  };
  return (
    <form className="panel panel-sm" onSubmit={guardar} noValidate>
      <div className="fields">
        <div><label htmlFor="m-tipo">{L("Tipo", "Type")}</label>
          <select id="m-tipo" value={f.tipo} onChange={(e) => { set("tipo", e.target.value); set("categoria", e.target.value === "ingreso" ? "donacion" : "material"); }}>
            <option value="gasto">{L("Gasto", "Spending")}</option><option value="ingreso">{L("Ingreso", "Income")}</option>
          </select></div>
        {!proyecto && (
          <div><label htmlFor="m-fondo">{L("Fondo", "Fund")}</label>
            <select id="m-fondo" value={f.proyecto} onChange={(e) => { const p = proyectos.find((x) => x.id === e.target.value); set("proyecto", e.target.value); if (p) set("moneda", p.moneda); }}>
              {coord && <option value="">{L("Fondo general de Hampatu Ayllu", "Hampatu Ayllu general fund")}</option>}
              {!coord && <option value="">{L("Elige el proyecto", "Choose the project")}</option>}
              {proyectos.filter((p) => !p.ejemplo && puede.gestionar(permisos, p.id)).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select></div>
        )}
        <div className="full"><label htmlFor="m-conc">{L("Concepto", "Description")}</label><input id="m-conc" maxLength={200} value={f.concepto} placeholder={f.tipo === "gasto" ? L("Ej.: 10 pares de botas para los recorridos", "E.g. 10 pairs of boots for the walks") : L("Ej.: convenio con la ONG X", "E.g. agreement with NGO X")} onChange={(e) => set("concepto", e.target.value)} /></div>
        <div><label htmlFor="m-cat">{L("Categoría", "Category")}</label>
          <select id="m-cat" value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>{cats.map((k) => <option key={k} value={k}>{et(CATEGORIAS_M, k)}</option>)}</select></div>
        <div><label htmlFor="m-fecha">{L("Fecha", "Date")}</label><input id="m-fecha" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
        <div><label htmlFor="m-imp">{L("Importe", "Amount")}</label><input id="m-imp" inputMode="decimal" value={f.importe} onChange={(e) => set("importe", e.target.value)} /></div>
        <div><label htmlFor="m-mon">{L("Moneda", "Currency")}</label>
          <select id="m-mon" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>{Object.keys(MONEDAS).map((k) => <option key={k} value={k}>{k.toUpperCase()} · {et(MONEDAS, k)}</option>)}</select></div>
        <div className="full"><label htmlFor="m-contra">{f.tipo === "gasto" ? L("Proveedor (empresa o tienda)", "Supplier (company or shop)") : L("Entidad que aporta", "Contributing organisation")}</label>
          <input id="m-contra" maxLength={160} value={f.contraparte} onChange={(e) => set("contraparte", e.target.value)} />
          <p className="hint">{L("No escribas nombres de personas particulares ni números de cuenta.", "Do not write private individuals' names or account numbers.")}</p></div>
        <div className="full"><label htmlFor="m-just">{L("Justificante (factura, boleta o recibo)", "Receipt or invoice")}</label>
          <input id="m-just" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => set("archivo", (e.target.files && e.target.files[0]) || null)} />
          <p className="hint">{L("Se guarda en una carpeta privada: solo lo ven la coordinación y quien lo sube.", "It is stored in a private folder: only the coordination team and the uploader can see it.")}</p></div>
      </div>
      <p className="hint">{L("Una vez registrado no se puede cambiar: si hay un error, se anula con un motivo y se registra de nuevo.", "Once recorded it cannot be changed: if there is a mistake, cancel it with a reason and record it again.")}</p>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Registrar", "Record")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

/* Donaciones recibidas por la pasarela (solo coordinación). Sin datos de tarjeta: no existen aquí. */
export function DonacionesLista() {
  const { en, meta } = useApp();
  const L = useL(), et = useEt();
  const [filtro, setFiltro] = useState("pagada");
  const { datos, error, cargando } = useCarga(async () => {
    const [ds, ps] = await Promise.all([filas("donaciones", { orden: "created_at", limite: 500 }), filas("proyectos", { orden: "nombre", desc: false })]);
    return { ds, ps };
  });
  const ds = (datos && datos.ds) || [];
  const lista = ds.filter((d) => !filtro || d.estado === filtro);
  const nombreP = (id) => (id ? ((datos.ps.find((p) => p.id === id)) || {}).nombre || "—" : L("Fondo general", "General fund"));
  return (
    <div>
      <Pestanas etiqueta={L("Estado", "Status")} valor={filtro} onCambio={setFiltro}
        opciones={[["pagada", et(ESTADOS_D, "pagada"), ds.filter((d) => d.estado === "pagada").length], ["procesando", et(ESTADOS_D, "procesando")], ["", L("Todas", "All"), ds.length]]} />
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : lista.length ? (
        <div className="tabla-w">
          <table className="tabla">
            <thead><tr><th>{L("Fecha", "Date")}</th><th>{L("Importe", "Amount")}</th><th>{L("Tipo", "Type")}</th><th>{L("Destino", "For")}</th><th>{L("Estado", "Status")}</th>{meta.admin && <th>{L("Noticias a", "Updates to")}</th>}</tr></thead>
            <tbody>
              {lista.map((d) => (
                <tr key={d.id}>
                  <td>{fechaCorta(d.pagada_en || d.created_at, en)}</td>
                  <td>{dinero(d.cantidad, d.moneda, en)}</td>
                  <td>{d.frecuencia === "mensual" ? L("Mensual", "Monthly") + (d.origen ? " · " + L("cuota", "instalment") : "") : L("Puntual", "One-off")}</td>
                  <td>{nombreP(d.proyecto)}</td>
                  <td>{et(ESTADOS_D, d.estado)}{d.suscripcion_estado === "cancelada" ? " · " + L("baja", "cancelled") : ""}</td>
                  {meta.admin && <td>{d.email || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="meta">{L("No hay donaciones en este estado.", "No donations with this status.")}</p>}
      <p className="hint">{L("Los datos de pago los guarda la pasarela. Aquí solo hay importes, fechas y estados. El correo solo aparece si la persona aceptó recibir noticias.", "Payment details are kept by the payment provider. Here there are only amounts, dates and statuses. The email only appears if the person agreed to receive updates.")}</p>
    </div>
  );
}
