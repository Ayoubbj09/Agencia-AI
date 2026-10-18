/**
 * Punto de entrada del JS (lo carga Base.astro en TODAS las páginas).
 *
 * Orden de arranque (no cambiar sin leer CONTRACT.md):
 *   1. Registra ScrollTrigger + SplitText y crea LA matchMedia compartida.
 *   2. Sincroniza html.motion con reduced motion (estados iniciales de reveal).
 *   3. Lenis (si no hay reduced motion) → cursor y magnéticos (solo desktop) → nav.
 *   4. Por cada sección, EN ORDEN DE PÁGINA: reveals genéricos de esa sección y
 *      luego su init(ctx). Así los ScrollTriggers se crean en el orden en que
 *      aparecen (necesario con pins). Cada sección en su propia tarea (se cede
 *      el hilo entre una y otra): sin una tarea larga única al arrancar.
 *   5. html.anim-ready en cuanto todo está montado (desactiva el salvavidas CSS
 *      de 3 s: a partir de aquí manda el JS).
 *   6. Tras document.fonts.ready y el montaje: ScrollTrigger.refresh() y salto
 *      al #ancla si la URL trae una (spec §9); luego se resuelve ctx.ready.
 *   (1b) Al cambiar de modo en vivo (escritorio ⇄ táctil) se conserva el punto
 *      de lectura: ver recordSpot/restoreSpot.
 *
 * Las secciones NO editan este archivo: solo su src/scripts/sections/<x>.ts.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { conditions, modeOf, noModeMatches } from './core/media';
import {
  ANCHOR_OFFSET,
  createLenis,
  destroyLenis,
  getLenis,
  scrollToTarget,
  startScroll,
  stopScroll,
} from './core/lenis';
import { revealElements, setupReveals, showAll } from './core/reveal';
import { splitText } from './core/split';
import { initCursor } from './core/cursor';
import { initMagnetic } from './core/magnetic';
import { initNav } from './core/nav';
import type { SectionContext, SectionInit } from './core/context';

import { init as initHero } from './sections/hero';
import { init as initCarta } from './sections/carta';
import { init as initFooter } from './sections/footer';

gsap.registerPlugin(ScrollTrigger, SplitText);
// La barra de direcciones del móvil cambia el alto de la ventana: no recalcular por eso.
ScrollTrigger.config({ ignoreMobileResize: true });

const html = document.documentElement;
const isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';

/* ── 1b. Mantener el sitio al cambiar de modo (escritorio ⇄ táctil en vivo) ──
   Al cambiar de modo se revierten TODOS los ScrollTriggers (todos viven en la
   matchMedia) y ScrollTrigger, al quedarse sin ninguno, olvida la posición que
   había guardado: tras su refresh la página quedaba arriba del todo. Aquí se
   apunta qué bloque había bajo la nav (y cuánto se había avanzado en él) ANTES
   de que gsap reaccione —estas MediaQueryList se crean antes que las de mm.add,
   así que su evento `change` llega primero— y se vuelve a él tras el refresh. */
const NAV_OFFSET = -ANCHOR_OFFSET;
let spot: { el: Element; ratio: number } | null = null;
let modeChanged = false;
const recordSpot = () => {
  modeChanged = true;
  if (spot || window.scrollY < 4) return;
  const blocks = document.querySelectorAll('#main > *, [data-footer]');
  for (const el of Array.from(blocks)) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.bottom > NAV_OFFSET) {
      spot = { el, ratio: Math.min(1, Math.max(0, (NAV_OFFSET - r.top) / r.height)) };
      return;
    }
  }
};
const restoreSpot = () => {
  if (!spot) return;
  const { el, ratio } = spot;
  spot = null;
  const r = el.getBoundingClientRect();
  scrollToTarget(Math.max(0, Math.round(window.scrollY + r.top + ratio * r.height - NAV_OFFSET)), {
    immediate: true,
  });
  ScrollTrigger.update();
};
Object.values(conditions).forEach((q) => window.matchMedia(q).addEventListener('change', recordSpot));
// Se emite al final del refresh que sigue a un cambio de matchMedia.
ScrollTrigger.addEventListener('matchMedia', restoreSpot);

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
// Lenis existe en desktop y en táctil (en táctil el scroll es nativo, pero
// mantiene las anclas con offset) y solo desaparece con reduced motion. Por eso
// depende ÚNICAMENTE de la preferencia de movimiento: no se destruye y recrea al
// pasar de escritorio a táctil (p. ej. al estrechar la ventana).
mm.add(
  { reduce: conditions.reduced, motionOk: '(prefers-reduced-motion: no-preference)' },
  (self) => {
    if (self.conditions?.reduce) return; // spec: sin Lenis con reduced motion
    createLenis();
    return () => destroyLenis();
  },
);

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
  ['#carta', initCarta, 'carta'],
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

function initSection([selector, init, name]: (typeof SECTIONS)[number]): void {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) return;

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
    console.error(`[almadina] La sección "${name}" falló al iniciar:`, err);
    showAll(root);
  }
}

/** Cede el hilo principal entre secciones (scheduler.yield si existe). */
const yieldToMain = (): Promise<void> => {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return s?.yield ? s.yield() : new Promise((resolve) => setTimeout(resolve, 0));
};

/* Las secciones se montan EN ORDEN, pero cada una en su propia tarea: así el
   arranque no es una única tarea larga de >100 ms que bloquee el primer pintado
   y la interacción (TBT). El hero va primero y sin esperas (su titular entra ya).
   Lo de debajo de la pantalla queda oculto por CSS hasta su reveal, así que
   montarlo unos milisegundos después no se ve. */
const sectionsMounted = (async () => {
  for (let i = 0; i < SECTIONS.length; i++) {
    if (i > 0) await yieldToMain();
    initSection(SECTIONS[i]);
  }

  /* ── Año del pie siempre actual (el HTML trae el del build) ─────────────── */
  document.querySelectorAll<HTMLElement>('[data-current-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ── 5. El JS ya controla los reveals: fuera el salvavidas CSS de 3 s ─────
     Se pone aquí (y no tras las fuentes) para que, si las fuentes tardan más de
     3 s, el salvavidas no muestre el contenido y luego se vuelva a ocultar. */
  html.classList.add('anim-ready');
})();

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
  if (userMoved || modeChanged) return;
  const hash = decodeURIComponent(window.location.hash || '');
  if (hash.length > 1 && hash !== '#menu' && document.getElementById(hash.slice(1))) {
    scrollToTarget(hash, { immediate: true });
  }
}

Promise.all([fontsReady.catch(() => undefined), sectionsMounted]).then(() => {
  ScrollTrigger.refresh();
  jumpToHash();
  resolveReady();
});

// El navegador vuelve a hacer su propio salto al fragmento al terminar `load`
// (sin offset y con los pins ya medidos de otra forma): se corrige otra vez.
Promise.all([pageLoaded, sectionsMounted]).then(() => requestAnimationFrame(jumpToHash));

// Cualquier refresh posterior (el automático de ScrollTrigger en `load`, el de
// las imágenes...) cambia el espacio de los pins: si la persona aún no se ha
// movido, se vuelve a colocar el ancla. Al primer gesto deja de actuar.
if (window.location.hash.length > 1) {
  const onRefresh = () => {
    if (userMoved || modeChanged) ScrollTrigger.removeEventListener('refresh', onRefresh);
    else jumpToHash();
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);
}
