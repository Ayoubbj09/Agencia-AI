/**
 * Cursor personalizado (spec §9 "Microinteracciones"). SOLO en modo desktop
 * (pointer: fine, ≥1024 px, sin reduced motion): main.ts lo inicia dentro de
 * la matchMedia y devuelve la limpieza.
 *
 *  - Un punto naranja que sigue al ratón (gsap.quickTo, solo transform).
 *  - Sobre enlaces/botones crece (.is-hover).
 *  - Con data-cursor="Texto" se convierte en un disco claro con esa etiqueta
 *    (p. ej. "Escribir" en WhatsApp, "Ver" en los paneles de sectores).
 *  - data-cursor="none" → oculta el cursor propio sobre ese elemento.
 *  - El cursor nativo solo se oculta cuando el propio ya está visible, y nunca
 *    en campos de texto (global.css). En táctil no existe.
 */
import { gsap } from 'gsap';

const INTERACTIVE = 'a[href], button, [role="button"], label, summary, [data-cursor], [data-cursor-hover]';
const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';

export function initCursor(): () => void {
  const el = document.querySelector<HTMLElement>('[data-cursor-el]');
  const labelEl = el?.querySelector<HTMLElement>('[data-cursor-label]');
  if (!el || !labelEl) return () => {};

  const html = document.documentElement;
  html.classList.add('has-cursor');

  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;
  let current: Element | null = null;
  let lastX = -1;
  let lastY = -1;
  let raf = 0;

  const setTarget = (target: Element | null) => {
    if (target === current) return;
    current = target;
    const field = target?.closest(TEXT_FIELDS);
    const hit = field ? null : target?.closest(INTERACTIVE);
    const label = hit?.getAttribute('data-cursor') ?? '';
    const hide = label === 'none' || !!field;

    el.style.opacity = hide ? '0' : '';
    // Sin cursor propio visible, se devuelve el nativo.
    html.classList.toggle('cursor-hide-native', shown && !hide);
    el.classList.toggle('has-label', !!label && !hide);
    el.classList.toggle('is-hover', !!hit && !label && !hide);
    if (label && label !== 'none') labelEl.textContent = label;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) {
      // Primer movimiento: colocar sin animar y mostrar.
      gsap.set(el, { x: e.clientX, y: e.clientY });
      el.classList.add('is-visible');
      html.classList.add('cursor-hide-native');
      shown = true;
    }
    lastX = e.clientX;
    lastY = e.clientY;
    xTo(lastX);
    yTo(lastY);
    setTarget(e.target as Element);
  };
  // Al hacer scroll sin mover el ratón cambia el elemento que hay debajo.
  const onScroll = () => {
    if (!shown || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      setTarget(document.elementFromPoint(lastX, lastY));
    });
  };
  const onLeaveWindow = (e: PointerEvent) => {
    if (!e.relatedTarget) {
      el.classList.remove('is-visible');
      html.classList.remove('cursor-hide-native');
      shown = false;
      current = null;
    }
  };
  const onDown = () => el.classList.add('is-down');
  const onUp = () => el.classList.remove('is-down');

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onLeaveWindow);
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerout', onLeaveWindow);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    html.classList.remove('has-cursor', 'cursor-hide-native');
    el.classList.remove('is-visible', 'is-hover', 'has-label', 'is-down');
    el.style.opacity = '';
    gsap.set(el, { clearProps: 'transform' });
  };
}
