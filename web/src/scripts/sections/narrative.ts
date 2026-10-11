/**
 * 7.2 Narración — script de la sección (#narracion).
 * PROPIETARIO: Sección A. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#narracion). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Cada frase se ilumina palabra a palabra con el scroll: opacity 0.2 → 1
 *    (NO animar color), scrub 0.6–1, ease 'none'.
 *  - SplitText con aria 'hidden' + copia del texto en <span class="sr-only">.
 *  - Táctil: misma idea con scrub más corto o reveal por frase.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, mm, conditions, modeOf } = ctx;
  if (!root) return;

  mm.add(conditions, (self) => {
    const mode = modeOf(self.conditions);
    if (mode === 'reduced') return; // maqueta estática, sin animaciones

    if (mode === 'desktop') {
      // TODO: versión escritorio
    } else {
      // TODO: versión táctil / < 1024 px
    }

    // return () => { /* limpieza de listeners propios (los tweens se revierten solos) */ };
  }, root); // scope: los selectores de texto ('.x') dentro del callback se buscan solo en root
}
