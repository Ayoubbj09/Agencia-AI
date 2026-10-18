/**
 * Botones magnéticos (spec §9): [data-magnetic] atrae levemente el botón hacia
 * el cursor al acercarse. Solo modo desktop (main.ts lo inicia en la matchMedia).
 *
 *   data-magnetic="0.35"    intensidad 0–1 (por defecto 0.35)
 *   [data-magnetic-inner]   hijo opcional que se mueve un poco más (profundidad)
 *
 * Solo transform (x/y con gsap.quickTo). Vuelve a su sitio con power3.out, sin rebote.
 * No combinar con data-reveal en el MISMO elemento (los dos animan transform).
 */
import { gsap } from 'gsap';

const RADIUS = 1.6; // zona de atracción: el botón y un margen alrededor (× la mitad del lado)

interface Item {
  el: HTMLElement;
  inner: HTMLElement | null;
  strength: number;
  xTo: gsap.QuickToFunc;
  yTo: gsap.QuickToFunc;
  ixTo?: gsap.QuickToFunc;
  iyTo?: gsap.QuickToFunc;
  active: boolean;
}

export function initMagnetic(scope: ParentNode = document): () => void {
  const items: Item[] = Array.from(scope.querySelectorAll<HTMLElement>('[data-magnetic]')).map((el) => {
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]');
    const strength = Number.parseFloat(el.dataset.magnetic || '') || 0.35;
    const opts = { duration: 0.6, ease: 'power3.out' };
    return {
      el,
      inner,
      strength,
      xTo: gsap.quickTo(el, 'x', opts),
      yTo: gsap.quickTo(el, 'y', opts),
      ixTo: inner ? gsap.quickTo(inner, 'x', opts) : undefined,
      iyTo: inner ? gsap.quickTo(inner, 'y', opts) : undefined,
      active: false,
    };
  });
  if (!items.length) return () => {};

  let raf = 0;
  let px = 0;
  let py = 0;

  const update = () => {
    raf = 0;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      // Centro "en reposo": se descuenta el desplazamiento actual del propio efecto.
      const cx = r.left + r.width / 2 - (gsap.getProperty(it.el, 'x') as number);
      const cy = r.top + r.height / 2 - (gsap.getProperty(it.el, 'y') as number);
      const dx = px - cx;
      const dy = py - cy;
      const inside =
        Math.abs(dx) < (r.width / 2) * RADIUS + 24 && Math.abs(dy) < (r.height / 2) * RADIUS + 24;
      if (inside) {
        it.active = true;
        it.xTo(dx * it.strength);
        it.yTo(dy * it.strength);
        it.ixTo?.(dx * it.strength * 0.35);
        it.iyTo?.(dy * it.strength * 0.35);
      } else if (it.active) {
        it.active = false;
        it.xTo(0);
        it.yTo(0);
        it.ixTo?.(0);
        it.iyTo?.(0);
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX;
    py = e.clientY;
    if (!raf) raf = requestAnimationFrame(update);
  };

  window.addEventListener('pointermove', onMove, { passive: true });

  return () => {
    window.removeEventListener('pointermove', onMove);
    cancelAnimationFrame(raf);
    for (const it of items) {
      gsap.killTweensOf([it.el, it.inner].filter(Boolean) as HTMLElement[]);
      gsap.set([it.el, it.inner].filter(Boolean) as HTMLElement[], { clearProps: 'transform' });
    }
  };
}
