import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import { DCAT, DIS } from "../data/constants.js";
import { CraftsHeader, CraftsNote } from "./Headers.jsx";
import { Chip, JoinBlock, JoinButton } from "./Shared.jsx";

/* Diseños de artesanía: cada uno con «Puedo hacerlo» y «Lo quiero». */
export default function Crafts() {
  const { t, en } = useApp();
  const [cat, setCat] = useState("");
  const [col, setCol] = useState({}); // id → "verde" | (amarillo por defecto)
  const cnt = {};
  DIS.forEach((d) => { cnt[d[1]] = (cnt[d[1]] || 0) + 1; });
  return (
    <section id="v-artesania" className="artesania" aria-labelledby="tab-artesania">
      <div className="caja caja-cabeza">
      <CraftsHeader />
      <div className="chips dis-cats" id="dis-cats" role="group" aria-label={t("Filtrar diseños")}>
        <Chip id="dc-all" label={t("Todos los diseños")} n={DIS.length} on={!cat} onClick={() => setCat("")} />
        {Object.keys(DCAT).map((k) => <Chip key={k} id={"dc-" + k} label={DCAT[k][en ? 1 : 0]} n={cnt[k] || 0} on={cat === k} onClick={() => setCat(k)} />)}
      </div>
      <CraftsNote />
      </div>
      <div className="dis-grid" id="dis-grid">
        {DIS.filter((d) => !cat || d[1] === cat).map((d) => {
          const v = col[d[0]] === "verde", sfx = v ? "-verde" : "";
          const base = en ? d[3] : d[2], nom = base + (v ? (en ? " (green)" : " (verde)") : "");
          const kh = "d:" + d[0] + sfx + ":hacer", kq = "d:" + d[0] + sfx + ":querer";
          return (
            <article className="dis" id={"dis-" + d[0]} key={d[0]}>
              <div className="dis-img"><img src={"/img/dis-" + d[0] + sfx + ".webp"} alt={nom} loading="lazy" /></div>
              <div className="dis-col" role="group" aria-label={en ? "Toad colour" : "Color del sapo"}>
                <button type="button" className="sw sw-am" aria-pressed={!v} onClick={() => setCol((c) => ({ ...c, [d[0]]: "" }))}>{en ? "Yellow" : "Amarillo"}</button>
                <button type="button" className="sw sw-ve" aria-pressed={v} onClick={() => setCol((c) => ({ ...c, [d[0]]: "verde" }))}>{en ? "Green" : "Verde"}</button>
              </div>
              <h3>{base}</h3>
              <p className="tec">{en ? d[5] : d[4]}</p>
              <div className="row"><JoinButton key={kh} clave={kh} tipo="hacer" /><JoinButton key={kq} clave={kq} tipo="querer" /></div>
              <JoinBlock key={"b" + kh} clave={kh} tipo="hacer" titulo={nom} contacto="" />
              <JoinBlock key={"b" + kq} clave={kq} tipo="querer" titulo={nom} contacto="" />
            </article>
          );
        })}
      </div>
    </section>
  );
}
