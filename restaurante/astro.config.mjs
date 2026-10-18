// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import { site } from './src/config/site.ts';
// Aviso de [PENDIENTE] en consola durante `npm run build` (lo implementa la Sección D
// dentro de ./src/integrations/pending-report.ts; aquí ya está conectado).
import pendingReport from './src/integrations/pending-report.ts';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // URL pública de la web. Sale de src/config/site.ts (campo `dominio`).
  site: site.dominio,
  output: 'static',

  // Astro 7 usa por defecto `compressHTML: 'jsx'`, que elimina los espacios entre
  // elementos en línea separados por saltos de línea (p. ej. "por <em>WhatsApp</em>").
  // Con `true` se colapsan a un solo espacio, como en HTML normal.
  compressHTML: true,

  integrations: [
    sitemap(),
    // ── Sección D: aviso de [PENDIENTE] en build ──
    pendingReport(),
  ],

  // Sin peticiones a terceros: no usamos prefetch, fuentes remotas ni CDNs.
  prefetch: false,
  devToolbar: { enabled: false },
});
