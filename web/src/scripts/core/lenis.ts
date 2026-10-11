/**
 * Lenis (smooth scroll) con la configuración obligatoria de la spec §3:
 *   new Lenis({ autoRaf: false, anchors: { offset: -80 } })
 *   lenis.on('scroll', ScrollTrigger.update)
 *   gsap.ticker.add(t => lenis.raf(t * 1000)) + gsap.ticker.lagSmoothing(0)
 *   Sin syncTouch (en táctil, scroll nativo). No se crea con reduced motion.
 *
 * main.ts lo crea/destruye dentro de la matchMedia compartida, así que la
 * instancia puede cambiar (o no existir): pide SIEMPRE la actual con getLenis()
 * en el momento de usarla, no la guardes al iniciar.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Altura de la nav fija: offset de las anclas. */
export const ANCHOR_OFFSET = -80;

let instance: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

export function createLenis(): Lenis {
  if (instance) return instance;
  const lenis = new Lenis({
    autoRaf: false,
    anchors: { offset: ANCHOR_OFFSET },
    // syncTouch: false (por defecto) → en táctil el scroll es nativo.
  });
  lenis.on('scroll', ScrollTrigger.update);
  tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  instance = lenis;
  return lenis;
}

export function destroyLenis(): void {
  if (tick) gsap.ticker.remove(tick);
  tick = null;
  instance?.destroy();
  instance = null;
}

/** Instancia actual o null (reduced motion / antes de iniciar). */
export function getLenis(): Lenis | null {
  return instance;
}

/** Bloquea el scroll (menú móvil, overlays). Sin Lenis no hace nada: usa la clase html.menu-open. */
export function stopScroll(): void {
  instance?.stop();
}

export function startScroll(): void {
  instance?.start();
}

/**
 * Scroll a un destino ("#id", elemento o número) con o sin Lenis.
 * Con Lenis aplica el mismo offset que las anclas; sin Lenis usa el salto nativo
 * (scroll-margin-top de global.css deja sitio a la nav).
 */
export function scrollToTarget(
  target: string | HTMLElement | number,
  opts: { immediate?: boolean } = {},
): void {
  const lenis = instance;
  if (lenis) {
    // Lenis recorta el destino a su `limit`, que mide con un ResizeObserver con
    // retardo (250 ms). Justo después de crear los pins el alto de la página ha
    // crecido miles de px y el límite aún es el viejo: sin esto, /#contacto
    // se quedaba a medio camino. Medir ahora es barato (dos lecturas).
    lenis.resize();
    const offset = typeof target === 'number' ? 0 : ANCHOR_OFFSET;
    lenis.scrollTo(target, { offset, immediate: opts.immediate ?? false, force: true });
    return;
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'auto' });
    return;
  }
  const el = typeof target === 'string' ? document.getElementById(target.replace(/^#/, '')) : target;
  el?.scrollIntoView({ block: 'start', behavior: 'auto' });
}
