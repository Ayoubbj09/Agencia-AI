/**
 * Reveals genéricos por atributo (spec §9 "Reveal al entrar en viewport").
 *
 *   data-reveal           fade + translateY 40px → 0 (power3.out, 1.1 s)
 *   data-reveal="up"      igual que el anterior
 *   data-reveal="fade"    solo opacidad
 *   data-reveal="clip"    imagen/tarjeta: clip-path de abajo arriba (power4.out, 1.2 s)
 *   data-reveal="split"   texto por líneas con máscara (core/split.ts)
 *   data-reveal="manual"  lo anima la propia sección (aquí se ignora)
 *
 *   data-reveal-delay="0.2"      retraso extra (s)
 *   data-reveal-group[="0.1"]    en un contenedor: sus [data-reveal] entran juntos,
 *                                en orden, con ese stagger (0.08–0.12) al entrar el contenedor
 *   data-reveal-start="top 80%"  inicio del ScrollTrigger (por defecto "top 88%")
 *
 * Los [data-reveal] sueltos se agrupan con ScrollTrigger.batch: los que entran a
 * la vez en pantalla hacen stagger 0.1 automáticamente.
 *
 * Estados iniciales en CSS (global.css), solo bajo html.js.motion → sin JS o con
 * reduced motion todo se ve desde el principio. main.ts llama a setupReveals()
 * por sección, en orden de página y dentro de la matchMedia (no en reduced).
 * No pongas data-reveal y data-magnetic en el MISMO elemento (ambos usan transform).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitText } from './split';

export type RevealVariant = 'up' | 'fade' | 'clip' | 'split';

export interface RevealOptions {
  variant?: RevealVariant;
  delay?: number;
  stagger?: number;
  /** ScrollTrigger: inicio (por defecto 'top 88%'). Pasa false para animar ya. */
  start?: string | false;
  trigger?: Element;
  /** Para paneles dentro de un scroll horizontal (7.5). */
  containerAnimation?: gsap.core.Animation;
  duration?: number;
}

const DEFAULT_START = 'top 88%';

/** Valores "desde/hasta" de cada variante (coinciden con el CSS inicial). */
function fromTo(variant: RevealVariant): [gsap.TweenVars, gsap.TweenVars] {
  switch (variant) {
    case 'fade':
      return [{ opacity: 0 }, { opacity: 1, duration: 1, ease: 'power3.out' }];
    case 'clip':
      return [
        { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.out' },
      ];
    case 'up':
    default:
      return [
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' },
      ];
  }
}

function variantOf(el: Element): RevealVariant | 'manual' {
  const v = (el.getAttribute('data-reveal') || 'up').trim();
  return (['up', 'fade', 'clip', 'split', 'manual'].includes(v) ? v : 'up') as RevealVariant | 'manual';
}

const num = (v: string | null | undefined, fallback: number) => {
  const n = v == null || v === '' ? NaN : Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Reveal imperativo para elementos sueltos (lo expone ctx.reveal).
 * Devuelve el tween (o el SplitText en la variante split).
 */
export function revealElements(targets: gsap.TweenTarget, opts: RevealOptions = {}) {
  const els = gsap.utils.toArray<HTMLElement>(targets);
  if (!els.length) return null;
  const variant = opts.variant ?? 'up';
  const st =
    opts.start === false
      ? undefined
      : {
          trigger: opts.trigger ?? els[0],
          start: opts.start ?? DEFAULT_START,
          once: true,
          ...(opts.containerAnimation ? { containerAnimation: opts.containerAnimation } : {}),
        };

  if (variant === 'split') {
    return els.map((el) =>
      splitText(el, { vars: { delay: opts.delay ?? 0, ...(st ? { scrollTrigger: { ...st, trigger: el } } : {}) } }),
    );
  }
  const [from, to] = fromTo(variant);
  return gsap.fromTo(els, from, {
    ...to,
    ...(opts.duration ? { duration: opts.duration } : {}),
    delay: opts.delay ?? 0,
    stagger: opts.stagger ?? 0.1,
    ...(st ? { scrollTrigger: st } : {}),
  });
}

/**
 * Crea los reveals de todos los [data-reveal] dentro de `scope` (opcionalmente
 * filtrados). Debe llamarse DENTRO de un callback de matchMedia: al cambiar de
 * modo se revierten y se vuelven a crear.
 */
export function setupReveals(scope: ParentNode, filter: (el: Element) => boolean = () => true): void {
  const done = new WeakSet<Element>();
  // 1) Grupos explícitos: un ScrollTrigger por contenedor, stagger en orden DOM.
  scope.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
    if (done.has(group) || !filter(group)) return;
    done.add(group);
    const items = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
      (el) => !done.has(el) && variantOf(el) !== 'manual' && variantOf(el) !== 'split',
    );
    if (!items.length) return;
    items.forEach((el) => done.add(el));
    const stagger = num(group.getAttribute('data-reveal-group'), 0.1);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: group,
        start: group.getAttribute('data-reveal-start') || DEFAULT_START,
        once: true,
      },
      delay: num(group.getAttribute('data-reveal-delay'), 0),
    });
    items.forEach((el, i) => {
      const [from, to] = fromTo(variantOf(el) as RevealVariant);
      tl.fromTo(el, from, { ...to, delay: num(el.getAttribute('data-reveal-delay'), 0) }, i * stagger);
    });
  });

  // 2) Sueltos.
  const loose: Record<'up' | 'fade' | 'clip', HTMLElement[]> = { up: [], fade: [], clip: [] };
  scope.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (done.has(el) || !filter(el)) return;
    const variant = variantOf(el);
    if (variant === 'manual') return; // la sección se encarga
    done.add(el);
    if (variant === 'split') {
      splitText(el, {
        vars: {
          delay: num(el.getAttribute('data-reveal-delay'), 0),
          scrollTrigger: {
            trigger: el,
            start: el.getAttribute('data-reveal-start') || DEFAULT_START,
            once: true,
          },
        },
      });
      return;
    }
    loose[variant].push(el);
  });

  (Object.keys(loose) as Array<keyof typeof loose>).forEach((variant) => {
    const els = loose[variant];
    if (!els.length) return;
    const [from, to] = fromTo(variant);
    gsap.set(els, from);
    ScrollTrigger.batch(els, {
      start: DEFAULT_START,
      // Si la página carga ya desplazada (ancla), lo que queda por encima también se muestra.
      end: 'max',
      once: true,
      interval: 0.08,
      onEnter: (batch) =>
        gsap.to(batch, {
          ...to,
          stagger: 0.1,
          overwrite: true,
          delay: num((batch[0] as HTMLElement).getAttribute('data-reveal-delay'), 0),
        }),
    });
  });
}

/** Muestra de golpe (sin animación) los [data-reveal] de un ámbito: red de seguridad. */
export function showAll(scope: ParentNode): void {
  const els = scope.querySelectorAll<HTMLElement>('[data-reveal]');
  // Valores inline explícitos (no clearProps): el CSS inicial seguiría ocultándolos.
  if (els.length) gsap.set(els, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)' });
}
