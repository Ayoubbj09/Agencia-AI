/**
 * 7.5 Para qué negocios — script de la sección (#sectores).
 * PROPIETARIO: Sección C. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#sectores). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Desktop: pin + scroll horizontal. Guarda el tween horizontal en una variable
 *    (ease 'none') y pásalo como containerAnimation a los ScrollTriggers del
 *    reveal por clip-path y del parallax interior de cada panel (sin scale > 1).
 *  - Táctil / < 1024 px: sin pin; carrusel nativo con scroll-snap y
 *    data-lenis-prevent, o lista vertical.
 *  - Cursor "Ver" sobre los paneles (data-cursor="Ver").
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
