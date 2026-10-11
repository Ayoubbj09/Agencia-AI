/**
 * Integración de Astro que, al hacer `npm run build`, muestra en consola un aviso
 * bien visible con la lista de [PENDIENTE] y [REVISAR CON GESTORÍA] que quedan
 * (spec §8, "Bloqueo de publicación").
 *
 * PROPIETARIO: Sección D. Ya está registrada en astro.config.mjs, así que basta
 * con rellenar los hooks de abajo (no hace falta tocar astro.config.mjs).
 *
 * Pistas: usar el hook 'astro:build:done' ({ dir, logger }) para recorrer los
 * .html generados, o bien leer src/ y src/config/site.ts (ver pendingFields()).
 */
import type { AstroIntegration } from 'astro';

export default function pendingReport(): AstroIntegration {
  return {
    name: 'relevo-pending-report',
    hooks: {
      // 'astro:build:done': async ({ dir, logger }) => { … },
    },
  };
}
