/**
 * Patch mirata: aggiunge SOLO il warning arachidi (olio di frittura) a tutte
 * le lingue scaricabili già generate, senza ri-tradurre il resto.
 *
 * Traduce "the frying oil may be peanut oil" EN → ogni lingua, antepone ⚠️
 * e lo scrive in `warnings.peanuts` di ogni scripts/translations/{lang}.json,
 * lasciando intatto tutto il resto (incluse le correzioni manuali).
 *
 * Uso:
 *   node scripts/patchPeanutsWarning.js               # patcha tutti i JSON
 *   node scripts/patchPeanutsWarning.js el tr cs        # solo le lingue indicate
 *
 * Dopo: node scripts/uploadToSupabase.js [lingue]   per caricare su Supabase.
 *
 * Requisiti:
 *   - npm install google-translate-api-x
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');
const RATE_LIMIT_MS = 200;

// Stessa stringa sorgente di ALLERGEN_WARNINGS.peanuts in generateTranslations.js
const SOURCE = 'Warning: the frying oil may be peanut oil';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let translate;

async function initTranslator() {
  const mod = await import('google-translate-api-x');
  translate = mod.default || mod.translate || mod;
}

async function translateText(text, targetLang) {
  const result = await translate(text, { from: 'en', to: targetLang });
  return result.text;
}

async function main() {
  await initTranslator();

  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error('❌ Cartella scripts/translations non trovata.');
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  let langCodes;
  if (args.length > 0) {
    langCodes = args;
  } else {
    langCodes = fs
      .readdirSync(TRANSLATIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
  }

  if (langCodes.length === 0) {
    console.log('Nessun file da patchare.');
    return;
  }

  console.log(`\nPatch warning arachidi per ${langCodes.length} lingue...\n`);

  let patched = 0;
  for (const langCode of langCodes) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭  ${langCode} — file non trovato, skip`);
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const translated = await translateText(SOURCE, langCode);
      data.warnings = { ...(data.warnings || {}), peanuts: `⚠️ ${translated}` };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✅ ${langCode} — ${translated}`);
      patched++;
      await delay(RATE_LIMIT_MS);
    } catch (err) {
      console.error(`  ❌ ${langCode} — errore: ${err.message}`);
    }
  }

  console.log(`\n✅ Fatto: ${patched}/${langCodes.length} lingue patchate.`);
  console.log(`\nPer caricarle su Supabase:`);
  console.log(`  node scripts/uploadToSupabase.js\n`);
}

main().catch((err) => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
