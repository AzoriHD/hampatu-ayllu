import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "./AppContext.jsx";
import { makeT } from "./i18n.js";
import { P } from "./data/constants.js";
import { store, useData, getUid } from "./lib/store.js";
import { ago as agoBase, avisoDelHash, errMsg, marcarHash, viewOf, VIEWS, ymd } from "./lib/utils.js";
import Hero from "./components/Hero.jsx";
import { Msg } from "./components/Shared.jsx";
import Board from "./components/Board.jsx";
import Communities from "./components/Communities.jsx";
import Calendar from "./components/Calendar.jsx";
import Crafts from "./components/Crafts.jsx";
import Species from "./components/Species.jsx";
import Rewards from "./components/Rewards.jsx";
import { Agreements, Footer } from "./components/Agreements.jsx";

const TABS = [
  ["tablon", "Tablón", "Board"],
  ["comunidades", "Comunidades", "Communities"],
  ["calendario", "Calendario", "Calendar"],
  ["artesania", "Artesanía", "Crafts"],
  ["especie", "La especie", "The species"],
  ["recompensas", "Recompensas", "Rewards"],
];

function leer(clave, porDefecto) {
  try { return localStorage.getItem(clave) || porDefecto; } catch (e) { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* ignore */ }
}
function idiomaInicial() {
  const v = leer("hampatu-lang", "");
  if (v === "es" || v === "en") return v;
  return /^es/i.test(navigator.language || "es") ? "es" : "en";
}

export default function App() {
  const data = useData();
  const uid = useMemo(getUid, []);
  const [lang, setLang] = useState(idiomaInicial);
  const t = useMemo(() => makeT(lang), [lang]);
  const en = lang === "en";

  /* ---- light / dark ---- */
  const [tema, setTema] = useState(() => { const v = leer("hampatu-tema", ""); return v === "dark" || v === "light" ? v : null; });
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const f = (e) => setSistemaOscuro(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    if (tema) document.documentElement.setAttribute("data-theme", tema);
    else document.documentElement.removeAttribute("data-theme");
  }, [tema]);
  const oscuro = tema ? tema === "dark" : sistemaOscuro;
  const cambiarTema = () => { const n = oscuro ? "light" : "dark"; setTema(n); guardar("hampatu-tema", n); };
  const cambiarIdioma = () => { const n = en ? "es" : "en"; setLang(n); guardar("hampatu-lang", n); };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  /* ---- navigation ---- */
  const inicioAviso = useMemo(avisoDelHash, []);
  const [view, setView] = useState(() => (inicioAviso ? "tablon" : viewOf(window.location.hash)));
  const [zona, setZona] = useState("");
  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState(() => (inicioAviso ? { [inicioAviso]: 1 } : {}));
  const [destino, setDestino] = useState(() => (inicioAviso ? { id: "a-" + inicioAviso, block: "start" } : null));
  const tabsRef = useRef(null);

  const irVista = useCallback((v, bajarATabs) => {
    setView(v); marcarHash(v);
    if (bajarATabs) setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const a = avisoDelHash();
      if (a) { setView("tablon"); setZona(""); setAbiertos((o) => ({ ...o, [a]: 1 })); setDestino({ id: "a-" + a, block: "start" }); }
      else setView(viewOf(window.location.hash));
    };
    const onClick = (ev) => {
      const enl = ev.target.closest?.('a[href^="#"]');
      if (!enl) return;
      const v = enl.getAttribute("href").slice(1);
      if (!VIEWS.includes(v)) return;
      ev.preventDefault();
      irVista(v, !enl.closest(".tabs"));
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("hashchange", onHash); document.removeEventListener("click", onClick); };
  }, [irVista]);

  /* keep the active tab visible on narrow screens */
  useEffect(() => {
    const w = tabsRef.current, tb = document.getElementById("tab-" + view);
    if (!w || !tb) return;
    if (tb.offsetLeft < w.scrollLeft || tb.offsetLeft + tb.offsetWidth > w.scrollLeft + w.clientWidth) w.scrollLeft = Math.max(0, tb.offsetLeft - 16);
  }, [view]);

  /* scroll to and highlight a post or a community once it is on screen */
  useEffect(() => {
    if (!destino) return undefined;
    const el = document.getElementById(destino.id);
    if (!el) return undefined;
    el.scrollIntoView({ block: destino.block || "center" });
    el.classList.add("flash");
    const tm = setTimeout(() => el.classList.remove("flash"), 2000);
    setDestino(null);
    return () => clearTimeout(tm);
  });

  const goAviso = (id) => { setZona(""); irVista("tablon"); setDestino({ id: "a-" + id }); };
  const goCom = (id) => { setZona(""); setQ(""); irVista("comunidades"); setDestino({ id: "c-" + id }); };

  /* ---- shared interaction state ---- */
  const [firma, setFirma] = useState(() => leer("hampatu-firma", ""));
  const keepFirma = (v) => { setFirma(v); guardar("hampatu-firma", v); };
  const [msg, setMsg] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [apuntando, setApuntando] = useState({});
  const [recien, setRecien] = useState({});
  const [formAviso, setFormAviso] = useState(null);
  const [calMes, setCalMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [calSel, setCalSel] = useState(() => ymd(new Date()));

  const ocupado = useRef(false);
  const write = (setLocal, fn, ok) => {
    if (ocupado.current) return Promise.resolve();
    ocupado.current = true; setLocal("Guardando…");
    return Promise.resolve().then(fn)
      .then(() => { setLocal(""); if (ok) ok(); }, (e) => setLocal(errMsg(e)))
      .finally(() => { ocupado.current = false; });
  };

  const contactoDe = (x) => {
    if (x.contacto) return String(x.contacto);
    const c = data.comunidades.find((k) => k.id === x.com);
    return c && c.contacto ? String(c.contacto) : "";
  };
  const zonaDe = (c) => (c.zona === "otra" && c.zonaOtra ? String(c.zonaOtra) : t(P[c.zona] || ""));
  const apuntesDe = (clave) => data.apuntes.filter((a) => a.aviso === clave).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const apuntar = (clave, nombre) => store.set("apuntes", clave + "__" + uid, { aviso: clave, by: uid, firma: nombre, ts: Date.now() });
  const quitarApunte = (clave) => {
    const ya = data.apuntes.find((x) => x.aviso === clave && x.by === uid);
    setRecien((r) => { const n = { ...r }; delete n[clave]; return n; });
    if (ya) store.removeMany([["apuntes", ya.id]]).catch(() => {});
  };
  const votar = (id) => {
    const mio = data.votos.find((v) => v.aviso === id && v.by === uid);
    (mio ? store.removeMany([["votos", mio.id]]) : store.set("votos", id + "__" + uid, { aviso: id, by: uid, ts: Date.now() }))
      .catch(() => setMsg("No se pudo guardar el voto. Inténtalo otra vez."));
  };
  const enlaceAviso = (id) => window.location.origin + window.location.pathname + "#aviso-" + id;

  const borrar = (key) => {
    const i = key.indexOf(":"), kind = key.slice(0, i), id = key.slice(i + 1);
    let pares;
    if (kind === "aviso") {
      pares = [["avisos", id]]
        .concat(data.respuestas.filter((r) => r.aviso === id).map((r) => ["respuestas", r.id]))
        .concat(data.apuntes.filter((v) => v.aviso === id).map((v) => ["apuntes", v.id]))
        .concat(data.votos.filter((v) => v.aviso === id).map((v) => ["votos", v.id]));
    } else if (kind === "resp") pares = [["respuestas", id]];
    else if (kind === "fecha") pares = [["fechas", id]].concat(data.apuntes.filter((v) => v.aviso === "f:" + id).map((v) => ["apuntes", v.id]));
    else pares = [["comunidades", id]];
    write(setMsg, () => store.removeMany(pares), () => setConfirmar(""));
  };

  const ofrecer = () => {
    setFormAviso({ k: Date.now(), preset: { tipo: "ofrecemos", titulo: t("Recompensa: ") }, enfocar: true });
    irVista("tablon");
  };

  const reiniciar = () => {
    store.reset(); setZona(""); setQ(""); setAbiertos({}); setApuntando({}); setRecien({}); setConfirmar(""); setFormAviso(null); setMsg("");
  };

  const ctx = {
    data, uid, lang, en, t, ago: (ts) => agoBase(ts, lang, t),
    canPost: true, canEdit: true,
    view, irVista, zona, setZona, q, setQ, abiertos, setAbiertos, goAviso, goCom,
    firma, keepFirma, msg, setMsg, confirmar, setConfirmar, write,
    apuntando, setApuntando, recien, setRecien, apuntesDe, apuntar, quitarApunte,
    votar, enlaceAviso, contactoDe, zonaDe, borrar, ofrecer, formAviso, setFormAviso,
    calMes, setCalMes, calSel, setCalSel, oscuro, cambiarTema, cambiarIdioma,
  };

  const rail = view === "tablon" || view === "comunidades";
  const items = view === "tablon" ? data.avisos : data.comunidades;
  const cuenta = {};
  items.forEach((x) => { if (P[x.zona]) cuenta[x.zona] = (cuenta[x.zona] || 0) + 1; });

  return (
    <AppContext.Provider value={ctx}>
      <Hero />
      <main className="wrap">
        <p className="notice demo">
          {t("Versión de demostración: lo que publiques se guarda solo en este navegador. Para usarla como red real necesita su propia base de datos.")}{" "}
          <button type="button" className="linkbtn" onClick={reiniciar}>{t("Restablecer los ejemplos")}</button>
        </p>

        {rail && (
          <nav className="rail" id="railnav" aria-label={en ? "Filter by area" : "Filtrar por zona"}>
            <p className="eyebrow">{en ? "Filter by area · applies to the board and the communities" : "Filtrar por zona · vale para el tablón y las comunidades"}</p>
            <div className="rail-scroll" id="rail">
              <button type="button" className="chipbtn" id="rp-all" aria-pressed={!zona} onClick={() => setZona("")}>{t("Toda la red")} <span className="n">{items.length}</span></button>
              {Object.keys(P).map((k) => (
                <button key={k} type="button" className="chipbtn" id={"rp-" + k} aria-pressed={zona === k} onClick={() => setZona(k)}>{t(P[k])} <span className="n">{cuenta[k] || 0}</span></button>
              ))}
            </div>
          </nav>
        )}

        <div className="tabs" ref={tabsRef}>
          {TABS.map(([v, es, enl]) => (
            <a key={v} href={"#" + v} id={"tab-" + v} aria-current={view === v ? "page" : "false"}>{en ? enl : es}</a>
          ))}
        </div>
        <Msg id="m-global" role="status" text={msg} />

        {view === "tablon" && <Board />}
        {view === "comunidades" && <Communities />}
        {view === "calendario" && <Calendar />}
        {view === "artesania" && <Crafts />}
        {view === "especie" && <Species />}
        {view === "recompensas" && <Rewards />}

        <Agreements />
      </main>
      <Footer />
    </AppContext.Provider>
  );
}

