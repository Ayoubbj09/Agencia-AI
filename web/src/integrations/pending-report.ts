/**
 * Aviso de publicación (spec §8, "Bloqueo de publicación").
 *
 * Al terminar `npm run build`, mientras `legalCompleto` sea false en
 * src/config/site.ts, muestra en consola un aviso bien visible con TODAS las
 * marcas que quedan en src/:
 *   - [PENDIENTE…]              datos que hay que rellenar (casi todos en site.ts)
 *   - [REVISAR CON GESTORÍA…]   puntos de los textos legales a revisar con la gestoría
 * con su archivo:línea, y en qué páginas generadas se ven todavía.
 *
 * Nunca hace fallar el build: si algo va mal, solo avisa.
 * Ya está registrada en astro.config.mjs (no hace falta tocar nada más).
 *
 * Qué NO cuenta como marca (para no dar falsos avisos):
 *   - menciones de ejemplo con puntos suspensivos ("[PENDIENTE…]", "[PENDIENTE: ...]");
 *   - los archivos .css (solo nombran la clase de resaltado) y este mismo archivo.
 */
import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../config/site';

const SCAN_EXT = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.md', '.mdx', '.json', '.html']);
const MARK = /\[(PENDIENTE|REVISAR CON GESTORÍA)([^\][]{0,400})\]/g;
const ONLY_ELLIPSIS = /^\s*:?\s*(…|\.\.\.)\s*$/;

interface Hit {
  kind: 'PENDIENTE' | 'REVISAR CON GESTORÍA';
  file: string;
  line: number;
  text: string;
  /** Campo de site.ts en esa línea (p. ej. "nombreLegal"), si lo hay. */
  field?: string;
}

async function walk(dir: string, filter: (f: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      out.push(...(await walk(p, filter)));
    } else if (filter(p)) out.push(p);
  }
  return out;
}

async function scanSource(root: string): Promise<Hit[]> {
  const srcDir = join(root, 'src');
  const self = fileURLToPath(import.meta.url);
  const files = await walk(srcDir, (f) => SCAN_EXT.has(extname(f)) && !f.endsWith(`integrations${sep}pending-report.ts`) && f !== self);
  const hits: Hit[] = [];
  for (const file of files.sort()) {
    const content = await readFile(file, 'utf8');
    const lines = content.split('\n');
    for (const m of content.matchAll(MARK)) {
      const [whole, kind, body] = m;
      if (ONLY_ELLIPSIS.test(body)) continue;
      const line = content.slice(0, m.index).split('\n').length;
      const field = /^\s*([A-Za-z]\w*)\s*:/.exec(lines[line - 1] ?? '')?.[1];
      hits.push({
        kind: kind as Hit['kind'],
        file: relative(root, file).split(sep).join('/'),
        line,
        // Las marcas largas pueden partirse en varias líneas en el código.
        text: whole.replace(/\s+/g, ' '),
        field: file.endsWith(`config${sep}site.ts`) ? field : undefined,
      });
    }
  }
  return hits;
}

/** Páginas generadas en las que todavía se ve alguna marca (y cuántas). */
async function scanOutput(outDir: string): Promise<Array<[string, number]>> {
  const files = await walk(outDir, (f) => f.endsWith('.html'));
  const pages: Array<[string, number]> = [];
  for (const file of files.sort()) {
    const html = await readFile(file, 'utf8');
    // Solo el texto visible: fuera <script>, <style> y comentarios.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    const n = Array.from(text.matchAll(MARK)).filter((m) => !ONLY_ELLIPSIS.test(m[2])).length;
    if (!n) continue;
    let route = '/' + relative(outDir, file).split(sep).join('/');
    route = route.replace(/index\.html$/, '').replace(/\.html$/, '');
    pages.push([route, n]);
  }
  return pages.sort(([a], [b]) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

/* ── Presentación ──────────────────────────────────────────────────────── */

const useColor =
  !process.env.NO_COLOR && (Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY));
const paint = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const banner = paint('1;38;5;16;48;5;208'); // negro sobre naranja
const orange = paint('1;38;5;208');
const yellow = paint('33');
const dim = paint('2');
const bold = paint('1');

function box(title: string, width: number): string[] {
  const pad = Math.max(0, width - title.length - 4);
  const line = ' '.repeat(width);
  return [banner(line), banner(`  ${title}${' '.repeat(pad)}  `), banner(line)];
}

function list(hits: Hit[]): string[] {
  const loc = (h: Hit) => `${h.file}:${h.line}`;
  const w = Math.min(44, Math.max(...hits.map((h) => loc(h).length)));
  return hits.map(
    (h) => `   ${dim(loc(h).padEnd(w))}  ${h.field ? yellow(`${h.field}: `) : ''}${h.text}`,
  );
}

function report(
  logger: AstroIntegrationLogger,
  hits: Hit[],
  pages: Array<[string, number]>,
): void {
  const pending = hits.filter((h) => h.kind === 'PENDIENTE');
  const review = hits.filter((h) => h.kind === 'REVISAR CON GESTORÍA');
  const W = 78;
  const out: string[] = [''];

  if (!site.legalCompleto) {
    out.push(...box('⚠  NO PUBLICAR TODAVÍA · legalCompleto: false (src/config/site.ts)', W));
    out.push(
      '',
      `   Mientras sea ${bold('false')}: todas las páginas llevan ${bold('noindex, nofollow')} y`,
      `   robots.txt devuelve ${bold('Disallow: /')}. No conectes el dominio ni compartas el enlace`,
      `   hasta rellenar nombre legal, NIF, domicilio y correo y poner ${bold('legalCompleto: true')}.`,
    );
  } else {
    out.push(...box('⚠  legalCompleto: true, PERO QUEDAN MARCAS SIN RESOLVER', W));
    out.push('', '   La web es indexable y estas marcas se ven resaltadas en páginas públicas.');
  }

  out.push('', orange(`   [PENDIENTE] · ${pending.length}`));
  out.push(...(pending.length ? list(pending) : ['   (ninguno)']));
  out.push('', orange(`   [REVISAR CON GESTORÍA] · ${review.length}`));
  out.push(...(review.length ? list(review) : ['   (ninguno)']));
  if (pages.length) {
    out.push(
      '',
      `   ${bold('Se ven resaltadas en:')} ${pages.map(([r, n]) => `${r} (${n})`).join(' · ')}`,
    );
  }
  out.push(
    '',
    dim('   Casi todo se cambia en src/config/site.ts. Cambia también legalActualizado'),
    dim('   cada vez que modifiques el aviso legal o la política de privacidad.'),
    '',
  );
  console.log(out.join('\n'));
  logger.warn(
    `${pending.length} [PENDIENTE] y ${review.length} [REVISAR CON GESTORÍA] sin resolver` +
      (site.legalCompleto ? '.' : ' · legalCompleto: false (noindex + robots Disallow).'),
  );
}

export default function pendingReport(): AstroIntegration {
  let root = process.cwd();
  return {
    name: 'relevo-pending-report',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': async ({ dir, logger }) => {
        try {
          const hits = await scanSource(root);
          const pages = await scanOutput(fileURLToPath(dir)).catch(() => []);
          if (!site.legalCompleto || hits.length) report(logger, hits, pages);
          else logger.info('Sin [PENDIENTE] ni [REVISAR CON GESTORÍA]. legalCompleto: true.');
        } catch (err) {
          // El aviso nunca debe romper el build.
          logger.warn(`No se pudo generar el aviso de pendientes: ${(err as Error).message}`);
        }
      },
    },
  };
}
