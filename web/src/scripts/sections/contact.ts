/**
 * 7.7 Contacto — animación de la sección (#contacto). PROPIETARIO: Sección D.
 *
 *  - Titular "Pásanos el relevo.": palabras que suben desde su máscara de línea
 *    (SplitText con autoSplit; la animación se devuelve desde onSplit). En
 *    desktop, además, una deriva lateral mínima ligada al scroll (capa rápida).
 *  - Luz ámbar del fondo:
 *      desktop → "amanece" ligada al scroll (scrub, ease 'none'): sube, crece y
 *                se enciende; es la capa lenta del parallax.
 *      touch   → fundido por tiempo al entrar (sin parallax).
 *  - Filete de los datos de contacto: se dibuja (scaleX) con expo.out.
 *  - El resto ([data-reveal] y el grupo del botón) lo anima el núcleo; el botón
 *    ya es magnético (data-magnetic, solo desktop).
 *
 * Reduced motion / sin JS: no se ejecuta nada y todo queda visible y estático.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q1, gsap, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const title = q1('[data-contact-title]');
  const glow = q1('[data-contact-glow]');
  const rule = q1('[data-contact-rule]');

  mm.add(
    conditions,
    (self) => {
      const mode = modeOf(self.conditions);
      if (mode === 'reduced') return; // maqueta estática, sin animaciones
      const desktop = mode === 'desktop';

      /* Titular: entrada por palabras (power4.out, stagger 0.08).
         Cada palabra baja la altura de SU máscara de línea (en px, no yPercent):
         la palabra en cursiva vive dentro de un <em> con line-height 0 (global.css)
         y su caja mide ~0, así que un yPercent no la movería. */
      if (title) {
        const maskHeight = (_: number, el: Element) =>
          ((el.closest('.split-line-mask') as HTMLElement | null)?.offsetHeight ?? 0) * 1.05;
        ctx.split(title, {
          type: 'lines,words',
          animate: 'words',
          aria: 'auto',
          from: { y: maskHeight },
          vars: {
            duration: 1.15,
            ease: 'power4.out',
            stagger: 0.08,
            scrollTrigger: { trigger: title, start: desktop ? 'top 82%' : 'top 88%', once: true },
          },
        });
      }

      /* Desktop: el titular llega con una deriva lateral mínima (capa rápida del
         parallax; la luz es la lenta). Va en el h2 entero: las palabras ya usan
         su propio transform para la entrada. */
      if (title && desktop) {
        gsap.fromTo(
          title,
          { xPercent: 4 },
          {
            xPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: root, start: 'top bottom', end: 'top 15%', scrub: 1 },
          },
        );
      }

      /* Luz ámbar. */
      if (glow) {
        if (desktop) {
          gsap.fromTo(
            glow,
            { opacity: 0, yPercent: 22, scale: 0.82 },
            {
              opacity: 1,
              yPercent: 0,
              scale: 1,
              ease: 'none',
              scrollTrigger: { trigger: root, start: 'top bottom', end: 'center center', scrub: 0.8 },
            },
          );
        } else {
          gsap.fromTo(
            glow,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1.2,
              ease: 'power3.out',
              scrollTrigger: { trigger: root, start: 'top 75%', once: true },
            },
          );
        }
      }

      /* Filete de los datos de contacto (acento). */
      if (rule) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: 'expo.out',
            delay: 0.15,
            scrollTrigger: { trigger: rule, start: 'top 90%', once: true },
          },
        );
      }
    },
    root,
  );
}
