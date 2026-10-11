/**
 * ============================================================================
 *  CONFIGURACIÓN DE LA WEB DE RELEVO IA
 * ============================================================================
 *
 *  Este es el ÚNICO archivo que tienes que tocar para cambiar los datos de la
 *  empresa (nombre legal, NIF, dirección, correo, teléfono, WhatsApp...).
 *
 *  Cómo editarlo:
 *   - Cambia solo el texto que está entre comillas "así".
 *   - No borres las comillas, las comas ni los nombres de la izquierda.
 *   - Mientras un dato ponga "[PENDIENTE: ...]", la web lo muestra resaltado en
 *     naranja para que no se te olvide rellenarlo.
 *   - Al guardar, la web se actualiza sola en todas las páginas.
 * ============================================================================
 */

export interface SiteConfig {
  nombreComercial: string;
  nombreLegal: string;
  nif: string;
  direccion: string;
  correo: string;
  telefono: string;
  whatsapp: string;
  whatsappUrl: string;
  dominio: string;
  legalCompleto: boolean;
  legalActualizado: string;
  avisoAgenteIA: boolean;
}

export const site: SiteConfig = {
  // Nombre con el que se conoce la marca. Úsalo siempre completo: "Relevo IA".
  nombreComercial: 'Relevo IA',

  // Nombre de la persona o empresa titular (autónomo o sociedad), tal y como
  // aparece en Hacienda. Sale en el pie, en el aviso legal y en la privacidad.
  // [PENDIENTE: NOMBRE LEGAL] provisional: cambiar por el nombre del DNI/NIE
  // (autónomo) o el de la sociedad antes de poner legalCompleto: true.
  nombreLegal: 'Relevo IA',

  // NIF o CIF del titular.
  nif: '[PENDIENTE: NIF]',

  // Domicilio completo del titular (calle, número, código postal, ciudad).
  direccion: '[PENDIENTE: DIRECCIÓN]',

  // Correo de contacto. Sale en el pie, en Contacto y en las páginas legales.
  correo: 'boujlikhayoub1@gmail.com',

  // Teléfono de contacto (puede ser el mismo que el de WhatsApp).
  telefono: '+34 613 657 130',

  // Número de WhatsApp tal y como se enseña en la web.
  whatsapp: '+34 613 657 130',

  // Enlace que abre WhatsApp con un mensaje ya escrito.
  // Si cambias el número de arriba, cambia también los dígitos de aquí
  // (34 + número, sin espacios ni el signo +).
  whatsappUrl:
    'https://wa.me/34613657130?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20Relevo%20IA',

  // [PENDIENTE: DOMINIO] cambiar por el dominio definitivo
  // Dirección completa de la web, con https:// y sin barra al final.
  // Se usa para la URL canónica, Open Graph, el sitemap y los datos estructurados.
  dominio: 'https://relevo-ia.vercel.app',

  // Ponlo en true SOLO cuando hayas rellenado todos los datos legales de arriba
  // (nombre legal, NIF, dirección y correo) y revisado los textos legales.
  // Mientras sea false, Google no indexa la web (noindex) y robots.txt la bloquea.
  legalCompleto: false,

  // Fecha de la última revisión de los textos legales. Escríbela a mano y
  // cámbiala cada vez que modifiques el aviso legal o la política de privacidad.
  legalActualizado: '11 de octubre de 2026',

  // [PENDIENTE: confirmar que nuestro WhatsApp lo atiende el agente]
  // true = bajo el botón de WhatsApp se avisa de que primero responde un agente
  // de IA y que una persona toma el relevo cuando hace falta.
  avisoAgenteIA: true,
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

/** "+34 613 657 130" → "+34613657130" (para enlaces tel:). */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
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
  { label: 'Qué hace', id: 'que-hace' },
  { label: 'Sectores', id: 'sectores' },
  { label: 'Cómo trabajamos', id: 'como-trabajamos' },
  { label: 'Contacto', id: 'contacto' },
];

/** En la home el enlace es "#id"; en el resto de páginas, "/#id". */
export function navHref(id: string, isHome: boolean): string {
  return isHome ? `#${id}` : `/#${id}`;
}

/** Textos SEO por defecto. */
export const seo = {
  titleHome: 'Relevo IA · Agentes de IA para WhatsApp',
  description:
    'Diseñamos, montamos y mantenemos agentes de IA que atienden a tus clientes por WhatsApp, los cualifican, agendan citas y avisan a tu equipo cuando hace falta.',
  ogImage: '/og.png',
  ogImageAlt: 'Relevo IA · Agentes de IA para WhatsApp',
  themeColor: '#0B0A09',
  locale: 'es_ES',
} as const;
