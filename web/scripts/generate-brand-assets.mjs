/**
 * Genera los recursos gráficos de marca a partir de código (sin descargas):
 *
 *   public/favicon.svg            favicon vectorial (navegadores modernos)
 *   public/favicon.ico            32 px dentro de un .ico (navegadores antiguos / crawlers)
 *   public/favicon-32x32.png      32 px
 *   public/apple-touch-icon.png   180 px (iOS, sin esquinas redondeadas: iOS las pone)
 *   public/icon-192.png           192 px (manifest)
 *   public/icon-512.png           512 px (manifest y logo del JSON-LD)
 *   public/site.webmanifest       manifest mínimo
 *   src/assets/textures/grain.png mosaico de grano para el fondo (global.css)
 *
 * Uso:  npm run assets:brand
 * Requiere `sharp` (devDependency). Se puede volver a ejecutar sin problema.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => resolve(root, 'public', p);

const BG = '#0B0A09';
const TEXT = '#F2EEE8';
const ACCENT = '#FF6B2C';

/**
 * Marca "R + testigo": una R geométrica de trazo y un punto naranja que toca el
 * extremo de su pierna — el testigo que se pasa (mismo detalle que el logotipo).
 * Dibujada con trazos (no depende de ninguna fuente instalada).
 */
function markSvg({ rounded = true, padding = 0 } = {}) {
  const s = 64 + padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padding} ${-padding} ${s} ${s}" width="${s}" height="${s}">
  <rect x="${-padding}" y="${-padding}" width="${s}" height="${s}" ${rounded ? 'rx="14"' : ''} fill="${BG}"/>
  <path d="M14 49L28.5 15L43 49M19.6 38h17.8" fill="none" stroke="${TEXT}" stroke-width="7"/>
  <circle cx="50.4" cy="45.6" r="4.6" fill="${ACCENT}"/>
</svg>
`;
}

async function png(svg, size, file) {
  const buf = await sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, buf);
  return buf;
}

/** Envuelve un PNG en un contenedor .ico (formato permitido desde Windows Vista). */
function icoFromPng(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: icono
  header.writeUInt16LE(1, 4); // nº de imágenes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // paleta
  entry.writeUInt8(0, 3); // reservado
  entry.writeUInt16LE(1, 4); // planos
  entry.writeUInt16LE(32, 6); // bits por píxel
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset
  return Buffer.concat([header, entry, pngBuf]);
}

/**
 * Grano: mosaico de 160×160 con píxeles blancos y negros de opacidad aleatoria,
 * de modo que el tono medio del fondo apenas cambia. Se cuantiza a 16 colores
 * para que pese pocos KB. Determinista (semilla fija) para builds reproducibles.
 */
async function grain(file, size = 160) {
  let seed = 0x5eed1234;
  const rand = () => {
    // mulberry32
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const light = rand() > 0.5 ? 255 : 0;
    data[i * 4] = light;
    data[i * 4 + 1] = light;
    data[i * 4 + 2] = light;
    data[i * 4 + 3] = Math.round(rand() ** 1.6 * 255);
  }
  await mkdir(dirname(file), { recursive: true });
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colors: 16, compressionLevel: 9, effort: 10 })
    .toFile(file);
}

await mkdir(pub(''), { recursive: true });

const svg = markSvg();
await writeFile(pub('favicon.svg'), svg);
const png32 = await png(svg, 32, pub('favicon-32x32.png'));
await writeFile(pub('favicon.ico'), icoFromPng(png32, 32));
// iOS redondea las esquinas por su cuenta: icono cuadrado y sin transparencia.
await png(markSvg({ rounded: false }), 180, pub('apple-touch-icon.png'));
await png(svg, 192, pub('icon-192.png'));
await png(svg, 512, pub('icon-512.png'));

await writeFile(
  pub('site.webmanifest'),
  JSON.stringify(
    {
      name: 'Ahlan IA',
      short_name: 'Ahlan IA',
      start_url: '/',
      display: 'browser',
      background_color: BG,
      theme_color: BG,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  ) + '\n',
);

await grain(resolve(root, 'src/assets/textures/grain.png'));

console.log('✔ Recursos de marca generados (favicons, manifest y grano).');
