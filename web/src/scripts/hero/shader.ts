/**
 * Shaders del hero (7.1) — "el relevo".
 *
 * Un único triángulo a pantalla completa + este fragment shader. Dos formas
 * orgánicas de metal líquido (dos "brazos" que entran desde la oscuridad) se
 * buscan hasta casi tocarse; entre sus puntas salta la energía y, de vez en
 * cuando, se funden un instante en un puente líquido (unión suave de SDF) y el
 * pulso de luz pasa de una a otra: pasar el testigo.
 *
 * Técnica (barata, sin raymarching):
 *  - Cada brazo es una curva de Bézier cuadrática con radio variable (distancia
 *    exacta de Íñigo Quílez) sobre un espacio deformado con senos lentos.
 *  - Las dos distancias se unen con smooth-min: el "cuello" líquido al tocarse.
 *  - Normal de tubo a partir del gradiente de la SDF (diferencias finitas) y
 *    sombreado de metal: reflejo de un entorno procedural cálido (ventana ámbar
 *    que sigue al ratón + contraluz), Fresnel y brillo especular del puntero.
 *  - Luz en "pool": todo se apaga lejos del punto de encuentro, así el texto del
 *    titular siempre queda sobre negro cálido (contraste AA).
 *  - Salida tonemapeada (ACES) y mezclada en "screen" sobre --bg exacto, para que
 *    los bordes del lienzo y el fundido con la página no se noten. Con dither.
 *
 * La coreografía (posiciones, beso, pulsos) se calcula en JS (webgl.ts) y llega
 * como uniforms: el shader solo pinta.
 */

export const vertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2  uRes;      // tamaño del lienzo en píxeles reales
uniform float uAspect;   // ancho / alto
uniform float uTime;     // segundos (se congela en pausa)
uniform vec2  uPointer;  // puntero en espacio p (suavizado)
uniform vec2  uMouse;    // puntero normalizado -1..1 (suavizado)
uniform float uScroll;   // 0..1 progreso del scroll del hero
uniform float uIntro;    // 0..1 entrada
uniform vec2  uMeet;     // punto de encuentro (espacio p)

uniform vec2  uA0;       // brazo A: base, control, punta
uniform vec2  uA1;
uniform vec2  uA2;
uniform vec2  uB0;       // brazo B
uniform vec2  uB1;
uniform vec2  uB2;
uniform vec2  uRadA;     // radio base / punta de A
uniform vec2  uRadB;
uniform float uKiss;     // 0..1 contacto (puente líquido)
uniform float uPulseA;   // posición del pulso en A (0 base -> 1 punta)
uniform float uPulseB;   // posición del pulso en B (1 punta -> 0 base)
uniform float uSpark;    // energía en el hueco entre puntas
uniform float uFlash;    // destello al tocarse

// Paleta en lineal (tokens: --accent, --accent-soft, --accent-deep, --bg)
const vec3 ACCENT      = vec3(1.0, 0.1470, 0.0262);
const vec3 ACCENT_SOFT = vec3(1.0, 0.4452, 0.1946);
const vec3 ACCENT_DEEP = vec3(0.1441, 0.0232, 0.0052);
const vec3 BG_SRGB     = vec3(0.0431, 0.0392, 0.0353);
const vec3 WARM_WHITE  = vec3(1.0, 0.80, 0.62);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Distancia exacta a una Bézier cuadrática + parámetro t del punto más cercano.
// (c) Íñigo Quílez, MIT — https://iquilezles.org/articles/distfunctions2d/
vec2 sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;
  float kk = 1.0 / max(dot(b, b), 1e-6);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);
  float res = 0.0;
  float t = 0.0;
  float p = ky - kx * kx;
  float p3 = p * p * p;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float h = q * q + 4.0 * p3;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    vec2 qv = d + (c + b * t) * t;
    res = dot(qv, qv);
  } else {
    float z = sqrt(-p);
    float v = acos(clamp(q / (p * z * 2.0), -1.0, 1.0)) / 3.0;
    float m = cos(v);
    float n = sin(v) * 1.732050808;
    vec3 tt = clamp(vec3(m + m, -n - m, n - m) * z - kx, 0.0, 1.0);
    vec2 qx = d + (c + b * tt.x) * tt.x;
    float dx = dot(qx, qx);
    vec2 qy = d + (c + b * tt.y) * tt.y;
    float dy = dot(qy, qy);
    if (dx < dy) { res = dx; t = tt.x; } else { res = dy; t = tt.y; }
  }
  return vec2(sqrt(res), t);
}

// Deformación lenta del espacio: las formas ondulan como un líquido espeso.
vec2 warp(vec2 p) {
  float t = uTime;
  vec2 q = p;
  q.x += 0.026 * sin(p.y * 3.1 + t * 0.29) + 0.010 * sin(p.y * 7.7 - t * 0.51 + p.x * 2.3);
  q.y += 0.026 * cos(p.x * 2.7 - t * 0.23) + 0.010 * cos(p.x * 6.9 + t * 0.43 + p.y * 1.9);
  return q;
}

// Radio a lo largo del brazo: grueso en la base, se afina y acaba en una gota.
float radiusAt(float t, vec2 rad) {
  float r = mix(rad.x, rad.y, smoothstep(0.05, 1.0, t));
  // Engrosamientos lentos a lo largo del cuerpo: orgánico, nunca un tubo perfecto.
  r *= 1.0 + 0.13 * sin(t * 6.0 + uTime * 0.35) * smoothstep(1.0, 0.6, t);
  r += rad.y * 0.5 * exp(-pow((t - 0.92) / 0.08, 2.0));
  return r;
}

// Escena: distancia con signo (out: tA, tB, mezcla h [1 = A], radio local).
float scene(vec2 p, out float tA, out float tB, out float h, out float r) {
  vec2 q = warp(p);
  vec2 a = sdBezier(q, uA0, uA1, uA2);
  vec2 b = sdBezier(q, uB0, uB1, uB2);
  float ra = radiusAt(a.y, uRadA);
  float rb = radiusAt(b.y, uRadB);
  // Ondas peristálticas: la "corriente" viaja hacia la punta en A y se aleja en B.
  ra *= 1.0 + 0.055 * sin(a.y * 24.0 - uTime * 2.1);
  rb *= 1.0 + 0.055 * sin(b.y * 22.0 + uTime * 1.9 + 1.7);
  float da = a.x - ra;
  float db = b.x - rb;
  float k = mix(0.010, 0.065, uKiss);
  h = clamp(0.5 + 0.5 * (db - da) / k, 0.0, 1.0);
  tA = a.y;
  tB = b.y;
  r = mix(rb, ra, h);
  return mix(db, da, h) - k * h * (1.0 - h);
}

float sceneD(vec2 p) {
  float tA; float tB; float h; float r;
  return scene(p, tA, tB, h, r);
}

// Entorno procedural cálido para los reflejos del metal.
vec3 env(vec3 r, vec2 m) {
  vec3 col = vec3(0.0012, 0.0010, 0.0009);
  // Cielo: ámbar profundo arriba, negro abajo.
  col += ACCENT_DEEP * 0.20 * smoothstep(-0.2, 1.0, r.y);
  // Contraluz (lo que queda detrás de la forma): resplandor ámbar tenue.
  col += ACCENT * 0.045 * smoothstep(0.2, -1.0, r.z);
  // Ventana principal (arriba a la derecha) que se desplaza con el ratón.
  vec3 L1 = normalize(vec3(0.50 + m.x * 0.55, 0.66 + m.y * 0.40, 0.56));
  float k1 = smoothstep(0.91, 0.993, dot(r, L1));
  col += WARM_WHITE * 2.2 * k1 + ACCENT_SOFT * 0.42 * smoothstep(0.66, 0.95, dot(r, L1));
  // Tira de luz estrecha: el reflejo largo típico del metal líquido.
  vec3 sN = normalize(vec3(-0.62 + m.x * 0.2, 0.78, 0.0));
  float strip = smoothstep(0.035, 0.0, abs(dot(r, sN) - 0.2)) * smoothstep(0.0, 0.8, r.z);
  col += ACCENT_SOFT * 0.45 * strip;
  // Relleno bajo, muy tenue, desde abajo a la izquierda.
  col += ACCENT * 0.03 * smoothstep(0.6, 1.0, dot(r, normalize(vec3(-0.7, -0.6, 0.4))));
  return col;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Polvo en suspensión que atrapa la luz cerca del encuentro (campo de partículas).
float dust(vec2 p, float scale, float seed) {
  vec2 g = p * scale + vec2(uTime * 0.18 * (0.6 + seed), -uTime * 0.07);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h1 = hash12(id + seed * 17.0);
  if (h1 < 0.9) return 0.0;
  vec2 o = vec2(hash12(id + 3.1 + seed), hash12(id + 7.7 - seed)) - 0.5;
  float d = length(f - o * 0.6);
  float tw = 0.55 + 0.45 * sin(uTime * (0.9 + h1 * 1.7) + h1 * 40.0);
  return smoothstep(0.11, 0.0, d) * tw;
}

void main() {
  // Espacio p: y en [-0.5, 0.5], x proporcional al ancho.
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  // Scroll: zoom-out alrededor del encuentro + parallax (las formas bajan más
  // despacio que el contenido).
  float zoom = 1.0 + uScroll * 0.42;
  p = (p - uMeet) * zoom + uMeet;
  p.y += uScroll * 0.11;
  // Profundidad sutil con el ratón.
  p -= uMouse * vec2(0.010, 0.008);

  float px = 1.5 / uRes.y * zoom;

  float tA; float tB; float h; float r;
  float d = scene(p, tA, tB, h, r);

  // "Pool" de luz centrado en el encuentro: lejos de él todo cae a negro cálido
  // (así el titular y el subtítulo quedan siempre sobre fondo oscuro).
  vec2 toM = p - uMeet;
  float dm2 = dot(toM, toM);
  float pool = exp(-dm2 / 0.045);
  float poolWide = exp(-dm2 / 0.22);

  // ── Fondo: resplandor ámbar detrás del encuentro, con sombra de las formas ─
  vec3 bg = ACCENT_DEEP * (0.42 * pool + 0.09 * poolWide);
  float sd = sceneD(p + vec2(-0.018, 0.03));
  bg *= mix(0.25, 1.0, smoothstep(-0.01, 0.10, sd));
  // Halo de energía alrededor de las formas cuando pasa el pulso.
  float pa = exp(-pow((tA - uPulseA) / 0.065, 2.0));
  float pb = exp(-pow((tB - uPulseB) / 0.065, 2.0));
  float pulse = pa * h + pb * (1.0 - h);
  bg += ACCENT * 0.07 * exp(-max(d, 0.0) * 30.0) * pulse * (0.35 + 0.65 * poolWide);

  // Chispa entre las puntas: un hilo de luz fino y un halo en el encuentro.
  vec2 ab = uB2 - uA2;
  float sl = clamp(dot(p - uA2, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  vec2 spp = uA2 + ab * sl;
  float flick = 0.8 + 0.2 * sin(uTime * 17.0) * sin(uTime * 5.3 + 1.0);
  float fil = exp(-pow(length(p - spp) / 0.0022, 2.0)) * uSpark * flick;
  float halo = 0.0012 / (dm2 + 0.0012);
  bg += WARM_WHITE * fil * 0.9;
  bg += ACCENT * halo * (0.07 * uSpark + 0.55 * uFlash);

  // Polvo en suspensión (dos capas con parallax de ratón), solo cerca de la luz.
  float dst = dust(p + uMouse * 0.012, 34.0, 0.0) + 0.6 * dust(p + uMouse * 0.024, 21.0, 1.0);
  bg += ACCENT_SOFT * 0.45 * dst * (pool * 0.8 + poolWide * 0.2);

  // ── Metal líquido ──────────────────────────────────────────────────────────
  float e = 1.0 / uRes.y;
  vec2 g = vec2(sceneD(p + vec2(e, 0.0)) - d, sceneD(p + vec2(0.0, e)) - d);
  g /= max(length(g), 1e-6);
  float rr = max(r, 1e-4);
  float c = clamp(1.0 + d / rr, 0.0, 1.0); // 0 eje, 1 borde
  vec3 n = normalize(vec3(g * c, sqrt(max(1.0 - c * c, 0.0))));
  // Micro-ondulación de la superficie a lo largo del flujo.
  float ripple = sin(mix(tB, tA, h) * 46.0 - uTime * 1.4) * 0.025 * (1.0 - c);
  n = normalize(n + vec3(vec2(-g.y, g.x) * ripple, 0.0));

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 R = reflect(-V, n);
  vec3 F0 = vec3(0.62, 0.42, 0.30);
  float fres = pow(1.0 - n.z, 4.0);
  vec3 F = F0 + (1.0 - F0) * fres;
  float light = 0.03 + 0.97 * (0.8 * pool + 0.2 * poolWide);
  vec3 metal = env(R, uMouse) * F * light;
  // Borde: recoge el resplandor que hay detrás (separa la silueta del fondo).
  metal += ACCENT * 0.10 * fres * (pool + 0.15 * poolWide);

  // Brillo especular del puntero (una lámpara que sigue al ratón).
  vec3 Lp = normalize(vec3(uPointer - p, 0.45));
  vec3 Hp = normalize(Lp + V);
  float spec = pow(max(dot(n, Hp), 0.0), 110.0);
  float pf = exp(-dot(uPointer - p, uPointer - p) / 0.08);
  metal += WARM_WHITE * 1.1 * spec * (0.2 + 0.8 * pf) * (0.25 + 0.75 * light);
  metal += ACCENT_DEEP * 0.35 * max(dot(n, Lp), 0.0) * pf;

  // Energía dentro del metal (subsuperficie): más intensa en el eje del tubo.
  float core = pulse * (0.25 + 0.75 * n.z) * (0.3 + 0.7 * poolWide);
  float tipGlow = exp(-pow((tA - 1.0) / 0.14, 2.0)) * h + exp(-pow((tB - 1.0) / 0.14, 2.0)) * (1.0 - h);
  metal += mix(ACCENT, ACCENT_SOFT, 0.25 * n.z) * (0.95 * core + 0.12 * tipGlow * (0.3 + uSpark + 2.0 * uFlash));

  float cover = smoothstep(px, -px, d);
  vec3 lin = mix(bg, metal, cover);

  // Entrada.
  lin *= uIntro;

  vec3 c1 = pow(aces(lin * 1.2), vec3(1.0 / 2.2));
  vec3 outc = 1.0 - (1.0 - BG_SRGB) * (1.0 - c1);
  outc += (hash12(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0;
  gl_FragColor = vec4(outc, 1.0);
}
`;
