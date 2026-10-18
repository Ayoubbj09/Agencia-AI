/**
 * Hero (#inicio): entrada del titular por palabras, rosetón de zellige que
 * aparece girando, gira despacio sin parar y, en escritorio, se agranda y gira
 * más al hacer scroll. Solo transform/opacity (y blur en la entrada del h1).
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q1, gsap, mm, conditions, modeOf, split } = ctx;
  const title = q1('[data-hero-title]');
  const rosette = q1('[data-hero-rosette]');
  const spin = rosette?.querySelector<SVGGElement>('[data-zellige-spin]');
  const arabic = q1('[data-hero-arabic]');
  const photo = q1('[data-hero-photo]');

  mm.add(
    conditions,
    (self) => {
      const mode = modeOf(self.conditions);
      if (mode === 'reduced') return;

      if (title) {
        split(title, {
          type: 'lines,words',
          animate: 'words',
          aria: 'auto',
          from: { yPercent: 115, opacity: 0, filter: 'blur(10px)' },
          vars: { duration: 1.15, ease: 'power4.out', stagger: 0.09, delay: 0.15 },
        });
      }

      if (rosette && spin) {
        gsap.set(spin, { transformOrigin: '50% 50%' });
        // La entrada va en el <svg> (no en el contenedor) para respetar la
        // opacidad propia del contenedor en móvil.
        gsap.fromTo(
          rosette.querySelector('svg'),
          { scale: 0.55, rotate: -70, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 1.8, ease: 'expo.out', delay: 0.1 },
        );
        // Giro continuo muy lento (un vuelta cada 2 minutos).
        gsap.to(spin, { rotate: 360, duration: 120, ease: 'none', repeat: -1 });
      }
      if (arabic) {
        gsap.from(arabic, { yPercent: 30, opacity: 0, duration: 1.6, ease: 'power3.out', delay: 0.4 });
      }

      if (photo && mode === 'desktop') {
        gsap.from(photo, { yPercent: 18, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.35 });
        gsap.to(photo, {
          yPercent: -14,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
      }

      if (mode === 'desktop' && rosette) {
        gsap.to(rosette, {
          scale: 1.35,
          rotate: 50,
          yPercent: 12,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
        if (arabic) {
          gsap.to(arabic, {
            xPercent: -12,
            ease: 'none',
            scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 },
          });
        }
      }
    },
    root,
  );
}
