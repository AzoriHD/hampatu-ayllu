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

## Datos compartidos (Supabase), cuentas y modo coordinación

Sin configurar nada, la app funciona como demostración: cada navegador guarda lo suyo
(también las cuentas, que solo existen en ese navegador).
Para que todo el mundo vea lo mismo:

1. **Vercel → tu proyecto → Storage → Create Database → Supabase** (plan gratuito) y conéctalo
   al proyecto. Vercel añade solo las claves (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`…).
2. **Open in Supabase → SQL Editor**: pega el contenido de `supabase.sql`, cambia `TU_CORREO@gmail.com`
   por tu correo y pulsa **Run**. Se puede volver a ejecutar cuando cambie el archivo.
3. **Authentication → Sign In / Providers**:
   - **Email** activado, con **Confirm email** activado.
   - **Allow anonymous sign-ins** desactivado: para publicar hace falta una cuenta.
4. **Authentication → URL Configuration → Site URL**: la dirección de la web
   (por ejemplo `https://hampatu-ayllu.vercel.app`). Es adonde lleva el enlace de los correos
   de activación y de cambio de contraseña.
5. **Authentication → Users → Add user → Create new user**: tu correo + una contraseña,
   con **Auto Confirm User** marcado.
6. En Vercel, **Deployments → ⋯ → Redeploy** (o sube cualquier cambio a GitHub).

### Cuentas y perfiles

- Leer es libre. Para publicar, responder, votar, apuntarse o añadir una comunidad hay que
  **entrar** (botón arriba a la derecha) o **crear una cuenta** con nombre, correo y contraseña.
- Cada cuenta tiene su **perfil** en la pestaña **Personas**: foto, a qué se dedica, dónde está,
  su comunidad, una presentación, contacto (WhatsApp, teléfono, correo, web) y redes
  (Facebook, Instagram, TikTok, YouTube, X). Todo es opcional menos el nombre y lo ve cualquiera.
- Los avisos y respuestas enlazan al perfil de quien los publica.
- **Correos**: Supabase envía los correos de activación con su servidor gratuito, que solo deja
  mandar unos pocos por hora. Si se apunta mucha gente a la vez, configura un servidor propio en
  **Authentication → Emails → SMTP Settings** (por ejemplo con Resend o Brevo, que tienen plan gratuito).

### Modo coordinación

Entra con tu cuenta de coordinación (la del paso 5) desde el botón **Entrar**. Verás la barra
**Modo coordinación**: puedes marcar fechas, verificar fotos, editar o borrar cualquier cosa
(también perfiles) y **Cargar ejemplos / Borrar ejemplos**.

Para probar en tu ordenador con la base de datos, crea un archivo `.env.local` con:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

## App instalable (celular y computadora)

La web es también una app (PWA): se instala gratis desde la propia web, sin tiendas, y se actualiza sola.

- Página **#app** (botón «Descargar app» arriba): botón de instalar cuando el navegador lo permite,
  pasos para Android, iPhone y iPad, Windows, Mac y Linux, código QR para abrirla en el celular y botón para compartirla.
- Aviso flotante «Instala la app» a los pocos segundos de entrar (no sale si ya está instalada o si se cierra).
- Sin conexión se abre y muestra lo último que se cargó (`public/sw.js`). Al publicar, `vite.config.js`
  le pone una versión nueva y la lista de archivos, así que no hay que tocar nada en cada cambio.
- Iconos en `public/icon-*.png`, capturas para la ventana de instalación en `public/img/app-*.webp`
  y la imagen para compartir el enlace (WhatsApp, Facebook…) en `public/og.jpg`.

## Imagen de perfil

Al editar el perfil se puede **subir una foto** o **elegir un dibujo** de la red (sapos, gente de la jalca,
animales y paisajes). Los dibujos están en `public/img/avatares/` y la lista en `src/data/avatares.js`.

## Diseño

Patrones de tejido andino (`public/img/tejido-*.webp`, `faja-*.webp`) y un medallón tejido para cada sección
(`med-*.webp`). Letras propias, sin Google Fonts: Bricolage Grotesque (títulos) y Atkinson Hyperlegible (texto),
instaladas con npm, así que la primera vez que lo bajes haz `npm install`.

## Estructura

```
public/img/          imágenes (logo, tejidos, fajas, medallones, avatares, sapos, artesanía)
src/App.jsx          estado general, navegación por pestañas (#tablon, #calendario…)
src/components/      Tablón, Comunidades, Personas y perfiles, Cuenta, Calendario, Artesanía, App…
src/data/            zonas, tipos, diseños y ejemplos
src/i18n.js          textos en inglés
src/lib/store.js     guardado de datos (Supabase o, sin configurar, este navegador)
supabase.sql         tablas y permisos para Supabase
src/styles.css       estilos (lana #fbf0d4, ocre #e8a42a y tierra #2b190b, modo claro/oscuro)
```
