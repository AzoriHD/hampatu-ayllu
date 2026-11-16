import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/*
 * App instalable: al publicar, el service worker (public/sw.js) recibe una versión nueva y la
 * lista de archivos de la app (JS, CSS y letras), para que funcione sin conexión y se actualice sola.
 * También pone la dirección completa de la imagen para compartir (WhatsApp, Facebook…).
 */
function appInstalable(sitio) {
  let outDir = "dist";
  return {
    name: "hampatu-app",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml(html) {
      return html.replace('content="/og.jpg"', 'content="' + sitio + '/og.jpg"')
        .replace('<meta property="og:type"', '<meta property="og:url" content="' + sitio + '/" />\n    <meta property="og:type"');
    },
    closeBundle() {
      const file = join(outDir, "sw.js");
      let sw;
      try { sw = readFileSync(file, "utf8"); } catch (e) { return; }
      const assets = readdirSync(join(outDir, "assets"))
        .filter((f) => /\.(js|css)$/.test(f) || (/-latin-(standard|400|700)-normal-[\w-]+\.woff2$/.test(f) && !/latin-ext/.test(f)))
        .map((f) => "/assets/" + f);
      sw = sw.replace("__VERSION__", Date.now().toString(36)).replace("[/*__PRECACHE__*/]", JSON.stringify(assets));
      writeFileSync(file, sw);
    },
  };
}

/*
 * Supabase: lee las claves públicas que crea la integración de Vercel,
 * tengan el prefijo que tengan (NEXT_PUBLIC_SUPABASE_URL, STORAGE_SUPABASE_URL…).
 * Nunca usa la clave secreta (SERVICE_ROLE).
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const buscar = (finales) => {
    for (const f of finales) {
      const k = Object.keys(env).sort((a, b) => a.length - b.length).find((n) => n.endsWith(f) && !/SERVICE|SECRET/.test(n) && env[n]);
      if (k) return env[k];
    }
    return "";
  };
  const url = buscar(["SUPABASE_URL"]);
  const key = buscar(["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"]);
  const sitio = "https://" + (env.VERCEL_PROJECT_PRODUCTION_URL || "hampatuayllu.vercel.app");
  return {
    plugins: [react(), appInstalable(sitio)],
    define: { __SB_URL__: JSON.stringify(url), __SB_KEY__: JSON.stringify(key) },
  };
});
