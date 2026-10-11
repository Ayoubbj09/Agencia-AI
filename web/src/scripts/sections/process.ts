/**
 * 7.6 Cómo trabajamos — script de la sección (#como-trabajamos).
 * PROPIETARIO: Sección C. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página. El eyebrow y el h2
 * ([data-reveal]) ya los anima el núcleo.
 *
 * La línea vertical está hecha de tramos (uno por paso, del nodo de ese paso al
 * del siguiente). Cada tramo se dibuja con scaleY ligado al scroll (scrub,
 * ease 'none'); su "punta" pasa por la línea de lectura (62 % de la pantalla).
 *
 *  · desktop → reversible y sincronizado con la línea VISIBLE: el paso 1 se
 *    enciende cuando empieza a dibujarse el primer tramo y el paso N+1 cuando el
 *    tramo N llega a su nodo (se lee del progreso del propio tween, que ya lleva
 *    el suavizado del scrub). Al subir, se apagan en orden inverso.
 *  · touch → simplificado: la línea se dibuja igual y cada paso se enciende una
 *    sola vez al entrar en pantalla.
 *  · reduced / sin JS → el CSS base ya es el estado final (todo encendido).
 *
 * "Encender" = animación por tiempo (opacity/transform): número naranja,
 * nodo (scale) y texto de 0.32 → 1 de opacidad.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q, gsap, ScrollTrigger, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const steps = q('[data-process-step]');
  if (!steps.length) return;

  const parts = steps.map((step) => ({
    step,
    seg: step.querySelector<HTMLElement>('[data-process-seg]'),
    line: step.querySelector<HTMLElement>('[data-process-line]'),
    dot: step.querySelector<HTMLElement>('[data-step-dot]'),
    lit: step.querySelector<HTMLElement>('[data-step-lit]'),
    body: step.querySelector<HTMLElement>('[data-step-body]'),
  }));

  mm.add(
    conditions,
    (context) => {
      const mode = modeOf(context.conditions);
      if (mode === 'reduced') return; // todo encendido (CSS base)

      const desktop = mode === 'desktop';
      const readLine = desktop ? '62%' : '70%';

      // Animación de "encendido" de cada paso (por tiempo). Los fromTo pintan ya
      // el estado apagado al crearse.
      const lights = parts.map(({ dot, lit, body }) => {
        const tl = gsap.timeline({ paused: true });
        if (dot) tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.8, ease: 'expo.out' }, 0);
        if (lit) {
          tl.fromTo(
            lit,
            { opacity: 0, yPercent: 10 },
            { opacity: 1, yPercent: 0, duration: 0.9, ease: 'power3.out' },
            0,
          );
        }
        if (body) tl.fromTo(body, { opacity: 0.32 }, { opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.08);
        return tl;
      });

      const state = parts.map(() => false);
      const setLit = (i: number, on: boolean) => {
        if (i < 0 || i >= lights.length || state[i] === on) return;
        state[i] = on;
        if (on) lights[i].play();
        else lights[i].reverse();
      };

      // Tramos de línea + encendido, en orden DOM.
      parts.forEach(({ step, seg, line }, i) => {
        if (seg && line) {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              // El trigger es el carril (sin transform); la línea escalada mediría 0.
              scrollTrigger: {
                trigger: seg,
                start: `top ${readLine}`,
                end: `bottom ${readLine}`,
                scrub: desktop ? 0.8 : 0.6,
              },
              // `this` = el propio tween (se renderiza ya durante su creación).
              onUpdate: desktop
                ? function (this: gsap.core.Tween) {
                    const p = this.progress();
                    if (i === 0) setLit(0, p > 0.002);
                    setLit(i + 1, p >= 0.985);
                  }
                : undefined,
            },
          );
        }
        if (!desktop) {
          ScrollTrigger.create({
            trigger: step,
            start: `top ${readLine}`,
            once: true,
            onEnter: () => setLit(i, true),
          });
        }
      });
    },
    root,
  );
}
