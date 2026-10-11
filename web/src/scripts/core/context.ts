/**
 * SectionContext: lo que main.ts entrega a cada sección en init(ctx).
 * Es el CONTRATO entre el núcleo y las secciones (ver CONTRACT.md).
 */
import type { gsap as GSAP } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import type { SplitText as STxt } from 'gsap/SplitText';
import type Lenis from 'lenis';
import type { conditions as CONDITIONS, Conditions, Mode } from './media';
import type { splitText, SplitOptions } from './split';
import type { revealElements, RevealOptions } from './reveal';

export interface SectionContext {
  /** Elemento raíz de la sección (por id). main.ts solo llama a init si existe. */
  root: HTMLElement;
  /** querySelectorAll dentro de root, como array tipado. */
  q: <T extends Element = HTMLElement>(selector: string) => T[];
  /** querySelector dentro de root. */
  q1: <T extends Element = HTMLElement>(selector: string) => T | null;

  gsap: typeof GSAP;
  ScrollTrigger: typeof ST;
  SplitText: typeof STxt;

  /** LA instancia compartida de gsap.matchMedia(). Úsala con `conditions`. */
  mm: gsap.MatchMedia;
  /** { desktop, touch, reduced } → cadenas de media query para mm.add(conditions, fn). */
  conditions: typeof CONDITIONS;
  /** Modo activo a partir de context.conditions (reduced > desktop > touch). */
  modeOf: (c: Partial<Conditions> | undefined) => Mode;

  /** Lenis actual o null (reduced motion). Pídelo en el momento de usarlo. */
  getLenis: () => Lenis | null;
  /** Bloquear/reanudar el scroll (lenis.stop()/start()). */
  stopScroll: () => void;
  startScroll: () => void;

  /** Helper de SplitText (mask: 'lines', autoSplit, anim devuelta desde onSplit). */
  split: typeof splitText;
  /** Reveal genérico (fade + 40px / fade / clip) para elementos sueltos. */
  reveal: typeof revealElements;

  /** true en la home (/). */
  isHome: boolean;

  /**
   * Se resuelve tras document.fonts.ready + ScrollTrigger.refresh() (justo antes
   * de html.anim-ready). Si creas animaciones aquí dentro de un callback de
   * mm.add, envuélvelas con context.add(() => …) para que se reviertan.
   */
  ready: Promise<void>;
}

export type { Conditions, Mode, SplitOptions, RevealOptions };

/** Firma que exporta cada archivo de src/scripts/sections/*.ts */
export type SectionInit = (ctx: SectionContext) => void;
