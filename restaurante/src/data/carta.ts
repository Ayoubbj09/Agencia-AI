/**
 * CARTA DE EJEMPLO — basada en los platos que se ven en las redes de Al Madina.
 * Pendiente de la carta real: cambia nombres, descripciones y precios (precio
 * entre comillas, p. ej. '6,50 €'; si aún no hay precio, deja precio: '').
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
    id: 'brasa',
    nombre: 'A la brasa',
    platos: [
      { nombre: 'Brochetas de pollo', descripcion: 'Pollo marinado con especias, hecho a la parrilla.', precio: '' },
      { nombre: 'Brochetas de kefta', descripcion: 'Carne picada especiada al estilo marroquí.', precio: '' },
      { nombre: 'Chuletas de cordero', descripcion: 'A la brasa, en su punto.', precio: '' },
      { nombre: 'Parrillada para compartir', descripcion: 'Surtido de carnes y brochetas a la brasa.', precio: '' },
    ],
  },
  {
    id: 'mar',
    nombre: 'Del mar',
    platos: [
      { nombre: 'Sopa de marisco', descripcion: 'Caldo de marisco con gambas y un toque de limón.', precio: '' },
      { nombre: 'Cazuela de marisco', descripcion: 'Gambas y mejillones en salsa de tomate, con limón y perejil.', precio: '' },
    ],
  },
  {
    id: 'fastfood',
    nombre: 'Fast food',
    platos: [
      { nombre: 'Tacos', descripcion: 'Con la carne que prefieras, patatas, queso y salsa.', precio: '' },
      { nombre: 'Patatas con salsa', descripcion: 'Patatas fritas con salsa de la casa.', precio: '' },
      { nombre: 'Hamburguesa', descripcion: 'Pan tierno, carne a la plancha y salsa.', precio: '' },
    ],
  },
  {
    id: 'batidos',
    nombre: 'Batidos y postres',
    platos: [
      { nombre: 'Batido de fresa', descripcion: 'Batido cremoso de fresa.', precio: '' },
      { nombre: 'Postre de la casa', descripcion: 'Postre de leche con sirope de fresa. Te hará recordar tu infancia.', precio: '' },
      { nombre: 'Té a la menta', descripcion: 'Té verde con hierbabuena, servido a la marroquí.', precio: '' },
    ],
  },
];
