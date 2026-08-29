#!/usr/bin/env node
/**
 * Genera le icone e le schermate di avvio del portale partner (partner/public/).
 *
 * Sorgente unica: assets/icons/logo/plate-forks.png — la mascotte con le posate.
 * È deliberatamente DIVERSA dall'icona dell'app (assets/icon.png): un ristoratore
 * che ha installato anche l'app del cliente deve distinguere le due icone in
 * home senza leggere il nome.
 *
 * Cosa produce:
 *  - icone 32/192/512 + apple-touch-icon 180: mascotte al 78% del riquadro
 *    (la 32 più piena, altrimenti a quella dimensione è illeggibile)
 *  - icona maskable 512: mascotte al 62%, perché i launcher Android ritagliano
 *    un cerchio più stretto della "safe zone" all'80% che si cita di solito —
 *    verificato simulando la maschera, all'80% le posate venivano tagliate
 *  - schermate di avvio iOS: fondo beige e mascotte centrata, la stessa
 *    costruzione dello splash dell'app (app.config.ts, expo-splash-screen)
 *
 * Il fondo è sempre #F7DCB3, il beige dello splash dell'app: così il ritaglio
 * dei launcher non si vede mai e l'avvio è coerente con l'app.
 *
 * Sulle schermate di avvio la mascotte NON viene mai ridimensionata: resta ai
 * suoi 400px nativi. Così è sempre nitida e, soprattutto, l'immagine non
 * guadagna colori nuovi — resta entro i 256 del sorgente e il PNG si scrive
 * indicizzato invece che a colore pieno. Sedici schermate passano da 3,1 MB a
 * poche centinaia di KB, con lo stesso identico risultato a schermo.
 *
 * Nessuna dipendenza, come scripts/generate-map-dots.js: decoder PNG (palette
 * con tRNS e truecolor), ricampionamento e encoder scritti qui.
 *
 * Uso: node partner/scripts/generate-pwa-assets.mjs
 * Stampa anche l'array `startupImage` da incollare in src/app/layout.tsx.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const SRC = path.join(ROOT, 'assets', 'icons', 'logo', 'plate-forks.png');
const OUT = path.join(HERE, '..', 'public');
const BEIGE = [247, 220, 179]; // #F7DCB3, lo stesso di app.config.ts

// ---------------------------------------------------------------- decodifica

/** I blocchi del PNG raggruppati per tipo, in un passaggio solo: IDAT può
 *  essere spezzato in più blocchi, PLTE e tRNS ce n'è al massimo uno. */
function chunks(buf) {
  const out = new Map();
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('ascii', o + 4, o + 8);
    if (!out.has(type)) out.set(type, []);
    out.get(type).push(buf.subarray(o + 8, o + 8 + len));
    if (type === 'IEND') break;
    o += 12 + len;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** PNG 8 bit non interlacciato, color type 2 (RGB), 3 (palette) o 6 (RGBA). */
function decodePng(file) {
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const depth = buf[24];
  const color = buf[25];
  if (depth !== 8 || buf[28] !== 0) throw new Error(`${file}: serve 8 bit non interlacciato`);
  const channels = color === 3 ? 1 : color === 2 ? 3 : color === 6 ? 4 : 0;
  if (!channels) throw new Error(`${file}: color type ${color} non gestito`);

  const blocchi = chunks(buf);
  const raw = zlib.inflateSync(Buffer.concat(blocchi.get('IDAT')));
  const stride = w * channels;
  const rows = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const off = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? rows[off + x - channels] : 0;
      const b = y > 0 ? rows[off - stride + x] : 0;
      const c = x >= channels && y > 0 ? rows[off - stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      rows[off + x] = v & 0xff;
    }
  }

  // tutto in RGBA, così il resto del programma non sa più di palette
  const out = new Uint8Array(w * h * 4);
  const plte = blocchi.get('PLTE')?.[0];
  const trns = blocchi.get('tRNS')?.[0];
  for (let i = 0; i < w * h; i++) {
    if (color === 3) {
      const idx = rows[i];
      out[i * 4] = plte[idx * 3];
      out[i * 4 + 1] = plte[idx * 3 + 1];
      out[i * 4 + 2] = plte[idx * 3 + 2];
      out[i * 4 + 3] = trns && idx < trns.length ? trns[idx] : 255;
    } else {
      out[i * 4] = rows[i * channels];
      out[i * 4 + 1] = rows[i * channels + 1];
      out[i * 4 + 2] = rows[i * channels + 2];
      out[i * 4 + 3] = channels === 4 ? rows[i * channels + 3] : 255;
    }
  }
  return { w, h, data: out };
}

// ------------------------------------------------------------ ricampionamento

/** Media d'area, con alpha premoltiplicata: senza, i pixel trasparenti
 *  sporcherebbero di scuro il contorno della mascotte.
 *
 *  Riduce soltanto, e ingrandire è un errore dichiarato invece che una
 *  sfocatura silenziosa: ingrandendo nascono colori nuovi, l'immagine esce dai
 *  256 del sorgente e il PNG torna a colore pieno — le schermate di avvio
 *  quadruplicherebbero di peso senza che nessuno se ne accorga. */
function resample(img, nw, nh) {
  const { w, h, data } = img;
  if (nw === w && nh === h) return img; // niente ricampionamento, niente colori nuovi
  if (nw > w || nh > h) {
    throw new Error(
      `richiesto un ingrandimento (${w}×${h} → ${nw}×${nh}): non si fa, ` +
        `perderebbe la tavolozza indicizzata. Serve un sorgente più grande.`
    );
  }
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx0 = (x * w) / nw, sx1 = ((x + 1) * w) / nw;
      const sy0 = (y * h) / nh, sy1 = ((y + 1) * h) / nh;
      let r = 0, g = 0, b = 0, a = 0, tot = 0;
      for (let py = Math.floor(sy0); py < Math.ceil(sy1); py++) {
        const cy = Math.min(sy1, py + 1) - Math.max(sy0, py);
        for (let px = Math.floor(sx0); px < Math.ceil(sx1); px++) {
          const wgt = (Math.min(sx1, px + 1) - Math.max(sx0, px)) * cy;
          const i = (py * w + px) * 4;
          const al = data[i + 3] / 255;
          r += data[i] * al * wgt; g += data[i + 1] * al * wgt; b += data[i + 2] * al * wgt;
          a += data[i + 3] * wgt; tot += wgt;
        }
      }
      if (tot > 0) { r /= tot; g /= tot; b /= tot; a /= tot; }
      const i = (y * nw + x) * 4;
      const al = a / 255;
      out[i] = al > 0 ? Math.round(r / al) : 0;
      out[i + 1] = al > 0 ? Math.round(g / al) : 0;
      out[i + 2] = al > 0 ? Math.round(b / al) : 0;
      out[i + 3] = Math.round(a);
    }
  }
  return { w: nw, h: nh, data: out };
}

/** Mascotte centrata su fondo pieno. Il risultato è opaco: l'alpha su
 *  apple-touch-icon iOS la riempirebbe di nero. */
function onBeige(logo, w, h) {
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = BEIGE[0]; rgb[i * 3 + 1] = BEIGE[1]; rgb[i * 3 + 2] = BEIGE[2];
  }
  const ox = Math.round((w - logo.w) / 2);
  const oy = Math.round((h - logo.h) / 2);
  for (let y = 0; y < logo.h; y++) {
    for (let x = 0; x < logo.w; x++) {
      const s = (y * logo.w + x) * 4;
      const al = logo.data[s + 3] / 255;
      if (al === 0) continue;
      const d = ((y + oy) * w + (x + ox)) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[d + c] = Math.round(logo.data[s + c] * al + rgb[d + c] * (1 - al));
      }
    }
  }
  return { w, h, rgb };
}

// ------------------------------------------------------------------ encoder

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Tavolozza dell'immagine, o null se i colori sono più di 256. */
function palette({ w, h, rgb }) {
  const index = new Map();
  const idx = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const key = (rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2];
    let v = index.get(key);
    if (v === undefined) {
      if (index.size === 256) return null;
      v = index.size;
      index.set(key, v);
    }
    idx[i] = v;
  }
  return { idx, colors: [...index.keys()] };
}

/** PNG indicizzato: la mascotte non ridimensionata resta entro i 256 colori
 *  del sorgente, e una schermata di avvio quasi tutta beige così pesa un decimo. */
function encodeIndexed({ w, h }, { idx, colors }) {
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    const o = y * (w + 1);
    raw[o] = y === 0 ? 0 : 2;
    for (let x = 0; x < w; x++) {
      const v = idx[y * w + x];
      raw[o + 1 + x] = y === 0 ? v : (v - idx[(y - 1) * w + x]) & 0xff;
    }
  }
  const plte = Buffer.alloc(colors.length * 3);
  colors.forEach((c, i) => {
    plte[i * 3] = (c >> 16) & 0xff; plte[i * 3 + 1] = (c >> 8) & 0xff; plte[i * 3 + 2] = c & 0xff;
  });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 3; // 8 bit, indicizzato
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('PLTE', plte),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodePng(img) {
  const pal = palette(img);
  if (pal) return encodeIndexed(img, pal);
  const { w, h, rgb } = img;
  const stride = w * 3;
  // filtro Up: sulle fasce di colore piatto le righe diventano zeri, e il
  // beige di una schermata di avvio è quasi tutto colore piatto
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1);
    raw[o] = y === 0 ? 0 : 2;
    for (let x = 0; x < stride; x++) {
      const v = rgb[y * stride + x];
      raw[o + 1 + x] = y === 0 ? v : (v - rgb[(y - 1) * stride + x]) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bit, truecolor senza alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------------- corpo

// Schermate di avvio: iPhone e iPad in verticale. Dove non c'è corrispondenza
// iOS mostra una schermata piena del colore di fondo — cioè quello che si
// vedeva prima di questo script, quindi una copertura parziale non peggiora nulla.
const SPLASH = [
  [375, 667, 2, 'iPhone SE / 8'],
  [375, 812, 3, 'iPhone X / XS / 11 Pro / 12-13 mini'],
  [390, 844, 3, 'iPhone 12 / 13 / 14 / 16e'],
  [393, 852, 3, 'iPhone 14 Pro / 15 / 16'],
  [402, 874, 3, 'iPhone 16 Pro'],
  [414, 896, 2, 'iPhone XR / 11'],
  [414, 896, 3, 'iPhone XS Max / 11 Pro Max'],
  [428, 926, 3, 'iPhone 12-13 Pro Max / 14 Plus'],
  [430, 932, 3, 'iPhone 14-15 Pro Max / 16 Plus'],
  [440, 956, 3, 'iPhone 16 Pro Max'],
  [744, 1133, 2, 'iPad mini 6'],
  [768, 1024, 2, 'iPad 9.7'],
  [810, 1080, 2, 'iPad 10.2'],
  [820, 1180, 2, 'iPad Air 10.9 / iPad 10'],
  [834, 1194, 2, 'iPad Pro 11'],
  [1024, 1366, 2, 'iPad Pro 12.9'],
];

const ICONS = [
  ['icons/icon-32.png', 32, 0.88],
  ['icons/icon-192.png', 192, 0.78],
  ['icons/icon-512.png', 512, 400 / 512],
  ['icons/icon-maskable-512.png', 512, 0.62],
  ['apple-touch-icon.png', 180, 0.78],
];

function write(rel, buf) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return `${rel} — ${(buf.length / 1024).toFixed(1)} KB`;
}

const logo = decodePng(SRC);
console.log(`sorgente: ${path.relative(ROOT, SRC)} (${logo.w}×${logo.h})\n`);

console.log('icone');
for (const [rel, size, frac] of ICONS) {
  const side = Math.round(size * frac);
  console.log('  ' + write(rel, encodePng(onBeige(resample(logo, side, side), size, size))));
}

console.log('\nschermate di avvio');
const links = [];
let totale = 0;
for (const [cw, ch, dpr, nome] of SPLASH) {
  const w = cw * dpr;
  const h = ch * dpr;
  const side = logo.w; // mai ridimensionata: nitida, e il PNG resta indicizzato
  const rel = `splash/${w}x${h}.png`;
  const buf = encodePng(onBeige(resample(logo, side, side), w, h));
  totale += buf.length;
  console.log(`  ${write(rel, buf)}  (${nome})`);
  links.push(
    `  {\n` +
    `    url: '/${rel}',\n` +
    `    media:\n` +
    `      '(device-width: ${cw}px) and (device-height: ${ch}px) and ` +
    `(-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)',\n` +
    `  },`
  );
}
console.log(`\ntotale schermate di avvio: ${(totale / 1024).toFixed(0)} KB`);
console.log('\n--- da incollare in src/app/layout.tsx (appleWebApp.startupImage) ---');
console.log('[\n' + links.join('\n') + '\n]');
