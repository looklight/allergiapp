#!/usr/bin/env node
/**
 * Genera gli avatar bundlati (400×400 PNG) a partire dai master 1024×1024
 * in _design/avatars/. Output in assets/avatars/.
 *
 * Uso:  npm run build:avatars
 *
 * Richiede `sips` (built-in su macOS). Salta i file già aggiornati.
 */

import { execSync } from 'node:child_process';
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
