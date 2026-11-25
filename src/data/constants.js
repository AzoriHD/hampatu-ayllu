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

export { SIMB, SIMB_K, SIMB_VIEJOS, TONOS } from "./simbolos.js";

/* Qué pasa al dar me gusta en Descubre (se elige en el perfil): «mensaje» abre un mensaje para el autor, «guardar» solo lo guarda */
export const AL_GUSTAR = { mensaje: ["Abrir un mensaje para quien lo publicó", "Open a message to whoever posted it"], guardar: ["Solo guardarlo en «Anuncios que te gustaron»", "Just save it in «Posts you liked»"] };
export function alGustarDe(p) { return p && p.alGustar === "guardar" ? "guardar" : "mensaje"; }
