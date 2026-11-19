import { useApp } from "../AppContext.jsx";

/* Lo que ya se ofrece en la comunidad: los avisos «Ofrecemos» del tablón. */
function Ofertas() {
  const { data, t, ago, goAviso } = useApp();
  const list = data.avisos.filter((a) => a.tipo === "ofrecemos").sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, 8);
  if (!list.length) return <ul className="ofertas" id="ofertas"><li className="meta">{t("Todavía no hay ofrecimientos en el tablón.")}</li></ul>;
  return (
    <ul className="ofertas" id="ofertas">
      {list.map((a) => (
        <li key={a.id}>
          <button type="button" className="linkbtn" onClick={() => goAviso(a.id)}>{a.titulo}</button>
          <p className="meta">{(a.firma || t("Sin firma")) + " · " + ago(a.ts)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Rewards() {
  const { en, ofrecer } = useApp();
  return (
    <section id="v-recompensas" className="recompensas" aria-labelledby="tab-recompensas">
    <div className="caja caja-cabeza">
    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "Rewards for those who protect" : "Recompensas para quien protege"}</h2>
      <p className="intro">{en ? "Looking after a stream takes time and work. This is what the community's NGOs, universities, municipalities and donors can offer the communities, rondas, schools and guides that protect the toad." : "Cuidar una quebrada cuesta tiempo y trabajo. Aquí está lo que las ONG, universidades, municipalidades y donantes de la comunidad pueden ofrecer a las comunidades, rondas, escuelas y guías que protegen al sapo."}</p></div>
    </header>
    <p className="regla">{en ? <><strong>We pay for photos, never for captured toads.</strong> A photo of the toad where it lives can earn a reward if it meets the conditions below. Catching, moving or keeping toads is never rewarded.</> : <><strong>Se paga por foto, nunca por sapo capturado.</strong> Una foto del sapo en su sitio puede tener recompensa si cumple las condiciones de abajo. Coger, mover o tener sapos en casa nunca se premia.</>}</p>
    </div>

    <div className="rec-grid">
      <article className="rec rec-dest"><h4>{en ? "Payment per verified photo" : "Pago por foto verificada"}</h4><p>{en ? "A payment for the first verified photo of the toad in each stream each month. It shows where the species is still alive." : "Un pago por la primera foto verificada del sapo en cada quebrada y cada mes. Sirve para saber dónde sigue vivo."}</p><p className="quien">{en ? "Given by: NGOs, research projects" : "Lo dan: ONG, proyectos de investigación"}</p></article>
      <article className="rec"><h4>{en ? "Field equipment" : "Equipo de campo"}</h4><p>{en ? "Head torches, boots, kits to disinfect boots and tools, rain gear." : "Linternas frontales, botas, kits para desinfectar botas y herramientas, impermeables."}</p><p className="quien">{en ? "Given by: NGOs, donors, local businesses" : "Lo dan: ONG, donantes, empresas locales"}</p></article>
      <article className="rec"><h4>{en ? "Training and certificates" : "Formación y certificados"}</h4><p>{en ? "Workshops on biosecurity, amphibian identification and guiding, with a certificate that helps people work as guides or monitors." : "Talleres de bioseguridad, identificación de anfibios y guiado, con certificado que sirve para trabajar como guía o monitor."}</p><p className="quien">{en ? "Given by: universities, NGOs" : "Lo dan: universidades, ONG"}</p></article>
      <article className="rec"><h4>{en ? "Paid monitoring days" : "Jornal de monitoreo"}</h4><p>{en ? "A daily wage for community monitors who walk their stream every month and record what they see, toads or no toads." : "Pago por día a monitores de la comunidad que recorren su quebrada cada mes y anotan lo que ven, haya sapos o no."}</p><p className="quien">{en ? "Given by: research projects, NGOs" : "Lo dan: proyectos de investigación, ONG"}</p></article>
      <article className="rec"><h4>{en ? "Works for the community" : "Obras para la comunidad"}</h4><p>{en ? "Improvements that help both the community and the stream: fencing springs off from cattle, repairing the canal, native plant nurseries, drinking water." : "Mejoras que sirven a la comunidad y a la quebrada: cercar puquios para el ganado, arreglar el canal, viveros de plantas nativas, agua potable."}</p><p className="quien">{en ? "Given by: municipalities, NGOs, cooperation funds" : "Lo dan: municipalidades, ONG, fondos de cooperación"}</p></article>
      <article className="rec"><h4>{en ? "School materials" : "Material escolar"}</h4><p>{en ? "Books, posters, notebooks and field trips for schools that teach about the toad." : "Libros, afiches, cuadernos y salidas de campo para las escuelas que enseñan sobre el sapo."}</p><p className="quien">{en ? "Given by: NGOs, municipalities, donors" : "Lo dan: ONG, municipalidades, donantes"}</p></article>
      <article className="rec"><h4>{en ? "Recognition" : "Reconocimiento"}</h4><p>{en ? "A «Hampatu Guardians» diploma, a mention across the community and a plaque for the community hall. It opens doors with municipalities and funders." : "Diploma «Guardianes del Hampatu», mención en la comunidad y placa para el local comunal. Abre puertas con municipalidades y financiadores."}</p><p className="quien">{en ? "Given by: the whole community" : "Lo da: toda la comunidad"}</p></article>
      <article className="rec"><h4>{en ? "Sales and tourism with a seal" : "Venta y turismo con sello"}</h4><p>{en ? "Help selling community products (weavings, cheese, native potatoes) with a «friends of the hampatu» seal, and tourist routes that keep away from the toad's sites." : "Ayuda para vender productos de la comunidad (tejidos, quesos, papas nativas) con un sello de «amigos del hampatu», y rutas de turismo que no pasan por los sitios del sapo."}</p><a className="linkbtn" href="#artesania">{en ? "See the craft designs" : "Ver los diseños de artesanía"}</a><p className="quien">{en ? "Given by: NGOs, guides, businesses" : "Lo dan: ONG, guías, empresas"}</p></article>
      <article className="rec"><h4>{en ? "Grants and exchanges" : "Becas e intercambios"}</h4><p>{en ? "Study grants for young people and trips to meet other communities that protect amphibians." : "Becas de estudio para jóvenes y viajes para conocer otras comunidades que cuidan anfibios."}</p><p className="quien">{en ? "Given by: universities, international NGOs" : "Lo dan: universidades, ONG extranjeras"}</p></article>
    </div>

    <div className="caja">
    <h3 className="sub">{en ? "Conditions for the photo payment" : "Condiciones del pago por foto"}</h3>
    <ol className="como">
      <li>{en ? "The toad is photographed where it is, without being touched or moved. Photos of a toad in someone's hand, in a container or away from the stream are not paid." : "El sapo sale en su sitio, sin tocarlo ni moverlo. Las fotos con el sapo en la mano, en un envase o fuera de la quebrada no se pagan."}</li>
      <li>{en ? <>The photo is sent with <a href="#visto">I've seen a toad</a>, with the date and the exact spot. Only the coordination team sees the spot, never the board.</> : <>La foto se manda con <a href="#visto">He visto un sapo</a>, con la fecha y el sitio exacto. El sitio solo lo ve la coordinación, nunca el tablón.</>}</li>
      <li>{en ? "Specialists in the community check it before paying. Verified posts carry the «Verified photo» tag." : "Especialistas de la comunidad la revisan antes de pagar. Los avisos revisados llevan la marca «Foto verificada»."}</li>
      <li>{en ? "The first photo from each stream each month is paid. More photos from the same place still help, but are not paid again." : "Se paga la primera foto de cada quebrada cada mes. Más fotos del mismo sitio ayudan, pero no se cobran otra vez."}</li>
      <li>{en ? "Dead toads are reported the same way but not paid, so nobody has a reason to harm them. A photo copied from the internet or from someone else cancels the payment." : "Los sapos muertos se avisan igual, pero no se pagan, para que nadie tenga motivo de hacerles daño. Una foto copiada de internet o de otra persona anula el pago."}</li>
    </ol>
    </div>

    <div className="caja">
    <h3 className="sub">{en ? "How a reward is earned" : "Cómo se gana una recompensa"}</h3>
    <ol className="como">
      <li>{en ? <>Photograph the toad where it is, without touching it, and send it with <a href="#visto">I've seen a toad</a>.</> : <>Fotografiar al sapo en su sitio, sin tocarlo, y mandarla con <a href="#visto">He visto un sapo</a>.</>}</li>
      <li>{en ? "Look after a stretch of stream and follow the community agreements." : "Cuidar un tramo de quebrada y seguir los acuerdos de la comunidad."}</li>
      <li>{en ? "Walk patrols or monitoring routes and report them on the board, even when no toad turns up." : "Hacer rondas o recorridos de monitoreo y contarlos en el tablón, aunque no aparezca ningún sapo."}</li>
      <li>{en ? "Take part in work days, workshops and talks." : "Participar en faenas, talleres y charlas."}</li>
      <li>{en ? "Teach others: schools, visitors, neighbouring communities." : "Enseñar a otros: escuelas, visitantes, comunidades vecinas."}</li>
    </ol>
    </div>

    <div className="caja">
    <h3 className="sub">{en ? "Already on offer in the community" : "Lo que ya se ofrece en la comunidad"}</h3>
    <Ofertas />
    <div className="cta">
      <button className="btn" type="button" id="b-ofrecer" onClick={ofrecer}>{en ? "Offer a reward" : "Ofrecer una recompensa"}</button>
      <span className="meta">{en ? "It is posted on the board as «We offer», so communities can reply." : "Se publica en el tablón como «Ofrecemos», para que las comunidades puedan responder."}</span>
    </div>
    </div>
  </section>
  );
}
