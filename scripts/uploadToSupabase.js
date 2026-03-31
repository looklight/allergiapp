/**
 * Carica le traduzioni pre-generate su Supabase (tabella `translations`).
 *
 * Uso:
 *   node scripts/uploadToSupabase.js                     # carica tutte le lingue
 *   node scripts/uploadToSupabase.js el tr cs             # carica solo le lingue specificate
 *   node scripts/uploadToSupabase.js --missing            # carica solo le lingue non ancora su Supabase
 *
 * Requisiti:
 *   - .env con EXPO_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   - Le traduzioni devono essere in scripts/translations/{langCode}.json
 */

const path = require('path');
const fs = require('fs');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

// Carica .env dal progetto root
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
}

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Manca EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

/**
 * Mappa i campi dal formato generateTranslations.js (camelCase)
 * al formato della tabella Supabase (snake_case).
 */
function mapToDbFormat(data) {
  return {
    allergens: data.allergens,
    descriptions: data.descriptions,
    warnings: data.warnings || {},
    card_texts: data.cardTexts,
    diet_foods: data.dietFoods,
    other_foods: data.otherFoods,
    restrictions: data.restrictions,
    restriction_card_texts: data.restrictionCardTexts,
    updated_at: new Date().toISOString(),
  };
}

async function upsertTranslation(langCode) {
  const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  ${langCode} — file non trovato, skip`);
    return false;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const row = { lang_code: langCode, ...mapToDbFormat(raw) };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/translations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  console.log(`  ✅ ${langCode} — caricato`);
  return true;
}

async function getExistingLangs() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/translations?select=lang_code`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!response.ok) throw new Error('Errore nel recupero lingue esistenti');
  const rows = await response.json();
  return rows.map(r => r.lang_code);
}

async function main() {
  const args = process.argv.slice(2);
  let langCodes;

  if (args.includes('--missing')) {
    // Carica solo le lingue che hanno JSON ma non sono su Supabase
    const existing = await getExistingLangs();
    const jsonLangs = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    langCodes = jsonLangs.filter(l => !existing.includes(l));
    console.log(`\nLingue su Supabase: ${existing.length} | JSON disponibili: ${jsonLangs.length} | Da caricare: ${langCodes.length}`);
  } else if (args.length > 0) {
    langCodes = args.filter(a => !a.startsWith('-'));
  } else {
    // Carica tutte le lingue trovate nella cartella
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
    try {
      const ok = await upsertTranslation(langCode);
      if (ok) uploaded++;
    } catch (err) {
      console.error(`  ❌ ${langCode} — errore: ${err.message}`);
    }
  }

  console.log(`\n✅ Fatto: ${uploaded}/${langCodes.length} lingue caricate.\n`);
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
