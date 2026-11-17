import { useApp } from "../AppContext.jsx";

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

export function Footer() {
  const { en, view, esApp } = useApp();
  return (
    <footer className="pie">
      <div className="wrap">
        <div className="pie-card">
          <div className="pie-marca">
            <img src="/img/logo.webp" width="440" height="423" alt="" loading="lazy" />
            <p><strong>Hampatu Ayllu</strong> {en ? "means «community of the toad» in Quechua." : "significa «comunidad del sapo» en quechua."}</p>
          </div>
          {view !== "app" && !esApp && (
            <div className="pie-app">
              <p>{en ? "Keep the community on your phone or computer. It installs from here, free, in a few seconds." : "Lleva la comunidad en tu celular o tu computadora. Se instala desde aquí, gratis y en unos segundos."}</p>
              <a className="btn-acc" href="#app">{en ? "Get the app" : "Descarga la app"}</a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
