/**
 * Navegación (spec §7.0):
 *  1. Se oculta al bajar y reaparece al subir (no en reduced motion).
 *  2. Fondo con desenfoque al dejar la parte de arriba (.is-scrolled).
 *  3. Menú móvil a pantalla completa:
 *     - <button aria-expanded aria-controls="menu">, Escape cierra.
 *     - El foco entra en el menú y vuelve al botón; Tab queda dentro de nav+menu.
 *     - .page queda `inert` y el scroll bloqueado (lenis.stop() / html.menu-open).
 *     - Entrada por líneas (yPercent 110 → 0, power4.out, stagger 0.08) salvo reduced.
 */
import { gsap } from 'gsap';
import type { conditions as CONDITIONS } from './media';
import { modeOf } from './media';

interface NavDeps {
  mm: gsap.MatchMedia;
  conditions: typeof CONDITIONS;
  stopScroll: () => void;
  startScroll: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function initNav({ mm, conditions, stopScroll, startScroll }: NavDeps): void {
  const html = document.documentElement;
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const menu = document.getElementById('menu');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const page = document.querySelector<HTMLElement>('.page');
  if (!nav) return;

  /* ── 1 + 2. Ocultar al bajar / fondo al hacer scroll ─────────────────── */
  let allowHide = false;
  let motion = false;
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const onScrollFrame = () => {
    ticking = false;
    const y = Math.max(window.scrollY, 0);
    nav.classList.toggle('is-scrolled', y > 8);
    if (menuOpen) {
      lastY = y;
      return;
    }
    const delta = y - lastY;
    if (y < 120 || !allowHide) nav.classList.remove('is-hidden');
    else if (delta > 6) nav.classList.add('is-hidden');
    else if (delta < -6) nav.classList.remove('is-hidden');
    if (Math.abs(delta) > 6) lastY = y;
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFrame);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScrollFrame();

  mm.add(conditions, (self) => {
    const mode = modeOf(self.conditions as Record<string, boolean>);
    allowHide = mode !== 'reduced';
    motion = mode !== 'reduced';
    return () => {
      allowHide = false;
      motion = false;
      nav.classList.remove('is-hidden');
    };
  });

  /* ── 3. Menú móvil ───────────────────────────────────────────────────── */
  if (!menu || !toggle) return;
  const lines = Array.from(menu.querySelectorAll<HTMLElement>('[data-menu-line]'));
  let tl: gsap.core.Timeline | null = null;

  const focusables = () =>
    [...nav.querySelectorAll<HTMLElement>(FOCUSABLE), ...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  function open() {
    if (menuOpen) return;
    menuOpen = true;
    tl?.kill();
    toggle!.setAttribute('aria-expanded', 'true');
    html.classList.add('menu-open');
    menu!.classList.add('is-open');
    nav!.classList.remove('is-hidden');
    if (page) page.inert = true;
    stopScroll();
    document.addEventListener('keydown', onKey);

    if (motion) {
      tl = gsap
        .timeline()
        .fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' })
        .fromTo(
          lines,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 },
          0.05,
        );
    }
    const firstLink = menu!.querySelector<HTMLElement>('a[href]');
    requestAnimationFrame(() => firstLink?.focus({ preventScroll: true }));
  }

  function close({ restoreFocus = true } = {}) {
    if (!menuOpen) return;
    menuOpen = false;
    tl?.kill();
    toggle!.setAttribute('aria-expanded', 'false');
    html.classList.remove('menu-open');
    if (page) page.inert = false;
    startScroll();
    document.removeEventListener('keydown', onKey);

    const finish = () => {
      menu!.classList.remove('is-open');
      gsap.set([menu, ...lines], { clearProps: 'opacity,transform' });
    };
    if (motion) {
      tl = gsap.timeline({ onComplete: finish }).to(menu, { opacity: 0, duration: 0.35, ease: 'power2.inOut' });
    } else {
      finish();
    }
    if (restoreFocus) toggle!.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => (menuOpen ? close() : open()));

  // Un enlace del menú cierra el menú ANTES de que Lenis (listener en window)
  // procese el ancla: así el scroll ya está reanudado cuando se desplaza.
  menu.addEventListener('click', (e) => {
    const link = (e.target as Element).closest('a[href]');
    if (link && !link.hasAttribute('target')) close({ restoreFocus: false });
  });

  // Si la ventana pasa a escritorio con el menú abierto, se cierra.
  const desktopMq = window.matchMedia('(min-width: 64em)');
  desktopMq.addEventListener('change', (e) => {
    if (e.matches) close({ restoreFocus: false });
  });
}
