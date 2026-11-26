import { useApp } from "../AppContext.jsx";
import { descargarApp } from "../lib/pwa.js";
import Paseo from "./Paseo.jsx";

export function Agreements() {
  const { en } = useApp();
  return (
    <section className="acuerdos" aria-labelledby="h-ac">
    <h2 id="h-ac">{en ? "Community agreements" : "Acuerdos de la comunidad"}</h2>
    <p className="intro">{en ? "Three rules that everyone who joins accepts, so that sharing information never puts the toad at risk." : "Tres reglas que acepta quien entra en la comunidad, para que compartir información nunca ponga en peligro al sapo."}</p>
    <div className="ac-grid">
      <div><h3>{en ? "No exact coordinates" : "Sin coordenadas exactas"}</h3><p>{en ? "Give only the region. Wildlife traffickers look for the exact spot of each population." : "Indica solo la región. Los traficantes de fauna buscan el punto exacto de cada población."}</p></div>
      <div><h3>{en ? "Look, don't touch" : "Se mira, no se toca"}</h3><p>{en ? "Photograph the animal where it is. Amphibian skin is delicate and hands can pass diseases on to it." : "Fotografía al animal donde está. La piel de los anfibios es delicada y las manos pueden pasarle enfermedades."}</p></div>
      <div><h3>{en ? "Clean boots between streams" : "Botas limpias entre quebradas"}</h3><p>{en ? "The chytrid fungus travels in mud and water. Wash and disinfect boots and gear before moving to another site." : "El hongo quitridio viaja en el barro y en el agua. Lava y desinfecta botas y equipo antes de cambiar de sitio."}</p></div>
    </div>
  </section>
  );
}

/* Significado del logo (identidad de Hampatu Ayllu) */
const SIGNIFICADO_ES = [
  "Todo empieza con un corazón abierto, de un solo trazo, como pintado a pincel. No se cierra: deja sitio para que entre quien quiera cuidar.",
  "Sobre él se alza el Perú, y juntos dibujan un corazón humano, con sus arterias subiendo hacia la sierra. Así nos recuerda que esta tierra no es un mapa lejano, sino algo que late dentro de cada persona.",
  "Mirado de otra forma, es también una manzana: el corazón es el fruto y el Perú, la hoja. La manzana es la naturaleza que nos alimenta, porque lo que se cuida da fruto.",
  "Dentro, un comunero y un hampatu están espalda con espalda, cubriéndose el uno al otro. El sapo es el centinela del agua: mientras canta en la quebrada, el comunero sabe que el agua está sana. El comunero, a su vez, mantiene limpios la quebrada y el páramo para que el sapo siga existiendo. Ninguno se salva sin el otro.",
  "Eso es un ayllu: una comunidad donde personas, animales, agua y tierra forman una sola familia, unida por el ayni, el «hoy por ti, mañana por mí». Hampatu Ayllu, la comunidad del sapo, es esa promesa mutua.",
  "De día el sapo es amarillo y de noche es verde, porque el hampatu tiene más de un color y la comunidad lo cuida igual en todas sus formas.",
];
const SIGNIFICADO_EN = [
  "It all begins with an open heart, drawn in a single stroke, as if painted with a brush. It never closes: it leaves room for anyone who wants to care.",
  "Above it rises Peru, and together they draw a human heart, its arteries climbing towards the highlands. It reminds us that this land is not a distant map, but something that beats inside every person.",
  "Seen another way, it is also an apple: the heart is the fruit and Peru, the leaf. The apple is the nature that feeds us, because what is cared for bears fruit.",
  "Inside, a comunero (a member of an Andean community) and a hampatu stand back to back, each watching over the other. The toad is the sentinel of the water: while it sings in the stream, the comunero knows the water is healthy. In turn, the comunero keeps the stream and the páramo clean so the toad can go on living. Neither is saved without the other.",
  "That is an ayllu: a community where people, animals, water and land form a single family, bound by ayni, the «today for you, tomorrow for me». Hampatu Ayllu, the community of the toad, is that mutual promise.",
  "By day the toad is yellow and by night it is green, because the hampatu comes in more than one colour and the community cares for it the same in every form.",
];

export function Footer() {
  const { en, view, esApp } = useApp();
  return (
    <footer className="pie">
      <div className="wrap">
        <div className="pie-card">
          <Paseo color="amarillo" className="paseo-pie" />
          <div className="pie-marca">
            <img className="logo-tema logo-claro" src="/img/logo-claro.svg?v=12" width="789" height="843" alt="" loading="lazy" />
            <img className="logo-tema logo-noche" src="/img/logo-noche.svg?v=12" width="789" height="843" alt="" loading="lazy" />
            <p><strong>Hampatu Ayllu</strong> {en ? "means «community of the toad» in Quechua." : "significa «comunidad del sapo» en quechua."}</p>
            <details className="pie-logo">
              <summary>{en ? "What our logo means" : "Qué significa nuestro logo"}</summary>
              {(en ? SIGNIFICADO_EN : SIGNIFICADO_ES).map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            </details>
          </div>
          {view !== "apoya" && (
            <div className="pie-app pie-apoya">
              <p>{en ? "Hampatu Ayllu grows with the support of people like you. Every contribution and how it is used is published." : "Hampatu Ayllu crece con el apoyo de personas como tú. Cada aportación, y en qué se usa, se publica."}</p>
              <div className="row"><a className="btn-acc" href="#apoya">{en ? "Support the cause" : "Apoya la causa"}</a><a className="btn-linea" href="#impacto">{en ? "Our impact" : "Nuestro impacto"}</a></div>
            </div>
          )}
          {view !== "app" && !esApp && (
            <div className="pie-app">
              <p>{en ? "Keep the community on your phone or computer. It installs from here, free, in a few seconds." : "Lleva la comunidad en tu celular o tu computadora. Se instala desde aquí, gratis y en unos segundos."}</p>
              <a className="btn-acc" href="#app" onClick={descargarApp}>{en ? "Get the app" : "Descarga la app"}</a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
