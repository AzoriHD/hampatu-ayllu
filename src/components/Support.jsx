import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { ACTUALIZADO, DONAR, PRESUPUESTO, RECIBIDO } from "../data/apoyo.js";
import { copiar, cuandoTexto } from "../lib/utils.js";

const soles = (n, en) => "S/ " + Math.round(n || 0).toLocaleString(en ? "en-GB" : "es-PE");

function Dato({ label, valor }) {
  const { en } = useApp();
  const [ok, setOk] = useState(false);
  if (!valor) return null;
  return (
    <div className="dona-dato">
      <dt>{label}</dt>
      <dd><span>{valor}</span>
        <button type="button" className="linkbtn" onClick={() => copiar(valor.replace(/\s+/g, "")).then(() => { setOk(true); setTimeout(() => setOk(false), 1600); }, () => {})}>
          {ok ? (en ? "Copied" : "Copiado") : (en ? "Copy" : "Copiar")}
        </button></dd>
    </div>
  );
}

/* Apoya el proyecto: cómo donar y en qué se gasta cada sol. Los datos están en src/data/apoyo.js. */
export default function Support() {
  const { en, lang, ofrecer, esApp } = useApp();
  const hayYape = !!DONAR.yape, hayBanco = !!(DONAR.cuenta || DONAR.cci), hayDonar = hayYape || hayBanco || !!DONAR.paypal;
  const total = PRESUPUESTO.reduce((s, l) => s + (l.soles || 0), 0);
  const gastado = PRESUPUESTO.reduce((s, l) => s + (l.gastado || 0), 0);
  const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

  return (
    <section id="v-apoya" className="apoya recompensas" aria-labelledby="h-apoya">
      <div className="caja caja-cabeza">
        <header className="vista-head">
          <div><h2 className="vista-h" id="h-apoya">{en ? "Support the project" : "Apoya el proyecto"}</h2>
          <p className="intro">{en ? "Fewer than 50 adult toads are thought to remain. Your support pays for monitoring, photo rewards and biosecurity for the communities that look after the streams. Every sol that comes in, and what it is spent on, is published here." : "Se calcula que quedan menos de 50 sapos adultos. Tu apoyo paga el monitoreo, las recompensas por foto y la bioseguridad de las comunidades que cuidan las quebradas. Cada sol que entra, y en qué se gasta, se publica aquí."}</p></div>
        </header>
      </div>

      <div className="caja">
        <h3 className="sub">{en ? "Donate" : "Dona"}</h3>
        {hayDonar ? (
          <div className="dona-grid">
            {hayYape && (
              <article className="rec rec-dest"><h4>Yape · Plin</h4>
                <dl><Dato label={en ? "Number" : "Número"} valor={DONAR.yape} />{DONAR.titular && <Dato label={en ? "Name" : "A nombre de"} valor={DONAR.titular} />}</dl>
              </article>
            )}
            {hayBanco && (
              <article className="rec"><h4>{en ? "Bank transfer" : "Transferencia"}{DONAR.banco ? " · " + DONAR.banco : ""}</h4>
                <dl><Dato label={en ? "Account" : "Cuenta"} valor={DONAR.cuenta} /><Dato label="CCI" valor={DONAR.cci} />{DONAR.titular && <Dato label={en ? "Name" : "A nombre de"} valor={DONAR.titular} />}</dl>
              </article>
            )}
            {DONAR.paypal && (
              <article className="rec"><h4>{en ? "From abroad" : "Desde el extranjero"}</h4>
                <p>{en ? "Card or PayPal, in any currency." : "Con tarjeta o PayPal, en cualquier moneda."}</p>
                <a className="btn" href={DONAR.paypal} target="_blank" rel="noopener noreferrer">{en ? "Donate with PayPal" : "Donar con PayPal"}</a>
              </article>
            )}
          </div>
        ) : (
          <p>{en ? "Soon you will be able to donate from here." : "Muy pronto podrás donar desde aquí."}{DONAR.correo ? (en ? " Meanwhile, write to " : " Mientras tanto, escribe a ") : ""}{DONAR.correo && <a href={"mailto:" + DONAR.correo}>{DONAR.correo}</a>}</p>
        )}
        {hayDonar && DONAR.correo && <p className="meta dona-correo">{en ? "Large donations, companies or field equipment: " : "Donaciones grandes, empresas o equipo de campo: "}<a href={"mailto:" + DONAR.correo}>{DONAR.correo}</a></p>}
      </div>

      <div className="caja">
        <h3 className="sub">{en ? "Where the money goes" : "En qué se gasta"}</h3>
        {PRESUPUESTO.length ? (
          <>
            {RECIBIDO > 0 && (
              <div className="dona-meta">
                <p><b>{soles(RECIBIDO, en)}</b> {en ? "received of" : "recibidos de"} <b>{soles(total, en)}</b></p>
                <div className="barra" role="img" aria-label={pct(RECIBIDO, total) + "%"}><span style={{ width: pct(RECIBIDO, total) + "%" }} /></div>
              </div>
            )}
            <table className="presu">
              <thead><tr><th>{en ? "Item" : "Concepto"}</th><th>{en ? "Needed" : "Hace falta"}</th><th>{en ? "Spent" : "Gastado"}</th></tr></thead>
              <tbody>
                {PRESUPUESTO.map((l, i) => (
                  <tr key={i}>
                    <td>{en ? l.en || l.es : l.es}<div className="barra fina"><span style={{ width: pct(l.gastado, l.soles) + "%" }} /></div></td>
                    <td>{soles(l.soles, en)}</td><td>{soles(l.gastado, en)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th>{en ? "Total" : "Total"}</th><th>{soles(total, en)}</th><th>{soles(gastado, en)}</th></tr></tfoot>
            </table>
            {ACTUALIZADO && <p className="meta">{en ? "Updated: " : "Actualizado: "}{cuandoTexto(ACTUALIZADO, "", lang)}</p>}
          </>
        ) : (
          <p>{en ? "We are preparing the budget. It will be published here line by line: what is needed, what has come in and what has been spent." : "Estamos preparando el presupuesto. Se publicará aquí línea por línea: lo que hace falta, lo que ha entrado y lo que se ha gastado."}</p>
        )}
      </div>

      <div className="caja">
        <h3 className="sub">{en ? "Other ways to help" : "Otras formas de ayudar"}</h3>
        <ul className="como">
          <li>{en ? "Offer a reward or field equipment to the communities." : "Ofrece una recompensa o equipo de campo a las comunidades."} <button type="button" className="linkbtn" onClick={ofrecer}>{en ? "Offer" : "Ofrecer"}</button></li>
          <li>{en ? "Buy crafts with the toad: part of each sale goes to the community that looks after the stream." : "Compra artesanía del sapo: parte de cada venta va a la comunidad que cuida la quebrada."} <a className="linkbtn" href="#artesania">{en ? "See designs" : "Ver diseños"}</a></li>
          {!esApp && <li>{en ? "Share the app with guides, schools and communities in the Andes." : "Comparte la app con guías, escuelas y comunidades de los Andes."} <a className="linkbtn" href="#app">{en ? "The app" : "La app"}</a></li>}
          <li>{en ? "If you see a toad, send the photo: it is the most useful thing there is." : "Si ves un sapo, manda la foto: es lo más útil que hay."} <a className="linkbtn" href="#visto">{en ? "I saw the hampatu" : "He visto al hampatu"}</a></li>
        </ul>
      </div>
    </section>
  );
}
