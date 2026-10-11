/**
 * 7.3 Qué hace un agente — script de la sección (#que-hace).
 * PROPIETARIO: Sección B. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página, y solo si existe
 * la raíz (#que-hace). Los [data-reveal] genéricos de la sección ya los anima el núcleo
 * (core/reveal.ts) justo antes de esta llamada.
 *
 * Patrón: todo lo animado va dentro de ctx.mm.add(ctx.conditions, ...); el
 * contexto revierte tweens, ScrollTriggers y SplitText al cambiar de modo.
 *
 * Por hacer (spec):
 *  - Desktop: sección pinned; la conversación avanza con el scroll (scrub, ease 'none').
 *    Indicador "escribiendo…" y burbujas con scale + fade. Las 4 capacidades
 *    se resaltan al llegar a su punto. Aviso final = notificación que sale del
 *    móvil hacia una persona (el relevo visual).
 *  - Táctil / < 1024 px: sin pin; la conversación se reproduce por tiempo al
 *    entrar en pantalla y las capacidades van debajo con reveal.
 *  - "Conversación de ejemplo" y "Aviso de ejemplo" SIEMPRE visibles (también sin JS).
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
