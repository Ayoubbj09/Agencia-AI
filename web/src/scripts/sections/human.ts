/**
 * 7.4 Control humano — script de la sección (#control-humano).
 * PROPIETARIO: Sección B. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#control-humano). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Línea naranja que viaja del icono "agente" al icono "persona" con el scroll
 *    (stroke-dashoffset en SVG pequeño o scaleX), scrub, ease 'none'.
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
