/**
 * 7.6 Cómo trabajamos — script de la sección (#como-trabajamos).
 * PROPIETARIO: Sección C. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#como-trabajamos). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Una línea se dibuja con el scroll (scaleY/scaleX o stroke-dashoffset), scrub,
 *    ease 'none', y cada paso (01–04) se ilumina al llegar.
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
