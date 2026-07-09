#!/usr/bin/env node
/**
 * Genera i PNG statici dei pallini mappa (assets/map/dots/) usati da MapPin
 * via prop `image` di react-native-maps — il percorso di rendering che NON
 * passa dalla cattura bitmap della view (niente spicchi/settling/flicker).
 *
 * Replica la geometria dei vecchi pallini-view di MapPin (dotMarker/dotMuted),
 * in DUE taglie (rampa: pallini più grandi nella fascia zoom vicina alla soglia
 * pin, così il salto pallino→pin è più morbido):
 *  - sm  normale: 10pt Ø incluso bordo 1.5pt / muted 7pt Ø bordo 1pt — canvas 18pt
 *  - lg  normale: 14pt Ø incluso bordo 2pt   / muted 10pt Ø bordo 1.25pt — canvas 22pt
 * Muted: alpha 0.7, senza ombra. Canvas simmetrico (anchor centro = coordinate
 * precise; il canvas è anche il tap target).
 *
 * Colori replicati da constants/theme.ts (light/dark divergono su green/gray/
 * primary): aggiornare QUI e rilanciare lo script se cambiano i token tema.
 *
 * Uso: node scripts/generate-map-dots.js
 * Output: 5 varianti × 2 temi × 2 taglie × 3 scale = 60 file
 * (taglia sm senza suffisso, lg con suffisso `-lg`).
 * Nessuna dipendenza: rasterizzatore supersampled + encoder PNG a mano.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'map', 'dots');

const SCALES = [1, 2, 3];
const SUPERSAMPLE = 8; // 8×8 subsample per pixel (antialiasing)

const BORDER = '#FFFFFF'; // theme.colors.onPrimary (uguale nei due temi)
const SHADOW_ALPHA = 0.2; // parità con shadowOpacity iOS dei pallini-view

// variante → colore fill per tema (da constants/theme.ts)
const THEMES = {
  light: {
    green: '#2E7D32', // success
    amber: '#F9A825', // coverageMedium
    gray: '#999999', // textDisabled
    primary: '#4CAF50', // primary
    muted: '#999999', // textDisabled (variante recessa)
  },
  dark: {
    green: '#66BB6A',
    amber: '#F9A825',
    gray: '#5F6368',
    primary: '#66BB6A',
    muted: '#5F6368',
  },
};

// geometria in pt: outerR include il bordo (come width/borderWidth delle view)
const SIZES = {
  sm: {
    canvas: 18,
    suffix: '',
    normal: { outerR: 5, borderW: 1.5, alpha: 1, shadow: true },
    muted: { outerR: 3.5, borderW: 1, alpha: 0.7, shadow: false },
  },
  lg: {
    canvas: 22,
    suffix: '-lg',
    normal: { outerR: 7, borderW: 2, alpha: 1, shadow: true },
    muted: { outerR: 5, borderW: 1.25, alpha: 0.7, shadow: false },
  },
};

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

/** Rasterizza un pallino su canvas RGBA (Float, premoltiplicato). */
function renderDot(sizePx, scale, fillHex, geo) {
  const { outerR, borderW, alpha, shadow } = geo;
  const cx = sizePx / 2;
  const cy = sizePx / 2;
  const rOuter = outerR * scale;
  const rFill = (outerR - borderW) * scale;
  const shadowDy = 0.5 * scale;
  const shadowBlur = 1.2 * scale;
  const fill = hexToRgb(fillHex);
  const border = hexToRgb(BORDER);

  const px = new Float64Array(sizePx * sizePx * 4);
  const step = 1 / SUPERSAMPLE;
  const half = step / 2;

  for (let y = 0; y < sizePx; y++) {
    for (let x = 0; x < sizePx; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const fx = x + sx * step + half - cx;
          const fy = y + sy * step + half - cy;
          const d = Math.hypot(fx, fy);
          // layer 1: ombra (sotto, offset verticale, falloff lineare)
          let sr = 0, sg = 0, sb = 0, sa = 0;
          if (shadow) {
            const ds = Math.hypot(fx, fy - shadowDy);
            if (ds < rOuter + shadowBlur) {
              const t = Math.max(0, Math.min(1, (rOuter + shadowBlur - ds) / shadowBlur));
              sa = SHADOW_ALPHA * t;
            }
          }
          // layer 2: disco bordo, layer 3: disco fill (source-over binario:
          // l'antialiasing lo fa il supersampling 8×8)
          let cr = sr, cg = sg, cb = sb, ca = sa;
          if (d <= rOuter) {
            const src = d <= rFill ? fill : border;
            cr = src[0]; cg = src[1]; cb = src[2]; ca = 1;
          }
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
        }
      }
      const n = SUPERSAMPLE * SUPERSAMPLE;
      const i = (y * sizePx + x) * 4;
      const A = (a / n) * alpha;
      px[i] = A > 0 ? (r / n) * alpha / A : 0; // de-premultiply
      px[i + 1] = A > 0 ? (g / n) * alpha / A : 0;
      px[i + 2] = A > 0 ? (b / n) * alpha / A : 0;
      px[i + 3] = A;
    }
  }
  return px;
}

// ── Encoder PNG minimale (RGBA 8-bit, filtro 0) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, sizePx) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(sizePx, 0);
  ihdr.writeUInt32BE(sizePx, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(sizePx * (sizePx * 4 + 1));
  for (let y = 0; y < sizePx; y++) {
    const row = y * (sizePx * 4 + 1);
    raw[row] = 0; // filtro none
    for (let x = 0; x < sizePx; x++) {
      const i = (y * sizePx + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        raw[row + 1 + x * 4 + ch] = Math.round(Math.max(0, Math.min(1, px[i + ch])) * 255);
      }
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
let count = 0;
for (const [, size] of Object.entries(SIZES)) {
  for (const [themeName, variants] of Object.entries(THEMES)) {
    for (const [variant, fillHex] of Object.entries(variants)) {
      const geo = variant === 'muted' ? size.muted : size.normal;
      for (const scale of SCALES) {
        const sizePx = size.canvas * scale;
        const png = encodePng(renderDot(sizePx, scale, fillHex, geo), sizePx);
        const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
        const file = path.join(OUT_DIR, `dot-${variant}-${themeName}${size.suffix}${scaleSuffix}.png`);
        fs.writeFileSync(file, png);
        count++;
      }
    }
  }
}
console.log(`Generati ${count} PNG in ${path.relative(process.cwd(), OUT_DIR)}`);
