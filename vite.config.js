import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

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
  return {
    plugins: [react()],
    define: { __SB_URL__: JSON.stringify(url), __SB_KEY__: JSON.stringify(key) },
  };
});
