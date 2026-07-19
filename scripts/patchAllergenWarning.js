/**
 * Patch mirata: aggiunge/aggiorna il warning di UN allergene in tutte le
 * lingue scaricabili già generate, senza ri-tradurre il resto.
 *
 * Traduce la stringa sorgente EN → ogni lingua, antepone ⚠️ e la scrive in
 * `warnings.<allergene>` di ogni scripts/translations/{lang}.json, lasciando
 * intatto tutto il resto (incluse le correzioni manuali).
 *
 * Le stringhe sorgente devono restare allineate ad ALLERGEN_WARNINGS in
 * generateTranslations.js.
 *
 * Uso:
 *   node scripts/patchAllergenWarning.js celery            # tutte le lingue
 *   node scripts/patchAllergenWarning.js celery el tr cs   # solo le indicate
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

// Allineate ad ALLERGEN_WARNINGS in generateTranslations.js
const SOURCES = {
  gluten: 'Warning: soy sauce may contain gluten',
  peanuts: 'Warning: the frying oil may be peanut oil',
  sesame: 'Warning: sauces and condiments may contain tahini (sesame paste) or sesame oil',
  celery: 'Warning: sauce bases, broths and stock cubes often contain celery',
  fava_beans: 'G6PD deficiency: even small amounts can cause hemolytic crisis',
};

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
  const [allergenId, ...langArgs] = process.argv.slice(2).filter((a) => !a.startsWith('-'));

  if (!allergenId || !SOURCES[allergenId]) {
    console.error(`❌ Indicare un allergene tra: ${Object.keys(SOURCES).join(', ')}`);
    console.error('   Uso: node scripts/patchAllergenWarning.js <allergene> [lingue...]');
    process.exit(1);
  }

  await initTranslator();

  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error('❌ Cartella scripts/translations non trovata.');
    process.exit(1);
  }

  let langCodes;
  if (langArgs.length > 0) {
    langCodes = langArgs;
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

  console.log(`\nPatch warning "${allergenId}" per ${langCodes.length} lingue...\n`);

  let patched = 0;
  for (const langCode of langCodes) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭  ${langCode} — file non trovato, skip`);
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const translated = await translateText(SOURCES[allergenId], langCode);
      data.warnings = { ...(data.warnings || {}), [allergenId]: `⚠️ ${translated}` };
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
