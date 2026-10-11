/**
 * 7.4 Control humano — script de la sección (#control-humano).
 * PROPIETARIO: Sección B. Marcado y estilos: src/components/sections/HumanControl.astro
 *
 * El testigo (punto naranja) sale del agente y recorre la pista hasta la
 * persona; detrás se dibuja la línea naranja (scaleX) y, al llegar, el anillo
 * de la persona se enciende y el punto se funde en él.
 * Ligado al scroll: scrub 0.8 + ease 'none' (spec §9). Sin pin, así que vale
 * igual en desktop y en táctil. Reduced / sin JS: estado final estático (CSS).
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q1, gsap, ScrollTrigger, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const diagram = q1('[data-human-diagram]');
  const track = q1('[data-human-track]');
  const line = q1('[data-human-line]');
  const baton = q1('[data-human-baton]');
  const ring = q1('[data-human-ring]');
  if (!diagram || !track || !line || !baton || !ring) return;

  mm.add(
    conditions,
    (self) => {
      if (modeOf(self.conditions) === 'reduced') return; // estado final estático

      // Estado inicial: nada recorrido, testigo en el agente, persona apagada.
      gsap.set(line, { scaleX: 0 });
      gsap.set(baton, { x: 0, opacity: 1, scale: 1 });
      gsap.set(ring, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
      tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
        .fromTo(baton, { x: 0 }, { x: () => track.clientWidth, duration: 1 }, 0)
        // Llega: el anillo se enciende y el testigo se funde en él.
        .fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.9)
        .fromTo(baton, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.8, duration: 0.12 }, 0.96);

      ScrollTrigger.create({
        trigger: diagram,
        start: 'top 85%',
        end: 'top 38%',
        scrub: 0.8,
        animation: tl,
        invalidateOnRefresh: true,
      });
    },
    root,
  );
}
