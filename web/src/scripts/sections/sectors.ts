/**
 * 7.5 Para qué negocios — script de la sección (#sectores).
 * PROPIETARIO: Sección C. Solo este archivo y su componente; no edites main.ts.
 *
 * main.ts llama a init(ctx) UNA vez, en orden de página. Los [data-reveal] de la
 * intro (eyebrow, h2 split, entradilla) ya los anima el núcleo antes de esta llamada.
 *
 *  · desktop → .is-pinned: el escenario se fija (pin) y la pista se desplaza en
 *    horizontal con un tween ligado al scroll (scrub, ease 'none') que se guarda
 *    en `horizontal` y se pasa como containerAnimation a:
 *      - el reveal por clip-path de cada foto (por tiempo, power4.out, una vez),
 *      - el parallax interior de cada foto (yPercent dentro del margen 3:4 → 4:5,
 *        nunca scale > 1) y el parallax del nombre (va más rápido que la foto).
 *    Recorrido del pin = ancho de la pista − ancho de pantalla (1 px de scroll
 *    vertical = 1 px de desplazamiento horizontal).
 *  · touch → carrusel nativo (CSS). Aquí solo: reveal por tiempo al entrar, un
 *    parallax mínimo y la barra de progreso del carrusel.
 *  · reduced → nada: la rejilla estática del CSS base.
 */
import type { SectionContext } from '../core/context';

export function init(ctx: SectionContext): void {
  const { root, q, q1, gsap, mm, conditions, modeOf, getLenis } = ctx;
  if (!root) return;

  const stage = q1('[data-sectors-stage]');
  const viewport = q1('[data-sectors-viewport]');
  const track = q1('[data-sectors-track]');
  const list = q1('[data-sectors-list]');
  const fill = q1('[data-sectors-progress]');
  const finalPanel = q1('[data-sector-final]');
  const panels = q('[data-sector]').filter((el) => el !== finalPanel);
  if (!stage || !viewport || !track || !list || !panels.length) return;

  /** Piezas de cada panel de sector. */
  const parts = panels.map((panel) => ({
    panel,
    frame: panel.querySelector<HTMLElement>('[data-sector-frame]'),
    img: panel.querySelector<HTMLElement>('[data-sector-img]'),
    name: panel.querySelector<HTMLElement>('[data-sector-name]'),
    nameInner: panel.querySelector<HTMLElement>('[data-sector-name-inner]'),
    meta: panel.querySelector<HTMLElement>('[data-sector-meta]'),
  }));
  const finalParts = finalPanel ? Array.from(finalPanel.querySelectorAll<HTMLElement>('[data-final-part]')) : [];

  /* ── Escritorio: pin + scroll horizontal ─────────────────────────────── */
  const desktop = (): (() => void) => {
    // Con Lenis activo, data-lenis-prevent haría que la rueda sobre los paneles
    // ignorase el smooth scroll: solo tiene sentido en el carrusel táctil.
    list.removeAttribute('data-lenis-prevent');
    root.classList.add('is-pinned');

    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    const setFill = fill ? gsap.quickSetter(fill, 'scaleX') : null;

    // Qué paneles se ven ya al fijarse el escenario (medido antes de mover nada).
    const trackLeft = track.getBoundingClientRect().left;
    const visibleWidth = viewport.clientWidth;
    const startsVisible = (el: HTMLElement) => el.getBoundingClientRect().left - trackLeft < visibleWidth * 0.92;

    // EL tween horizontal (spec §9): lineal, ligado al scroll, reutilizado como containerAnimation.
    const horizontal = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      // `this` y no la constante: el tween se renderiza ya durante su creación.
      onUpdate(this: gsap.core.Tween) {
        setFill?.(this.progress());
      },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    parts.forEach(({ panel, frame, img, name, nameInner, meta }, i) => {
      // Zigzag: en los paneles pares la foto está abajo → se descubre de arriba abajo.
      const fromTop = i % 2 === 1;

      // Reveal por tiempo. Los paneles ya visibles al fijar el escenario usan un
      // trigger vertical (con containerAnimation saltarían en la carga de la página).
      const tl = gsap.timeline({
        scrollTrigger: startsVisible(panel)
          ? { trigger: stage, start: 'top 50%', once: true }
          : { trigger: panel, containerAnimation: horizontal, start: 'left 86%', once: true },
      });
      if (frame) {
        tl.fromTo(
          frame,
          { clipPath: fromTop ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.out' },
          0,
        );
      }
      if (nameInner) tl.from(nameInner, { yPercent: fromTop ? -105 : 105, duration: 1.1, ease: 'power4.out' }, 0.1);
      if (meta) tl.from(meta, { opacity: 0, y: fromTop ? -24 : 24, duration: 0.9, ease: 'power3.out' }, 0.2);

      // Parallax interior de la foto: recorre el margen que sobra (3:4 en 4:5 → 6,25 %).
      if (img) {
        gsap.fromTo(
          img,
          { yPercent: 0 },
          {
            yPercent: -6.25,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: horizontal,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        );
      }
      // Parallax por capas: el nombre se adelanta un poco a la foto.
      if (name) {
        gsap.fromTo(
          name,
          { x: () => window.innerWidth * 0.045 },
          {
            x: () => window.innerWidth * -0.045,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: horizontal,
              start: 'left right',
              end: 'right left',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      }
    });

    if (finalPanel && finalParts.length) {
      gsap.from(finalParts, {
        opacity: 0,
        y: 40,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: finalPanel, containerAnimation: horizontal, start: 'left 82%', once: true },
      });
    }

    // Teclado: el foco en algo de la pista que está fuera de pantalla lleva el
    // scroll al punto en que ese panel se ve (overflow: clip impide que el
    // navegador desplace el contenedor por su cuenta).
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      const st = horizontal.scrollTrigger;
      if (!target || !st || !target.matches(':focus-visible')) return;
      const item = target.closest<HTMLElement>('[data-sector], [data-sectors-intro]');
      if (!item) return;
      const max = distance();
      if (!max) return;
      const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      // Posición del panel dentro de la pista (las dos cajas llevan la misma translación).
      const offset = item.getBoundingClientRect().left - track.getBoundingClientRect().left;
      const x = gsap.utils.clamp(0, max, offset - gutter);
      const y = st.start + (x / max) * (st.end - st.start);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
    track.addEventListener('focusin', onFocusIn);

    return () => {
      track.removeEventListener('focusin', onFocusIn);
      root.classList.remove('is-pinned');
      list.setAttribute('data-lenis-prevent', '');
      if (fill) gsap.set(fill, { clearProps: 'transform' });
    };
  };

  /* ── Táctil / < 1024 px: carrusel nativo (sin pin) ──────────────────── */
  const touch = (): (() => void) => {
    const frames = parts.map((p) => p.frame).filter(Boolean) as HTMLElement[];
    const names = parts.map((p) => p.nameInner).filter(Boolean) as HTMLElement[];
    const metas = parts.map((p) => p.meta).filter(Boolean) as HTMLElement[];
    const imgs = parts.map((p) => p.img).filter(Boolean) as HTMLElement[];

    // Reveal por tiempo al entrar el carrusel (los de fuera de pantalla ya
    // están descubiertos cuando se llega a ellos deslizando).
    const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
    tl.fromTo(
      frames,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.out', stagger: 0.1 },
      0,
    )
      .from(names, { yPercent: 105, duration: 1.1, ease: 'power4.out', stagger: 0.1 }, 0.1)
      .from(metas, { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 0.2);
    if (finalParts.length) {
      tl.from(finalParts, { opacity: 0, y: 32, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 0.3);
    }

    // Parallax muy reducido con el scroll vertical (dentro del margen de la foto).
    if (imgs.length) {
      gsap.fromTo(
        imgs,
        { yPercent: -1.5 },
        {
          yPercent: -4.75,
          ease: 'none',
          scrollTrigger: { trigger: list, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        },
      );
    }

    // Progreso del carrusel (parte visible → final), solo transform.
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!fill) return;
      const max = list.scrollWidth;
      const ratio = max > 0 ? (list.scrollLeft + list.clientWidth) / max : 1;
      fill.style.transform = `scaleX(${gsap.utils.clamp(0, 1, ratio)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    list.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      cancelAnimationFrame(raf);
      list.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (fill) fill.style.transform = '';
    };
  };

  mm.add(
    conditions,
    (context) => {
      const mode = modeOf(context.conditions);
      if (mode === 'reduced') return; // rejilla estática, sin animaciones
      return mode === 'desktop' ? desktop() : touch();
    },
    root,
  );
}
