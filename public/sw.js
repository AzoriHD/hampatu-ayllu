/*
 * Hampatu Ayllu · service worker: la app abre rápido y, sin cobertura, muestra lo último que se cargó.
 * Al publicar (npm run build), vite.config.js pone la versión y la lista de archivos de la app;
 * así cada versión nueva sustituye a la anterior y borra lo viejo.
 */
const VERSION = "__VERSION__";
const CACHE = "hampatu-" + VERSION;
const BASE = ["/", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png", "/img/logo.webp",
  "/img/faja-ranas.webp", "/img/faja-zigzag.webp", "/img/faja-tejido.webp", "/img/tejido-fondo-640.webp",
  "/img/med-rana.webp", "/img/med-cerro-laguna.webp", "/img/med-quenua.webp", "/img/med-laguna.webp",
  "/img/med-lupino.webp", "/img/med-rana-2.webp", "/img/med-ichu.webp", "/img/med-cerro.webp"];
const APP = [/*__PRECACHE__*/];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.concat(APP))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("hampatu-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const guardar = (req, res) => { if (res && res.ok && res.type === "basic") caches.open(CACHE).then((c) => c.put(req, res)); };
const OPC = { ignoreVary: true, ignoreSearch: false };
const primeroCache = (req) => caches.match(req, OPC).then((hit) => hit || fetch(req).then((res) => { guardar(req, res.clone()); return res; }));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // la base de datos y las fotos subidas van siempre a la red
  if (req.mode === "navigate") {
    // la página: primero la red (para tener lo último) y, sin conexión, la guardada
    e.respondWith(fetch(req).then((res) => { guardar("/", res.clone()); return res; }).catch(() => caches.match("/", OPC)));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/img/")) { e.respondWith(primeroCache(req)); return; }
  e.respondWith(fetch(req).then((res) => { guardar(req, res.clone()); return res; }).catch(() => caches.match(req, OPC)));
});
