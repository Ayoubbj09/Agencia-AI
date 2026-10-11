/**
 * 7.1 Hero — script de la sección (#inicio). PROPIETARIO: Sección A.
 *
 * Qué hace, por modo (una sola matchMedia compartida, ctx.mm):
 *
 *  desktop  · Entrada del titular por palabras (SplitText, máscara por línea,
 *             suben desde abajo con un blur que se aclara). (Eyebrow, subtítulo,
 *             CTA e indicador entran con CSS desde la primera pintura: ver
 *             Hero.astro, "Entrada (CSS puro)", por el LCP.)
 *           · Scroll (scrub 0.8, ease 'none'): el fondo hace zoom-out + parallax
 *             y se desvanece; el contenido sube un poco y se apaga al final.
 *           · WebGL (OGL): import() tras `load` + requestIdleCallback, solo si
 *             hay WebGL sin "major performance caveat". Si no, se queda el
 *             degradado CSS (con deriva muy lenta, en CSS).
 *  touch    · Misma entrada del titular; fondo estático, sin efectos de scroll:
 *             tras `load` + requestIdleCallback se pinta en un <canvas> 2D un
 *             fotograma exportado del propio WebGL (AVIF de ~7 KB, vertical u
 *             horizontal según la orientación) y se funde sobre el degradado.
 *             Un canvas nunca es candidato a LCP y no compite con lo crítico.
 *  reduced  · Nada: todo visible y estático (el CSS sin html.motion ya lo muestra).
 *
 * LCP: el subtítulo (el candidato LCP) no depende del JS; el titular empieza
 * en cuanto se ejecuta el script. El canvas nunca es candidato a LCP.
 * Sin preloader (opcional en la spec): ver Hero.astro.
 */
import type { SectionContext } from '../core/context';
// Fotogramas fijos del propio render WebGL (A-still, exportados con Playwright +
// sharp): solo para táctil. Nunca son fotos de sectores.
import stillPortrait from '../../assets/hero/hero-still-portrait.avif?url';
import stillLandscape from '../../assets/hero/hero-still-landscape.avif?url';

/** Ejecuta `cb` tras `load` + requestIdleCallback. Devuelve la cancelación. */
function afterLoadIdle(cb: () => void): () => void {
  let done = false;
  let idleId = 0;
  let timer = 0;
  const run = () => {
    if (done) return;
    // Safari no tiene requestIdleCallback: un pequeño retraso tras `load`.
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => !done && cb(), { timeout: 1500 });
    } else {
      timer = window.setTimeout(() => !done && cb(), 250);
    }
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    done = true;
    window.removeEventListener('load', run);
    if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
    if (timer) window.clearTimeout(timer);
  };
}

/**
 * ¿Hay WebGL utilizable? Crea el contexto en el propio lienzo (OGL lo reutiliza).
 * failIfMajorPerformanceCaveat: con renderizado por software, mejor el degradado.
 */
function probeWebGL(canvas: HTMLCanvasElement): boolean {
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: true,
  };
  try {
    return !!(canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs));
  } catch {
    return false;
  }
}

/**
 * Táctil: pinta el fotograma fijo del WebGL en un canvas 2D y lo funde sobre el
 * degradado CSS. Cambia de imagen si cambia la orientación. Devuelve la limpieza.
 */
function paintStill(
  visual: HTMLElement,
  gsap: SectionContext['gsap'],
  context: gsap.Context,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__still';
  canvas.setAttribute('aria-hidden', 'true');
  const portraitMq = window.matchMedia('(orientation: portrait)');
  let token = 0;

  const draw = () => {
    const mine = ++token;
    const portrait = portraitMq.matches;
    const img = new Image();
    img.decoding = 'async';
    img.src = portrait ? stillPortrait : stillLandscape;
    img
      .decode()
      .then(() => {
        if (context.isReverted || mine !== token) return;
        const c2d = canvas.getContext('2d');
        if (!c2d) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        c2d.drawImage(img, 0, 0);
        canvas.dataset.orientation = portrait ? 'portrait' : 'landscape';
        if (!canvas.isConnected) {
          visual.appendChild(canvas);
          context.add(() => {
            gsap.fromTo(
              canvas,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 1.2,
                ease: 'power3.out',
                onComplete: () => visual.classList.add('is-still'),
              },
            );
          });
        }
      })
      .catch(() => {
        // Sin imagen (red, formato): se queda el degradado CSS.
      });
  };

  const cancelIdle = afterLoadIdle(() => {
    if (!context.isReverted) draw();
  });
  const onOrientation = () => {
    if (canvas.isConnected) draw();
  };
  portraitMq.addEventListener('change', onOrientation);

  return () => {
    token++;
    cancelIdle();
    portraitMq.removeEventListener('change', onOrientation);
    canvas.remove();
    visual.classList.remove('is-still');
  };
}

export function init(ctx: SectionContext): void {
  const { root, q1, gsap, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const title = q1<HTMLElement>('[data-hero-title]');
  const cue = q1<HTMLElement>('[data-hero-cue]');
  const visual = q1<HTMLElement>('[data-hero-visual]');
  const fallback = q1<HTMLElement>('[data-hero-fallback]');
  const content = q1<HTMLElement>('[data-hero-content]');

  mm.add(
    conditions,
    (context) => {
      const mode = modeOf(context.conditions);
      if (mode === 'reduced') return; // estático: el CSS sin html.motion lo muestra todo

      /* ── 1. Entrada del titular (por tiempo, en cuanto llega el script) ─── */
      if (title) {
        ctx.split(title, {
          type: 'lines,words',
          animate: 'words',
          aria: 'auto',
          from: { yPercent: 115, opacity: 0, filter: 'blur(10px)' },
          vars: {
            duration: 1.05,
            ease: 'power4.out',
            stagger: 0.08,
            delay: 0.05,
            // Sin restos de filter cuando acaba (mejor nitidez y menos capas).
            clearProps: 'filter',
          },
        });
      }
      if (!visual) return;
      if (mode !== 'desktop') return paintStill(visual, gsap, context); // táctil: fondo estático

      /* ── 2. Scroll: zoom-out + parallax + fundido (scrub, ease none) ───── */
      const scrollState = { p: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 },
      });
      tl.to(scrollState, { p: 1, duration: 1 }, 0).to(visual, { opacity: 0, duration: 1 }, 0);
      if (fallback) tl.to(fallback, { yPercent: 12, scale: 0.92, duration: 1 }, 0);
      if (cue) tl.to(cue, { opacity: 0, duration: 0.15 }, 0);
      if (content) tl.to(content, { yPercent: -6, opacity: 0.25, duration: 0.6 }, 0.4);

      /* ── 3. WebGL diferido ─────────────────────────────────────────────── */
      const canvas = document.createElement('canvas');
      canvas.className = 'hero__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      let gl: { destroy: () => void } | null = null;

      const cancelIdle = afterLoadIdle(() => {
        if (context.isReverted) return;
        if (!probeWebGL(canvas)) return; // sin WebGL: degradado CSS con deriva lenta
        import('../hero/webgl')
          .then(({ createHeroGL }) => {
            if (context.isReverted) return;
            visual.appendChild(canvas);
            gl = createHeroGL({
              container: visual,
              canvas,
              anchor: title,
              scroll: scrollState,
              onFirstFrame: () => {
                if (context.isReverted) return;
                context.add(() => {
                  gsap.to(canvas, {
                    opacity: 1,
                    duration: 1.2,
                    ease: 'power3.out',
                    onComplete: () => visual.classList.add('is-gl'),
                  });
                });
              },
              onContextLost: () => {
                visual.classList.remove('is-gl');
                gsap.set(canvas, { opacity: 0 });
              },
            });
          })
          .catch(() => {
            // Si el chunk no carga, el degradado CSS sigue ahí: nada que hacer.
            canvas.remove();
          });
      });

      return () => {
        cancelIdle();
        gl?.destroy();
        gl = null;
        canvas.remove();
        visual.classList.remove('is-gl');
      };
    },
    root,
  );
}
