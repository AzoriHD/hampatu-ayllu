import { useApp } from "../AppContext.jsx";

/* La especie: texto fijo en dos idiomas. */
export default function Species() {
  const { en } = useApp();
  return (
    <section id="v-especie" className="especie" aria-labelledby="tab-especie">
    <div className="caja caja-cabeza">
    <header className="vista-head">
      <div><h2 className="vista-h">{en ? "Meet the hampatu" : "Conoce al hampatu"}</h2>
      <p className="intro">{en ? "What is known about the Peruvian harlequin toad, with its sources, and what to do if you come across one." : "Lo que se sabe del sapo arlequín peruano, con sus fuentes, y qué hacer si te cruzas con uno."}</p></div>
    </header>
    </div>
    <div className="esp-grid">
      <div className="esp-main">
        <h2>{en ? "The Peruvian harlequin toad" : "El sapo arlequín peruano"}</h2>
        <p className="esp-lede">{en ? "A small toad from the highlands of northern Peru that was almost given up for lost and has turned up again." : "Un sapo pequeño de las alturas del norte del Perú que se dio casi por perdido y que ha vuelto a aparecer."}</p>

        <figure className="lamina">
          <div className="lamina-grid">
            <figure><img src="/img/sapo-lado.webp" width="380" height="306" alt="" loading="lazy" /><figcaption>{en ? "Sitting, side view" : "Sentado, de lado"}</figcaption></figure>
            <figure><img src="/img/sapo-frente.webp" width="380" height="294" alt="" loading="lazy" /><figcaption>{en ? "Front view" : "De frente"}</figcaption></figure>
            <figure><img src="/img/sapo-camina.webp" width="380" height="277" alt="" loading="lazy" /><figcaption>{en ? "Walking" : "Caminando"}</figcaption></figure>
            <figure><img src="/img/sapo-dorso.webp" width="368" height="333" alt="" loading="lazy" /><figcaption>{en ? "Seen from above" : "Visto desde arriba"}</figcaption></figure>
          </div>
          <figcaption className="lamina-pie">{en ? "Plate I · The hampatu as the network draws it. An artistic illustration, not an identification guide." : "Lámina I · El hampatu como lo dibuja la red. Ilustración artística, no sirve como guía para identificarlo."}</figcaption>
        </figure>

        <h3>{en ? "Where it lives" : "Dónde vive"}</h3>
        <p>{en ? "Only in Peru. It is a toad of the puna and subpuna, found in high grasslands and beside streams and rivers in the northern Andes. The historical records are from Cajamarca: around Celendín, San Miguel de Pallaques and the province of Hualgayoc. The specimen used to describe the species was collected in 1979 at 3,200 m, near Celendín." : "Solo en el Perú. Es un sapo de puna y subpuna, en pajonales de altura y junto a quebradas y ríos de los Andes del norte. Los registros históricos son de Cajamarca: alrededores de Celendín, San Miguel de Pallaques y la provincia de Hualgayoc. El ejemplar con el que se describió la especie se recogió en 1979 a 3.200 m, cerca de Celendín."}</p>

        <h3>{en ? "The good news" : "La buena noticia"}</h3>
        <p>{en ? "In November 2024 and January 2026 two individuals were found in Áncash, at about 2,900 m, beside an irrigation canal among small farm plots. It is the first confirmed record in that region in more than 12 years, about 220 km south-east of where the species was described. Turning up in farmland suggests it tolerates some human presence, and that there may be more populations still to be found." : "En noviembre de 2024 y enero de 2026 se encontraron dos individuos en Áncash, a unos 2.900 m, junto a un canal de riego y entre chacras. Es el primer registro confirmado en esa región en más de 12 años, a unos 220 km al sureste de donde se describió la especie. Que aparezca en un paisaje cultivado indica que tolera cierta presencia humana, y que puede haber más poblaciones sin encontrar."}</p>

        <h3>{en ? "What threatens it" : "Qué lo amenaza"}</h3>
        <p>{en ? "Chytridiomycosis, a disease caused by a fungus that attacks amphibian skin, and the degradation of its habitat. The Red List classifies it as Critically Endangered and estimates that fewer than 50 adults remain." : "La quitridiomicosis, una enfermedad causada por un hongo que ataca la piel de los anfibios, y la degradación de su hábitat. La Lista Roja lo clasifica En Peligro Crítico y calcula que quedan menos de 50 adultos."}</p>

        <h3>{en ? <>What an <i>Atelopus</i> looks like</> : <>Cómo es un <i>Atelopus</i></>}</h3>
        <p>{en ? "Harlequin toads are small and slender, with a pointed snout and thin legs. They tend to walk more than hop and are active by day, close to water. They have no visible eardrum. Their tadpoles live clinging to rocks in fast-flowing streams." : "Los sapos arlequín son pequeños y delgados, de hocico puntiagudo y patas finas. Suelen caminar más que saltar y están activos de día, cerca del agua. No se les ve tímpano. Sus renacuajos viven pegados a las piedras de quebradas con corriente."}</p>
      </div>

      <aside className="esp-side">
        <dl className="ficha">
          <div><dt>{en ? "Scientific name" : "Nombre científico"}</dt><dd><i>Atelopus peruensis</i></dd></div>
          <div><dt>{en ? "Described by" : "Descrita por"}</dt><dd>{en ? "Gray and Cannatella, 1985" : "Gray y Cannatella, 1985"}</dd></div>
          <div><dt>{en ? "Family" : "Familia"}</dt><dd>Bufonidae</dd></div>
          <div><dt>{en ? "Found in" : "Vive en"}</dt><dd>{en ? "Peru only" : "Solo en el Perú"}</dd></div>
          <div><dt>{en ? "Elevation of records" : "Altitud de los registros"}</dt><dd>{en ? "2,900 to 3,200 m" : "De 2.900 a 3.200 m"}</dd></div>
          <div><dt>{en ? "Status" : "Estado"}</dt><dd><span className="estado">{en ? "Critically Endangered" : "En Peligro Crítico"}</span></dd></div>
          <div><dt>{en ? "Estimated adults" : "Adultos estimados"}</dt><dd>{en ? "Fewer than 50" : "Menos de 50"}</dd></div>
        </dl>
        <div className="si-ves">
          <h3>{en ? "If you see one" : "Si ves uno"}</h3>
          <ol>
            <li>{en ? "Do not touch it or move it." : "No lo toques ni lo muevas."}</li>
            <li>{en ? "Take a photo of it where it is. If it is verified, it can earn a reward." : "Hazle una foto donde está. Si se verifica, puede tener recompensa."}</li>
            <li>{en ? "Note the day and the place, without coordinates." : "Apunta el día y el lugar, sin coordenadas."}</li>
            <li>{en ? "Post it on the board as a Sighting and add the photo." : "Avisa en el tablón como Avistamiento y sube la foto."}</li>
            <li>{en ? "Clean your boots before going to another stream." : "Limpia las botas antes de ir a otra quebrada."}</li>
          </ol>
        </div>
      </aside>
    </div>
    <p className="fuentes"><span>{en ? "Sources:" : "Fuentes:"}</span> <a href="https://salamandra-journal.com/index.php/contents/2026-vol-62/2218-corr-vilca-alzamora-et-al-1788">{en ? "Vilca-Alzamora et al., Salamandra 62 (2026)" : "Vilca-Alzamora y otros, Salamandra 62 (2026)"}</a> · <a href="https://amphibiaweb.org/species/72">AmphibiaWeb</a> · <a href="https://amphibiansoftheworld.amnh.org/Amphibia/Anura/Bufonidae/Atelopus/Atelopus-peruensis">Amphibian Species of the World</a> · <a href="https://dx.doi.org/10.2305/IUCN.UK.2018-2.RLTS.T54539A89196220.en">{en ? "IUCN Red List" : "Lista Roja de la UICN"}</a></p>
  </section>
  );
}
