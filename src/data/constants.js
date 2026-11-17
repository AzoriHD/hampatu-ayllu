/* Datos fijos de la app: zonas, tipos, diseños, símbolos. */
export const ZONAS=[["caj","Cajamarca"],["anc","Áncash"],["otra","Otra zona"]];
export const P=Object.fromEntries(ZONAS);
export const TA={avistamiento:"Avistamiento",necesitamos:"Necesitamos",ofrecemos:"Ofrecemos",evento:"Evento",pregunta:"Pregunta"};
export const TC={local:"Comunidad local",guias:"Guías y guardaparques",escuela:"Escuela",ong:"ONG",investigacion:"Investigación",otro:"Otro"};
export const ES={vivo:"Vivo y activo",debil:"Débil o enfermo",muerto:"Muerto",renacuajos:"Renacuajos"};
export const TF={faena:"Faena",taller:"Taller o charla",entrega:"Entrega de recompensas",reunion:"Reunión",monitoreo:"Recorrido de monitoreo",otro:"Otro"};
export const JOIN={evento:["Me apunto","Se apuntaron"],ofrecemos:["Me interesa","Interesados"],necesitamos:["Puedo ayudar","Pueden ayudar"],hacer:["Puedo hacerlo","Pueden hacerlo"],querer:["Lo quiero","Lo quieren"]};
export const DCAT={prendas:["Prendas","Clothing"],accesorios:["Bolsos y accesorios","Bags and accessories"],ceramica:["Cerámica y mates","Pottery and gourds"],hogar:["Hogar, escuela y música","Home, school and music"]};
export const DIS=[
 ["chompa","prendas","Chompa","Jumper","Tejido a palitos con franjas de sapos","Hand-knitted with bands of toads"],
 ["chullo","prendas","Chullo","Chullo hat","Tejido de lana con orejeras y trenzas","Wool knit with ear flaps and braids"],
 ["poncho","prendas","Poncho","Poncho","Tejido en telar con sapos en los bordes","Loom-woven with toads along the edges"],
 ["bufanda","prendas","Bufanda","Scarf","Tejido con flecos","Knitted with fringes"],
 ["guantes","prendas","Guantes sin dedos","Fingerless gloves","Tejido a palitos","Hand-knitted"],
 ["medias","prendas","Medias","Socks","Tejido de lana","Wool knit"],
 ["manta","prendas","Manta","Blanket shawl","Tejido en telar con flecos","Loom-woven with fringes"],
 ["pantuflas","prendas","Pantuflas","Slippers","Tejido con forro de lana de oveja","Woven with sheepskin lining"],
 ["zapatillas","prendas","Zapatillas de tela","Canvas shoes","Tela tejida y suela de yute","Woven fabric and jute sole"],
 ["bolso","accesorios","Bolso","Tote bag","Tela con bordado y pompones","Fabric with embroidery and pompoms"],
 ["morral","accesorios","Morral","Drawstring bag","Tejido con cordón trenzado","Knitted with a braided cord"],
 ["canguro","accesorios","Canguro","Bum bag","Tela tejida con borlas","Woven fabric with tassels"],
 ["monedero","accesorios","Monedero","Coin purse","Bordado con borla","Embroidered with a tassel"],
 ["cartuchera","accesorios","Cartuchera","Zip pouch","Tela bordada con cierre","Embroidered fabric with zip"],
 ["billetera","accesorios","Billetera","Wallet","Tela tejida","Woven fabric"],
 ["celular","accesorios","Porta celular","Phone pouch","Tela tejida con cordón","Woven fabric with cord"],
 ["sombrero","accesorios","Sombrero con cinta","Hat with woven band","Cinta tejida para sombrero de fieltro","Woven band for a felt hat"],
 ["llavero","accesorios","Llavero","Key ring","Sapitos a crochet y borla","Crochet toads and a tassel"],
 ["parches","accesorios","Parches bordados","Embroidered patches","Para coser en mochilas y ropa","To sew on bags and clothes"],
 ["aretes","accesorios","Aretes y collar","Earrings and necklace","Sapitos de cerámica o semilla","Small ceramic or seed toads"],
 ["taza","ceramica","Taza","Mug","Cerámica con el sapo en relieve","Ceramic with the toad in relief"],
 ["ceramica","ceramica","Sapitos de cerámica","Ceramic toads","Barro pintado a mano","Hand-painted clay"],
 ["silbato","ceramica","Silbato de cerámica","Ceramic whistle","Barro modelado","Moulded clay"],
 ["mate","ceramica","Mate burilado","Carved gourd","Calabaza tallada a mano","Hand-carved gourd"],
 ["cojin","hogar","Cojín","Cushion","Tejido con borlas","Woven with tassels"],
 ["amigurumi","hogar","Sapo de crochet","Crochet toad","Muñeco tejido para niños","Knitted toy for children"],
 ["cuaderno","hogar","Cuaderno","Notebook","Tapa de yute estampada","Printed jute cover"],
 ["zampona","hogar","Zampoña con cinta","Panpipes with band","Cinta tejida con sapos","Woven band with toads"]
];
export const TD={"":"Todos los avisos, del más reciente al más antiguo.",
  avistamiento:"Has visto un sapo, renacuajos o uno muerto. Di cómo estaba y en qué zona, y sube una foto: si se verifica, puede tener recompensa.",
  necesitamos:"Algo que le falta a tu comunidad para ayudar al sapo: material, formación, transporte o contactos.",
  ofrecemos:"Algo que puedes dar a otras comunidades: talleres, material, tiempo o movilidad.",
  evento:"Una faena, charla, salida o reunión. Pon fecha, hora y punto de encuentro.",
  pregunta:"Una duda para el resto de la comunidad. Quien sepa, responde debajo."};
export const TCD={local:"Comunidad campesina, ronda, comité de regantes o junta vecinal.",
  guias:"Guías, guardaparques o gente que recorre la zona por trabajo.",
  escuela:"Escuelas, colegios y docentes.",
  ong:"Asociaciones y ONG, peruanas o extranjeras.",
  investigacion:"Universidades, estudiantes e investigadores.",
  otro:"Municipalidades, empresas locales o cualquier otro grupo."};
/* Decimal-degree pairs, degrees-minutes, or UTM: exact locations stay out of the community. */
export const COORD=/(-?\d{1,3}[.,]\d{3,}\s*[,;\/ ]\s*-?\d{1,3}[.,]\d{3,})|(\d{1,3}\s*°\s*\d{1,2}\s*['’′])|(\b\d{1,2}\s?[C-Xc-x]\s+\d{6}\s+\d{7}\b)/;
export const COORD_MSG="Quita las coordenadas exactas e indica solo la región. Los traficantes de fauna buscan esos datos.";

export const SIMB={
  sapo:['Sapo','Toad','<ellipse cx="12" cy="13.5" rx="4" ry="5.2"/><circle cx="10" cy="7.6" r="1.4"/><circle cx="14" cy="7.6" r="1.4"/><path d="M8.6 11 5 8.4 3.4 9.4M15.4 11 19 8.4l1.6 1M8.6 17 5 19.6l-1.6-.6M15.4 17l3.6 2.6 1.6-.6"/>'],
  gota:['Gota','Drop','<path d="M12 3c3.6 4.7 6 8 6 11a6 6 0 0 1-12 0c0-3 2.4-6.3 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2 2.4"/>'],
  montana:['Montaña','Mountain','<path d="M2 19 9 8l4 6 3-4 6 9z"/><path d="M7.4 10.6 9 12.2l1.6-1.6"/>'],
  sol:['Sol','Sun','<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
  luna:['Luna','Moon','<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z"/>'],
  hoja:['Hoja','Leaf','<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 14.5 9.5"/>'],
  chakana:['Chakana','Chakana','<path d="M9 2.5h6v3.5h3v3h3.5v6H18v3h-3v3.5H9V18H6v-3H2.5V9H6V6h3z"/><circle cx="12" cy="12" r="2.4"/>'],
  espiral:['Espiral','Spiral','<path d="M11 12a1 1 0 0 1 2 0 2 2 0 0 1-4 0 3 3 0 0 1 6 0 4 4 0 0 1-8 0 5 5 0 0 1 10 0"/>'],
  ola:['Ola','Wave','<path d="M2.5 9.5c2.4-2.8 4.8-2.8 7.2 0s4.8 2.8 7.2 0c1.6-1.8 3.2-2.2 4.6-1.2M2.5 15.5c2.4-2.8 4.8-2.8 7.2 0s4.8 2.8 7.2 0c1.6-1.8 3.2-2.2 4.6-1.2"/>'],
  flor:['Flor','Flower','<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6 11 3.5 12 3.5s2 2.5 0 6.3zM14.1 11.3c3.2-2.6 5.8-2.3 6.1-1.3s-1.6 2.9-5.6 3.3zM13.3 14c1.6 3.7.4 6-.6 6.3s-2.4-2-1.4-5.8zM10.7 14c-1 3.8-3.3 5.1-4.1 4.5s-.3-3.4 3.4-5.3zM9.9 11.3c-4-.4-5.9-2.3-5.6-3.3s2.9-1.3 6.1 1.3z"/>'],
  ichu:['Ichu','Ichu grass','<path d="M12 20.5V7M12 20.5C10.4 14.6 7.6 11.4 4 9.8M12 20.5c1.6-5.9 4.4-9.1 8-10.7M12 20.5c-.8-3.8-2.4-6.6-4.6-8.7M12 20.5c.8-3.8 2.4-6.6 4.6-8.7M3 20.5h18"/>'],
  estrella:['Estrella','Star','<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>']
};
export const SIMB_K=Object.keys(SIMB);
