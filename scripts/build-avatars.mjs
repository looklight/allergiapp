#!/usr/bin/env node
/**
 * Genera gli avatar bundlati (400×400 PNG) a partire dai master 1024×1024
 * in _design/avatars/. Output in assets/avatars/.
 *
 * Uso:  npm run build:avatars
 *
 * Richiede `sips` (built-in su macOS). Salta i file già aggiornati.
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, '_design/avatars');
const OUT_DIR = join(ROOT, 'assets/avatars');
const TARGET_SIZE = 400;

if (!existsSync(SRC_DIR)) {
  console.error(`[build-avatars] Cartella sorgente mancante: ${SRC_DIR}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const masters = readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith('.png'));

if (masters.length === 0) {
  console.log('[build-avatars] Nessun master PNG trovato.');
  process.exit(0);
}

let built = 0;
let skipped = 0;

for (const file of masters) {
  const src = join(SRC_DIR, file);
  const dst = join(OUT_DIR, file);

  const srcMtime = statSync(src).mtimeMs;
  const dstMtime = existsSync(dst) ? statSync(dst).mtimeMs : 0;
  if (dstMtime >= srcMtime) {
    skipped += 1;
    continue;
  }

  execSync(
    `sips -Z ${TARGET_SIZE} "${src}" --out "${dst}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  built += 1;
  console.log(`  ✓ ${file}`);
}

console.log(`\n[build-avatars] ${built} generati, ${skipped} già aggiornati.`);

/**
 * Ottimizzazione lossless dei PNG con oxipng.
 *
 * È LOSSLESS: ricomprime lo stream DEFLATE senza toccare un solo pixel
 * (alpha incluso → trasparenza preservata, dark mode invariata). Idempotente:
 * rilanciarlo su file già ottimizzati è un no-op. Opzionale: se oxipng non è
 * installato il build NON si rompe, salta lo step con un avviso.
 *
 * Install una tantum: `brew install oxipng`
 */
const outFiles = readdirSync(OUT_DIR)
  .filter((f) => f.toLowerCase().endsWith('.png'))
  .map((f) => join(OUT_DIR, f));

const hasOxipng = spawnSync('oxipng', ['--version'], { stdio: 'ignore' }).status === 0;

if (!hasOxipng) {
  console.warn(
    '[build-avatars] oxipng non trovato — salto l\'ottimizzazione lossless. ' +
    'Installa con `brew install oxipng` per ridurre il peso del bundle.',
  );
} else if (outFiles.length > 0) {
  const sizeOf = (files) => files.reduce((s, f) => s + statSync(f).size, 0);
  const before = sizeOf(outFiles);
  // -o max: massima compressione · --strip safe: rimuove metadati non visivi
  // (no --alpha: NON tocchiamo l'RGB dei pixel trasparenti → resta bit-perfect)
  spawnSync('oxipng', ['-o', 'max', '--strip', 'safe', ...outFiles], { stdio: ['ignore', 'ignore', 'inherit'] });
  const after = sizeOf(outFiles);
  const savedKb = Math.round((before - after) / 1024);
  const pct = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
  console.log(`[build-avatars] oxipng: ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB (-${pct}%, ${savedKb}KB risparmiati).`);
}
