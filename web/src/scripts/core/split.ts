/**
 * Helper de SplitText según la spec §9:
 *   SplitText.create(el, { type: 'lines,words', mask: 'lines', autoSplit: true,
 *     onSplit: self => gsap.from(self.words, {...}) })
 * La animación se DEVUELVE desde onSplit: así SplitText la revierte y la rehace
 * con el mismo progreso cuando cambian las fuentes o el tamaño de la ventana.
 *
 * Accesibilidad:
 *   - h1/h2: aria 'auto' (SplitText pone aria-label al padre y oculta los trozos).
 *   - párrafos de la narración (7.2): aria 'hidden' + copia en <span class="sr-only">.
 *
 * Llama a split() DENTRO de un callback de ctx.mm.add(...): el contexto revierte
 * el split y su animación (y su ScrollTrigger) al cambiar de modo.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

export interface SplitOptions {
  /** Qué partir. Por defecto 'lines,words'. */
  type?: string;
  /** Qué se anima: 'lines' | 'words' | 'chars'. Por defecto 'lines'. */
  animate?: 'lines' | 'words' | 'chars';
  /** Máscara (overflow clip) por línea. Por defecto 'lines'. */
  mask?: 'lines' | 'words' | 'chars' | false;
  aria?: 'auto' | 'hidden' | 'none';
  /** Estado inicial de cada trozo (gsap.from). Por defecto { yPercent: 120 }. */
  from?: gsap.TweenVars;
  /** Vars extra del tween (duration, ease, stagger, delay, scrollTrigger...). */
  vars?: gsap.TweenVars;
  /** Si es true, pone opacity:1 al elemento (útil con data-reveal="split"/"manual"). */
  showParent?: boolean;
  /**
   * Para construir tu propia animación (timeline, etc.). Si se pasa, se usa en
   * lugar de from/vars. DEBE devolver la animación.
   */
  build?: (self: SplitText) => gsap.core.Animation;
}

/**
 * Palabras/letras: `yPercent` se mide sobre la caja de cada trozo, y una palabra
 * dentro de un <em> de titular mide ~0 de alto (global.css le da line-height 0
 * para que la serif no abra el interlineado): no subiría nada. Se convierte a
 * `y` en px con la altura de SU línea, así todas las palabras recorren lo mismo.
 */
function wordSafeFrom(from: gsap.TweenVars, animate: SplitOptions['animate']): gsap.TweenVars {
  if (animate === 'lines' || typeof from.yPercent !== 'number') return from;
  const { yPercent, ...rest } = from;
  const pct = yPercent as number;
  return {
    ...rest,
    y: (_: number, el: Element) => {
      const line = el.closest<HTMLElement>('.split-line') ?? (el as HTMLElement);
      return (line.offsetHeight * pct) / 100;
    },
  };
}

export function splitText(target: HTMLElement, opts: SplitOptions = {}): SplitText {
  const {
    type = 'lines,words',
    animate = 'lines',
    mask = 'lines',
    aria = 'auto',
    from = { yPercent: 120 },
    vars = {},
    showParent = true,
    build,
  } = opts;

  return SplitText.create(target, {
    type,
    ...(mask ? { mask } : {}),
    // Clases fijas: global.css amplía .split-line-mask para no cortar descendentes.
    linesClass: 'split-line',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    aria,
    autoSplit: true,
    onSplit(self) {
      if (showParent) gsap.set(target, { opacity: 1 });
      if (build) return build(self);
      const pieces =
        animate === 'chars' ? self.chars : animate === 'words' ? self.words : self.lines;
      return gsap.from(pieces, {
        ...wordSafeFrom(from, animate),
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.1,
        ...vars,
      });
    },
  });
}
