/* Dibujos para usar de imagen de perfil si no se quiere subir una foto. [clave, español, inglés] */
export const AVATARES = [
  ["sapo-roca", "Sapo en la piedra", "Toad on a rock"],
  ["sapo-frente", "Sapo de frente", "Toad, front view"],
  ["sapo-amanecer", "Sapo al amanecer", "Toad at sunrise"],
  ["investigadora", "Investigadora", "Researcher"],
  ["investigador", "Investigador", "Researcher"],
  ["comunera", "Comunera", "Community member"],
  ["comunero", "Comunero", "Community member"],
  ["abuela", "Abuela", "Grandmother"],
  ["abuelo", "Abuelo", "Grandfather"],
  ["tejedora", "Tejedora", "Weaver"],
  ["musico", "Músico con zampoña", "Panpipe player"],
  ["observadora", "Observadora con binoculares", "Watcher with binoculars"],
  ["condor", "Cóndor", "Condor"],
  ["picaflor", "Picaflor", "Hummingbird"],
  ["oso", "Oso de anteojos", "Spectacled bear"],
  ["vicunas", "Vicuñas", "Vicuñas"],
  ["llama", "Llama", "Llama"],
  ["vizcacha", "Vizcacha", "Viscacha"],
  ["nevado", "Nevado", "Snow-capped peak"],
  ["quebrada", "Quebrada", "Mountain stream"],
];
const CLAVES = new Set(AVATARES.map((a) => a[0]));
export const avatarValido = (k) => CLAVES.has(String(k || ""));
export const avatarUrl = (k) => (avatarValido(k) ? "/img/avatares/" + k + ".webp" : "");
