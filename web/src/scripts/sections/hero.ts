/**
 * 7.1 Hero — script de la sección (#inicio).
 * PROPIETARIO: Sección A. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#inicio). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Entrada del h1 por líneas/palabras con ctx.split (aria 'auto'), subiendo
 *    desde abajo con un ligero blur que se aclara (filter: blur permitido aquí).
 *    Hoy el h1 usa data-reveal="split" genérico: cámbialo a "manual" al animarlo tú.
 *  - WebGL (OGL) en [data-hero-visual]: import() tras 'load' + requestIdleCallback,
 *    solo modo desktop con WebGL. DPR ≤ 1.5, render al 50–75 %, pausa con
 *    IntersectionObserver y visibilitychange. Táctil/sin WebGL/reduced: degradado CSS.
 *  - Scroll: zoom-out/parallax sutil del fondo y fade (scrub, ease 'none').
 *  - Preloader opcional (≤ 0,8 s, solo home, no si document.referrer es del propio sitio).
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
