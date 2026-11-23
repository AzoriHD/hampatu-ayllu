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

/* El proyecto de ejemplo del encargo: enseña la estructura de una ficha. NO es un proyecto real ni describe
   actividades en marcha. Lleva ejemplo = true: sale marcado como ejemplo y no cuenta en ninguna cifra. */
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
