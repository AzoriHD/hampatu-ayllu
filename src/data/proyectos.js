/* Textos fijos de Proyectos, Colabora, Financiación e Impacto: [español, inglés]. */

export const ESTADOS_P = {
  preparacion: ["En preparación", "In preparation"],
  buscando: ["Buscando apoyo", "Seeking support"],
  activo: ["Activo", "Active"],
  pausado: ["Pausado", "Paused"],
  finalizado: ["Finalizado", "Completed"],
};
/* Color de cada estado (variables de styles.css) */
export const COLOR_P = { preparacion: "var(--ask)", buscando: "var(--need)", activo: "var(--sight)", pausado: "var(--muted)", finalizado: "var(--offer)" };

export const CATEGORIAS_C = {
  voluntariado: ["Voluntariado", "Volunteering"],
  investigacion: ["Investigación científica", "Scientific research"],
  herpetologia: ["Herpetología", "Herpetology"],
  educacion: ["Educación ambiental", "Environmental education"],
  material: ["Material científico", "Scientific materials"],
  equipamiento: ["Equipamiento", "Equipment"],
  transporte: ["Transporte", "Transport"],
  tecnologia: ["Apoyo tecnológico", "Tech support"],
  diseno: ["Diseño y comunicación", "Design and communication"],
  traduccion: ["Traducción", "Translation"],
  formacion: ["Formación", "Training"],
  institucional: ["Colaboración institucional", "Institutional partnership"],
};

export const ESTADOS_O = {
  abierta: ["Abierta", "Open"], en_curso: ["En curso", "In progress"], cubierta: ["Cubierta", "Filled"], cerrada: ["Cerrada", "Closed"],
};
export const ESTADOS_CAND = {
  enviada: ["Enviada", "Sent"], en_revision: ["En revisión", "Under review"], aceptada: ["Aceptada", "Accepted"],
  rechazada: ["No seleccionada", "Not selected"], retirada: ["Retirada", "Withdrawn"],
};
export const TIPOS_CAND = {
  persona: ["Persona voluntaria", "Volunteer"], profesional: ["Profesional", "Professional"],
  universidad: ["Universidad o centro de investigación", "University or research centre"], organizacion: ["Organización o empresa", "Organisation or company"],
};

export const TIPOS_ACT = {
  avance: ["Avance", "Progress"], actividad: ["Actividad realizada", "Activity carried out"], resultado: ["Resultado", "Result"],
};
export const TIPOS_NEC = { dinero: ["Financiación", "Funding"], material: ["Material", "Materials"], voluntariado: ["Personas", "People"], otro: ["Otro", "Other"] };

export const CATEGORIAS_M = {
  material: ["Material", "Materials"], equipamiento: ["Equipamiento", "Equipment"], transporte: ["Transporte", "Transport"],
  formacion: ["Formación", "Training"], alimentacion: ["Alimentación", "Food"], servicios: ["Servicios", "Services"],
  comunicacion: ["Comunicación", "Communication"], tecnologia: ["Tecnología", "Technology"], administracion: ["Administración", "Administration"],
  donacion: ["Donación (otra vía)", "Donation (other channel)"], subvencion: ["Subvención", "Grant"], convenio: ["Convenio", "Agreement"], otro: ["Otro", "Other"],
};
export const CAT_INGRESO = ["donacion", "subvencion", "convenio", "otro"];
export const CAT_GASTO = ["material", "equipamiento", "transporte", "formacion", "alimentacion", "servicios", "comunicacion", "tecnologia", "administracion", "otro"];
export const ESTADOS_M = { registrado: ["Pendiente de verificar", "Awaiting check"], verificado: ["Verificado", "Verified"], anulado: ["Anulado", "Cancelled"] };

export const TIPOS_INF = {
  actividad: ["Actividad", "Activity"], informe: ["Informe", "Report"], financiero: ["Informe económico", "Financial report"], resultado: ["Resultados", "Results"],
};

export const MONEDAS = { eur: ["Euros", "Euros"], usd: ["Dólares", "US dollars"], pen: ["Soles", "Soles"] };
export const PRESETS = { eur: [5, 10, 20, 50, 100], usd: [5, 10, 20, 50, 100], pen: [20, 40, 80, 200, 400] };

export const ESTADOS_D = {
  iniciada: ["Sin completar", "Not completed"], procesando: ["Procesando", "Processing"], pagada: ["Confirmada", "Confirmed"],
  fallida: ["Fallida", "Failed"], cancelada: ["Cancelada", "Cancelled"], reembolsada: ["Reembolsada", "Refunded"],
};

/* Proyectos de ejemplo: enseñan cómo es una ficha en cada estado. NINGUNO es un proyecto real ni describe
   actividades en marcha. Llevan ejemplo = true: salen marcados como ejemplo y no cuentan en ninguna cifra. */
export const PROYECTO_EJEMPLO = {
  nombre: "Protección de hábitats altoandinos para Atelopus peruensis",
  resumen: "Ejemplo de ficha: así se presenta una iniciativa de conservación comunitaria en Hampatu Ayllu.",
  descripcion: "Iniciativa de conservación comunitaria orientada a documentar los hábitats, conocer las amenazas y promover acciones de protección junto a las comunidades locales de Áncash.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
  problema: "Aquí se explica el problema ambiental que se quiere abordar. Por ejemplo: quebradas altoandinas que pierden agua o vegetación, presencia del hongo quitridio, ganado que pisa las orillas o falta de datos sobre dónde vive todavía la especie.",
  especies: "Sapo arlequín peruano (Atelopus peruensis)",
  ecosistemas: "Quebradas y bofedales altoandinos, pajonal de puna",
  zona: "anc",
  region: "Áncash (ejemplo)",
  responsable_org: "Ejemplo: comunidad campesina o asociación que lidera el proyecto",
  objetivos: [
    "Conocer qué quebradas siguen en buen estado y cuáles necesitan cuidado",
    "Identificar las amenazas junto con quienes viven en la zona",
    "Acordar con las comunidades medidas de protección que puedan mantener",
  ],
  actividades: [
    { texto: "Reuniones de presentación con las comunidades", hecha: false },
    { texto: "Recorridos de monitoreo con protocolo de bioseguridad", hecha: false },
    { texto: "Talleres en escuelas sobre el sapo y el agua", hecha: false },
  ],
  calendario: [
    { fecha: "Mes 1", hito: "Presentación del proyecto y acuerdos" },
    { fecha: "Meses 2 a 6", hito: "Monitoreo y talleres" },
    { fecha: "Mes 7", hito: "Informe de resultados para las comunidades" },
  ],
  necesidades: [
    { texto: "Botas y kits de desinfección para los recorridos", tipo: "material", cubierta: false },
    { texto: "Apoyo de una persona con formación en herpetología", tipo: "voluntariado", cubierta: false },
  ],
  destino_fondos: "Aquí se explica en qué se usaría cada aportación: material de campo, transporte a las quebradas, talleres…",
  resultados: "",
  estado: "preparacion",
  moneda: "pen",
  ejemplo: true,
  publicado: true,
};

/* Más fichas de ejemplo, una por estado. Textos inventados: no describen proyectos ni lugares concretos. */
export const PROYECTOS_EJEMPLO = [
  PROYECTO_EJEMPLO,
  {
    nombre: "Vigilantes de quebrada: monitoreo comunitario del sapo arlequín",
    resumen: "Ejemplo de proyecto activo: comuneros formados que recorren sus quebradas y anotan lo que ven.",
    descripcion: "Grupo de personas de la comunidad que, tras una formación básica, recorren cada mes las quebradas cercanas y registran si ven sapos, renacuajos o cambios en el agua.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
    problema: "Nadie sabe con certeza en qué quebradas sigue viviendo la especie. Sin datos regulares no se puede saber si la población crece, se mantiene o desaparece.",
    especies: "Sapo arlequín peruano (Atelopus peruensis)",
    ecosistemas: "Quebradas altoandinas y bofedales",
    zona: "anc",
    region: "Áncash (ejemplo)",
    responsable_org: "Ejemplo: comité de vigilancia de una comunidad campesina",
    objetivos: [
      "Formar a un grupo de vigilantes de la propia comunidad",
      "Recorrer las mismas quebradas cada mes con el mismo método",
      "Compartir los datos con la comunidad en asamblea",
    ],
    actividades: [
      { texto: "Taller de formación en monitoreo y bioseguridad", hecha: true },
      { texto: "Primeros recorridos de prueba", hecha: true },
      { texto: "Recorridos mensuales durante la época de lluvias", hecha: false },
      { texto: "Presentación de datos en asamblea", hecha: false },
    ],
    calendario: [
      { fecha: "Mes 1", hito: "Formación de vigilantes" },
      { fecha: "Meses 2 a 10", hito: "Recorridos mensuales" },
      { fecha: "Mes 11", hito: "Devolución de resultados a la comunidad" },
    ],
    necesidades: [
      { texto: "Libretas impermeables y linternas frontales", tipo: "material", cubierta: true },
      { texto: "Viáticos para los días de recorrido", tipo: "dinero", cubierta: false },
    ],
    destino_fondos: "Viáticos de los vigilantes, material de registro y desinfección del calzado entre quebradas.",
    resultados: "",
    estado: "activo",
    moneda: "pen",
    presupuesto: 650000,
    meta_fondos: 400000,
    ejemplo: true,
    publicado: true,
  },
  {
    nombre: "Vivero comunitario de queñua para proteger las nacientes",
    resumen: "Ejemplo de proyecto que busca apoyo: plantar queñua nativa alrededor de las nacientes de agua.",
    descripcion: "Vivero gestionado por la comunidad para producir plantones de queñua y reforestar las laderas sobre las nacientes, donde nacen las quebradas en las que vive el sapo.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
    problema: "Las laderas sin árboles retienen menos agua: las quebradas se secan antes en la época seca y el hábitat del sapo se reduce.",
    especies: "Sapo arlequín peruano (Atelopus peruensis), queñua (Polylepis)",
    ecosistemas: "Bosque de queñua, nacientes y quebradas altoandinas",
    zona: "anc",
    region: "Áncash (ejemplo)",
    responsable_org: "Ejemplo: asociación de mujeres de la comunidad",
    objetivos: [
      "Montar un vivero que la comunidad pueda mantener sola",
      "Producir plantones de queñua de semilla local",
      "Plantar en las laderas que elija la asamblea",
    ],
    actividades: [
      { texto: "Elegir el terreno del vivero con la comunidad", hecha: false },
      { texto: "Recoger semilla de queñua de la zona", hecha: false },
      { texto: "Faena comunal de plantación", hecha: false },
    ],
    calendario: [
      { fecha: "Meses 1 y 2", hito: "Construcción del vivero" },
      { fecha: "Meses 3 a 12", hito: "Producción de plantones" },
      { fecha: "Época de lluvias", hito: "Plantación" },
    ],
    necesidades: [
      { texto: "Malla de sombra, bolsas y herramientas", tipo: "material", cubierta: false },
      { texto: "Financiación para el primer año del vivero", tipo: "dinero", cubierta: false },
      { texto: "Asesoría de alguien con experiencia en viveros forestales", tipo: "voluntariado", cubierta: false },
    ],
    destino_fondos: "Material del vivero, transporte de plantones y comida para las faenas de plantación.",
    resultados: "",
    estado: "buscando",
    moneda: "pen",
    presupuesto: 1200000,
    meta_fondos: 1200000,
    ejemplo: true,
    publicado: true,
  },
  {
    nombre: "Cercos para bofedales: orillas sin pisoteo de ganado",
    resumen: "Ejemplo de proyecto en preparación: cercar tramos de orilla y abrir bebederos para el ganado.",
    descripcion: "Acuerdo con las familias ganaderas para cercar algunos tramos de orilla y llevar el agua del ganado a bebederos, sin quitarles pasto ni acceso al agua.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
    problema: "El ganado pisa las orillas, enturbia el agua y destruye los sitios donde el sapo pone los huevos y crecen los renacuajos.",
    especies: "Sapo arlequín peruano (Atelopus peruensis)",
    ecosistemas: "Bofedales y orillas de quebrada",
    zona: "caj",
    region: "Cajamarca (ejemplo)",
    responsable_org: "Ejemplo: junta de usuarios de agua de la comunidad",
    objetivos: [
      "Acordar con las familias qué tramos se cercan",
      "Instalar bebederos para que el ganado no baje a la orilla",
      "Comprobar si la orilla se recupera",
    ],
    actividades: [
      { texto: "Reuniones con las familias ganaderas", hecha: false },
      { texto: "Instalación de cercos y bebederos", hecha: false },
      { texto: "Fotos de la orilla antes y después", hecha: false },
    ],
    calendario: [
      { fecha: "Mes 1", hito: "Acuerdos con las familias" },
      { fecha: "Meses 2 y 3", hito: "Cercos y bebederos" },
      { fecha: "Mes 12", hito: "Revisión de la orilla" },
    ],
    necesidades: [
      { texto: "Postes, alambre y mangueras", tipo: "material", cubierta: false },
      { texto: "Transporte del material hasta la zona", tipo: "otro", cubierta: false },
    ],
    destino_fondos: "Material de cercos y bebederos, y transporte hasta la comunidad.",
    resultados: "",
    estado: "preparacion",
    moneda: "pen",
    presupuesto: 800000,
    ejemplo: true,
    publicado: true,
  },
  {
    nombre: "El sapo arlequín en la escuela",
    resumen: "Ejemplo de proyecto finalizado: talleres en escuelas rurales sobre el sapo, el agua y el quitridio.",
    descripcion: "Ciclo de talleres en escuelas de la zona para que niños y niñas conozcan al sapo arlequín, por qué está en peligro y qué pueden hacer sus familias.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se hayan realizado.",
    problema: "Mucha gente joven no sabe que el sapo vive en sus quebradas ni que está en peligro crítico.",
    especies: "Sapo arlequín peruano (Atelopus peruensis)",
    ecosistemas: "Quebradas altoandinas",
    zona: "anc",
    region: "Áncash (ejemplo)",
    responsable_org: "Ejemplo: docentes de escuelas rurales",
    objetivos: [
      "Dar a conocer el sapo en las escuelas de la zona",
      "Preparar material sencillo que los docentes puedan reutilizar",
    ],
    actividades: [
      { texto: "Preparación del material con los docentes", hecha: true },
      { texto: "Talleres en las escuelas", hecha: true },
      { texto: "Concurso de dibujo del sapo", hecha: true },
    ],
    calendario: [
      { fecha: "Mes 1", hito: "Material listo" },
      { fecha: "Meses 2 a 4", hito: "Talleres" },
      { fecha: "Mes 5", hito: "Concurso y cierre" },
    ],
    necesidades: [
      { texto: "Impresión de láminas y fichas", tipo: "material", cubierta: true },
      { texto: "Personas para dar los talleres", tipo: "voluntariado", cubierta: true },
    ],
    destino_fondos: "Impresión de material y transporte a las escuelas.",
    resultados: "Aquí se cuentan los resultados al cerrar el proyecto. Por ejemplo: cuántas escuelas participaron, cuántos niños y niñas, y qué material queda para los docentes.",
    estado: "finalizado",
    moneda: "pen",
    presupuesto: 300000,
    ejemplo: true,
    publicado: true,
  },
  {
    nombre: "Vigilancia del hongo quitridio en quebradas con sapo",
    resumen: "Ejemplo de proyecto en pausa: muestreo con hisopos para saber si el hongo está presente.",
    descripcion: "Toma de muestras con hisopos, sin dañar a los animales, para saber si el hongo quitridio está en las quebradas donde vive el sapo. Las muestras se analizan en un laboratorio colaborador.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
    problema: "El quitridio ha hecho desaparecer muchas especies de Atelopus. Saber si está en la zona cambia qué medidas hay que tomar.",
    especies: "Sapo arlequín peruano (Atelopus peruensis) y otros anfibios de la quebrada",
    ecosistemas: "Quebradas altoandinas",
    zona: "anc",
    region: "Áncash (ejemplo)",
    responsable_org: "Ejemplo: universidad colaboradora con la comunidad",
    objetivos: [
      "Saber si el hongo está presente en las quebradas con sapo",
      "Aplicar un protocolo de bioseguridad en todos los recorridos",
    ],
    actividades: [
      { texto: "Permisos y protocolo de muestreo", hecha: true },
      { texto: "Muestreo en campo", hecha: false },
      { texto: "Análisis en laboratorio", hecha: false },
    ],
    calendario: [
      { fecha: "Meses 1 y 2", hito: "Permisos" },
      { fecha: "Época de lluvias", hito: "Muestreo" },
      { fecha: "Después del muestreo", hito: "Resultados" },
    ],
    necesidades: [
      { texto: "Hisopos, guantes y desinfectante", tipo: "material", cubierta: false },
      { texto: "Persona con formación en herpetología", tipo: "voluntariado", cubierta: false },
      { texto: "Coste de los análisis de laboratorio", tipo: "dinero", cubierta: false },
    ],
    destino_fondos: "Material de muestreo, envío de muestras y análisis de laboratorio.",
    resultados: "",
    estado: "pausado",
    moneda: "pen",
    presupuesto: 950000,
    ejemplo: true,
    publicado: true,
  },
  {
    nombre: "Tejidos del sapo: artesanía para financiar la conservación",
    resumen: "Ejemplo de proyecto que busca apoyo: tejedoras de la comunidad venden piezas con el sapo arlequín.",
    descripcion: "Las tejedoras de la comunidad hacen chullos, chompas y mantas con diseños del sapo. Parte de cada venta va a un fondo comunal de conservación.\n\nEste texto es un ejemplo de estructura: no describe un proyecto real ni actividades que se estén realizando.",
    problema: "Los proyectos de conservación dependen de donaciones puntuales. Un ingreso propio y continuo ayuda a que la comunidad los mantenga.",
    especies: "Sapo arlequín peruano (Atelopus peruensis)",
    ecosistemas: "Quebradas altoandinas (protegidas con el fondo comunal)",
    zona: "caj",
    region: "Cajamarca (ejemplo)",
    responsable_org: "Ejemplo: asociación de tejedoras",
    objetivos: [
      "Crear una línea de piezas con el sapo",
      "Encontrar puntos de venta dentro y fuera de Perú",
      "Destinar una parte fija de cada venta al fondo comunal",
    ],
    actividades: [
      { texto: "Diseño de las piezas con las tejedoras", hecha: true },
      { texto: "Fotos y fichas de cada pieza", hecha: false },
      { texto: "Primeros puntos de venta", hecha: false },
    ],
    calendario: [
      { fecha: "Mes 1", hito: "Diseños" },
      { fecha: "Meses 2 y 3", hito: "Primera producción" },
      { fecha: "Mes 4", hito: "Venta" },
    ],
    necesidades: [
      { texto: "Lana y tintes naturales para la primera producción", tipo: "material", cubierta: false },
      { texto: "Apoyo en fotografía y tienda online", tipo: "voluntariado", cubierta: false },
    ],
    destino_fondos: "Lana y tintes para la primera producción; el resto lo financian las ventas.",
    resultados: "",
    estado: "buscando",
    moneda: "pen",
    meta_fondos: 250000,
    ejemplo: true,
    publicado: true,
  },
];
