import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "./AppContext.jsx";
import { makeT } from "./i18n.js";
import { P } from "./data/constants.js";
import { ensureUid, perfilVisto, store, useData, useMeta } from "./lib/store.js";
import { ago as agoBase, avisoDelHash, errMsg, marcarHash, perfilDelHash, viewOf, VIEWS, ymd } from "./lib/utils.js";
import { enApp, MODOS_APP } from "./lib/pwa.js";
import Hero, { FajaRanas } from "./components/Hero.jsx";
import { BottomNav, Topbar } from "./components/Topbar.jsx";
import AppPage from "./components/AppPage.jsx";
import { Msg } from "./components/Shared.jsx";
import Board from "./components/Board.jsx";
import Communities from "./components/Communities.jsx";
import Calendar from "./components/Calendar.jsx";
import Crafts from "./components/Crafts.jsx";
import Species from "./components/Species.jsx";
import Rewards from "./components/Rewards.jsx";
import Sighting from "./components/Sighting.jsx";
import Support from "./components/Support.jsx";
import { Agreements, Footer } from "./components/Agreements.jsx";
import AdminZone from "./components/Admin.jsx";
import { AccountPanel } from "./components/Account.jsx";
import { People, Profile } from "./components/People.jsx";

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
  const meta = useMeta();
  const uid = meta.uid;
  /* {modo: "entrar" | "crear", motivo?} while the account panel is open */
  const [cuentaPanel, setCuentaPanel] = useState(() => (window.location.hash === "#admin" ? { modo: "entrar", k: 0 } : null));
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

  /* ---- dentro de la app instalada no se habla de la app: ya la tienes ---- */
  const [esApp, setEsApp] = useState(enApp);
  useEffect(() => {
    const mqs = MODOS_APP.map((q) => window.matchMedia?.(q)).filter(Boolean);
    const f = () => setEsApp(enApp());
    mqs.forEach((m) => m.addEventListener?.("change", f));
    return () => mqs.forEach((m) => m.removeEventListener?.("change", f));
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("en-app", esApp); }, [esApp]);

  /* ---- navigation ---- */
  const inicioAviso = useMemo(avisoDelHash, []);
  const [perfil, setPerfil] = useState(() => { const id = perfilDelHash(); return id ? { id, k: 0 } : null; });
  const [view, setView] = useState(() => (perfilDelHash() ? "perfil" : inicioAviso ? "tablon" : viewOf(window.location.hash)));
  const [zona, setZona] = useState("");
  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState(() => (inicioAviso ? { [inicioAviso]: 1 } : {}));
  const [destino, setDestino] = useState(() => (inicioAviso ? { id: "a-" + inicioAviso, block: "start" } : null));
  const tabsRef = useRef(null);

  /* Al cambiar de sección se baja (o se sube) hasta el principio del contenido */
  const irVista = useCallback((v, bajar) => {
    setView(v); marcarHash(v);
    if (bajar) setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, []);

  /* Si se entra con un enlace a una sección (#app, #calendario…), se abre ya en ella */
  useEffect(() => {
    const h = window.location.hash;
    if (!inicioAviso && h && h !== "#tablon" && h !== "#admin" && (perfilDelHash() || VIEWS.includes(h.slice(1)))) {
      requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ block: "start" }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHash = () => {
      const a = avisoDelHash(), pf = perfilDelHash();
      if (pf) { setPerfil({ id: pf, k: Date.now() }); setView("perfil"); }
      else if (a) { setView("tablon"); setZona(""); setAbiertos((o) => ({ ...o, [a]: 1 })); setDestino({ id: "a-" + a, block: "start" }); }
      else { setView(viewOf(window.location.hash)); tabsRef.current?.scrollIntoView({ block: "start" }); }
    };
    const onClick = (ev) => {
      if (ev.defaultPrevented) return;
      const enl = ev.target.closest?.('a[href^="#"]');
      if (!enl) return;
      const v = enl.getAttribute("href").slice(1);
      if (!VIEWS.includes(v)) return;
      ev.preventDefault();
      irVista(v, true);
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("hashchange", onHash); document.removeEventListener("click", onClick); };
  }, [irVista]);

  /* En la app, la página «App» (descargar e instalar) no existe: lleva al tablón */
  useEffect(() => { if (esApp && view === "app") irVista("tablon"); }, [esApp, view, irVista]);

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
  const irPerfil = (id, editar) => {
    setPerfil({ id, editar: !!editar, k: Date.now() }); setView("perfil"); marcarHash("perfil-" + id);
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  /* ---- accounts and profiles ---- */
  const perfiles = useMemo(() => { const m = {}; data.perfiles.forEach((p) => { m[p.id] = p; }); return m; }, [data.perfiles]);
  const perfilDe = (id) => perfiles[id] || null;
  const canPost = !!meta.cuenta;
  const pedirCuenta = (motivo) => setCuentaPanel({ modo: "entrar", motivo: motivo || "Para hacerlo necesitas una cuenta. Es gratis y tarda un minuto.", k: Date.now() });
  /* A brand-new account opens its own profile so the person can fill it in. */
  useEffect(() => {
    if (meta.nuevo && uid && perfiles[uid]) { perfilVisto(); setCuentaPanel(null); irPerfil(uid, true); }
  });

  /* ---- shared interaction state ---- */
  const [firmaGuardada, setFirma] = useState(() => leer("hampatu-firma", ""));
  const firma = firmaGuardada || (perfiles[uid] && perfiles[uid].nombre) || "";
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
  const apuntar = async (clave, nombre) => {
    if (!canPost) { pedirCuenta(); throw { code: "cuenta" }; }
    const u = await ensureUid();
    return store.set("apuntes", clave + "__" + u, { aviso: clave, by: u, firma: nombre, ts: Date.now() });
  };
  const quitarApunte = (clave) => {
    const ya = data.apuntes.find((x) => x.aviso === clave && x.by === uid);
    setRecien((r) => { const n = { ...r }; delete n[clave]; return n; });
    if (ya) store.removeMany([["apuntes", ya.id]]).catch(() => {});
  };
  const votar = (id) => {
    if (!canPost) { pedirCuenta("Para votar necesitas una cuenta. Es gratis y tarda un minuto."); return; }
    const mio = data.votos.find((v) => v.aviso === id && v.by === uid);
    (mio ? store.removeMany([["votos", mio.id]]) : ensureUid().then((u) => store.set("votos", id + "__" + u, { aviso: id, by: u, ts: Date.now() })))
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
    else if (kind === "perfil") pares = [["perfiles", id]];
    else if (kind === "fecha") pares = [["fechas", id]].concat(data.apuntes.filter((v) => v.aviso === "f:" + id).map((v) => ["apuntes", v.id]));
    else pares = [["comunidades", id]];
    write(setMsg, () => store.removeMany(pares), () => { setConfirmar(""); if (kind === "perfil") irVista("personas"); });
  };

  const ofrecer = () => {
    setFormAviso({ k: Date.now(), preset: { tipo: "ofrecemos", titulo: t("Recompensa: ") }, enfocar: true });
    irVista("tablon");
  };

  const reiniciar = () => {
    store.reset(); setZona(""); setQ(""); setAbiertos({}); setApuntando({}); setRecien({}); setConfirmar(""); setFormAviso(null); setMsg("");
  };

  const ctx = {
    data, uid, meta, lang, en, t, ago: (ts) => agoBase(ts, lang, t),
    canPost, canEdit: meta.admin, cuentaPanel, setCuentaPanel, pedirCuenta, perfilDe, irPerfil, reiniciar,
    view, irVista, zona, setZona, q, setQ, abiertos, setAbiertos, goAviso, goCom,
    firma, keepFirma, msg, setMsg, confirmar, setConfirmar, write,
    apuntando, setApuntando, recien, setRecien, apuntesDe, apuntar, quitarApunte,
    votar, enlaceAviso, contactoDe, zonaDe, borrar, ofrecer, formAviso, setFormAviso,
    calMes, setCalMes, calSel, setCalSel, oscuro, cambiarTema, cambiarIdioma, esApp,
  };

  return (
    <AppContext.Provider value={ctx}>
      <Topbar />
      <Hero />
      <FajaRanas />
      <main className="wrap">
        <div className="ancla" ref={tabsRef} aria-hidden="true"></div>
        <AdminZone />
        {(cuentaPanel || meta.recovery) && <AccountPanel key={meta.recovery ? "nueva" : cuentaPanel.k} />}


        <Msg id="m-global" role="status" text={msg} />

        {view === "tablon" && <Board />}
        {view === "comunidades" && <Communities />}
        {view === "personas" && <People />}
        {view === "perfil" && perfil && <Profile key={perfil.k + perfil.id} id={perfil.id} editar={perfil.editar} />}
        {view === "calendario" && <Calendar />}
        {view === "artesania" && <Crafts />}
        {view === "especie" && <Species />}
        {view === "recompensas" && <Rewards />}
        {view === "visto" && <Sighting />}
        {view === "apoya" && <Support />}
        {view === "app" && !esApp && <AppPage />}

        {view !== "app" && <Agreements />}
      </main>
      <Footer />
      <BottomNav />
    </AppContext.Provider>
  );
}

