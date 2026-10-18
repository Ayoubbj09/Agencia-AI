/**
 * 7.8 Pie — animación ([data-footer]). PROPIETARIO: Sección D.
 *
 * Marca gigante "Al Madina · المدينة" que se revela al llegar al final de la página:
 *   desktop → las letras suben desde su máscara ligadas al scroll (scrub 0.8,
 *             ease 'none') mientras la marca entra en pantalla; al tocar fondo,
 *             el testigo naranja aparece con un acento expo.out (el "relevo").
 *   touch   → la misma idea por tiempo al entrar (power4.out, stagger 0.08).
 *   reduced / sin JS → la marca se ve entera desde el principio.
 *
 * Solo transform/opacity. Los [data-reveal] del pie los anima el núcleo.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q, q1, gsap, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const wordmark = q1('[data-footer-wordmark]');
  const chars = q('[data-wm-ch]');
  const dot = q1('[data-wm-dot]');
  if (!wordmark || !chars.length) return;

  mm.add(
    conditions,
    (self) => {
      const mode = modeOf(self.conditions);
      if (mode === 'reduced') return; // maqueta estática, sin animaciones

      if (mode === 'desktop') {
        // Letras: de abajo (fuera de la máscara) a su sitio, a la par del scroll.
        gsap
          .timeline({
            scrollTrigger: {
              trigger: wordmark,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: 0.8,
            },
          })
          .fromTo(
            chars,
            { yPercent: 118 },
            { yPercent: 0, ease: 'none', duration: 1, stagger: 0.12 },
          );

        // El testigo: acento por tiempo cuando la marca ya está casi entera.
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0, xPercent: -260 },
            {
              scale: 1,
              xPercent: 0,
              duration: 1,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: wordmark,
                start: 'bottom bottom+=40',
                toggleActions: 'play none none reverse',
              },
            },
          );
        }
      } else {
        // Táctil / < 1024 px: por tiempo al entrar.
        const tl = gsap.timeline({
          scrollTrigger: { trigger: wordmark, start: 'top 92%', once: true },
        });
        tl.fromTo(
          chars,
          { yPercent: 118 },
          { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.08 },
        );
        if (dot) {
          tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.9, ease: 'expo.out' }, '-=0.5');
        }
      }
    },
    root,
  );
}
