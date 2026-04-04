/**
 * Script per caricare le traduzioni pre-generate su Supabase.
 *
 * Uso:
 *   node scripts/uploadTranslations.js                     # carica tutte le lingue
 *   node scripts/uploadTranslations.js el tr cs             # carica solo le lingue specificate
 *
 * Requisiti:
 *   - admin/.env.local deve contenere SUPABASE_SERVICE_ROLE_KEY
 *   - Le traduzioni devono essere in scripts/translations/{langCode}.json
 */

const path = require('path');
const fs = require('fs');
const supabase = require('./lib/supabaseAdmin');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

async function uploadTranslation(langCode) {
  const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  skip ${langCode} — file non trovato`);
    return false;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Mappa camelCase → snake_case per Supabase
  const row = {
    lang_code: langCode,
    allergens: raw.allergens,
    descriptions: raw.descriptions,
    warnings: raw.warnings || null,
    card_texts: raw.cardTexts,
    diet_foods: raw.dietFoods || null,
    other_foods: raw.otherFoods || null,
    restrictions: raw.restrictions || null,
    restriction_card_texts: raw.restrictionCardTexts || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('translations')
    .upsert(row, { onConflict: 'lang_code' });

  if (error) {
    console.error(`  ERRORE ${langCode}:`, error.message);
    return false;
  }

  console.log(`  OK ${langCode}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  let langCodes = args;

  if (langCodes.length === 0) {
    if (!fs.existsSync(TRANSLATIONS_DIR)) {
      console.error(`Cartella ${TRANSLATIONS_DIR} non trovata.`);
      process.exit(1);
    }

    langCodes = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();
  }

  if (langCodes.length === 0) {
    console.log('Nessuna traduzione da caricare.');
    return;
  }

  console.log(`\nCaricamento ${langCodes.length} lingue su Supabase...\n`);

  let uploaded = 0;
  for (const langCode of langCodes) {
    const ok = await uploadTranslation(langCode);
    if (ok) uploaded++;
  }

  console.log(`\nFatto: ${uploaded}/${langCodes.length} lingue caricate.\n`);
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
