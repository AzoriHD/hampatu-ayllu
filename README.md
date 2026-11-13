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

## Importante: los datos

Ahora mismo todo lo que se publica (avisos, comunidades, fechas, apuntados, votos) se guarda
**solo en el navegador de cada persona** (`localStorage`). Es una demostración: lo que escribe uno
no lo ven los demás.

Para que funcione como red real hace falta una base de datos compartida (por ejemplo
[Supabase](https://supabase.com) o Firebase, ambas con plan gratuito). Todo el acceso a datos está
en un solo archivo, `src/lib/store.js`: basta con cambiar ese archivo para conectar la base de datos
sin tocar el resto de la app.

## Estructura

```
public/img/          imágenes (logo, bandas, sapos, diseños de artesanía)
src/App.jsx          estado general, navegación por pestañas (#tablon, #calendario…)
src/components/      Tablón, Comunidades, Calendario, Artesanía, Especie, Recompensas…
src/data/            zonas, tipos, diseños y ejemplos
src/i18n.js          textos en inglés
src/lib/store.js     guardado de datos (cambiar aquí para usar una base de datos real)
src/styles.css       estilos (amarillo #ebae25 y marrón #1e130a, modo claro/oscuro)
```
