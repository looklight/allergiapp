/**
 * Secondo round di correzioni: fig, passion_fruit, apple sistematici + diete.
 *
 * Uso:
 *   node scripts/fixTranslationErrors2.js            # corregge i file locali
 *   node scripts/fixTranslationErrors2.js --upload    # corregge + carica su Supabase
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

const FIXES = {
  // ── FIG: sistematicamente tradotto come "figura/immagine/gigante" ────
  bg: { otherFoods: { fig: 'Смокиня' } },
  hr: { otherFoods: { fig: 'Smokva', passion_fruit: 'Marakuja' } },
  sk: { otherFoods: { fig: 'Figa' } },
  sl: { otherFoods: { fig: 'Figa' } },
  sr: { otherFoods: { fig: 'Смоква', passion_fruit: 'Маракуја' } },

  // ── FARSI (fa) ─────────────────────────────────────────────────────
  fa: {
    otherFoods: {
      fig: 'انجیر',
      apple: 'سیب',
      passion_fruit: 'پشن فروت',
    },
  },

  // ── PASSION_FRUIT: tradotto letteralmente come "frutto della sofferenza/passione" ──
  bs: { otherFoods: { passion_fruit: 'Marakuja', apple: 'Jabuka' } },
  et: { otherFoods: { passion_fruit: 'Passioonivili', apple: 'Õun' } },
  mk: { otherFoods: { passion_fruit: 'Маракуја' } },
  sw: { otherFoods: { passion_fruit: 'Pesheni' } },
  tl: { otherFoods: { passion_fruit: 'Passion fruit', apple: 'Mansanas' } },

  // ── APPLE: non tradotto (lasciato "Apple" in inglese) ──────────────
  ca: { otherFoods: { apple: 'Poma' } },
  gl: { otherFoods: { apple: 'Mazá' } },
  hy: { otherFoods: { apple: 'Խնձոր' } },
  lo: { otherFoods: { apple: 'ໝາກແອັບເປີ້ນ' } },
  lt: { otherFoods: { apple: 'Obuolys' } },
  lv: { otherFoods: { apple: 'Ābols' } },
  mn: { otherFoods: { apple: 'Алим' } },
  mt: { otherFoods: { apple: 'Tuffieħa' } },
  sk: { otherFoods: { apple: 'Jablko' } },
  sl: { otherFoods: { apple: 'Jabolko' } },
  sq: { otherFoods: { apple: 'Mollë' } },

  // ── FINNISH: seafood su card vegana ──────────────────────────────────
  fi: {
    dietFoods: { seafood: 'Merenelävät' },
  },

  // ── UCRAINO: pesca aggettivo → sostantivo ───────────────────────────
  uk: { otherFoods: { peach: 'Персик' } },
};

// Merge fixes per lingue con entries multiple
function mergeFixes(fixes) {
  const merged = {};
  for (const [lang, sections] of Object.entries(fixes)) {
    if (!merged[lang]) merged[lang] = {};
    for (const [section, entries] of Object.entries(sections)) {
      if (!merged[lang][section]) merged[lang][section] = {};
      Object.assign(merged[lang][section], entries);
    }
  }
  return merged;
}

function applyFixes() {
  const mergedFixes = mergeFixes(FIXES);
  let totalFixed = 0;
  const fixedLangs = [];

  for (const [langCode, sections] of Object.entries(mergedFixes)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${langCode} — file non trovato, skip`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fixCount = 0;

    for (const [section, fixes] of Object.entries(sections)) {
      const target = data[section];
      if (!target) {
        console.log(`  ⚠️  ${langCode} — sezione ${section} non trovata`);
        continue;
      }
      for (const [key, correctValue] of Object.entries(fixes)) {
        const oldValue = target[key];
        if (oldValue !== correctValue) {
          target[key] = correctValue;
          console.log(`  🔧 ${langCode}.${section}.${key}: "${oldValue}" → "${correctValue}"`);
          fixCount++;
        }
      }
    }

    if (fixCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✅ ${langCode} — ${fixCount} correzioni\n`);
      totalFixed += fixCount;
      fixedLangs.push(langCode);
    }
  }

  return { totalFixed, fixedLangs };
}

async function uploadToSupabase(langCodes) {
  const supabase = require('./lib/supabaseAdmin');
  console.log(`\nCaricamento ${langCodes.length} lingue corrette su Supabase...\n`);

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
  console.log('\n🔍 Correzione round 2: fig, passion_fruit, apple, diete\n');

  const { totalFixed, fixedLangs } = applyFixes();
  console.log(`\n✅ Totale: ${totalFixed} correzioni in ${fixedLangs.length} lingue\n`);

  const shouldUpload = process.argv.includes('--upload');
  if (shouldUpload && fixedLangs.length > 0) {
    await uploadToSupabase(fixedLangs);
  }
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
