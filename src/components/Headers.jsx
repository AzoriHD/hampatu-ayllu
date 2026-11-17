import { useApp } from "../AppContext.jsx";

/* Cabeceras y textos fijos de cada pestaña. */
export function BoardHeader() { const { en } = useApp(); return (<>    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "What is happening along the streams" : "Lo que pasa en las quebradas"}</h2>
      <p className="intro">{en ? "This is where the community shares what is happening: toad sightings, what a community needs, what it can offer, events and questions. Anyone in the community can reply. Posts appear in the language they were written in, mostly Spanish." : "Aquí se cuenta lo que pasa: avistamientos del sapo, lo que una comunidad necesita, lo que puede ofrecer, eventos y preguntas. Cualquiera de la comunidad puede responder."}</p></div>
    </header></>); }
export function CommunitiesHeader() { const { en } = useApp(); return (<>    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "Who looks after the jalca" : "Quién cuida la jalca"}</h2>
      <p className="intro">{en ? "Who is in the community and how to reach them. Each profile says where the group is, what it can offer, what it needs and how to contact it. Use it to find the right people before you ask or offer something." : "Quién forma la comunidad y cómo encontrarlo. Cada ficha dice dónde está el grupo, qué puede ofrecer, qué necesita y cómo contactarlo. Sirve para dar con la gente adecuada antes de pedir u ofrecer algo."}</p></div>
    </header></>); }
export function CalendarHeader() { const { en } = useApp(); return (<>    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "The community's dates" : "Fechas de la comunidad"}</h2>
      <p className="intro">{en ? "Work days, workshops, reward handovers and meetings. Tap a day to see what is on." : "Faenas, talleres, entregas de recompensas y reuniones. Toca un día para ver qué hay."}</p></div>
    </header></>); }
export function CraftsHeader() { const { en } = useApp(); return (<>    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "Hampatu crafts" : "Artesanía del hampatu"}</h2>
      <p className="intro">{en ? "Designs with the toad for weavers, potters and schools to make and sell. Part of every sale goes to the community that looks after the stream." : "Diseños con el sapo para que tejedoras, artesanos y escuelas los hagan y los vendan. Parte de cada venta va a la comunidad que cuida la quebrada."}</p></div>
    </header><ol className="pasos">
      <li><b>{en ? "Choose a design" : "Elige un diseño"}</b><span>{en ? "Tap «I can make it» so buyers know who makes it." : "Marca «Puedo hacerlo» para que se sepa quién lo hace."}</span></li>
      <li><b>{en ? "Make it" : "Hazlo"}</b><span>{en ? "Knit, weave, embroider or shape it your way, with your local patterns." : "Téjelo, bórdalo o modélalo a tu manera, con los diseños de tu zona."}</span></li>
      <li><b>{en ? "Offer it" : "Ofrécelo"}</b><span>{en ? "Post it on the board under «We offer», with a photo, the price and a contact." : "Publícalo en el tablón como «Ofrecemos», con foto, precio y contacto."}</span></li>
      <li><b>{en ? "Share the earnings" : "Reparte"}</b><span>{en ? "Agree what part of each sale goes to protecting the stream." : "Acordad qué parte de cada venta va a cuidar la quebrada."}</span></li>
    </ol></>); }
export function CraftsNote() { const { en } = useApp(); return (<><p className="meta dis-nota">{en ? "Design images to inspire you. They are not products for sale yet." : "Imágenes de diseño para inspirarse. Todavía no son productos a la venta."}</p></>); }
export function HeroText() { const { en } = useApp(); return (<><p className="kicker">{en ? "Community of the Toad" : "Comunidad del Sapo"}</p><h1 id="h-portada">Hampatu Ayllu</h1><p className="thesis">{en ? "No one who looks after a stream is alone." : "Quien cuida una quebrada no está solo."}</p><p className="lede">{en ? <>A community of villages, guides, schools and researchers looking after the Peruvian harlequin toad (<i>Atelopus peruensis</i>), a critically endangered species found only in the Andes of Peru.</> : <>Comunidad de pueblos, guías, escuelas e investigadores que cuidan al sapo arlequín peruano (<i>Atelopus peruensis</i>), una especie en peligro crítico que solo vive en los Andes del Perú.</>}</p></>); }
export function CalendarLegend({ hoy }) {
  const { en } = useApp();
  return (<><p className="cal-leyenda"><span className="ley ley-act"></span><span>{en ? "Activity" : "Con actividad"}</span><span className="ley ley-sel"></span><span>{en ? "Selected day" : "Día elegido"}</span><span className="ley-hoy">{hoy}</span><span>{en ? "Today" : "Hoy"}</span></p></>);
}
