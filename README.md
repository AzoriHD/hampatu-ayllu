# Hampatu Ayllu · Comunidad del Sapo

App web para conectar a las comunidades que cuidan al sapo arlequín peruano (*Atelopus peruensis*).
Hecha con **React 18 + Vite 5**.

## Probarla en tu ordenador

Necesitas [Node.js](https://nodejs.org) (versión 18 o superior, la LTS vale).

```bash
npm install      # solo la primera vez
npm run dev      # abre http://localhost:5173
```

Para generar la versión final (carpeta `dist/`):

```bash
npm run build
npm run preview  # la sirve en http://localhost:4173 para revisarla
```

## Publicarla en Vercel (tunombre.vercel.app)

### Opción A: con GitHub (recomendada, se actualiza sola)

1. Crea una cuenta en [github.com](https://github.com) y un repositorio nuevo (por ejemplo `hampatu-ayllu`).
2. En el repositorio, pulsa **Add file → Upload files** y arrastra todo el contenido de esta carpeta
   **menos** `node_modules` y `dist` (si existen).
3. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New… → Project** → importa el repositorio.
4. Vercel detecta Vite solo. Comprueba que pone:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Pulsa **Deploy**. En un minuto tendrás `hampatu-ayllu.vercel.app` (o parecido).

Cada vez que subas cambios al repositorio, Vercel vuelve a publicar la web.

### Opción B: desde la terminal

```bash
npm install -g vercel
vercel          # la primera vez te pide iniciar sesión y unas preguntas (acepta lo que propone)
vercel --prod   # publica la versión definitiva
```

## Datos compartidos (Supabase) y modo coordinación

Sin configurar nada, la app funciona como demostración: cada navegador guarda lo suyo.
Para que todo el mundo vea lo mismo:

1. **Vercel → tu proyecto → Storage → Create Database → Supabase** (plan gratuito) y conéctalo
   al proyecto. Vercel añade solo las claves (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`…).
2. **Open in Supabase → SQL Editor**: pega el contenido de `supabase.sql`, cambia `TU_CORREO@gmail.com`
   por tu correo y pulsa **Run**.
3. **Authentication → Sign In / Providers**: activa **Allow anonymous sign-ins**
   (así cualquiera publica sin registrarse).
4. **Authentication → Users → Add user → Create new user**: tu correo + una contraseña,
   con **Auto Confirm User** marcado.
5. En Vercel, **Deployments → ⋯ → Redeploy** (o sube cualquier cambio a GitHub).

Para entrar como coordinación: enlace **Acceso de coordinación** al pie de la página
(o añade `#admin` a la dirección). Desde ahí puedes marcar fechas, verificar fotos, editar o
borrar cualquier cosa y **Cargar ejemplos / Borrar ejemplos**.

Para probar en tu ordenador con la base de datos, crea un archivo `.env.local` con:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

## Estructura

```
public/img/          imágenes (logo, bandas, sapos, diseños de artesanía)
src/App.jsx          estado general, navegación por pestañas (#tablon, #calendario…)
src/components/      Tablón, Comunidades, Calendario, Artesanía, Especie, Recompensas…
src/data/            zonas, tipos, diseños y ejemplos
src/i18n.js          textos en inglés
src/lib/store.js     guardado de datos (Supabase o, sin configurar, este navegador)
supabase.sql         tablas y permisos para Supabase
src/styles.css       estilos (amarillo #ebae25 y marrón #1e130a, modo claro/oscuro)
```
