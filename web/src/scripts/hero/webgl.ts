/**
 * WebGL del hero (7.1) con OGL — se carga con import() desde sections/hero.ts
 * SOLO en modo escritorio, tras `load` + requestIdleCallback y si hay WebGL sin
 * "major performance caveat" (renderizado por software → degradado CSS).
 *
 * Rendimiento (spec 7.1):
 *  - devicePixelRatio limitado a 1,5 y render al 50–75 % (escalado con CSS).
 *  - Si los frames tardan de media > 20 ms, baja la resolución un escalón.
 *  - Bucle propio con requestAnimationFrame que se PARA fuera de pantalla
 *    (IntersectionObserver), con la pestaña oculta (visibilitychange) y cuando
 *    el hero ya se ha desvanecido por scroll.
 *  - destroy(): cancela el rAF, quita listeners/observers, pierde el contexto
 *    (WEBGL_lose_context) y retira el canvas. Lo llama la matchMedia al salir
 *    del modo escritorio.
 *
 * La coreografía del "relevo" vive aquí (uniforms); el shader solo pinta.
 */
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { vertex, fragment } from './shader';

type V2 = [number, number];

export interface HeroGLOptions {
  /** Contenedor [data-hero-visual] (tamaño del lienzo). */
  container: HTMLElement;
  /** Lienzo ya sondeado (tiene contexto WebGL). */
  canvas: HTMLCanvasElement;
  /** El titular: el encuentro se coloca por encima de él (nunca detrás del texto). */
  anchor?: HTMLElement | null;
  /** Progreso del scroll del hero (0..1), lo escribe un ScrollTrigger con scrub. */
  scroll: { p: number };
  /** Primer frame pintado: el llamador hace el fundido de entrada. */
  onFirstFrame?: () => void;
  /** Se perdió el contexto WebGL: el llamador vuelve al degradado. */
  onContextLost?: () => void;
}

export interface HeroGL {
  destroy: () => void;
}

/* ── Utilidades ──────────────────────────────────────────────────────────── */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];
const norm = (a: V2): V2 => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const mix2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Subdivisión de De Casteljau: la parte [0, s] de una Bézier cuadrática. */
function truncate(p0: V2, p1: V2, p2: V2, s: number): [V2, V2, V2] {
  const q0 = mix2(p0, p1, s);
  const q1 = mix2(p1, p2, s);
  return [p0, q0, mix2(q0, q1, s)];
}

/**
 * Composición en espacio p (y ∈ [-0.5, 0.5], x ∈ [-aspect/2, aspect/2]).
 * El encuentro queda arriba a la derecha, por encima / a la derecha del titular;
 * los brazos nacen en la oscuridad (arriba-izquierda y abajo-derecha).
 */
function layout(aspect: number, anchorTop: number | null) {
  const right = aspect / 2;
  // Altura: por encima del borde superior del titular (con aire para las puntas).
  const y = anchorTop == null ? 0.235 : Math.min(0.3, Math.max(0.2, anchorTop + 0.1));
  const meet: V2 = [right - Math.min(0.4, Math.max(0.28, aspect * 0.22)), y];
  return {
    meet,
    dir: norm([1, -0.3]) as V2,
    a0: [-0.95, 0.22] as V2, // relativos al encuentro
    a1: [-0.36, 0.12] as V2,
    b0: [0.52, -0.72] as V2,
    b1: [0.36, -0.08] as V2,
    radA: [0.1, 0.037] as V2,
    radB: [0.115, 0.039] as V2,
  };
}

/* ── Coreografía del relevo (ciclo de 8,5 s) ─────────────────────────────── */
const CYCLE = 8.5;
const CYCLE_OFFSET = 0.5; // el primer contacto llega ~3,6 s tras aparecer

interface Beat {
  kiss: number;
  gap: number;
  pulseA: number;
  pulseB: number;
  spark: number;
  flash: number;
}

function beat(time: number): Beat {
  const c = (((time + CYCLE_OFFSET) / CYCLE) % 1 + 1) % 1;
  const kiss = smooth(0.36, 0.49, c) * (1 - smooth(0.55, 0.74, c));
  // A lleva la energía hacia su punta…
  const pa = (c - 0.04) / 0.42;
  const pulseA = pa >= 0 && pa <= 1 ? lerp(-0.2, 1.08, easeInOut(pa)) : -2;
  // …se la pasa a B en el contacto y B se la lleva.
  const pb = (c - 0.53) / 0.43;
  const pulseB = pb >= 0 && pb <= 1 ? lerp(1.08, -0.2, easeInOut(pb)) : -2;
  const charge = smooth(0.26, 0.44, c) * (1 - smooth(0.5, 0.6, c));
  const spark = (1 - kiss) * (0.28 + 0.72 * charge);
  const flash = Math.exp(-Math.pow((c - 0.495) / 0.04, 2));
  const gap = lerp(0.062, -0.008, kiss);
  return { kiss, gap, pulseA, pulseB, spark, flash };
}

export function createHeroGL(opts: HeroGLOptions): HeroGL {
  const { container, canvas, scroll, anchor, onFirstFrame, onContextLost } = opts;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  // Resolución de render: 75 % en pantallas normales, 60 % si ya hay densidad alta.
  let resScale = dpr > 1 ? 0.6 : 0.75;
  const MIN_SCALE = 0.5;

  const renderer = new Renderer({
    canvas,
    dpr: dpr * resScale,
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'default',
    webgl: 2,
  });
  const gl = renderer.gl;
  gl.clearColor(0.043, 0.039, 0.035, 1);

  const geometry = new Triangle(gl);
  const uniforms = {
    uRes: { value: [1, 1] },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uPointer: { value: [0, 0] },
    uMouse: { value: [0, 0] },
    uScroll: { value: 0 },
    uIntro: { value: 0 },
    uMeet: { value: [0, 0] },
    uA0: { value: [0, 0] },
    uA1: { value: [0, 0] },
    uA2: { value: [0, 0] },
    uB0: { value: [0, 0] },
    uB1: { value: [0, 0] },
    uB2: { value: [0, 0] },
    uRadA: { value: [0.08, 0.03] },
    uRadB: { value: [0.09, 0.03] },
    uKiss: { value: 0 },
    uPulseA: { value: -2 },
    uPulseB: { value: -2 },
    uSpark: { value: 0 },
    uFlash: { value: 0 },
  };
  const program = new Program(gl, { vertex, fragment, uniforms, depthTest: false, depthWrite: false });
  if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
    // Shader no válido en este equipo: se libera todo y se queda el degradado CSS.
    program.remove();
    geometry.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw new Error('hero-webgl: program link failed');
  }
  const mesh = new Mesh(gl, { geometry, program });

  /* ── Tamaño ─────────────────────────────────────────────────────────── */
  let cssW = 1;
  let cssH = 1;
  let comp = layout(1, null);
  const resize = () => {
    cssW = Math.max(1, container.clientWidth);
    cssH = Math.max(1, container.clientHeight);
    renderer.dpr = dpr * resScale;
    renderer.setSize(cssW, cssH);
    // OGL fija el tamaño CSS en px: lo dejamos al 100 % del contenedor.
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    uniforms.uAspect.value = cssW / cssH;
    // Borde superior del titular en espacio p (y = 0.5 arriba, -0.5 abajo).
    let anchorTop: number | null = null;
    if (anchor) {
      const a = anchor.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      if (a.height > 0 && c.height > 0) anchorTop = 0.5 - (a.top - c.top) / c.height;
    }
    comp = layout(cssW / cssH, anchorTop);
    needsFrame = true;
  };

  /* ── Puntero (suavizado con inercia) ─────────────────────────────────── */
  let rawX = window.innerWidth * 0.62;
  let rawY = window.innerHeight * 0.38;
  let hasPointer = false;
  const mouse: V2 = [0, 0];
  const pointer: V2 = [0, 0];
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    rawX = e.clientX;
    rawY = e.clientY;
    hasPointer = true;
  };
  const onPointerLeave = () => {
    hasPointer = false;
  };

  /* ── Bucle ───────────────────────────────────────────────────────────── */
  let raf = 0;
  let running = false;
  let inView = true;
  let pageVisible = document.visibilityState !== 'hidden';
  let destroyed = false;
  let firstFrame = true;
  let needsFrame = true;
  let time = 0;
  let last = 0;
  let slowFrames = 0;
  let sampled = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    try {
      draw(now);
    } catch {
      // Cualquier fallo en tiempo de ejecución: se para y vuelve el degradado.
      stop();
      onContextLost?.();
    }
  };

  const draw = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;

    // Resolución adaptativa: si vamos lentos de forma sostenida, un escalón abajo.
    if (!firstFrame && resScale > MIN_SCALE) {
      sampled++;
      if (dt > 0.02) slowFrames++;
      if (sampled >= 90) {
        if (slowFrames > 45) {
          resScale = Math.max(MIN_SCALE, resScale - 0.1);
          resize();
        }
        sampled = 0;
        slowFrames = 0;
      }
    }

    // Desvanecido del todo por scroll: no pintamos (el contenedor ya está a opacity 0).
    const sp = clamp01(scroll.p);
    if (sp >= 0.999 && !needsFrame) return;

    time += dt;
    const k = 1 - Math.exp(-dt * 3.2); // inercia del ratón
    const rect = container.getBoundingClientRect();
    const nx = hasPointer ? ((rawX - rect.left) / rect.width) * 2 - 1 : 0.15;
    const ny = hasPointer ? -(((rawY - rect.top) / rect.height) * 2 - 1) : 0.2;
    mouse[0] = lerp(mouse[0], Math.max(-1.2, Math.min(1.2, nx)), k);
    mouse[1] = lerp(mouse[1], Math.max(-1.2, Math.min(1.2, ny)), k);
    const aspect = cssW / cssH;
    pointer[0] = (mouse[0] * 0.5) * aspect;
    pointer[1] = mouse[1] * 0.5;

    // Composición + coreografía.
    const b = beat(time);
    const drift: V2 = [0.008 * Math.sin(time * 0.31), 0.006 * Math.cos(time * 0.23)];
    const lean: V2 = [mouse[0] * 0.042, mouse[1] * 0.03];
    const m = add(add(comp.meet, drift), lean);
    const half = b.gap / 2;
    const tipA = add(m, scale(comp.dir, -(half + comp.radA[1])));
    const tipB = add(m, scale(comp.dir, half + comp.radB[1]));
    const a0 = add(comp.meet, comp.a0);
    const a1 = add(add(comp.meet, comp.a1), scale(lean, 0.6));
    const b0 = add(comp.meet, comp.b0);
    const b1 = add(add(comp.meet, comp.b1), scale(lean, 0.6));

    // Entrada: los brazos crecen a lo largo de su curva hasta encontrarse.
    const reach = easeOutCubic(time / 2.8);
    const [A0, A1, A2] = reach < 1 ? truncate(a0, a1, tipA, Math.max(reach, 0.001)) : [a0, a1, tipA];
    const [B0, B1, B2] = reach < 1 ? truncate(b0, b1, tipB, Math.max(reach, 0.001)) : [b0, b1, tipB];

    const u = uniforms;
    u.uTime.value = time;
    u.uMouse.value = [mouse[0], mouse[1]];
    u.uPointer.value = [pointer[0], pointer[1]];
    u.uScroll.value = sp;
    u.uIntro.value = easeOutCubic(time / 1.8);
    u.uMeet.value = m;
    u.uA0.value = A0;
    u.uA1.value = A1;
    u.uA2.value = A2;
    u.uB0.value = B0;
    u.uB1.value = B1;
    u.uB2.value = B2;
    u.uRadA.value = comp.radA;
    u.uRadB.value = comp.radB;
    // Durante la entrada no hay contacto ni chispa hasta que las puntas llegan.
    const ready = smooth(0.82, 1, reach);
    u.uKiss.value = b.kiss * ready;
    u.uPulseA.value = b.pulseA;
    u.uPulseB.value = b.pulseB;
    u.uSpark.value = b.spark * ready;
    u.uFlash.value = b.flash * ready;

    renderer.render({ scene: mesh });
    needsFrame = false;

    if (firstFrame) {
      firstFrame = false;
      onFirstFrame?.();
    }
  };

  const start = () => {
    if (running || destroyed) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => (inView && pageVisible ? start() : stop());

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries.some((e) => e.isIntersecting);
      sync();
    },
    { rootMargin: '0px' },
  );
  const ro = new ResizeObserver(() => resize());
  const onVisibility = () => {
    pageVisible = document.visibilityState !== 'hidden';
    sync();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
    onContextLost?.();
  };

  resize();
  io.observe(container);
  ro.observe(container);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  sync();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      try {
        program.remove();
        geometry.remove();
      } catch {
        /* el contexto puede estar ya perdido */
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}
