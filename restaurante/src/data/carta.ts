/**
 * CARTA DE EJEMPLO — pendiente de la carta real de Al Madina.
 *
 * Para poner la carta de verdad: cambia los nombres, descripciones y precios
 * de abajo (precio entre comillas, p. ej. '6,50 €'). Si un plato no tiene
 * precio todavía, deja precio: ''.
 * Mientras `cartaDeEjemplo` sea true, la web muestra el aviso "Carta de ejemplo".
 */
export const cartaDeEjemplo = true;

export interface Plato {
  nombre: string;
  descripcion: string;
  precio: string;
}
export interface Categoria {
  id: string;
  nombre: string;
  platos: Plato[];
}

export const carta: Categoria[] = [
  {
    id: 'tacos',
    nombre: 'Tacos',
    platos: [
      { nombre: 'Taco de pollo', descripcion: 'Pollo marinado, patatas, queso fundido y salsa de la casa.', precio: '' },
      { nombre: 'Taco de kefta', descripcion: 'Carne picada especiada al estilo marroquí, patatas y salsa.', precio: '' },
      { nombre: 'Taco mixto', descripcion: 'Pollo y kefta, patatas, queso y salsa a elegir.', precio: '' },
    ],
  },
  {
    id: 'durum',
    nombre: 'Durum y bocadillos',
    platos: [
      { nombre: 'Durum de pollo', descripcion: 'Pan fino enrollado con pollo, verduras y salsa.', precio: '' },
      { nombre: 'Bocadillo de kefta', descripcion: 'Pan crujiente, kefta a la plancha, cebolla y especias.', precio: '' },
      { nombre: 'Bocadillo de pollo', descripcion: 'Pollo a la plancha, ensalada y salsa de la casa.', precio: '' },
    ],
  },
  {
    id: 'platos',
    nombre: 'Platos marroquíes',
    platos: [
      { nombre: 'Tajín de pollo', descripcion: 'Pollo guisado lentamente con especias, limón y aceitunas.', precio: '' },
      { nombre: 'Cuscús', descripcion: 'Sémola con verduras y carne, receta tradicional.', precio: '' },
      { nombre: 'Harira', descripcion: 'Sopa marroquí de tomate, legumbres y especias.', precio: '' },
    ],
  },
  {
    id: 'bebidas',
    nombre: 'Bebidas y dulces',
    platos: [
      { nombre: 'Té a la menta', descripcion: 'Té verde con hierbabuena fresca, servido a la marroquí.', precio: '' },
      { nombre: 'Batido natural', descripcion: 'Preparado al momento con fruta.', precio: '' },
      { nombre: 'Dulces marroquíes', descripcion: 'Selección de pastas tradicionales con miel y almendra.', precio: '' },
    ],
  },
];
