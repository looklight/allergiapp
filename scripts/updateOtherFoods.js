/**
 * Aggiorna solo la sezione otherFoods nei file di traduzione esistenti.
 * - Rimuove stone_fruits
 * - Aggiunge le nuove chiavi mancanti (peach, cherry, apricot, apple, pear, pumpkin, eggplant, carrot, coconut, pineapple, lentils, chickpeas, mango, avocado, coriander)
 *
 * Uso:
 *   node scripts/updateOtherFoods.js            # aggiorna tutti i file esistenti
 *   node scripts/updateOtherFoods.js el tr cs    # aggiorna solo le lingue specificate
 *   node scripts/updateOtherFoods.js --upload    # aggiorna + carica su Supabase
 *
 * Requisiti:
 *   npm install google-translate-api-x
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');
const RATE_LIMIT_MS = 250;

const NEW_OTHER_FOODS = {
  // Verdure
  tomato: 'Tomato',
  onion: 'Onion',
  garlic: 'Garlic',
  bell_pepper: 'Bell pepper',
  eggplant: 'Eggplant',
  carrot: 'Carrot',
  mushrooms: 'Mushrooms',
  pumpkin: 'Pumpkin',
  zucchini: 'Zucchini',
  fennel: 'Fennel',
  celeriac: 'Celeriac',
  spinach: 'Spinach',
  potato: 'Potato',
  // Frutta
  peach: 'Peach',
  kiwi: 'Kiwi',
  strawberries: 'Strawberries',
  apple: 'Apple',
  banana: 'Banana',
  cherry: 'Cherry',
  apricot: 'Apricot',
  pear: 'Pear',
  citrus: 'Citrus fruits',
  coconut: 'Coconut',
  pineapple: 'Pineapple',
  mango: 'Mango',
  avocado: 'Avocado',
  grapes: 'Grapes',
  melon: 'Melon',
  watermelon: 'Watermelon',
  fig: 'Fig',
  passion_fruit: 'Passion fruit',
  // Legumi, cereali e altro
  chickpeas: 'Chickpeas',
  lentils: 'Lentils',
  corn: 'Corn',
  buckwheat: 'Buckwheat',
  coriander: 'Coriander',
  spicy: 'Spicy foods',
  beans: 'Beans',
  peas: 'Peas',
  rice: 'Rice',
  poppy_seeds: 'Poppy seeds',
  sunflower_seeds: 'Sunflower seeds',
  cinnamon: 'Cinnamon',
  ginger: 'Ginger',
  cacao_chocolate: 'Cacao / Chocolate',
  oats: 'Oats',
  olive_oil: 'Olive oil',
  // Proteine
  pork: 'Pork',
  red_meat: 'Red meat',
  chicken: 'Chicken',
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

async function updateLanguage(langCode) {
  const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭️  ${langCode} — file non trovato, skip`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const existing = data.otherFoods || {};

  // Trova chiavi mancanti
  const missingKeys = Object.keys(NEW_OTHER_FOODS).filter(k => !(k in existing));

  if (missingKeys.length === 0 && !('stone_fruits' in existing)) {
    console.log(`  ✅ ${langCode} — già aggiornato`);
    return false;
  }

  console.log(`  🌐 ${langCode} — ${missingKeys.length} traduzioni mancanti...`);

  // Traduci le chiavi mancanti
  for (let i = 0; i < missingKeys.length; i++) {
    const key = missingKeys[i];
    existing[key] = await translateText(NEW_OTHER_FOODS[key], langCode);
    await delay(RATE_LIMIT_MS);
    process.stdout.write(`\r    ${i + 1}/${missingKeys.length}`);
  }
  if (missingKeys.length > 0) process.stdout.write('\n');

  // Rimuovi stone_fruits
  delete existing.stone_fruits;

  // Riordina secondo l'ordine di NEW_OTHER_FOODS
  const ordered = {};
  for (const key of Object.keys(NEW_OTHER_FOODS)) {
    if (existing[key]) ordered[key] = existing[key];
  }

  data.otherFoods = ordered;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✅ ${langCode} — aggiornato`);
  return true;
}

async function uploadToSupabase(langCodes) {
  const supabase = require('./lib/supabaseAdmin');
  console.log(`\nCaricamento ${langCodes.length} lingue su Supabase...\n`);

  let uploaded = 0;
  for (const langCode of langCodes) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) continue;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { error } = await supabase
      .from('translations')
      .upsert({
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
      }, { onConflict: 'lang_code' });

    if (error) {
      console.error(`  ERRORE upload ${langCode}:`, error.message);
    } else {
      console.log(`  OK ${langCode}`);
      uploaded++;
    }
  }

  console.log(`\nUpload: ${uploaded}/${langCodes.length} lingue caricate.\n`);
}

async function main() {
  await initTranslator();

  const args = process.argv.slice(2);
  const shouldUpload = args.includes('--upload');
  const langArgs = args.filter(a => a !== '--upload');

  let langCodes;
  if (langArgs.length > 0) {
    langCodes = langArgs;
  } else {
    langCodes = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  console.log(`\nAggiornamento otherFoods per ${langCodes.length} lingue\n`);

  let updated = 0;
  const updatedCodes = [];
  for (const langCode of langCodes) {
    try {
      if (await updateLanguage(langCode)) {
        updated++;
        updatedCodes.push(langCode);
      }
    } catch (err) {
      console.error(`  ❌ ${langCode} — errore: ${err.message}`);
    }
  }

  console.log(`\n✅ Fatto: ${updated}/${langCodes.length} lingue aggiornate.\n`);

  if (shouldUpload && updatedCodes.length > 0) {
    await uploadToSupabase(updatedCodes);
  }
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
