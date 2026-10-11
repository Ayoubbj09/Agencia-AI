/**
 * Genera la imagen para compartir en redes y WhatsApp: public/og.png
 * (PNG 1200 × 630, < 300 KB, tipográfica, spec §10).
 *
 *   npm run assets:og
 *
 * Qué hace:
 *   1. Toma las MISMAS fuentes que usa la web (Fontsource, ya instaladas en
 *      node_modules): Inter Tight (variable) e Instrument Serif cursiva.
 *   2. Las convierte de WOFF2 a TTF en una carpeta temporal (sharp/librsvg no
 *      leen WOFF2) y crea un fontconfig temporal que solo ve esas fuentes.
 *   3. Dibuja la composición en SVG y la rasteriza con sharp (librsvg + Pango:
 *      interletraje y pesos reales de la fuente, no una imitación).
 *   4. Comprueba que el texto ha salido con las fuentes de verdad (si no, se
 *      para SIN tocar public/og.png) y que el PNG pesa menos de 300 KB.
 *
 * Sin dependencias nuevas: solo sharp (ya en devDependencies) y node:zlib.
 * Para cambiar la frase, edita PHRASE más abajo y vuelve a ejecutar el script.
 */
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { brotliDecompressSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'package.json'));
const OUT = join(ROOT, 'public', 'og.png');

/* ─── Contenido y diseño ────────────────────────────────────────────────── */

const W = 1200;
const H = 630;
const PAD = 76; // margen exterior

// Tokens de src/styles/tokens.css (la imagen no puede leer CSS).
const C = {
  bg: '#0B0A09',
  text: '#F2EEE8',
  muted: '#9A9189',
  accent: '#FF6B2C',
  line: 'rgba(242,238,232,0.14)',
};

const EYEBROW = 'AGENTES DE IA PARA WHATSAPP';
// La frase: el concepto del nombre (spec §1). Sin cifras ni promesas.
const PHRASE = [
  { text: 'IA que trabaja,', serif: false },
  { text: 'personas que deciden.', serif: true },
];
const FOOTNOTE = 'Empezamos por las inmobiliarias.';

const FAMILY_SANS = 'Inter Tight';
const FAMILY_SERIF = 'Instrument Serif';

const FONT_FILES = [
  '@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2',
  '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
  '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
];

/* ─── WOFF2 → TTF (especificación W3C WOFF2, sin dependencias) ──────────── */

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca',
  'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

/** Lector secuencial big-endian sobre un Buffer. */
class Reader {
  constructor(buf, pos = 0) {
    this.buf = buf;
    this.pos = pos;
  }
  u8() {
    return this.buf.readUInt8(this.pos++);
  }
  u16() {
    const v = this.buf.readUInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  i16() {
    const v = this.buf.readInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.buf.readUInt32BE(this.pos);
    this.pos += 4;
    return v;
  }
  bytes(n) {
    const v = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
  tag() {
    return this.bytes(4).toString('latin1');
  }
  base128() {
    let acc = 0;
    for (let i = 0; i < 5; i++) {
      const b = this.u8();
      acc = acc * 128 + (b & 0x7f);
      if (!(b & 0x80)) return acc;
    }
    throw new Error('UIntBase128 inválido');
  }
  u255() {
    const code = this.u8();
    if (code === 253) return this.u16();
    if (code === 255) return this.u8() + 253;
    if (code === 254) return this.u8() + 253 * 2;
    return code;
  }
  sub(n) {
    return new Reader(this.bytes(n));
  }
}

/** Puntos de un glifo simple a partir del codificado "triplet" de WOFF2. */
function decodeTriplets(flags, glyphs, nPoints) {
  const pts = [];
  let x = 0;
  let y = 0;
  const sign = (f, v) => (f & 1 ? v : -v);
  for (let i = 0; i < nPoints; i++) {
    let flag = flags.u8();
    const onCurve = !(flag >> 7);
    flag &= 0x7f;
    let dx;
    let dy;
    if (flag < 10) {
      dx = 0;
      dy = sign(flag, ((flag & 14) << 7) + glyphs.u8());
    } else if (flag < 20) {
      dx = sign(flag, (((flag - 10) & 14) << 7) + glyphs.u8());
      dy = 0;
    } else if (flag < 84) {
      const b0 = flag - 20;
      const b1 = glyphs.u8();
      dx = sign(flag, 1 + (b0 & 0x30) + (b1 >> 4));
      dy = sign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f));
    } else if (flag < 120) {
      const b0 = flag - 84;
      dx = sign(flag, 1 + (Math.floor(b0 / 12) << 8) + glyphs.u8());
      dy = sign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + glyphs.u8());
    } else if (flag < 124) {
      const b1 = glyphs.u8();
      const b2 = glyphs.u8();
      const b3 = glyphs.u8();
      dx = sign(flag, (b1 << 4) + (b2 >> 4));
      dy = sign(flag >> 1, ((b2 & 0x0f) << 8) + b3);
    } else {
      const b1 = glyphs.u8();
      const b2 = glyphs.u8();
      const b3 = glyphs.u8();
      const b4 = glyphs.u8();
      dx = sign(flag, (b1 << 8) + b2);
      dy = sign(flag >> 1, (b3 << 8) + b4);
    }
    x += dx;
    y += dy;
    pts.push({ x, y, onCurve });
  }
  return pts;
}

/** Reconstruye glyf + loca (formato largo) desde la tabla glyf transformada. */
function rebuildGlyf(data) {
  const r = new Reader(data);
  r.u16(); // version
  const optionFlags = r.u16();
  const numGlyphs = r.u16();
  r.u16(); // indexFormat original (escribimos siempre loca larga)
  const sizes = Array.from({ length: 7 }, () => r.u32());
  const [nContourS, nPointsS, flagS, glyphS, compositeS, bboxS, instrS] = sizes.map((n) => r.sub(n));
  const overlap = optionFlags & 1 ? r.bytes((numGlyphs + 7) >> 3) : null;
  const bboxBitmap = bboxS.bytes(((numGlyphs + 31) >> 5) << 2);
  const hasBbox = (i) => bboxBitmap[i >> 3] & (0x80 >> (i & 7));

  const parts = [];
  const loca = [0];
  const xMins = new Array(numGlyphs).fill(0);
  let offset = 0;

  for (let i = 0; i < numGlyphs; i++) {
    const nContours = nContourS.i16();
    let glyph = Buffer.alloc(0);

    if (nContours > 0) {
      const endPts = [];
      let total = 0;
      for (let c = 0; c < nContours; c++) {
        total += nPointsS.u255();
        endPts.push(total - 1);
      }
      const pts = decodeTriplets(flagS, glyphS, total);
      const instrLen = glyphS.u255();
      const instr = instrS.bytes(instrLen);
      let bbox;
      if (hasBbox(i)) bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
      else {
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      }
      xMins[i] = bbox[0];
      const overlapFlag = overlap && overlap[i >> 3] & (0x80 >> (i & 7)) ? 0x40 : 0;
      // Banderas y coordenadas sin comprimir (delta de 16 bits): más grande, igual de válido.
      glyph = Buffer.alloc(10 + nContours * 2 + 2 + instrLen + total * 5);
      let p = 0;
      p = glyph.writeInt16BE(nContours, p);
      for (const v of bbox) p = glyph.writeInt16BE(v, p);
      for (const e of endPts) p = glyph.writeUInt16BE(e, p);
      p = glyph.writeUInt16BE(instrLen, p);
      instr.copy(glyph, p);
      p += instrLen;
      pts.forEach((pt, k) => {
        p = glyph.writeUInt8((pt.onCurve ? 1 : 0) | (k === 0 ? overlapFlag : 0), p);
      });
      let prev = 0;
      for (const pt of pts) {
        p = glyph.writeInt16BE(pt.x - prev, p);
        prev = pt.x;
      }
      prev = 0;
      for (const pt of pts) {
        p = glyph.writeInt16BE(pt.y - prev, p);
        prev = pt.y;
      }
    } else if (nContours < 0) {
      // Compuesto: los componentes se copian tal cual desde compositeStream.
      const start = compositeS.pos;
      let flags;
      let haveInstr = false;
      do {
        flags = compositeS.u16();
        compositeS.u16(); // glyphIndex
        compositeS.pos += flags & 0x0001 ? 4 : 2;
        if (flags & 0x0008) compositeS.pos += 2;
        else if (flags & 0x0040) compositeS.pos += 4;
        else if (flags & 0x0080) compositeS.pos += 8;
        if (flags & 0x0100) haveInstr = true;
      } while (flags & 0x0020);
      const comp = compositeS.buf.subarray(start, compositeS.pos);
      const bbox = [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];
      xMins[i] = bbox[0];
      let instrPart = Buffer.alloc(0);
      if (haveInstr) {
        const n = glyphS.u255();
        instrPart = Buffer.alloc(2 + n);
        instrPart.writeUInt16BE(n, 0);
        instrS.bytes(n).copy(instrPart, 2);
      }
      const head = Buffer.alloc(10);
      head.writeInt16BE(-1, 0);
      bbox.forEach((v, k) => head.writeInt16BE(v, 2 + k * 2));
      glyph = Buffer.concat([head, comp, instrPart]);
    }

    const padded = Buffer.alloc((glyph.length + 3) & ~3);
    glyph.copy(padded);
    parts.push(padded);
    offset += padded.length;
    loca.push(offset);
  }

  const locaBuf = Buffer.alloc(loca.length * 4);
  loca.forEach((v, k) => locaBuf.writeUInt32BE(v, k * 4));
  return { glyf: Buffer.concat(parts), loca: locaBuf, numGlyphs, xMins };
}

/** hmtx transformada (versión 1): los lsb que faltan son el xMin de cada glifo. */
function rebuildHmtx(data, numHMetrics, numGlyphs, xMins) {
  const r = new Reader(data);
  const flags = r.u8();
  const aw = Array.from({ length: numHMetrics }, () => r.u16());
  const lsb = Array.from({ length: numHMetrics }, (_, i) => (flags & 1 ? xMins[i] : r.i16()));
  const lsbRest = Array.from({ length: numGlyphs - numHMetrics }, (_, i) =>
    flags & 2 ? xMins[numHMetrics + i] : r.i16(),
  );
  const out = Buffer.alloc(numHMetrics * 4 + lsbRest.length * 2);
  let p = 0;
  for (let i = 0; i < numHMetrics; i++) {
    p = out.writeUInt16BE(aw[i], p);
    p = out.writeInt16BE(lsb[i], p);
  }
  for (const v of lsbRest) p = out.writeInt16BE(v, p);
  return out;
}

function checksum(buf) {
  let sum = 0;
  const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

/** Ensambla un sfnt (TTF) a partir de { tag: Buffer }. */
function buildSfnt(flavor, tables) {
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  const pow = 2 ** Math.floor(Math.log2(n));
  const headerLen = 12 + n * 16;
  const header = Buffer.alloc(headerLen);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(n, 4);
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(Math.log2(pow), 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);
  if (tables.head) tables.head.writeUInt32BE(0, 8); // checkSumAdjustment se calcula al final
  const body = [];
  let offset = headerLen;
  tags.forEach((tag, i) => {
    const data = tables[tag];
    const rec = 12 + i * 16;
    header.write(tag, rec, 4, 'latin1');
    header.writeUInt32BE(checksum(data), rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(data.length, rec + 12);
    const padded = Buffer.alloc((data.length + 3) & ~3);
    data.copy(padded);
    body.push(padded);
    offset += padded.length;
  });
  const font = Buffer.concat([header, ...body]);
  if (tables.head) {
    const headOffset = header.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
    font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headOffset + 8);
  }
  return font;
}

/** WOFF2 → TTF. Los TTF/OTF se devuelven tal cual. */
export function woff2ToSfnt(input) {
  const r = new Reader(input);
  const signature = r.tag();
  if (signature !== 'wOF2') return input;
  const flavor = r.u32();
  if (flavor === 0x74746366) throw new Error('Las colecciones WOFF2 (ttcf) no están soportadas');
  r.u32(); // length
  const numTables = r.u16();
  r.u16(); // reserved
  r.u32(); // totalSfntSize
  const totalCompressedSize = r.u32();
  r.pos = 48; // resto de la cabecera (versión, metadatos, datos privados)

  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = r.u8();
    const tag = (flags & 0x3f) === 63 ? r.tag() : KNOWN_TAGS[flags & 0x3f];
    const version = flags >> 6;
    const origLength = r.base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    const transformLength = transformed ? r.base128() : undefined;
    dir.push({ tag, origLength, transformed, length: transformed ? transformLength : origLength });
  }
  const data = brotliDecompressSync(r.bytes(totalCompressedSize));
  const raw = {};
  let pos = 0;
  for (const t of dir) {
    raw[t.tag] = { ...t, data: data.subarray(pos, pos + t.length) };
    pos += t.length;
  }

  const tables = {};
  for (const t of dir) tables[t.tag] = Buffer.from(raw[t.tag].data);

  if (raw.glyf?.transformed) {
    const { glyf, loca, numGlyphs, xMins } = rebuildGlyf(raw.glyf.data);
    tables.glyf = glyf;
    tables.loca = loca;
    tables.head.writeInt16BE(1, 50); // indexToLocFormat = loca larga
    if (raw.hmtx?.transformed) {
      const numHMetrics = tables.hhea.readUInt16BE(34);
      tables.hmtx = rebuildHmtx(raw.hmtx.data, numHMetrics, numGlyphs, xMins);
    }
  } else if (raw.hmtx?.transformed) {
    throw new Error('hmtx transformada sin glyf transformada: no soportado');
  }
  return buildSfnt(flavor, tables);
}

/* ─── Fuentes temporales + fontconfig ───────────────────────────────────── */

function prepareFonts() {
  const dir = mkdtempSync(join(tmpdir(), 'relevo-og-'));
  for (const spec of FONT_FILES) {
    const src = require.resolve(spec);
    const name = spec.split('/').pop().replace(/\.woff2?$/, '.ttf');
    writeFileSync(join(dir, name), woff2ToSfnt(readFileSync(src)));
  }
  // Solo estas fuentes: así, si algo falla, no se cuela una del sistema.
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${dir}</dir>
  <cachedir>${join(dir, 'cache')}</cachedir>
</fontconfig>
`;
  writeFileSync(join(dir, 'fonts.conf'), conf);
  return dir;
}

/* ─── SVG ───────────────────────────────────────────────────────────────── */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Caja de tinta de un fragmento SVG (renderizándolo y recortando el fondo). */
async function inkBox(sharp, fragment) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${fragment}</svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  return {
    left: -info.trimOffsetLeft,
    top: -info.trimOffsetTop,
    width: info.width,
    height: info.height,
    right: -info.trimOffsetLeft + info.width,
  };
}

async function compose(sharp) {
  // Logotipo: "Relevo" (Inter Tight 600, tracking -0.045em) + testigo naranja + "IA"
  // (Instrument Serif cursiva), como src/components/Logo.astro.
  const logoSize = 196;
  const logoBaseline = H - PAD - 6;
  const relevo = `<text x="${PAD - 6}" y="${logoBaseline}" font-family="${FAMILY_SANS}" font-weight="600" font-size="${logoSize}" letter-spacing="${(-0.045 * logoSize).toFixed(2)}" fill="${C.text}">Relevo</text>`;
  const relevoBox = await inkBox(sharp, relevo);
  const dotR = (0.2 * logoSize) / 2;
  const dotCx = relevoBox.right + 0.012 * logoSize + dotR;
  const dotCy = logoBaseline - 0.17 * logoSize - dotR;
  const iaX = dotCx + dotR + 0.13 * logoSize;
  const ia = `<text x="${iaX.toFixed(1)}" y="${logoBaseline}" font-family="${FAMILY_SERIF}" font-style="italic" font-size="${(logoSize * 1.08).toFixed(1)}" letter-spacing="${(0.01 * logoSize).toFixed(2)}" fill="${C.text}">IA</text>`;

  // Frase: sans + serif cursiva, alineada arriba a la izquierda.
  const phraseSize = 64;
  const phraseTop = PAD + 92;
  const phrase = PHRASE.map((l, i) => {
    const y = phraseTop + phraseSize * 0.82 + i * phraseSize * 1.06;
    return l.serif
      ? `<text x="${PAD - 2}" y="${y.toFixed(1)}" font-family="${FAMILY_SERIF}" font-style="italic" font-size="${(phraseSize * 1.1).toFixed(1)}" letter-spacing="-0.6" fill="${C.text}">${esc(l.text)}</text>`
      : `<text x="${PAD - 3}" y="${y.toFixed(1)}" font-family="${FAMILY_SANS}" font-weight="500" font-size="${phraseSize}" letter-spacing="${(-0.035 * phraseSize).toFixed(2)}" fill="${C.text}">${esc(l.text)}</text>`;
  }).join('\n  ');

  const eyebrowY = PAD + 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${W * 0.88}" cy="${H * 1.02}" r="${W * 0.62}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.accent}" stop-opacity="0.20"/>
      <stop offset="0.35" stop-color="${C.accent}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <circle cx="${PAD + 5}" cy="${eyebrowY - 5}" r="5" fill="${C.accent}"/>
  <text x="${PAD + 22}" y="${eyebrowY}" font-family="${FAMILY_SANS}" font-weight="500" font-size="17" letter-spacing="2.4" fill="${C.muted}">${esc(EYEBROW)}</text>
  <text x="${W - PAD}" y="${eyebrowY}" text-anchor="end" font-family="${FAMILY_SANS}" font-weight="400" font-size="19" letter-spacing="-0.2" fill="${C.muted}">${esc(FOOTNOTE)}</text>

  ${phrase}

  <line x1="${PAD}" y1="${logoBaseline - logoSize * 0.98}" x2="${W - PAD}" y2="${logoBaseline - logoSize * 0.98}" stroke="${C.line}" stroke-width="1"/>

  ${relevo}
  <circle cx="${dotCx.toFixed(1)}" cy="${dotCy.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${C.accent}"/>
  ${ia}
</svg>`;
  return svg;
}

/* ─── Comprobaciones ────────────────────────────────────────────────────── */

/**
 * Comprueba que librsvg dibuja con NUESTRAS fuentes:
 *  - sin fuente utilizable salen "cajas" (tofu) del mismo ancho para cualquier
 *    letra: "MMMMMM" y "IIIIII" medirían igual;
 *  - si solo cargase una de las dos familias, sans y serif pintarían igual.
 */
async function checkFonts(sharp) {
  const sample = (family, attrs, text) =>
    `<text x="20" y="200" font-family="${family}" ${attrs} font-size="72" fill="#fff">${text}</text>`;
  const sans = [FAMILY_SANS, 'font-weight="600"'];
  const serif = [FAMILY_SERIF, 'font-style="italic"'];
  for (const [family, attrs] of [sans, serif]) {
    const wide = await inkBox(sharp, sample(family, attrs, 'MMMMMM'));
    const narrow = await inkBox(sharp, sample(family, attrs, 'IIIIII'));
    if (!(wide.width > narrow.width * 1.8)) throw new Error(`"${family}" sale como cajas (tofu)`);
  }
  // Mismos atributos en las dos familias: si falta una, fontconfig la sustituye
  // por la otra y los dos dibujos coinciden.
  const a = await inkBox(sharp, sample(FAMILY_SANS, 'font-style="italic"', 'Relevo'));
  const b = await inkBox(sharp, sample(FAMILY_SERIF, 'font-style="italic"', 'Relevo'));
  if (a.width === b.width && a.height === b.height) {
    throw new Error('Inter Tight e Instrument Serif se dibujan igual: solo se ha cargado una fuente');
  }
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

const fontDir = prepareFonts();
process.env.FONTCONFIG_FILE = join(fontDir, 'fonts.conf');
// sharp se carga DESPUÉS de fijar FONTCONFIG_FILE (fontconfig lo lee al iniciarse).
const { default: sharp } = await import(require.resolve('sharp'));

try {
  await checkFonts(sharp);

  const svg = await compose(sharp);
  const png = await sharp(Buffer.from(svg))
    // Color verdadero (sin paleta): el degradado ámbar sale limpio, sin bandas (~90 KB).
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const meta = await sharp(png).metadata();
  if (meta.width !== W || meta.height !== H) throw new Error(`Tamaño inesperado: ${meta.width}×${meta.height}`);
  if (png.length >= 300 * 1024) throw new Error(`og.png pesa ${(png.length / 1024).toFixed(0)} KB (máx. 300 KB)`);
  writeFileSync(OUT, png);
  console.log(`✓ public/og.png · ${W}×${H} · ${(statSync(OUT).size / 1024).toFixed(1)} KB`);
} finally {
  rmSync(fontDir, { recursive: true, force: true });
}
