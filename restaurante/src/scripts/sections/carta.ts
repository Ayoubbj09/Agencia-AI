/**
 * Carta (#carta): convierte las categorías en pestañas accesibles (flechas,
 * Inicio/Fin) con un indicador azafrán que se desliza, y hace entrar los
 * platos escalonados. Sin JS se ve toda la carta. Solo transform/opacity.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q, q1, gsap, mm, conditions, modeOf } = ctx;
  const tablist = q1('[data-carta-tabs]');
  const tabs = q<HTMLButtonElement>('[data-carta-tab]');
  const panels = q('[data-carta-panel]');
  const indicator = q1('[data-carta-indicator]');
  const panelsWrap = panels[0]?.parentElement;
  if (!tablist || !tabs.length || tabs.length !== panels.length) return;

  // Las pestañas existen siempre que haya JS (también con reduced motion).
  tablist.hidden = false;
  panelsWrap?.classList.add('is-tabs');
  let current = 0;
  let animate = false;

  const moveIndicator = (instant = false) => {
    if (!indicator) return;
    const t = tabs[current];
    const vars = { x: t.offsetLeft - 0, width: t.offsetWidth };
    if (instant || !animate) gsap.set(indicator, vars);
    else gsap.to(indicator, { ...vars, duration: 0.6, ease: 'expo.out' });
  };

  const show = (i: number, focus = false) => {
    current = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (focus) tabs[i].focus();
    moveIndicator();
    if (animate) {
      gsap.fromTo(
        panels[i].querySelectorAll('[data-plato]'),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08, overwrite: true },
      );
    }
    ctx.ScrollTrigger.refresh();
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const next =
        e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
        : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
        : e.key === 'Home' ? 0
        : e.key === 'End' ? last
        : -1;
      if (next >= 0) {
        e.preventDefault();
        show(next, true);
      }
    });
  });
  show(0);
  window.addEventListener('resize', () => moveIndicator(true));
  ctx.ready.then(() => moveIndicator(true));

  mm.add(
    conditions,
    (self) => {
      if (modeOf(self.conditions) === 'reduced') return;
      animate = true;
      // Entrada inicial de los platos de la primera pestaña.
      gsap.from(panels[current].querySelectorAll('[data-plato]'), {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: panelsWrap ?? root, start: 'top 85%', once: true },
      });
      return () => {
        animate = false;
      };
    },
    root,
  );
}
