/**
 * Punto de entrada del JS (lo carga Base.astro en TODAS las páginas).
 *
 * Orden de arranque (no cambiar sin leer CONTRACT.md):
 *   1. Registra ScrollTrigger + SplitText y crea LA matchMedia compartida.
 *   2. Sincroniza html.motion con reduced motion (estados iniciales de reveal).
 *   3. Lenis (si no hay reduced motion) → cursor y magnéticos (solo desktop) → nav.
 *   4. Por cada sección, EN ORDEN DE PÁGINA: reveals genéricos de esa sección y
 *      luego su init(ctx). Así los ScrollTriggers se crean en el orden en que
 *      aparecen (necesario con pins).
 *   5. html.anim-ready en cuanto todo está montado (desactiva el salvavidas CSS
 *      de 3 s: a partir de aquí manda el JS).
 *   6. Tras document.fonts.ready: ScrollTrigger.refresh() y salto al #ancla si la
 *      URL trae una (spec §9); luego se resuelve ctx.ready.
 *
 * Las secciones NO editan este archivo: solo su src/scripts/sections/<x>.ts.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { conditions, modeOf, noModeMatches } from './core/media';
import { createLenis, destroyLenis, getLenis, scrollToTarget, startScroll, stopScroll } from './core/lenis';
import { revealElements, setupReveals, showAll } from './core/reveal';
import { splitText } from './core/split';
import { initCursor } from './core/cursor';
import { initMagnetic } from './core/magnetic';
import { initNav } from './core/nav';
import type { SectionContext, SectionInit } from './core/context';

import { init as initHero } from './sections/hero';
import { init as initNarrative } from './sections/narrative';
import { init as initAgent } from './sections/agent';
import { init as initHuman } from './sections/human';
import { init as initSectors } from './sections/sectors';
import { init as initProcess } from './sections/process';
import { init as initContact } from './sections/contact';
import { init as initFooter } from './sections/footer';

gsap.registerPlugin(ScrollTrigger, SplitText);
// La barra de direcciones del móvil cambia el alto de la ventana: no recalcular por eso.
ScrollTrigger.config({ ignoreMobileResize: true });

const html = document.documentElement;
const isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';

/** LA instancia de gsap.matchMedia() de toda la web. */
const mm = gsap.matchMedia();

/* ── 2. html.motion = sin reduced motion (se actualiza si cambia en vivo) ── */
mm.add(conditions, (self) => {
  html.classList.toggle('motion', modeOf(self.conditions) !== 'reduced');
});

// Hueco de las tres consultas (≥1024 px con pointer: none): ningún callback de
// mm.add() se ejecuta, así que nada animaría los reveals → web estática.
// (Se registra después de la matchMedia: al cambiar de modo, gsap revierte primero.)
const syncNoMode = () => {
  if (noModeMatches()) html.classList.remove('motion');
};
Object.values(conditions).forEach((q) => window.matchMedia(q).addEventListener('change', syncNoMode));
syncNoMode();

/* ── 3. Lenis, cursor, magnéticos, nav ─────────────────────────────────── */
mm.add(conditions, (self) => {
  if (modeOf(self.conditions) === 'reduced') return; // spec: sin Lenis con reduced motion
  createLenis();
  return () => destroyLenis();
});

mm.add(conditions, (self) => {
  if (modeOf(self.conditions) !== 'desktop') return; // cursor y magnéticos: solo escritorio
  const stopCursor = initCursor();
  const stopMagnetic = initMagnetic();
  return () => {
    stopCursor();
    stopMagnetic();
  };
});

initNav({ mm, conditions, stopScroll, startScroll });

/* ── 4. Secciones, en orden de página ──────────────────────────────────── */
const SECTIONS: ReadonlyArray<readonly [selector: string, init: SectionInit, name: string]> = [
  ['#inicio', initHero, 'hero'],
  ['#narracion', initNarrative, 'narrative'],
  ['#que-hace', initAgent, 'agent'],
  ['#control-humano', initHuman, 'human'],
  ['#sectores', initSectors, 'sectors'],
  ['#como-trabajamos', initProcess, 'process'],
  ['#contacto', initContact, 'contact'],
  ['[data-footer]', initFooter, 'footer'],
];
const SECTION_SELECTOR = SECTIONS.map(([s]) => s).join(',');

/* Promesa "todo listo" (fuentes + refresh); se resuelve en el paso 5. */
let resolveReady: () => void = () => {};
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

const shared = {
  gsap,
  ScrollTrigger,
  SplitText,
  mm,
  conditions,
  modeOf,
  getLenis,
  stopScroll,
  startScroll,
  split: splitText,
  reveal: revealElements,
  isHome,
  ready,
};

// Reveals de contenido que no pertenece a ninguna sección registrada
// (páginas legales, 404...). Va primero: en esas páginas está antes del pie.
const main = document.getElementById('main');
if (main) {
  mm.add(conditions, (self) => {
    if (modeOf(self.conditions) === 'reduced') return;
    setupReveals(main, (el) => !el.closest(SECTION_SELECTOR));
  });
}

for (const [selector, init, name] of SECTIONS) {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) continue;

  // a) Reveals genéricos ([data-reveal]) de esta sección, antes que sus pins.
  mm.add(conditions, (self) => {
    if (modeOf(self.conditions) === 'reduced') return;
    setupReveals(root);
  });

  // b) La animación propia de la sección.
  const ctx: SectionContext = {
    ...shared,
    root,
    q: <T extends Element = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s)),
    q1: <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s),
  };
  try {
    init(ctx);
  } catch (err) {
    // Una sección rota no puede dejar contenido oculto ni bloquear al resto.
    console.error(`[relevo] La sección "${name}" falló al iniciar:`, err);
    showAll(root);
  }
}

/* ── Año del pie siempre actual (el HTML trae el del build) ─────────────── */
document.querySelectorAll<HTMLElement>('[data-current-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

/* ── 5. El JS ya controla los reveals: fuera el salvavidas CSS de 3 s ───────
   Se pone aquí (y no tras las fuentes) para que, si las fuentes tardan más de
   3 s, el salvavidas no muestre el contenido y luego se vuelva a ocultar. */
html.classList.add('anim-ready');

/* ── 6. Fuentes listas → refresh → ancla → ctx.ready ──────────────────────── */
const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
const pageLoaded = new Promise<void>((resolve) => {
  if (document.readyState === 'complete') resolve();
  else window.addEventListener('load', () => resolve(), { once: true });
});

// Si la persona ya ha empezado a desplazarse, no se le "devuelve" al ancla.
let userMoved = false;
const onUserScroll = () => {
  userMoved = true;
};
for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
  window.addEventListener(type, onUserScroll, { once: true, passive: true });
}

/** Salto al #ancla de la URL con el offset de la nav (spec §9). */
function jumpToHash(): void {
  if (userMoved) return;
  const hash = decodeURIComponent(window.location.hash || '');
  if (hash.length > 1 && hash !== '#menu' && document.getElementById(hash.slice(1))) {
    scrollToTarget(hash, { immediate: true });
  }
}

fontsReady
  .catch(() => undefined)
  .then(() => {
    ScrollTrigger.refresh();
    jumpToHash();
    resolveReady();
  });

// El navegador vuelve a hacer su propio salto al fragmento al terminar `load`
// (sin offset y con los pins ya medidos de otra forma): se corrige otra vez.
pageLoaded.then(() => requestAnimationFrame(jumpToHash));
