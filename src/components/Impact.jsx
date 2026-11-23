/* Nuestro impacto: solo datos verificados y agregados (cifras_publicas() en supabase.sql) e informes publicados. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { CATEGORIAS_M, MONEDAS, TIPOS_ACT, TIPOS_INF } from "../data/proyectos.js";
import { borrar, cambiar, crear, filas, useCarga, useCifras } from "../lib/tablas.js";
import { puede } from "../lib/permisos.js";
import { dinero } from "../lib/donaciones.js";
import { str } from "../lib/utils.js";
import { Archivos, Aviso, Barra, Cargando, Confirmar, ErrorCarga, EstadoP, fechaCorta, Parrafos, Pestanas, SubirDocs, useEnviar, useEt, useL, Vacio } from "./Kit.jsx";

export default function Impact() {
  const { en, meta, permisos } = useApp();
  const L = useL(), et = useEt();
  const cif = useCifras();
  const [form, setForm] = useState(false);
  const extra = useCarga(async () => {
    const [ps, acts, infs] = await Promise.all([
      filas("proyectos", { eq: { publicado: true }, orden: "actualizado" }),
      filas("proyecto_actualizaciones", { orden: "fecha", limite: 40 }),
      filas("informes", { orden: "fecha" }),
    ]);
    return { ps, acts, infs };
  });
  const c = cif.datos || {};
  const ps = ((extra.datos && extra.datos.ps) || []).filter((p) => !p.ejemplo);
  const idsP = new Set(ps.map((p) => p.id));
  const acts = ((extra.datos && extra.datos.acts) || []).filter((a) => idsP.has(a.proyecto)).slice(0, 12);
  const infs = (extra.datos && extra.datos.infs) || [];
  const pr = c.proyectos || {};
  const fondos = c.fondos || [], gastos = c.gastos || [], material = c.material || [];
  const hayAlgo = (c.comunidades_participantes || 0) + Object.values(pr).reduce((s, n) => s + n, 0) + (c.actividades || 0) + (c.resultados || 0)
    + (c.informes || 0) + (c.colaboradores || 0) + fondos.length + gastos.length > 0;
  const puedeInformar = meta.cuenta && (puede.coordinar(permisos) || permisos.participa.size > 0 || permisos.representa.size > 0);

  const tiles = [
    [L("Comunidades participantes", "Communities taking part"), c.comunidades_participantes || 0, L("con al menos un proyecto", "in at least one project")],
    [L("Proyectos activos", "Active projects"), pr.activo || 0, ""],
    [L("Proyectos finalizados", "Completed projects"), pr.finalizado || 0, ""],
    [L("Actividades realizadas", "Activities carried out"), c.actividades || 0, L("validadas", "validated")],
    [L("Resultados documentados", "Documented results"), c.resultados || 0, L("validados", "validated")],
    [L("Colaboradores", "Collaborators"), c.colaboradores || 0, L("en equipos de proyecto", "in project teams")],
    [L("Informes publicados", "Published reports"), c.informes || 0, ""],
  ];

  return (
    <section id="v-impacto" aria-labelledby="h-impacto">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div>
            <h2 className="vista-h" id="h-impacto">{L("Nuestro impacto", "Our impact")}</h2>
            <p className="intro">{L("Lo que Hampatu Ayllu está consiguiendo, con datos que se pueden comprobar: pagos confirmados por la pasarela, ingresos y gastos verificados por la coordinación, y actividades y resultados validados.", "What Hampatu Ayllu is achieving, with figures anyone can check: payments confirmed by the payment provider, income and spending verified by the coordination team, and validated activities and results.")}</p>
          </div>
        </header>
      </div>
      <ErrorCarga error={cif.error} />
      {cif.cargando && !cif.datos ? <Cargando /> : !hayAlgo ? (
        <Vacio med="med-cerro-laguna" titulo={L("Los primeros resultados llegarán con las primeras actividades", "The first results will come with the first activities")}
          texto={L("Aquí no se inventa nada: estas cifras empiezan en cero y crecen solo con lo que se verifica. En cuanto haya proyectos en marcha, actividades validadas o fondos confirmados, se publicarán aquí con sus informes.", "Nothing is made up here: these figures start at zero and grow only with what is verified. As soon as there are projects under way, validated activities or confirmed funds, they will be published here with their reports.")}>
          <div className="row"><a className="btn-ghost" href="#proyectos">{L("Ver proyectos", "See projects")}</a><a className="btn-ghost" href="#colabora">{L("Colaborar", "Get involved")}</a></div>
        </Vacio>
      ) : (
        <>
          <div className="tiles">
            {tiles.map(([et_, n, sub]) => (
              <div className="tile" key={et_}><p className="tile-n">{n.toLocaleString(en ? "en-GB" : "es-PE")}</p><p className="tile-l">{et_}</p>{sub && <p className="meta">{sub}</p>}</div>
            ))}
          </div>
          <div className="caja">
            <h3 className="sub">{L("Dinero", "Money")}</h3>
            {fondos.length || gastos.length ? (
              <div className="tiles tiles-dinero">
                {[...new Set([...fondos.map((f) => f.moneda), ...gastos.map((g) => g.moneda)])].map((mon) => {
                  const f = fondos.find((x) => x.moneda === mon) || { donaciones: 0, otros: 0, aportaciones: 0 };
                  const g = gastos.find((x) => x.moneda === mon) || { total: 0, n: 0 };
                  const m = material.find((x) => x.moneda === mon);
                  return (
                    <div className="tile" key={mon}>
                      <p className="meta">{et(MONEDAS, mon)}</p>
                      <p className="tile-n">{dinero(f.donaciones + f.otros, mon, en)}</p>
                      <p className="tile-l">{L("Fondos recibidos", "Funds received")}</p>
                      <p className="meta">{L("Donaciones: ", "Donations: ")}{dinero(f.donaciones, mon, en)} · {L("Otros ingresos: ", "Other income: ")}{dinero(f.otros, mon, en)}</p>
                      <p className="tile-n2">{dinero(g.total, mon, en)}</p>
                      <p className="tile-l">{L("Gastos registrados y verificados", "Recorded and verified spending")}</p>
                      {m && <p className="meta">{L("Material y equipamiento: ", "Materials and equipment: ")}{dinero(m.total, mon, en)} · {m.n} {m.n === 1 ? L("compra", "purchase") : L("compras", "purchases")}</p>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="meta">{L("Todavía no hay fondos confirmados ni gastos verificados.", "No confirmed funds or verified spending yet.")}</p>}
            {c.donantes > 0 && <p className="meta">{c.donantes} {c.donantes === 1 ? L("persona u organización ha donado", "person or organisation has donated") : L("personas u organizaciones han donado", "people or organisations have donated")}.</p>}
            <Graficos c={c} />
          </div>
          {ps.some((p) => p.meta_fondos > 0 || p.estado !== "preparacion") && (
            <div className="caja">
              <h3 className="sub">{L("Proyectos", "Projects")}</h3>
              <ul className="impacto-proy">
                {ps.map((p) => {
                  const x = (c.por_proyecto || []).find((y) => y.id === p.id) || { recaudado: 0, gastado: 0 };
                  return (
                    <li key={p.id}>
                      <div className="row"><a href={"#proyecto-" + p.id}><b>{p.nombre}</b></a><EstadoP estado={p.estado} /></div>
                      {p.meta_fondos > 0 && <><Barra valor={x.recaudado} total={p.meta_fondos} /><p className="meta">{dinero(x.recaudado, p.moneda, en)} {L("de", "of")} {dinero(p.meta_fondos, p.moneda, en)}{x.gastado ? " · " + L("gastado: ", "spent: ") + dinero(x.gastado, p.moneda, en) : ""}</p></>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {acts.length > 0 && (
        <div className="caja">
          <h3 className="sub">{L("Últimas actualizaciones de los proyectos", "Latest project updates")}</h3>
          <ol className="historial">
            {acts.map((a) => {
              const p = ps.find((x) => x.id === a.proyecto);
              return (
                <li key={a.id}>
                  <p className="historial-fecha">{fechaCorta(a.fecha, en)}</p>
                  <div>
                    <div className="row"><span className="tag">{et(TIPOS_ACT, a.tipo)}</span>{a.validada ? <span className="tag tag-ok">{L("Validado", "Validated")}</span> : <span className="tag tag-ej">{L("Sin validar", "Not validated")}</span>}</div>
                    <h4>{a.titulo}</h4>
                    {p && <p className="meta"><a href={"#proyecto-" + p.id}>{p.nombre}</a></p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="caja" id="informes">
        <div className="caja-tit">
          <h3 className="sub">{L("Informes", "Reports")}</h3>
          {puedeInformar && !form && <button type="button" className="btn-mini" onClick={() => setForm(true)}>{L("Preparar un informe", "Prepare a report")}</button>}
        </div>
        {form && <InformeForm onClose={() => setForm(false)} />}
        {extra.cargando && !extra.datos ? <Cargando /> : infs.length ? <InformesLista lista={infs} proyectos={(extra.datos && extra.datos.ps) || []} />
          : <p className="meta">{L("Los primeros informes se publicarán cuando comiencen las actividades: documentos PDF, fotografías y resúmenes.", "The first reports will be published once activities begin: PDF documents, photos and summaries.")}</p>}
      </div>

      <details className="caja como-se-calcula">
        <summary>{L("Cómo se calculan estas cifras", "How these figures are calculated")}</summary>
        <ul className="lista-puntos">
          <li>{L("Fondos recibidos: donaciones que la pasarela de pago ha confirmado y otros ingresos (convenios, subvenciones, transferencias) que la coordinación ha verificado. Un pago sin confirmar nunca se cuenta.", "Funds received: donations confirmed by the payment provider and other income (agreements, grants, transfers) verified by the coordination team. An unconfirmed payment is never counted.")}</li>
          <li>{L("Gastos: solo los verificados, con su justificante guardado de forma privada. No se borran: los errores se anulan con un motivo.", "Spending: only verified entries, with their receipt kept privately. They are never deleted: mistakes are cancelled with a reason.")}</li>
          <li>{L("Actividades y resultados: actualizaciones de los proyectos que la coordinación ha validado.", "Activities and results: project updates validated by the coordination team.")}</li>
          <li>{L("Los proyectos y comunidades de ejemplo no cuentan nunca.", "Example projects and communities are never counted.")}</li>
          <li>{L("Cada moneda se suma por separado: no se convierten cantidades entre monedas.", "Each currency is added up separately: amounts are never converted between currencies.")}</li>
        </ul>
      </details>
    </section>
  );
}

/* ---------- Gráficos (solo si hay datos suficientes) ---------- */
function Graficos({ c }) {
  const { en } = useApp();
  const L = useL(), et = useEt();
  const monedas = [...new Set([...(c.fondos_mes || []).map((x) => x.moneda), ...(c.gastos_categoria || []).map((x) => x.moneda)])];
  const [mon, setMon] = useState(monedas[0] || "pen");
  const meses = useMemo(() => {
    const l = (c.fondos_mes || []).filter((x) => x.moneda === mon);
    if (l.length < 3) return null;
    /* los últimos 12 meses con meses vacíos incluidos, para no deformar el tiempo */
    const fin = new Date(), out = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(fin.getFullYear(), fin.getMonth() - i, 1);
      const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const x = l.find((y) => y.mes === k);
      out.push({ k, etiqueta: d.toLocaleDateString(en ? "en-GB" : "es-PE", { month: "short" }), titulo: d.toLocaleDateString(en ? "en-GB" : "es-PE", { month: "long", year: "numeric" }), valor: x ? x.total : 0 });
    }
    return out;
  }, [c.fondos_mes, mon, en]);
  const cats = useMemo(() => {
    const l = (c.gastos_categoria || []).filter((x) => x.moneda === mon);
    return l.length >= 2 ? l.map((x) => ({ k: x.categoria, etiqueta: et(CATEGORIAS_M, x.categoria), titulo: et(CATEGORIAS_M, x.categoria), valor: x.total, n: x.n })) : null;
  }, [c.gastos_categoria, mon, en]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!meses && !cats) {
    return monedas.length ? <p className="hint">{L("Los gráficos aparecerán cuando haya datos de al menos tres meses o dos tipos de gasto.", "Charts will appear once there are at least three months of data or two kinds of spending.")}</p> : null;
  }
  const fmt = (v) => dinero(v, mon, en);
  return (
    <div className="graficos">
      {monedas.length > 1 && <Pestanas etiqueta={L("Moneda", "Currency")} valor={mon} onCambio={setMon} opciones={monedas.map((m) => [m, et(MONEDAS, m)])} />}
      {meses && <Columnas titulo={L("Fondos recibidos por mes", "Funds received per month")} sub={L("Últimos 12 meses · ", "Last 12 months · ") + et(MONEDAS, mon)} datos={meses} fmt={fmt} />}
      {cats && <BarrasH titulo={L("Gastos verificados por tipo", "Verified spending by type")} sub={et(MONEDAS, mon)} datos={cats} fmt={fmt} />}
    </div>
  );
}

/* Marcas: barras finas (≤ 24 px), extremo redondeado de 4 px y base recta, 2 px de aire entre barras,
   rejilla fina y discreta, una sola serie (sin leyenda) y tabla con los datos. Color validado en claro y oscuro. */
function escala(max) {
  if (max <= 0) return { tope: 1, pasos: [0, 1] };
  const p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p;
  const paso = (n <= 1.5 ? 0.25 : n <= 3 ? 0.5 : n <= 6 ? 1 : 2) * p;
  const tope = Math.ceil(max / paso) * paso, pasos = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) pasos.push(v);
  return { tope, pasos };
}
const corto = (v, en) => new Intl.NumberFormat(en ? "en-GB" : "es-PE", { notation: v >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v / 100);

function Tooltip({ d, fmt, x, y }) {
  if (!d) return null;
  return <div className="g-tip" style={{ left: x + "%", top: y + "%" }} role="status"><b>{d.titulo}</b><span>{fmt(d.valor)}{d.n ? " · " + d.n : ""}</span></div>;
}

/* Ancho real del gráfico: el texto se dibuja a su tamaño, también en el móvil */
function useAncho(ref, inicial) {
  const [w, setW] = useState(inicial);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const medir = () => setW(Math.max(280, Math.round(el.clientWidth)));
    medir();
    const ro = window.ResizeObserver ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(el); else window.addEventListener("resize", medir);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", medir); };
  }, [ref]);
  return w;
}

function Columnas({ titulo, sub, datos, fmt }) {
  const { en } = useApp();
  const L = useL();
  const [act, setAct] = useState(-1);
  const caja = useRef(null);
  const W = useAncho(caja, 640), H = 240, iz = 44, ab = 28, ar = 18, de = 6;
  const cada = W < 480 ? 2 : 1; /* en pantallas estrechas, un mes sí y otro no en el eje */
  const { tope, pasos } = escala(Math.max(...datos.map((d) => d.valor)));
  const banda = (W - iz - de) / datos.length, ancho = Math.min(24, banda - 2);
  const y = (v) => H - ab - (v / tope) * (H - ab - ar);
  const imax = datos.reduce((m, d, i) => (d.valor > datos[m].valor ? i : m), 0), ult = datos.length - 1;
  return (
    <figure className="grafico">
      <figcaption><b>{titulo}</b><span className="meta">{sub}</span></figcaption>
      <div className="g-lienzo" ref={caja} onMouseLeave={() => setAct(-1)}>
        <svg viewBox={"0 0 " + W + " " + H} width={W} height={H} role="img" aria-label={titulo}>
          {pasos.map((v) => <g key={v}><line className="g-rejilla" x1={iz} x2={W - de} y1={y(v)} y2={y(v)} /><text className="g-eje" x={iz - 8} y={y(v) + 4} textAnchor="end">{corto(v, en)}</text></g>)}
          {datos.map((d, i) => {
            const cx = iz + banda * i + banda / 2, h = H - ab - y(d.valor), r = Math.min(4, h);
            return (
              <g key={d.k} tabIndex={0} role="img" aria-label={d.titulo + ": " + fmt(d.valor)} onMouseEnter={() => setAct(i)} onFocus={() => setAct(i)} onBlur={() => setAct(-1)}>
                <rect className="g-hit" x={cx - banda / 2} y={ar} width={banda} height={H - ab - ar} />
                {d.valor > 0 && <path className={"g-barra" + (act === i ? " activa" : "")} d={`M${cx - ancho / 2},${H - ab} V${y(d.valor) + r} Q${cx - ancho / 2},${y(d.valor)} ${cx - ancho / 2 + r},${y(d.valor)} H${cx + ancho / 2 - r} Q${cx + ancho / 2},${y(d.valor)} ${cx + ancho / 2},${y(d.valor) + r} V${H - ab} Z`} />}
                {(i === imax || i === ult) && d.valor > 0 && <text className="g-valor" x={cx} y={y(d.valor) - 6} textAnchor="middle">{corto(d.valor, en)}</text>}
                {(ult - i) % cada === 0 && <text className="g-eje" x={cx} y={H - 9} textAnchor="middle">{d.etiqueta}</text>}
              </g>
            );
          })}
          <line className="g-base" x1={iz} x2={W - de} y1={H - ab} y2={H - ab} />
        </svg>
        <Tooltip d={datos[act]} fmt={fmt} x={act >= 0 ? ((iz + banda * act + banda / 2) / W) * 100 : 0} y={act >= 0 ? (y(datos[act].valor) / H) * 100 : 0} />
      </div>
      <TablaDatos datos={datos} fmt={fmt} cab={[L("Mes", "Month"), L("Importe", "Amount")]} />
    </figure>
  );
}

function BarrasH({ titulo, sub, datos, fmt }) {
  const L = useL();
  const [act, setAct] = useState(-1);
  const max = Math.max(...datos.map((d) => d.valor)) || 1;
  return (
    <figure className="grafico">
      <figcaption><b>{titulo}</b><span className="meta">{sub}</span></figcaption>
      <ul className="g-barrash" onMouseLeave={() => setAct(-1)}>
        {datos.map((d, i) => (
          <li key={d.k} tabIndex={0} aria-label={d.titulo + ": " + fmt(d.valor)} onMouseEnter={() => setAct(i)} onFocus={() => setAct(i)} onBlur={() => setAct(-1)} className={act === i ? "activa" : ""}>
            <span className="g-cat">{d.etiqueta}</span>
            <span className="g-pista"><span className="g-barra-h" style={{ width: Math.max(1, (d.valor / max) * 100) + "%" }} /><span className="g-valor-h">{fmt(d.valor)}</span></span>
          </li>
        ))}
      </ul>
      <TablaDatos datos={datos} fmt={fmt} cab={[L("Tipo", "Type"), L("Importe", "Amount")]} />
    </figure>
  );
}

function TablaDatos({ datos, fmt, cab }) {
  const L = useL();
  return (
    <details className="g-tabla">
      <summary>{L("Ver los datos en una tabla", "View the data as a table")}</summary>
      <table className="tabla"><thead><tr><th>{cab[0]}</th><th>{cab[1]}</th></tr></thead>
        <tbody>{datos.map((d) => <tr key={d.k}><td>{d.titulo}</td><td>{fmt(d.valor)}</td></tr>)}</tbody></table>
    </details>
  );
}

/* ---------- Informes ---------- */
export function InformesLista({ lista, proyectos = [], compacto }) {
  const { en, uid, permisos } = useApp();
  const L = useL(), et = useEt();
  const env = useEnviar();
  const [tipo, setTipo] = useState("");
  const coord = puede.coordinar(permisos);
  const l = lista.filter((i) => !tipo || i.tipo === tipo);
  const tipos = [...new Set(lista.map((i) => i.tipo))];
  return (
    <div>
      {!compacto && tipos.length > 1 && <Pestanas etiqueta={L("Tipo de informe", "Report type")} valor={tipo} onCambio={setTipo} opciones={[["", L("Todos", "All")], ...tipos.map((k) => [k, et(TIPOS_INF, k)])]} />}
      <ul className="informes">
        {l.map((i) => {
          const p = i.proyecto && proyectos.find((x) => x.id === i.proyecto);
          return (
            <li key={i.id} className="informe">
              <div className="row"><span className="tag">{et(TIPOS_INF, i.tipo)}</span>{!i.publicado && <span className="tag tag-ej">{L("Borrador: pendiente de que la coordinación lo publique", "Draft: waiting for the coordination team to publish it")}</span>}<span className="meta">{fechaCorta(i.fecha, en)}</span></div>
              <h4>{i.titulo}</h4>
              {p && !compacto && <p className="meta"><a href={"#proyecto-" + p.id}>{p.nombre}</a></p>}
              <Parrafos texto={i.resumen} />
              <Archivos lista={i.archivos} />
              <div className="row">
                {coord && <button type="button" className="linkbtn" onClick={() => env.enviar(() => cambiar("informes", i.id, { publicado: !i.publicado }))}>{i.publicado ? L("Retirar", "Unpublish") : L("Publicar", "Publish")}</button>}
                {(coord || (i.by === uid && !i.publicado)) && <Confirmar texto={L("Borrar", "Delete")} onSi={() => env.enviar(() => borrar("informes", i.id))} />}
              </div>
            </li>
          );
        })}
      </ul>
      <Aviso texto={env.msg} />
    </div>
  );
}

export function InformeForm({ presetProyecto, presetComunidad, onClose }) {
  const { data, permisos } = useApp();
  const L = useL(), et = useEt();
  const { msg, setMsg, ocupado, enviar } = useEnviar();
  const coord = puede.coordinar(permisos);
  const ps = useCarga(() => filas("proyectos", { orden: "nombre", desc: false }));
  const misP = (ps.datos || []).filter((p) => !p.ejemplo && puede.participar(permisos, p.id));
  const misC = data.comunidades.filter((c) => puede.representar(permisos, c.id));
  const [f, setF] = useState({ titulo: "", tipo: "actividad", fecha: new Date().toISOString().slice(0, 10), proyecto: presetProyecto || "", comunidad: presetComunidad || "", resumen: "", archivos: [], publicar: false });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = (ev) => {
    ev.preventDefault();
    const d = { titulo: str(f.titulo, 160), tipo: f.tipo, fecha: f.fecha, proyecto: f.proyecto || null, comunidad: f.comunidad || null, resumen: str(f.resumen, 4000) || null, archivos: f.archivos, publicado: coord && f.publicar };
    if (d.titulo.length < 3) { setMsg(L("Escribe un título.", "Write a title.")); return; }
    if (!coord && !d.proyecto && !d.comunidad) { setMsg(L("Elige el proyecto o la comunidad del informe.", "Choose the report's project or community.")); return; }
    enviar(() => crear("informes", d), onClose);
  };
  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <div className="fields">
        <div className="full"><label htmlFor="i-tit">{L("Título", "Title")}</label><input id="i-tit" maxLength={160} value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
        <div><label htmlFor="i-tipo">{L("Tipo", "Type")}</label>
          <select id="i-tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{Object.keys(TIPOS_INF).map((k) => <option key={k} value={k}>{et(TIPOS_INF, k)}</option>)}</select></div>
        <div><label htmlFor="i-fecha">{L("Fecha", "Date")}</label><input id="i-fecha" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></div>
        {!presetProyecto && (
          <div><label htmlFor="i-proy">{L("Proyecto", "Project")}</label>
            <select id="i-proy" value={f.proyecto} onChange={(e) => set("proyecto", e.target.value)}>
              <option value="">{coord ? L("Hampatu Ayllu en general", "Hampatu Ayllu in general") : L("Ninguno", "None")}</option>
              {(coord ? (ps.datos || []).filter((p) => !p.ejemplo) : misP).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select></div>
        )}
        {!presetProyecto && misC.length > 0 && (
          <div><label htmlFor="i-com">{L("Comunidad", "Community")}</label>
            <select id="i-com" value={f.comunidad} onChange={(e) => set("comunidad", e.target.value)}>
              <option value="">{L("Ninguna", "None")}</option>{misC.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
        )}
        <div className="full"><label htmlFor="i-res">{L("Resumen", "Summary")}</label><textarea id="i-res" rows={4} maxLength={4000} value={f.resumen} onChange={(e) => set("resumen", e.target.value)} /></div>
        <div className="full"><span className="label">{L("Documentos PDF y fotografías", "PDF documents and photos")}</span><SubirDocs id="i-arch" docs={f.archivos} onChange={(v) => set("archivos", v)} max={10} /></div>
        {coord && <label className="check full"><input type="checkbox" checked={f.publicar} onChange={(e) => set("publicar", e.target.checked)} />{L("Publicarlo ya", "Publish it now")}</label>}
      </div>
      {!coord && <p className="hint">{L("La coordinación lo revisará antes de publicarlo.", "The coordination team will review it before publishing.")}</p>}
      <p className="hint">{L("Comprueba que las fotos y documentos no muestran datos personales ni ubicaciones exactas sin permiso.", "Check that photos and documents do not show personal data or exact locations without permission.")}</p>
      <Aviso texto={msg} />
      <div className="panel-actions">
        <button className="btn" type="submit" disabled={ocupado}>{ocupado ? L("Guardando…", "Saving…") : L("Guardar informe", "Save report")}</button>
        <button className="btn-ghost" type="button" onClick={onClose}>{L("Cancelar", "Cancel")}</button>
      </div>
    </form>
  );
}

