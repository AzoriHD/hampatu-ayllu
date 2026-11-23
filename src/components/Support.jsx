/*
 * Apoya la causa: donaciones al fondo general o a un proyecto, transparencia y otras formas de colaborar.
 * El cobro lo hace la pasarela de pago desde el servidor (api/donaciones/*). Mientras no haya una entidad
 * receptora configurada, el formulario se ve pero no cobra nada (ver README → «Donaciones»).
 */
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext.jsx";
import { DONAR, FOTO_CABECERA, ONG_COLABORADORA } from "../data/apoyo.js";
import { MONEDAS, PRESETS } from "../data/proyectos.js";
import { claveIdempotencia, comprobarDonacion, dinero, estadoDonaciones, iniciarDonacion } from "../lib/donaciones.js";
import { filas, useCarga, useCifras } from "../lib/tablas.js";
import { copiar, marcarHash } from "../lib/utils.js";
import { Svg } from "./Shared.jsx";
import { Aviso, Barra, useEt, useL } from "./Kit.jsx";

const LIMITES = { eur: [1, 5000], usd: [1, 5000], pen: [5, 20000] };

/* Vuelta desde la página de pago: ?donacion=ok&sid=… o ?donacion=cancelada */
function leerVuelta() {
  try {
    const q = new URLSearchParams(window.location.search);
    const d = q.get("donacion");
    if (!d) return null;
    return { tipo: d === "ok" ? "comprobando" : "cancelada", sid: q.get("sid") || "" };
  } catch (e) { return null; }
}

const RAZONES = [
  ['<path d="M12 21v-8"/><path d="M12 13c0-4.4-3.2-7.5-8-7.5 0 4.6 3.4 7.5 8 7.5z"/><path d="M12 11c0-3.6 2.7-6.5 7.5-6.5 0 3.9-3 6.5-7.5 6.5z"/>',
    "Conservar anfibios y otros animales amenazados", "Protect amphibians and other threatened animals",
    "Empezando por el sapo arlequín peruano, del que se conocen muy pocos ejemplares.", "Starting with the Peruvian harlequin toad, of which very few individuals are known."],
  ['<circle cx="9" cy="8.4" r="3.2"/><path d="M3.4 19.5c.6-3.5 2.9-5.4 5.6-5.4s5 1.9 5.6 5.4"/><circle cx="17.1" cy="9.4" r="2.4"/><path d="M15.7 14.2c2.4.2 4.1 1.9 4.7 5"/>',
    "Trabajar con las comunidades locales", "Work directly with local communities",
    "Quien vive junto a las quebradas decide y lidera.", "Those who live by the streams decide and lead."],
  ['<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="16" r="3"/><path d="m20.2 18.2 1.8 1.8"/>',
    "Unir ciencia y saber local", "Bring science and local knowledge together",
    "Investigadores y comunidades aprenden unos de otros.", "Researchers and communities learn from each other."],
  ['<path d="M12 3c3.6 4.7 6 8 6 11a6 6 0 0 1-12 0c0-3 2.4-6.3 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2 2.4"/>',
    "Proteger el agua y los hábitats", "Protect water and habitats",
    "Fuentes de agua, quebradas y bofedales de los que depende todo.", "Springs, streams and wetlands everything depends on."],
  ['<rect x="6" y="3" width="12" height="17" rx="2.5"/><path d="M10 17h4"/>',
    "Dar herramientas a las comunidades", "Give communities practical tools",
    "Esta plataforma, para organizarse y pedir ayuda.", "This platform, to organise and ask for help."],
  ['<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 10.6V15c1.4 1.5 3 2.2 5 2.2s3.6-.7 5-2.2v-4.4"/>',
    "Formación y educación ambiental", "Training and environmental education",
    "Talleres, escuelas y materiales en su idioma.", "Workshops, schools and materials in their language."],
];
const DESTINOS = [
  ["Conservación de biodiversidad", "Biodiversity conservation", "Seguimiento de especies y protección de hábitats.", "Species monitoring and habitat protection."],
  ["Trabajo comunitario", "Community work", "Actividades, formación y colaboración con las comunidades.", "Activities, training and collaboration with communities."],
  ["Trabajo de campo", "Fieldwork", "Desplazamientos, materiales y equipamiento.", "Travel, materials and equipment."],
  ["Desarrollo de Hampatu Ayllu", "Developing Hampatu Ayllu", "Mantenimiento tecnológico y herramientas para la red de conservación.", "Tech upkeep and tools for the conservation network."],
];
const OTRAS = [
  ["Empresas colaboradoras", "Partner companies", "Patrocinio, material o servicios para los proyectos.", "Sponsorship, materials or services for the projects."],
  ["Universidades e investigadores", "Universities and researchers", "Estudios, prácticas y asesoría científica junto a las comunidades.", "Studies, placements and scientific advice alongside communities."],
  ["Organizaciones ambientales", "Environmental organisations", "Acuerdos para gestionar fondos o sumar proyectos.", "Agreements to manage funds or join projects."],
  ["Voluntariado", "Volunteering", "Campo, educación, diseño, traducción o tecnología.", "Fieldwork, education, design, translation or technology."],
  ["Material y equipamiento", "Materials and equipment", "Botas, kits de bioseguridad, cámaras, GPS…", "Boots, biosecurity kits, cameras, GPS…"],
];

export default function Support() {
  const { en, meta, canPost, donarA, ofrecer, esApp } = useApp();
  const L = useL(), et = useEt();
  const est = useCarga(estadoDonaciones, []);
  const pasarela = est.datos || { activo: false };
  const proyQ = useCarga(() => filas("proyectos", { eq: { publicado: true, acepta_donaciones: true }, orden: "nombre", desc: false }));
  const proyectos = ((proyQ.datos) || []).filter((p) => !p.ejemplo && (p.estado === "buscando" || p.estado === "activo"));
  const cif = useCifras();
  const c = cif.datos || {};
  const monedas = pasarela.activo && pasarela.monedas && pasarela.monedas.length ? pasarela.monedas : ["eur", "usd", "pen"];

  /* ---- formulario ---- */
  const [destino, setDestino] = useState(donarA || "");
  useEffect(() => { if (donarA) setDestino(donarA); }, [donarA]);
  const proyecto = proyectos.find((p) => p.id === destino) || null;
  const [moneda, setMoneda] = useState(() => (/-PE$/i.test(navigator.language || "") ? "pen" : en ? "usd" : "eur"));
  const [frecuencia, setFrecuencia] = useState("puntual");
  const [preset, setPreset] = useState(2);
  const [otra, setOtra] = useState("");
  const [cons, setCons] = useState({ condiciones: false, noticias: false, asociar: false });
  const [msg, setMsg] = useState("");
  const [yendo, setYendo] = useState(false);
  const mon = proyecto ? proyecto.moneda : monedas.includes(moneda) ? moneda : monedas[0];
  const frec = proyecto ? "puntual" : frecuencia;
  const lim = (pasarela.limites && pasarela.limites[mon]) || LIMITES[mon] || [1, 5000];
  const cantidad = preset >= 0 ? PRESETS[mon][preset] : Number(String(otra).replace(",", "."));
  const valida = Number.isFinite(cantidad) && cantidad >= lim[0] && cantidad <= lim[1] && Math.abs(cantidad * 100 - Math.round(cantidad * 100)) < 1e-6;
  const clave = useMemo(claveIdempotencia, [mon, frec, cantidad, destino]); // una por intento: un doble clic no crea dos pagos

  const donar = (ev) => {
    ev.preventDefault();
    if (!pasarela.activo || yendo) return;
    if (!valida) { setMsg(L("Elige una cantidad entre ", "Choose an amount between ") + dinero(lim[0] * 100, mon, en) + L(" y ", " and ") + dinero(lim[1] * 100, mon, en) + "."); return; }
    if (!cons.condiciones) { setMsg(L("Marca la casilla de la donación para continuar.", "Tick the donation box to continue.")); return; }
    setMsg(""); setYendo(true);
    iniciarDonacion({ cantidad: Math.round(cantidad * 100) / 100, moneda: mon, frecuencia: frec, proyecto: proyecto ? proyecto.id : "", idempotencia: clave,
      consentimientos: { condiciones: true, noticias: cons.noticias, asociar: cons.asociar && meta.cuenta }, idioma: en ? "en" : "es" })
      .then((url) => { window.location.assign(url); })
      .catch((e) => {
        setYendo(false);
        setMsg(e.code === "inactivo" ? L("Las donaciones en línea no están activas todavía.", "Online donations are not active yet.")
          : e.code === "cantidad" ? L("Esa cantidad no se puede donar en línea.", "That amount cannot be donated online.")
          : e.code === "proyecto" ? L("Este proyecto ya no recibe donaciones.", "This project no longer accepts donations.")
          : e.code === "red" ? L("No hay conexión. Inténtalo otra vez.", "No connection. Try again.")
          : L("La pasarela de pago no respondió. No se ha hecho ningún cargo. Inténtalo en un momento.", "The payment provider did not respond. Nothing was charged. Try again shortly."));
      });
  };

  /* ---- vuelta desde la pasarela: se comprueba de verdad, nunca se da por hecha ---- */
  const [vuelta, setVuelta] = useState(leerVuelta);
  useEffect(() => {
    if (!vuelta) return;
    try { window.history.replaceState(null, "", window.location.pathname + window.location.hash); } catch (e) { /* ignore */ }
    if (vuelta.tipo !== "comprobando") return;
    if (!/^cs_(test|live)_/.test(vuelta.sid)) { setVuelta({ tipo: "error" }); return; }
    comprobarDonacion(vuelta.sid).then((d) => setVuelta({ tipo: d.estado === "pagada" ? "ok" : d.estado === "procesando" ? "procesando" : d.estado === "cancelada" ? "cancelada" : "pendiente", d }),
      () => setVuelta({ tipo: "error" }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const irForm = () => document.getElementById("elige")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const fondos = c.fondos || [];
  const apoyados = (c.por_proyecto || []).filter((p) => p.recaudado > 0).length;
  const hayTransparencia = fondos.length > 0 || (c.actividades || 0) > 0 || (c.informes || 0) > 0;
  const hayManual = !!(DONAR.yape || DONAR.cuenta || DONAR.cci || DONAR.paypal);

  return (
    <section id="v-apoya" className="apoya" aria-labelledby="h-apoya">
      <div className="caja apoya-hero">
        <div className="apoya-hero-txt">
          <p className="apoya-kicker">{L("Apoya la causa", "Support the cause")}</p>
          <h2 className="vista-h" id="h-apoya">{L("La conservación también está en tus manos", "Conservation is in your hands too")}</h2>
          <p className="intro">{L("Ayúdanos a construir una red de conservación comunitaria en Perú. Cada apoyo nos acerca a comunidades mejor preparadas para proteger su biodiversidad.", "Help us build a community conservation network in Peru. Every contribution brings us closer to communities better prepared to protect their biodiversity.")}</p>
          <button type="button" className="btn-acc" onClick={irForm}>{L("Quiero apoyar", "I want to help")}</button>
        </div>
        <figure className="apoya-hero-img">
          <img src={FOTO_CABECERA.src} width="736" height="486" alt={en ? FOTO_CABECERA.en : FOTO_CABECERA.es} />
        </figure>
      </div>

      {vuelta && <Vuelta v={vuelta} onCerrar={() => setVuelta(null)} />}

      <div className="caja">
        <h3 className="sub">{L("¿Por qué apoyar Hampatu Ayllu?", "Why support Hampatu Ayllu?")}</h3>
        <ul className="razones">
          {RAZONES.map(([d, es, eng, des, deng]) => (
            <li key={es}><span className="razon-ico"><Svg d={d} width="1.9" /></span><div><b>{en ? eng : es}</b><p>{en ? deng : des}</p></div></li>
          ))}
        </ul>
      </div>

      <form className="caja dona-form" id="elige" onSubmit={donar} noValidate>
        <h3 className="sub">{L("Elige tu aportación", "Choose your contribution")}</h3>
        {!pasarela.activo && !est.cargando && (
          <p className="notice dona-off"><strong>{L("Las donaciones en línea todavía no están activas.", "Online donations are not active yet.")}</strong> {L("Estamos preparando la entidad que recibirá los fondos con todas las garantías. Mientras tanto, desde aquí no se cobra nada.", "We are setting up the organisation that will receive the funds with every safeguard. Until then, nothing is charged from this page.")}{(ONG_COLABORADORA.enlace || hayManual || DONAR.correo) ? " " + L("Abajo tienes otras formas de ayudar ya.", "Below you will find other ways to help now.") : ""}</p>
        )}

        {proyectos.length > 0 && (
          <fieldset className="dona-grupo"><legend>{L("¿A qué quieres destinarla?", "What would you like to support?")}</legend>
            <label className="opcion"><input type="radio" name="destino" checked={!proyecto} onChange={() => { setDestino(""); marcarHash("apoya"); }} /><span><b>{L("Fondo general de Hampatu Ayllu", "Hampatu Ayllu general fund")}</b><span className="meta">{L("Se usa donde más falta hace.", "Used where it is needed most.")}</span></span></label>
            {proyectos.map((p) => {
              const x = (c.por_proyecto || []).find((y) => y.id === p.id);
              return (
                <label className="opcion" key={p.id}><input type="radio" name="destino" checked={destino === p.id} onChange={() => { setDestino(p.id); marcarHash("apoya-" + p.id); }} />
                  <span><b>{p.nombre}</b>{p.meta_fondos > 0 && <span className="meta">{dinero((x && x.recaudado) || 0, p.moneda, en)} {L("de", "of")} {dinero(p.meta_fondos, p.moneda, en)}</span>}
                    {p.meta_fondos > 0 && <Barra valor={(x && x.recaudado) || 0} total={p.meta_fondos} />}</span></label>
              );
            })}
          </fieldset>
        )}
        {proyecto && proyecto.destino_fondos && <p className="hint"><b>{L("Destino de los fondos: ", "What the funds are for: ")}</b>{proyecto.destino_fondos}</p>}

        <div className="dona-grupos">
          <div className="dona-grupo" role="group" aria-label={L("Frecuencia", "Frequency")}>
            <span className="label">{L("Frecuencia", "Frequency")}</span>
            <div className="segmento">
              <button type="button" aria-pressed={frec === "puntual"} onClick={() => setFrecuencia("puntual")}>{L("Una vez", "One-off")}</button>
              <button type="button" aria-pressed={frec === "mensual"} disabled={!!proyecto} onClick={() => setFrecuencia("mensual")}>{L("Cada mes", "Monthly")}</button>
            </div>
            {proyecto && <p className="hint">{L("Las donaciones a un proyecto son de una vez.", "Donations to a project are one-off.")}</p>}
          </div>
          <div className="dona-grupo" role="group" aria-label={L("Moneda", "Currency")}>
            <span className="label">{L("Moneda", "Currency")}</span>
            <div className="segmento">
              {(proyecto ? [proyecto.moneda] : monedas).map((m) => <button type="button" key={m} aria-pressed={mon === m} onClick={() => setMoneda(m)}>{m.toUpperCase()}</button>)}
            </div>
            {proyecto && <p className="hint">{L("En la moneda del proyecto: ", "In the project's currency: ")}{et(MONEDAS, proyecto.moneda)}.</p>}
          </div>
        </div>

        <div className="dona-grupo" role="group" aria-label={L("Cantidad", "Amount")}>
          <span className="label">{L("Cantidad", "Amount")}</span>
          <div className="cantidades">
            {PRESETS[mon].map((v, i) => <button type="button" key={v} className="cantidad" aria-pressed={preset === i} onClick={() => { setPreset(i); setOtra(""); }}>{dinero(v * 100, mon, en)}</button>)}
            <label className={"cantidad otra" + (preset < 0 ? " activa" : "")}>
              <span className="sr">{L("Otra cantidad", "Other amount")}</span>
              <input inputMode="decimal" placeholder={L("Otra cantidad", "Other amount")} value={otra} onFocus={() => setPreset(-1)} onChange={(e) => { setPreset(-1); setOtra(e.target.value.replace(/[^\d.,]/g, "").slice(0, 9)); }} />
            </label>
          </div>
        </div>

        <p className="dona-resumen" aria-live="polite">
          {valida ? <>{L("Vas a donar ", "You will donate ")}<b>{dinero(Math.round(cantidad * 100), mon, en)}</b>{frec === "mensual" ? L(" cada mes", " every month") : L(" una vez", " once")}{L(" a ", " to ")}<b>{proyecto ? proyecto.nombre : L("Hampatu Ayllu", "Hampatu Ayllu")}</b>.</> : L("Elige o escribe una cantidad.", "Choose or type an amount.")}
        </p>

        <div className="dona-consent">
          <label className="check"><input type="checkbox" checked={cons.condiciones} onChange={(e) => setCons({ ...cons, condiciones: e.target.checked })} />
            <span>{L("Entiendo que es una donación voluntaria, no la compra de un producto ni de un servicio", "I understand this is a voluntary donation, not the purchase of a product or service")}{pasarela.entidad ? L(", y que la recibe ", ", received by ") + pasarela.entidad : ""}.
              {pasarela.privacidad && <> <a href={pasarela.privacidad} target="_blank" rel="noopener noreferrer">{L("Política de privacidad", "Privacy policy")}</a>.</>}</span></label>
          <label className="check"><input type="checkbox" checked={cons.noticias} onChange={(e) => setCons({ ...cons, noticias: e.target.checked })} /><span>{L("Quiero recibir por correo noticias sobre en qué se usa mi aportación (opcional).", "I would like email updates on how my contribution is used (optional).")}</span></label>
          {canPost && <label className="check"><input type="checkbox" checked={cons.asociar} onChange={(e) => setCons({ ...cons, asociar: e.target.checked })} /><span>{L("Asociar la donación a mi cuenta para verla después (opcional).", "Link the donation to my account so I can see it later (optional).")}</span></label>}
        </div>

        <Aviso texto={msg} />
        <button type="submit" className="btn-acc btn-ancho" disabled={!pasarela.activo || yendo}>
          {yendo ? L("Abriendo el pago seguro…", "Opening secure payment…") : pasarela.activo ? L("Continuar al pago seguro", "Continue to secure payment") : L("Donaciones en línea aún no disponibles", "Online donations not available yet")}
        </button>
        <p className="hint dona-seguro"><Svg width="2" d='<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>' />
          {L("El pago se hace en la página segura de la pasarela (Stripe). Hampatu Ayllu no ve ni guarda los datos de tu tarjeta. La confirmación llega solo cuando el pago se ha completado de verdad.", "Payment happens on the payment provider's secure page (Stripe). Hampatu Ayllu never sees or stores your card details. Confirmation only comes once the payment has really gone through.")}</p>
        {pasarela.entidad && <p className="meta">{L("Recibe las donaciones: ", "Donations are received by: ")}<b>{pasarela.entidad}</b></p>}
      </form>

      {(ONG_COLABORADORA.enlace || hayManual) && (
        <div className="caja">
          <h3 className="sub">{L("Otras formas de donar", "Other ways to donate")}</h3>
          <div className="dona-grid">
            {ONG_COLABORADORA.enlace && /^https:\/\//.test(ONG_COLABORADORA.enlace) && (
              <article className="rec rec-dest"><h4>{L("A través de ", "Through ")}{ONG_COLABORADORA.nombre || L("nuestra ONG colaboradora", "our partner NGO")}</h4>
                {ONG_COLABORADORA.acuerdo && <p>{ONG_COLABORADORA.acuerdo}</p>}
                <a className="btn" href={ONG_COLABORADORA.enlace} target="_blank" rel="noopener noreferrer">{L("Donar en su web", "Donate on their site")}</a></article>
            )}
            {DONAR.yape && <article className="rec"><h4>Yape · Plin</h4><dl><Dato label={L("Número", "Number")} valor={DONAR.yape} />{DONAR.titular && <Dato label={L("A nombre de", "Name")} valor={DONAR.titular} />}</dl></article>}
            {(DONAR.cuenta || DONAR.cci) && <article className="rec"><h4>{L("Transferencia", "Bank transfer")}{DONAR.banco ? " · " + DONAR.banco : ""}</h4><dl><Dato label={L("Cuenta", "Account")} valor={DONAR.cuenta} /><Dato label="CCI" valor={DONAR.cci} />{DONAR.titular && <Dato label={L("A nombre de", "Name")} valor={DONAR.titular} />}</dl></article>}
            {DONAR.paypal && /^https:\/\//.test(DONAR.paypal) && <article className="rec"><h4>PayPal</h4><a className="btn" href={DONAR.paypal} target="_blank" rel="noopener noreferrer">{L("Donar con PayPal", "Donate with PayPal")}</a></article>}
          </div>
          <p className="hint">{L("Lo que llega por estas vías se publica en «Nuestro impacto» cuando la coordinación lo verifica.", "Money received this way appears in “Our impact” once the coordination team verifies it.")}</p>
        </div>
      )}

      <div className="caja">
        <h3 className="sub">{L("¿A dónde irá tu aportación?", "Where will your contribution go?")}</h3>
        <div className="destinos">
          {DESTINOS.map(([es, eng, des, deng], i) => (
            <article key={es} className="destino"><span className="destino-n" aria-hidden="true">{i + 1}</span><h4>{en ? eng : es}</h4><p>{en ? deng : des}</p></article>
          ))}
        </div>
        <p className="meta">{L("Las aportaciones se destinan a las necesidades reales de cada momento, y se publica en qué se usan: cada gasto se registra con su justificante y lo verifica la coordinación.", "Contributions go to real needs as they arise, and how they are used is published: every expense is recorded with its receipt and checked by the coordination team.")}</p>
      </div>

      <div className="caja">
        <h3 className="sub">{L("Transparencia", "Transparency")}</h3>
        {hayTransparencia ? (
          <>
            <div className="tiles">
              {fondos.map((f) => <div className="tile" key={f.moneda}><p className="tile-n">{dinero(f.donaciones + f.otros, f.moneda, en)}</p><p className="tile-l">{L("Recibido", "Received")} · {et(MONEDAS, f.moneda)}</p></div>)}
              <div className="tile"><p className="tile-n">{c.donantes || 0}</p><p className="tile-l">{L("Personas y entidades donantes", "Donors")}</p></div>
              <div className="tile"><p className="tile-n">{c.actividades || 0}</p><p className="tile-l">{L("Actividades realizadas", "Activities carried out")}</p></div>
              <div className="tile"><p className="tile-n">{apoyados}</p><p className="tile-l">{L("Proyectos apoyados", "Projects supported")}</p></div>
              <div className="tile"><p className="tile-n">{c.informes || 0}</p><p className="tile-l">{L("Informes publicados", "Reports published")}</p></div>
            </div>
            <a className="btn-ghost" href="#impacto">{L("Ver informes y cuentas", "See reports and accounts")}</a>
          </>
        ) : (
          <p>{L("Todavía no hay fondos recibidos ni actividades financiadas. Los primeros informes —cantidad recibida, número de colaboradores, actividades y uso de los fondos— se publicarán aquí cuando comiencen las actividades.", "No funds have been received and no activities funded yet. The first reports — amount received, number of contributors, activities and use of funds — will be published here once activities begin.")}</p>
        )}
      </div>

      <div className="caja">
        <h3 className="sub">{L("También puedes colaborar de otras formas", "You can also help in other ways")}</h3>
        <div className="otras-formas">
          {OTRAS.map(([es, eng, des, deng]) => <article key={es} className="rec"><h4>{en ? eng : es}</h4><p>{en ? deng : des}</p></article>)}
        </div>
        <div className="row">
          <a className="btn" href="#colabora">{L("Contactar para colaborar", "Get in touch to collaborate")}</a>
          {DONAR.correo && <a className="btn-ghost" href={"mailto:" + DONAR.correo}>{DONAR.correo}</a>}
        </div>
        <ul className="como">
          <li>{L("Ofrece una recompensa o equipo de campo a las comunidades.", "Offer a reward or field equipment to the communities.")} <button type="button" className="linkbtn" onClick={ofrecer}>{L("Ofrecer", "Offer")}</button></li>
          <li>{L("Compra artesanía del sapo: parte de cada venta va a la comunidad que cuida la quebrada.", "Buy crafts with the toad: part of each sale goes to the community that looks after the stream.")} <a className="linkbtn" href="#artesania">{L("Ver diseños", "See designs")}</a></li>
          {!esApp && <li>{L("Comparte la app con guías, escuelas y comunidades de los Andes.", "Share the app with guides, schools and communities in the Andes.")} <a className="linkbtn" href="#app">{L("La app", "The app")}</a></li>}
        </ul>
      </div>
    </section>
  );
}

function Vuelta({ v, onCerrar }) {
  const { en } = useApp();
  const L = useL();
  const d = v.d || {};
  const txt = {
    comprobando: [L("Comprobando tu donación…", "Checking your donation…"), L("Estamos preguntando a la pasarela de pago si se ha completado.", "We are asking the payment provider whether it went through.")],
    ok: [L("¡Gracias! Tu donación se ha confirmado.", "Thank you! Your donation is confirmed."), d.cantidad ? L("Has donado ", "You donated ") + dinero(d.cantidad, d.moneda, en) + (d.frecuencia === "mensual" ? L(" al mes", " a month") : "") + L(". Recibirás el justificante por correo.", ". You will receive the receipt by email.") : ""],
    procesando: [L("Tu pago se está procesando.", "Your payment is being processed."), L("Algunos medios de pago tardan unos días. Solo contará como recibido cuando la pasarela lo confirme.", "Some payment methods take a few days. It will only count as received once the provider confirms it.")],
    pendiente: [L("El pago no se ha completado.", "The payment was not completed."), L("No se ha hecho ningún cargo. Puedes intentarlo de nuevo.", "Nothing was charged. You can try again.")],
    cancelada: [L("Has cancelado la donación.", "You cancelled the donation."), L("No se ha hecho ningún cargo.", "Nothing was charged.")],
    error: [L("No pudimos comprobar el pago.", "We could not check the payment."), L("Si se completó, recibirás el justificante por correo. Si tienes dudas, escríbenos.", "If it went through, you will receive the receipt by email. If in doubt, write to us.")],
  }[v.tipo] || ["", ""];
  return (
    <div className={"notice vuelta vuelta-" + v.tipo} role="status">
      <p><strong>{txt[0]}</strong> {txt[1]}</p>
      {v.tipo !== "comprobando" && <button type="button" className="linkbtn" onClick={onCerrar}>{L("Cerrar", "Close")}</button>}
    </div>
  );
}

function Dato({ label, valor }) {
  const L = useL();
  const [ok, setOk] = useState(false);
  if (!valor) return null;
  return (
    <div className="dona-dato">
      <dt>{label}</dt>
      <dd><span>{valor}</span>
        <button type="button" className="linkbtn" onClick={() => copiar(valor.replace(/\s+/g, "")).then(() => { setOk(true); setTimeout(() => setOk(false), 1600); }, () => {})}>{ok ? L("Copiado", "Copied") : L("Copiar", "Copy")}</button></dd>
    </div>
  );
}
