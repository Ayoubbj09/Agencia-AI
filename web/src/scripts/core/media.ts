/**
 * Condiciones de gsap.matchMedia() (spec §9 "Versiones por dispositivo").
 * Hay UNA sola instancia de gsap.matchMedia() (creada en main.ts) y todas las
 * secciones la usan con estas tres condiciones con nombre.
 *
 *  desktop  → pins, parallax, cursor, magnéticos, Lenis, WebGL.
 *  touch    → sin pins, reveals simples, parallax muy reducido, fondo estático.
 *  reduced  → maqueta en columna sin animaciones, sin Lenis/cursor/preloader.
 *
 * `touch` y `reduced` pueden ser true a la vez: manda `reduced` (ver modeOf).
 * `desktop` y `reduced` son excluyentes (desktop exige no-preference).
 */
export const conditions = {
  desktop: '(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
  touch: '(max-width: 1023px), (pointer: coarse)',
  reduced: '(prefers-reduced-motion: reduce)',
} as const;

/**
 * Las tres consultas son las EXACTAS de la spec. Dejan un hueco: ≥1024 px con
 * `(pointer: none)` (TV, quiosco) y sin reduced motion. Ahí ningún callback de
 * mm.add() se ejecuta (ni reveals ni Lenis): main.ts lo detecta con esta
 * función y deja la web estática (quita html.motion) para que nada quede oculto.
 */
export function noModeMatches(): boolean {
  return !Object.values(conditions).some((q) => window.matchMedia(q).matches);
}

export type ConditionName = keyof typeof conditions;
export type Conditions = Record<ConditionName, boolean>;
export type Mode = 'desktop' | 'touch' | 'reduced';

/**
 * Resuelve el modo activo a partir de `context.conditions` de un callback de
 * mm.add(). Prioridad: reduced > desktop > touch.
 */
export function modeOf(c: Partial<Conditions> | undefined): Mode {
  if (!c || c.reduced) return 'reduced';
  if (c.desktop) return 'desktop';
  return 'touch';
}

/** Consulta puntual (fuera de matchMedia) — no reactiva. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(conditions.reduced).matches;
}
