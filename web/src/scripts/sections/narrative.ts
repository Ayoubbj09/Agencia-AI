/**
 * 7.2 Narración — script de la sección (#narracion). PROPIETARIO: Sección A.
 *
 * Cada frase se ilumina palabra a palabra (opacity 0.2 → 1; nunca `color`).
 *
 *  desktop  · scrub 0.8 con ease 'none': la frase se enciende mientras sube
 *             desde el 82 % hasta el 50 % de la pantalla (es la propia lectura).
 *             El resplandor de la respuesta se enciende con ella y sube algo
 *             más despacio (parallax).
 *  touch    · versión ligera: al entrar cada frase, sus palabras se encienden
 *             por tiempo (power3.out, stagger 0.08); sin scrub ni parallax.
 *  reduced  · nada: frases completas (sin split, sin copia sr-only).
 *
 * Accesibilidad: SplitText con aria 'hidden' (la frase partida queda oculta a
 * lectores) + copia del texto en <span class="sr-only"> justo antes. La copia
 * se crea y se retira con la matchMedia: nunca hay doble lectura.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q, q1, gsap, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const lines = q<HTMLElement>('[data-narrative-line]');
  const glow = q1<HTMLElement>('[data-narrative-glow]');
  const finalLine = lines[lines.length - 1] ?? null;

  mm.add(
    conditions,
    (context) => {
      const mode = modeOf(context.conditions);
      if (mode === 'reduced') return; // frases completas, estáticas

      const copies: HTMLElement[] = [];

      // En orden DOM: un ScrollTrigger por frase, de arriba abajo.
      lines.forEach((line) => {
        const copy = document.createElement('span');
        copy.className = 'sr-only';
        copy.textContent = (line.textContent || '').replace(/\s+/g, ' ').trim();
        line.before(copy);
        copies.push(copy);

        ctx.split(line, {
          type: 'words',
          mask: false,
          aria: 'hidden',
          build: (self) =>
            mode === 'desktop'
              ? gsap.fromTo(
                  self.words,
                  { opacity: 0.2 },
                  {
                    opacity: 1,
                    ease: 'none',
                    stagger: 0.1,
                    scrollTrigger: {
                      trigger: line,
                      start: 'top 82%',
                      end: 'bottom 50%',
                      scrub: 0.8,
                    },
                  },
                )
              : gsap.fromTo(
                  self.words,
                  { opacity: 0.2 },
                  {
                    opacity: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.08,
                    scrollTrigger: { trigger: line, start: 'top 78%', once: true },
                  },
                ),
        });
      });

      // La luz de la respuesta: se enciende con la última frase.
      if (glow && finalLine) {
        if (mode === 'desktop') {
          gsap.fromTo(
            glow,
            { opacity: 0, yPercent: 18 },
            {
              opacity: 1,
              yPercent: -12,
              ease: 'none',
              scrollTrigger: { trigger: finalLine, start: 'top 85%', end: 'bottom 35%', scrub: 1 },
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
              delay: 0.3,
              scrollTrigger: { trigger: finalLine, start: 'top 78%', once: true },
            },
          );
        }
      }

      return () => {
        copies.forEach((c) => c.remove());
      };
    },
    root,
  );
}
