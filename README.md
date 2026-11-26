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

## «He visto al hampatu» (avistamientos privados)

Botón en la portada y sección `#visto` (`src/components/Sighting.jsx`, `src/lib/avistamientos.js`). Con cuenta,
cualquiera manda fotos (hasta 3, sin los datos GPS del móvil), el sitio exacto (GPS del móvil o coordenadas
escritas), día, hora, estado, cuántos, nota y un contacto. Todo va a la tabla `avistamientos` y a la carpeta
privada `avistamientos` de Supabase: solo lo ven quien lo envió y la coordinación, nunca el tablón. La
coordinación los ve en la misma sección, filtra por estado (nuevo, en revisión, confirmado, descartado), abre el
mapa, escribe por WhatsApp y borra. La barra de coordinación avisa de los nuevos.
Para activarlo en una base de datos que ya existe, pega en Supabase → SQL Editor solo el bloque 8 de `supabase.sql`.

## Mensajes privados

Botón del bocadillo arriba (con el número de mensajes sin leer) y sección `#mensajes` (`src/components/Messages.jsx`,
`src/lib/mensajes.js`). Se escribe a alguien desde su perfil («Mandar un mensaje privado»), desde un aviso
(«Mensaje privado») o desde Descubre. Cada mensaje solo lo leen las dos personas; llegan al momento (Realtime),
se marcan como leídos al abrir la conversación y el último propio dice «Enviado» o «Leído». Tabla `mensajes`:
bloque 9 de `supabase.sql`.

## Descubre

Sección `#descubre` (`src/components/Discover.jsx`): los avisos de «Necesitamos» (Piden) y «Ofrecemos» (Ofrecen),
de uno en uno, como cartas. Se desliza a la derecha (me gusta, que es el voto del aviso) o a la izquierda (paso), o
con los botones y las flechas del teclado. Botones: deshacer, paso, mensaje privado, donar o ayudar (en Piden:
dinero, material, tiempo o transporte; llega como mensaje privado y queda apuntado en «Pueden ayudar») o me interesa
(en Ofrecen) y me gusta. Lo ya visto se recuerda en el navegador; abajo sale la lista de «Te gustaron».

## Ampliación: proyectos, comunidades, colabora, financiación e impacto

Cinco módulos conectados entre sí:

1. **Proyectos** (`#proyectos`, ficha en `#proyecto-<id>`): iniciativas de conservación con portada, descripción, problema
   ambiental, comunidades participantes, responsables, especies y ecosistemas, objetivos, actividades, calendario,
   presupuesto, financiación conseguida (calculada, nunca escrita a mano), necesidades, fotos y documentos, historial de
   actualizaciones, resultados, comentarios y seguidores. Estados: en preparación, buscando apoyo, activo, pausado y finalizado.
   El **proyecto de ejemplo** («Protección de hábitats altoandinos para *Atelopus peruensis*») se carga desde Coordinación →
   Proyectos: sale marcado como ejemplo, no acepta donaciones y no cuenta en ninguna cifra.
2. **Comunidades** (`#comunidad-<id>`): cada comunidad tiene su ficha (presentación, fotos, ecosistemas, biodiversidad,
   actividades, proyectos, necesidades, ofertas, apoyos recibidos, resultados y representantes). Una persona pide formar
   parte o representarla; deciden **sus representantes** (o la coordinación si aún no tiene). Cada persona decide si su
   nombre sale en público. Comunidades y proyectos se vinculan N:M: propone una parte y acepta la otra.
3. **Colabora** (`#colabora`): necesidades reales (voluntariado, investigación, herpetología, educación, material,
   equipamiento, transporte, tecnología, diseño, traducción, formación, colaboración institucional), siempre ligadas a un
   proyecto o una comunidad. Candidaturas con revisión (enviada, en revisión, aceptada, no seleccionada, retirada); al
   aceptar, la persona entra en el equipo del proyecto. Se escribe a los candidatos por mensaje privado. No es empleo.
4. **Donaciones y financiación** (`#apoya`, `#apoya-<id>` para un proyecto): fondo general (puntual o mensual) o proyecto
   concreto (puntual, en la moneda del proyecto). EUR, USD y PEN. Ingresos y gastos con justificante privado, verificados
   por la coordinación y sin borrado posible (se anulan con motivo). Ver «Donaciones» abajo.
5. **Nuestro impacto** (`#impacto`): cifras verificables y agregadas, gráficos cuando hay datos suficientes, historial de
   actualizaciones e informes (PDF, fotos y resúmenes). Sin datos, estados vacíos que lo explican.

Además, **Coordinación** (`#coordinacion`, solo para la coordinación): resumen de pendientes, proyectos (publicar, activar
donaciones, ejemplo), comunidades (solicitudes y representantes), candidaturas, financiación (ingresos, gastos, donaciones),
informes, validar actividades y resultados, permisos (solo administración) y registro de cambios.

Las secciones nuevas se descargan al abrirlas (la portada sigue cargando rápido con poca cobertura) y funcionan también
en la versión de demostración (sin Supabase), guardando en el navegador.

### Quién puede hacer qué

| | Administración | Coordinación | Representante | Responsable de proyecto | Cuenta |
|---|:-:|:-:|:-:|:-:|:-:|
| Dar y quitar permisos de coordinación | ✓ | | | | |
| Publicar proyectos y activar sus donaciones | ✓ | ✓ | | | |
| Verificar gastos, validar resultados, publicar informes | ✓ | ✓ | | | |
| Crear proyectos (en borrador) | ✓ | ✓ | ✓ | | |
| Editar la ficha de su comunidad y aceptar miembros | ✓ | ✓ | ✓ | | |
| Editar su proyecto y su equipo, registrar ingresos y gastos | ✓ | ✓ | | ✓ | |
| Publicar necesidades y revisar sus candidaturas | ✓ | ✓ | ✓ | ✓ | |
| Seguir, comentar, ofrecerse y donar | ✓ | ✓ | ✓ | ✓ | ✓ |

- **Administración**: los correos de `admin_emails` (bloque 7 de `supabase.sql`).
- **Coordinación**: se da desde Coordinación → Permisos (eligiendo a una persona con cuenta).
- **Representantes**: los acepta la comunidad (o la coordinación la primera vez).
- **Responsables**: quien crea el proyecto y a quien añada su equipo.

La web solo enseña u oculta botones: quien decide es la base de datos (RLS). Cada cambio importante queda en el
**registro de cambios** (`auditoria`), que nadie puede borrar.

### Base de datos de la ampliación

En **Supabase → SQL Editor**, pega `supabase.sql` **desde el bloque 10 hasta el final** y pulsa **Run** (o el archivo
entero: se puede ejecutar más de una vez). Crea:

| Bloque | Qué |
|---|---|
| 10 | `roles_usuario`, `comunidad_miembros` y los permisos nuevos de las fichas de comunidad (`docs`) |
| 11 | `proyectos`, `proyecto_equipo`, `proyecto_comunidades`, `proyecto_actualizaciones`, `proyecto_comentarios`, `proyecto_seguidores` |
| 12 | `oportunidades`, `candidaturas` |
| 13 | `donaciones`, `donaciones_eventos`, `movimientos` y la carpeta privada `justificantes` |
| 14 | `informes`, la carpeta pública `documentos` y la función `cifras_publicas()` |
| 15 | `auditoria` (registro de cambios) |

Los datos financieros privados (donaciones, movimientos, justificantes) nunca son públicos: lo público sale solo de
`cifras_publicas()`, que suma registros verificados (pagos confirmados por la pasarela, movimientos verificados,
actualizaciones validadas) y deja fuera los ejemplos.

## Donaciones

Arquitectura: la web nunca toca tarjetas ni claves secretas.

```
navegador ──(cantidad, moneda, destino)──▶ api/donaciones/checkout ──▶ Stripe Checkout (página de pago segura)
Stripe ──(aviso firmado)──▶ api/donaciones/webhook ──▶ tabla donaciones (pagada / fallida / reembolsada…)
navegador ◀── api/donaciones/estado?sid=… (confirmación real, preguntada a Stripe)
```

- `api/donaciones/*.js` son funciones de Vercel (servidor). El código común está en `server/donaciones.js`.
- Evita duplicados: clave de idempotencia por intento (un doble clic no crea dos pagos), referencia única por sesión de
  pago y tabla `donaciones_eventos` (si Stripe repite un aviso, no se cuenta dos veces).
- Un pago solo cuenta como recibido cuando el **webhook** lo confirma. La página de vuelta pregunta a Stripe; nunca da
  un pago por hecho.
- Las donaciones a un proyecto solo se aceptan si está publicado, buscando apoyo o activo y con las donaciones activadas
  por la coordinación; son puntuales y en la moneda del proyecto.

**Ahora mismo está apagado**: falta la entidad que recibe el dinero. El formulario se ve, pero no cobra nada.

### Qué falta para activar los pagos reales

1. **Entidad receptora**: una asociación u ONG legalmente habilitada para recibir donaciones (en Perú o en España), o una
   **ONG colaboradora** que gestione los fondos con un **acuerdo formal**. Con su nombre, documento fiscal y cuenta bancaria.
2. **Cuenta de Stripe a nombre de esa entidad** (stripe.com), verificada, con la cuenta bancaria de la entidad.
3. **Política de privacidad** de la entidad publicada (aviso RGPD / Ley 29733 de Perú) y su enlace.
4. En **Stripe → Developers → Webhooks → Add endpoint**: `https://TU-WEB.vercel.app/api/donaciones/webhook` con estos avisos:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`.
5. En **Vercel → Settings → Environment Variables**, las variables de la tabla de abajo, y **Redeploy**.
6. Prueba primero con las claves de **modo de prueba** de Stripe (`sk_test_…`) y la tarjeta `4242 4242 4242 4242`.
   Cuando todo vaya bien, cambia a las claves reales (`sk_live_…`) y crea el webhook también en modo real.

> El plan gratuito (Hobby) de Vercel es para uso personal y no comercial. Para recibir donaciones, revisa sus condiciones:
> puede hacer falta el plan Pro.

Mientras tanto, en `src/data/apoyo.js` puedes poner el enlace de donación de una **ONG colaboradora** (`ONG_COLABORADORA`)
o los datos de Yape, transferencia o PayPal **de la entidad** (`DONAR`): salen como «Otras formas de donar». Lo que llegue
por esas vías se registra como ingreso en Coordinación → Financiación para que cuente en las cifras públicas.

### Variables de entorno (Vercel)

| Variable | Dónde se usa | Qué es |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (o con prefijo `NEXT_PUBLIC_`) | web | Ya las crea la integración de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | Clave secreta de Supabase (la crea la integración). **Nunca** en el navegador |
| `DONACIONES_ACTIVAS` | servidor | `true` para encender las donaciones (con todo lo demás configurado) |
| `DONACIONES_ENTIDAD` | servidor | Nombre legal de la entidad que recibe el dinero (sale en el formulario y en Stripe) |
| `STRIPE_SECRET_KEY` | servidor | Clave secreta de Stripe (`sk_test_…` o `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | servidor | Secreto del webhook (`whsec_…`) |
| `DONACIONES_PRIVACIDAD_URL` | servidor | (opcional) enlace https a la política de privacidad de la entidad |
| `DONACIONES_MONEDAS` | servidor | (opcional) monedas admitidas, por defecto `eur,usd,pen` |
| `SITIO_URL` | servidor | (opcional) dirección de la web para volver del pago, p. ej. `https://hampatuayllu.vercel.app` |

Sin `DONACIONES_ACTIVAS=true` **y** todas las demás, las funciones responden «desactivado» y no se cobra nada.
Hay una copia comentada en `.env.example`.

## Pruebas

```bash
npm install
npm test
```

- `pruebas/rls.test.mjs`: ejecuta `supabase.sql` en un Postgres real (PGlite) que imita Supabase y comprueba más de 100
  permisos (quién ve, crea, cambia y borra cada cosa).
- `pruebas/checkout.test.mjs` y `pruebas/webhook.test.mjs`: el inicio de pago y los avisos de Stripe (pagos, duplicados,
  cuotas mensuales, reembolsos), con Stripe y Supabase simulados.

## App instalable (celular y computadora)

La web es también una app (PWA): se instala gratis desde la propia web, sin tiendas, y se actualiza sola.

- Página **#app** (botón «Descargar app» arriba): botón de instalar cuando el navegador lo permite,
  pasos para Android, iPhone y iPad, Windows, Mac y Linux, código QR para abrirla en el celular y botón para compartirla.
- Aviso flotante «Instala la app» a los pocos segundos de entrar (no sale si ya está instalada o si se cierra).
- Dentro de la app instalada no aparece nada sobre la app (ni el botón de descargar, ni la página #app, ni el aviso del pie):
  `esApp` en `src/App.jsx` lo detecta con `display-mode` (y `navigator.standalone` en iPhone).
- Icono: el logo (corazón con el mapa de Perú, el comunero y el sapo arlequín) sobre fondo oscuro. `icon-192/512.png` (cuadrado con esquinas redondeadas,
  para ordenadores y la web), `icon-maskable-*.png` y `apple-touch-icon.png` (cuadrados llenos: Android e
  iPhone les ponen su propia forma, círculo o cuadrado redondeado, y el sapo queda grande y centrado).
- Sin conexión se abre y muestra lo último que se cargó (`public/sw.js`). Al publicar, `vite.config.js`
  le pone una versión nueva y la lista de archivos, así que no hay que tocar nada en cada cambio.
- Iconos en `public/icon-*.png`, capturas para la ventana de instalación en `public/img/app-*.webp`
  y la imagen para compartir el enlace (WhatsApp, Facebook…) en `public/og.jpg`.

## Imagen de perfil

Al editar el perfil se puede **subir una foto** o **elegir un dibujo** de la comunidad (sapos, gente de la jalca,
animales y paisajes). Los dibujos están en `public/img/avatares/` y la lista en `src/data/avatares.js`.

## Diseño

Patrones de tejido andino (`public/img/tejido-*.webp`, `faja-*.webp`) y un medallón tejido para cada sección
(`med-*.webp`). Letras propias, sin Google Fonts: Bricolage Grotesque (títulos) y Atkinson Hyperlegible (texto),
instaladas con npm, así que la primera vez que lo bajes haz `npm install`.

- En el móvil, la barra de abajo lleva todas las secciones en una fila que se desliza a izquierda y derecha.
- Música: botón de la nota musical arriba. Suena `public/audio/musica-hampatu.mp3`: los cuatro temas de
  Hampatu Ayllu mezclados en una sola pieza continua de casi 15 minutos, igualados de volumen y fundidos
  entre sí, que vuelve a empezar sola. No hay temas sueltos ni se puede saltar o adelantar: solo encender
  y apagar. Va con un `<audio>` normal, así que sigue sonando con la pantalla apagada o la app en segundo
  plano, y en la pantalla de bloqueo sale el sapo con «Hampatu Ayllu» y el botón de pausa.
- Volumen: con la música puesta, el botón se alarga en una píldora con un deslizador (se guarda para la
  próxima vez). En el móvil cuelga debajo del botón y se esconde solo a los 4 segundos; con la música puesta,
  un toque lo vuelve a sacar y otro apaga. En iPhone y iPad no sale: la web no puede cambiar el volumen
  allí, se usan los botones del móvil.
- El sapo de la portada y del pie (`src/components/Paseo.jsx`, amarillo o verde) camina por el borde de la
  manta (`sapo-<color>-anda.webp`), se sienta (`sapo-<color>-sentado.webp`), a veces caza una mosca
  (`sapo-<color>-caza.webp`), se da la vuelta y vuelve (`pasear`, `girar`, `andar` y `sentar` en `src/styles.css`).
- La especie, la lámina: las dos coloraciones conocidas (verde y negro, amarillo y marrón). Arriba, de perfil y
  exactamente al mismo tamaño: `public/img/morfo-verde-v2.webp` y `morfo-amarillo-v2.webp` (736 × 486, fondo
  transparente, el sapo ocupa 720 px de ancho en las dos). Debajo, el lomo, el vientre y de frente
  (`morfo-<verde|amarillo>-<arriba|abajo|frente>.webp`). La lista está en `MORFOS` y `VISTAS` de
  `src/components/Species.jsx`.

## Estructura

```
public/img/          imágenes (logo, tejidos, fajas, medallones, avatares, sapos, artesanía)
src/App.jsx          estado general, navegación por pestañas (#tablon, #calendario…) y fichas (#proyecto-…, #comunidad-…)
src/components/      Tablón, Comunidades, Personas y perfiles, Cuenta, Calendario, Artesanía, App…
                     Projects, CommunityPage, Collaborate, Support, Impact, Coordination, Finance (ampliación) y Kit (piezas comunes)
src/data/            zonas, tipos, diseños y ejemplos · proyectos.js (textos de la ampliación) · apoyo.js (otras vías de donar)
src/i18n.js          textos en inglés
src/lib/store.js     guardado de datos (Supabase o, sin configurar, este navegador)
src/lib/tablas.js    tablas de la ampliación (Supabase o, en la demostración, este navegador) y cifras públicas
src/lib/permisos.js  qué puede hacer la cuenta abierta (coordinación, representante, responsable)
src/lib/donaciones.js llamadas a las funciones de donación del servidor
api/donaciones/      funciones de Vercel: checkout, webhook y estado (Stripe)
server/donaciones.js código común del servidor (claves secretas, límites, Stripe y Supabase)
pruebas/             pruebas automáticas (npm test)
supabase.sql         tablas y permisos para Supabase (bloques 1 a 15)
src/styles.css       estilos (lana #fbf0d4, ocre #e8a42a y tierra #2b190b, modo claro/oscuro)
```
