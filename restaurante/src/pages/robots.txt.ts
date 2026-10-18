/**
 * /robots.txt (spec §8 y §10). Se genera en el build a partir de site.ts:
 *  - legalCompleto: false → bloquea a todos los buscadores (Disallow: /).
 *  - legalCompleto: true  → permite indexar y enlaza el sitemap del dominio.
 */
import type { APIRoute } from 'astro';
import { site, absoluteUrl } from '../config/site';

export const GET: APIRoute = () => {
  const body = site.legalCompleto
    ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`, '']
    : [
        '# Web en preparación: faltan los datos legales (legalCompleto: false en src/config/site.ts).',
        '# Mientras tanto no se permite indexar ninguna página.',
        'User-agent: *',
        'Disallow: /',
        '',
      ];
  return new Response(body.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
