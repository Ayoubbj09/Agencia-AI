/**
 * ============================================================================
 *  CONFIGURACIÓN DE LA WEB DE AL MADINA (Salt, Girona)
 * ============================================================================
 *
 *  Este es el ÚNICO archivo que hay que tocar para cambiar los datos del
 *  restaurante (teléfono, dirección, horario, redes, datos legales...).
 *
 *  Cómo editarlo:
 *   - Cambia solo el texto que está entre comillas 'así'.
 *   - No borres las comillas, las comas ni los nombres de la izquierda.
 *   - Mientras un dato ponga "[PENDIENTE: ...]", la web lo muestra resaltado
 *     para que no se olvide rellenarlo.
 *   - La carta (platos) está en src/data/carta.ts.
 * ============================================================================
 */

export interface SiteConfig {
  nombreComercial: string;
  nombreArabe: string;
  lema: string;
  nombreLegal: string;
  nif: string;
  domicilioTitular: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
  correo: string;
  horario: string;
  horarioDetalle: string;
  precioPersona: string;
  instagram: string;
  tiktok: string;
  mapsUrl: string;
  resenasUrl: string;
  notaGoogle: string;
  numResenas: string;
  dominio: string;
  legalCompleto: boolean;
  legalActualizado: string;
}

export const site: SiteConfig = {
  // Nombre del restaurante tal y como se enseña en la web.
  nombreComercial: 'Al Madina',
  // "La ciudad" en árabe. Sale junto al logotipo.
  nombreArabe: 'المدينة',
  // Lema del propio restaurante (de su perfil de TikTok).
  lema: 'Saldrás con una sonrisa. ¡Te esperamos!',

  // Titular del negocio (persona o sociedad) tal y como aparece en Hacienda.
  nombreLegal: '[PENDIENTE: NOMBRE LEGAL DEL TITULAR]',
  // NIF o CIF del titular.
  nif: '[PENDIENTE: NIF]',
  // Domicilio fiscal del titular (puede ser distinto del restaurante).
  domicilioTitular: '[PENDIENTE: DOMICILIO DEL TITULAR]',

  // Dirección del restaurante.
  direccion: "Carrer d'Àngel Guimerà, 85",
  codigoPostal: '17190',
  ciudad: 'Salt (Girona)',

  // Teléfono para pedir y reservar.
  telefono: '872 27 24 99',
  // Correo de contacto (opcional).
  correo: '[PENDIENTE: CORREO]',

  // Horario. Google solo indica el cierre a las 00:00.
  horario: 'Cerramos a las 00:00',
  horarioDetalle: '[PENDIENTE: horario completo por días]',
  // Precio medio por persona (dato de Google).
  precioPersona: '10–20 €',

  // Redes sociales.
  instagram: 'https://www.instagram.com/almadina_fastfood_',
  tiktok: 'https://www.tiktok.com/@almadina_fastfood_',

  // Enlaces de Google Maps (solo se abren al hacer clic).
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=AL%20MADINA%20RESTAURANT%20FASTFOOD%2C%20Carrer%20d'%C3%80ngel%20Guimer%C3%A0%2085%2C%2017190%20Salt",
  resenasUrl:
    'https://www.google.com/maps/search/?api=1&query=AL%20MADINA%20RESTAURANT%20FASTFOOD%20Salt',
  // Nota y número de reseñas en Google. Actualízalos de vez en cuando.
  notaGoogle: '5,0',
  numResenas: '74',

  // [PENDIENTE: DOMINIO] cambiar por el dominio definitivo (con https:// y sin barra final).
  dominio: 'https://almadina-salt.vercel.app',

  // true SOLO cuando estén rellenos los datos legales y revisados los textos.
  // Mientras sea false, Google no indexa la web (noindex) y robots.txt la bloquea.
  legalCompleto: false,

  // Fecha de la última revisión de los textos legales (escrita a mano).
  legalActualizado: '18 de octubre de 2026',
};

export default site;

/* ---------------------------------------------------------------------------
 *  Ayudantes (no hace falta tocarlos)
 * ------------------------------------------------------------------------- */

/** Marca que delata un dato sin rellenar: "[PENDIENTE: …]" o "[REVISAR CON GESTORÍA…]". */
export const PENDING_PATTERN = /\[(?:PENDIENTE|REVISAR CON GESTORÍA)[^\]]*\]/g;

/** true si el texto contiene algún "[PENDIENTE…]" o "[REVISAR CON GESTORÍA…]". */
export function isPending(value: unknown): boolean {
  return typeof value === 'string' && /\[(?:PENDIENTE|REVISAR CON GESTORÍA)/.test(value);
}

/** Lista de los campos de site.ts que siguen pendientes (útil para avisos de build). */
export function pendingFields(config: SiteConfig = site): Array<[keyof SiteConfig, string]> {
  return (Object.entries(config) as Array<[keyof SiteConfig, unknown]>)
    .filter(([, v]) => isPending(v))
    .map(([k, v]) => [k, String(v)]);
}

/** "872 27 24 99" → "+34872272499" (para enlaces tel:). */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? digits : `+34${digits}`}`;
}

/** URL absoluta a partir del dominio: absoluteUrl('/og.png') → "https://…/og.png". */
export function absoluteUrl(path = '/'): string {
  return new URL(path, site.dominio).href;
}

/** true si la web puede indexarse (todos los datos legales completos). */
export const indexable = site.legalCompleto;

/** Año actual para el "©" del pie (se calcula al construir la web). */
export const currentYear = new Date().getFullYear();

/* ---------------------------------------------------------------------------
 *  Navegación principal (anclas de la página de inicio)
 * ------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  /** id de la sección en la home, sin "#". */
  id: string;
}

export const navLinks: NavLink[] = [
  { label: 'Carta', id: 'carta' },
  { label: 'Nosotros', id: 'nosotros' },
  { label: 'Reseñas', id: 'resenas' },
  { label: 'Cómo pedir', id: 'pedir' },
  { label: 'Visítanos', id: 'visitanos' },
];

/** En la home el enlace es "#id"; en el resto de páginas, "/#id". */
export function navHref(id: string, isHome: boolean): string {
  return isHome ? `#${id}` : `/#${id}`;
}

/** Textos SEO por defecto. */
export const seo = {
  titleHome: 'Al Madina · Restaurante marroquí y fast food en Salt (Girona)',
  description:
    "Restaurante marroquí y comida rápida en Salt (Girona). Para comer aquí, para llevar o a domicilio. Carrer d'Àngel Guimerà, 85 · 872 27 24 99.",
  ogImage: '/og.png',
  ogImageAlt: 'Al Madina · Restaurante marroquí en Salt (Girona)',
  themeColor: '#140D0A',
  locale: 'es_ES',
} as const;
