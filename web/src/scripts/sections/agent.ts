/**
 * 7.3 Qué hace un agente — script de la sección (#que-hace).
 * PROPIETARIO: Sección B. Marcado y estilos: src/components/sections/AgentDemo.astro
 *
 * Versiones (una sola ctx.mm con las tres condiciones):
 *
 *  · desktop → .is-live + .is-pinned. El escenario [data-agent-stage] se fija
 *    (pin) y una timeline con scrub (ease 'none') hace avanzar la conversación:
 *    para cada burbuja, indicador "escribiendo" → burbuja con scale + fade, y la
 *    lista sube como en un chat real (anclada abajo, solo transform). Cada
 *    capacidad se ilumina en su frase exacta (data-cap en el marcado) y el riel
 *    de la izquierda avanza con ella. Al final, el aviso interno sale de detrás
 *    del móvil y viaja hasta Laura (el relevo visual); la línea se rellena y su
 *    anillo se enciende. Cierra con las 4 capacidades encendidas.
 *
 *  · touch (< 1024 px o puntero grueso) → .is-live, sin pin. La misma
 *    secuencia por tiempo (power3.out / expo.out) al entrar el móvil en
 *    pantalla (se pausa si se vuelve arriba; se completa si ya quedó atrás). Las capacidades van
 *    debajo con el reveal genérico ([data-reveal-group]).
 *
 *  · reduced (y sin JS) → nada: el CSS base ya es la columna estática completa.
 *
 * Solo se animan transform y opacity. Las burbujas usan opacity (no autoAlpha)
 * para no sacarlas del árbol de accesibilidad mientras "llegan".
 */
import type { SectionContext } from '../core/context';

/** Opacidad de una capacidad aún no alcanzada / ya superada (versión fijada). */
const DIM = 0.22;
const PAST = 0.45;
/** Opacidad de Laura antes de recibir el relevo. */
const PERSON_IDLE = 0.4;

/** Suma offsetLeft/Top hasta `ancestor` (ignora transforms: medidas estables). */
function offsetIn(el: HTMLElement, ancestor: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== ancestor) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function init(ctx: SectionContext): void {
  const { root, q, q1, gsap, ScrollTrigger, mm, conditions, modeOf } = ctx;
  if (!root) return;

  const stage = q1('[data-agent-stage]');
  const device = q1('[data-agent-device]');
  const phone = q1('[data-agent-phone]');
  const chat = q1('[data-agent-chat]');
  const list = q1('[data-agent-messages]');
  const msgs = q('[data-agent-msg]');
  const pills = msgs.map((m) => m.querySelector<HTMLElement>('[data-agent-typing]'));
  const bubbles = msgs.map((m) => m.querySelector<HTMLElement>('[data-agent-bubble]'));
  const capsBox = q1('.agent__caps');
  const caps = q('[data-agent-cap]');
  const capItems = q('[data-agent-capability]');
  const rail = q1('[data-agent-progress]');
  const card = q1('[data-agent-handoff]');
  const relay = q1('[data-agent-relay]');
  const fill = q1('[data-agent-relay-fill]');
  const person = q1('[data-agent-person]');
  const ring = q1('[data-agent-person-ring]');

  if (
    !stage || !device || !phone || !chat || !list || !card || !fill || !person || !ring ||
    !msgs.length || pills.some((p) => !p) || bubbles.some((b) => !b)
  ) {
    return; // marcado incompleto: se queda la versión estática (legible)
  }
  const typing = pills as HTMLElement[];
  const bubble = bubbles as HTMLElement[];

  /** Capacidad que se ilumina con cada burbuja (0 = ninguna). */
  const capOf = msgs.map((m) => Number(m.dataset.cap || 0));
  const isAgent = (i: number) => msgs[i].dataset.agentMsg === 'agente';
  /** Tiempo de lectura proporcional al texto (unidades de timeline). */
  const readFor = (i: number, k = 1) => (0.22 + (bubble[i].textContent || '').trim().length / 230) * k;

  /** Desplazamiento que lleva el aviso al centro del móvil (escondido detrás). */
  const fromPhone = () => {
    const p = offsetIn(phone, device);
    const c = offsetIn(card, device);
    return {
      x: Math.round(p.x + phone.offsetWidth / 2 - (c.x + card.offsetWidth / 2)),
      y: Math.round(p.y + phone.offsetHeight / 2 - (c.y + card.offsetHeight / 2)),
    };
  };

  const animated = [list, card, fill, person, ring, rail, ...typing, ...bubble, ...caps].filter(
    Boolean,
  ) as HTMLElement[];

  mm.add(
    conditions,
    (self) => {
      const mode = modeOf(self.conditions);
      if (mode === 'reduced') return; // maqueta estática (CSS base)

      root.classList.add('is-live');
      if (mode === 'desktop') root.classList.add('is-pinned');
      let cleanup: (() => void) | undefined;

      try {
        cleanup = mode === 'desktop' ? buildDesktop() : buildTouch();
      } catch (err) {
        // Nunca dejar la conversación oculta: vuelta a la versión estática.
        console.error('[relevo] 7.3 no pudo iniciar la animación:', err);
        root.classList.remove('is-live', 'is-pinned');
        gsap.set(animated, { clearProps: 'all' });
      }

      return () => {
        cleanup?.();
        root.classList.remove('is-live', 'is-pinned');
      };
    },
    root,
  );

  /* ════════════════════════════════════════════════════════════════════════
     ESCRITORIO: pin + scrub
     ════════════════════════════════════════════════════════════════════════ */
  function buildDesktop(): () => void {
    // Medidas del chat (sin transforms). Se rehacen en cada refresh, antes de
    // que ScrollTrigger invalide la timeline y reevalúe los valores-función.
    const m = { view: 0, top: [] as number[], h: [] as number[], pill: [] as number[], rail: 0, capEnd: [] as number[] };
    const measure = () => {
      const cs = getComputedStyle(chat!);
      m.view = chat!.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      msgs.forEach((el, i) => {
        m.top[i] = el.offsetTop;
        m.h[i] = el.offsetHeight;
        m.pill[i] = typing[i].offsetHeight;
      });
      if (rail && capsBox) {
        const railBox = rail.parentElement as HTMLElement;
        m.rail = railBox.offsetHeight || 1;
        // Fracción del riel hasta el final de cada capacidad.
        m.capEnd = capItems.map((li) =>
          Math.min(1, Math.max(0, (offsetIn(li, capsBox).y + li.offsetHeight - railBox.offsetTop) / m.rail)),
        );
      }
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    // Chat anclado abajo: el borde inferior de lo último visible toca el pie del chat.
    const yTyping = (i: number) => () => Math.round(m.view - (m.top[i] + m.pill[i]));
    const yBubble = (i: number) => () => Math.round(m.view - (m.top[i] + m.h[i]));
    const railTo = (k: number) => () => (k <= 0 ? 0 : m.capEnd[k - 1] ?? 1);

    // Estado inicial (el contexto lo revierte al cambiar de modo).
    gsap.set(typing, { autoAlpha: 0 });
    gsap.set(bubble, { opacity: 0 });
    gsap.set(list, { y: () => m.view });
    gsap.set(caps, { opacity: DIM });
    gsap.set(card, { opacity: 0 });
    gsap.set(fill, { scaleX: 0 });
    gsap.set(ring, { opacity: 0 });
    gsap.set(person, { opacity: PERSON_IDLE });
    if (rail) gsap.set(rail, { scaleY: 0 });

    // Scrub → ease 'none' en todo (la suavidad la dan Lenis + scrub).
    // immediateRender: false → cada fromTo solo pinta su "from" al llegar a él.
    const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
    let t = 0.15;
    let prevY: () => number = () => m.view;
    let activeCap = 0;

    msgs.forEach((_, i) => {
      const agent = isAgent(i);
      // 1) "escribiendo": la lista hace sitio y aparece el indicador.
      tl.fromTo(list, { y: prevY }, { y: yTyping(i), duration: 0.25 }, t);
      tl.fromTo(typing[i], { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.18 }, t + 0.04);
      t += agent ? 0.6 : 0.4;

      // 2) La burbuja sustituye al indicador: pequeño scale + fade.
      tl.fromTo(typing[i], { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.92, duration: 0.1 }, t);
      tl.fromTo(bubble[i], { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3 }, t);
      tl.fromTo(list, { y: yTyping(i) }, { y: yBubble(i), duration: 0.3 }, t);

      // 3) Capacidad correspondiente + riel de progreso.
      const k = capOf[i];
      if (k && caps[k - 1]) {
        tl.fromTo(caps[k - 1], { opacity: DIM }, { opacity: 1, duration: 0.3 }, t);
        if (activeCap && caps[activeCap - 1]) {
          tl.fromTo(caps[activeCap - 1], { opacity: 1 }, { opacity: PAST, duration: 0.3 }, t);
        }
        if (rail) tl.fromTo(rail, { scaleY: railTo(k - 1) }, { scaleY: railTo(k), duration: 0.6 }, t);
        activeCap = k;
      }

      t += 0.3 + readFor(i);
      prevY = yBubble(i);
    });

    // 4) El relevo: el aviso sale de detrás del móvil y viaja hasta Laura.
    tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
    tl.fromTo(
      card,
      { x: () => fromPhone().x, y: () => fromPhone().y, scale: 0.88 },
      { x: 0, y: 0, scale: 1, duration: 1 },
      t,
    );
    tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 0.75 }, t + 0.35);
    tl.fromTo(person, { opacity: PERSON_IDLE }, { opacity: 1, duration: 0.3 }, t + 0.85);
    tl.fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t + 0.95);
    t += 1.45;

    // 5) Cierre: las cuatro capacidades encendidas, un respiro y se suelta el pin.
    caps.forEach((c, idx) => {
      if (idx + 1 !== activeCap) tl.fromTo(c, { opacity: PAST }, { opacity: 1, duration: 0.45 }, t);
    });
    t += 0.45;
    tl.to({}, { duration: 0.7 }, t);

    ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      // Recorrido generoso sin cansar: ≈ 3 pantallas (2400–3400 px).
      end: () => `+=${Math.round(Math.min(Math.max(window.innerHeight * 3.1, 2400), 3400))}`,
      pin: true,
      scrub: 0.8,
      animation: tl,
      invalidateOnRefresh: true,
    });

    return () => ScrollTrigger.removeEventListener('refreshInit', measure);
  }

  /* ════════════════════════════════════════════════════════════════════════
     TÁCTIL / < 1024 px: sin pin, por tiempo al entrar en pantalla
     ════════════════════════════════════════════════════════════════════════ */
  function buildTouch(): () => void {
    gsap.set(typing, { autoAlpha: 0 });
    gsap.set(bubble, { opacity: 0 });
    gsap.set(card, { opacity: 0 });
    gsap.set(fill, { scaleY: 0 });
    gsap.set(ring, { opacity: 0 });
    gsap.set(person, { opacity: PERSON_IDLE });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    let t = 0.25;

    msgs.forEach((_, i) => {
      const agent = isAgent(i);
      tl.fromTo(typing[i], { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' }, t);
      t += agent ? 0.65 : 0.4;
      tl.to(typing[i], { autoAlpha: 0, scale: 0.92, duration: 0.2, ease: 'power2.out' }, t);
      tl.fromTo(
        bubble[i],
        { opacity: 0, scale: 0.9, y: 6 },
        { opacity: 1, scale: 1, y: 0, duration: 0.65 },
        t,
      );
      t += 0.3 + readFor(i, 1.15);
    });

    // El relevo: el aviso baja desde detrás del móvil hasta Laura.
    tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t);
    tl.fromTo(
      card,
      { x: () => fromPhone().x, y: () => fromPhone().y, scale: 0.9 },
      { x: 0, y: 0, scale: 1, duration: 1.1, ease: 'power4.out' },
      t,
    );
    tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: 0.8 }, t + 0.1);
    tl.to(person, { opacity: 1, duration: 0.8 }, t + 0.6);
    tl.fromTo(ring, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' }, t + 0.7);

    ScrollTrigger.create({
      trigger: phone,
      start: 'top 70%',
      endTrigger: relay ?? phone,
      end: 'bottom top',
      // Entra → se reproduce. Si se vuelve arriba antes de verla, se pausa y
      // sigue al regresar. Si la persona ya la ha dejado atrás (móvil y aviso
      // fuera de pantalla por arriba), se completa en silencio: al volver la
      // encuentra entera y nunca queda texto oculto.
      onEnter: () => tl.play(),
      onEnterBack: () => tl.play(),
      onLeaveBack: () => tl.pause(),
      onLeave: () => tl.progress(1),
    });

    return () => {};
  }
}
