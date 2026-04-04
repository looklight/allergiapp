/**
 * Round 3: fig sistematico, allergen safety, oats, duplicati
 */
const fs = require('fs');
const path = require('path');
const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

// Array per evitare chiavi duplicate
const FIX_LIST = [
  // ── P0: FOOD SAFETY ─────────────────────────────────────────────────
  { lang: 'id', section: 'otherFoods', key: 'oats', value: 'Oat' },               // "gandum" = wheat!
  { lang: 'uk', section: 'otherFoods', key: 'fig', value: 'Інжір' },              // "Рис" = rice!
  { lang: 'ne', section: 'allergens', key: 'peanuts', value: 'बदाम भुइँ' },       // was "almonds"
  { lang: 'ne', section: 'otherFoods', key: 'fig', value: 'अञ्जीर' },
  { lang: 'ne', section: 'otherFoods', key: 'melon', value: 'खर्बुजा' },
  { lang: 'my', section: 'allergens', key: 'celery', value: 'ဆယ်လရီ' },          // was Chinese coriander
  { lang: 'my', section: 'otherFoods', key: 'oats', value: 'အိုးတ်' },
  { lang: 'lo', section: 'allergens', key: 'nuts', value: 'ແກ່ນໄມ້' },           // was generic "fruit"

  // ── P1: FIG = "image/picture/figure" ────────────────────────────────
  { lang: 'am', section: 'otherFoods', key: 'fig', value: 'በለስ' },
  { lang: 'az', section: 'otherFoods', key: 'fig', value: 'Əncir' },
  { lang: 'az', section: 'otherFoods', key: 'peas', value: 'Yaşıl noxud' },
  { lang: 'et', section: 'otherFoods', key: 'fig', value: 'Viigimari' },
  { lang: 'eu', section: 'otherFoods', key: 'fig', value: 'Pikua' },
  { lang: 'hy', section: 'otherFoods', key: 'fig', value: 'Թուզ' },
  { lang: 'is', section: 'otherFoods', key: 'fig', value: 'Fíkja' },
  { lang: 'km', section: 'otherFoods', key: 'fig', value: 'ផ្លែល្វា' },
  { lang: 'km', section: 'otherFoods', key: 'oats', value: 'គ្រាប់ស្រូវអូត' },
  { lang: 'lv', section: 'otherFoods', key: 'fig', value: 'Vīģe' },
  { lang: 'mk', section: 'otherFoods', key: 'fig', value: 'Смоква' },
  { lang: 'mn', section: 'otherFoods', key: 'fig', value: 'Инжир' },
  { lang: 'mn', section: 'otherFoods', key: 'passion_fruit', value: 'Маракуйя' },
  { lang: 'ms', section: 'otherFoods', key: 'fig', value: 'Buah ara' },
  { lang: 'si', section: 'otherFoods', key: 'fig', value: 'අත්තික්කා' },
  { lang: 'ta', section: 'otherFoods', key: 'fig', value: 'அத்திப்பழம்' },

  // Fig untranslated in Latin-script languages
  { lang: 'af', section: 'otherFoods', key: 'fig', value: 'Vy' },
  { lang: 'ca', section: 'otherFoods', key: 'fig', value: 'Figa' },
  { lang: 'cy', section: 'otherFoods', key: 'fig', value: 'Ffigys' },
  { lang: 'da', section: 'otherFoods', key: 'fig', value: 'Figen' },
  { lang: 'ga', section: 'otherFoods', key: 'fig', value: 'Fige' },
  { lang: 'gl', section: 'otherFoods', key: 'fig', value: 'Figo' },
  { lang: 'lt', section: 'otherFoods', key: 'fig', value: 'Figa' },
  { lang: 'mt', section: 'otherFoods', key: 'fig', value: 'Tin' },
  { lang: 'no', section: 'otherFoods', key: 'fig', value: 'Fiken' },
  { lang: 'sq', section: 'otherFoods', key: 'fig', value: 'Fik' },
  { lang: 'tl', section: 'otherFoods', key: 'fig', value: 'Igos' },

  // ── P1: passion_fruit literal translations ──────────────────────────
  // already fixed: bs, hr, sr, sw, mk, et, fa in round 2

  // ── P1: Bosnian untranslated ────────────────────────────────────────
  { lang: 'bs', section: 'otherFoods', key: 'rice', value: 'Riža' },
  { lang: 'bs', section: 'otherFoods', key: 'ginger', value: 'Đumbir' },
  { lang: 'bs', section: 'otherFoods', key: 'fig', value: 'Smokva' },

  // ── P1: melon/watermelon duplicates ─────────────────────────────────
  { lang: 'bn', section: 'otherFoods', key: 'melon', value: 'খরমুজ' },

  // ── P1: Uzbek duplicates ────────────────────────────────────────────
  { lang: 'uz', section: 'otherFoods', key: 'zucchini', value: 'Qovoqcha' },
  { lang: 'uz', section: 'otherFoods', key: 'peas', value: "Ko'k no'xat" },

  // ── P1: Swahili lentils = chickpeas ─────────────────────────────────
  { lang: 'sw', section: 'otherFoods', key: 'lentils', value: 'Kamande' },

  // ── P1: Finnish seafood on vegan card = crustaceans ─────────────────
  { lang: 'fi', section: 'dietFoods', key: 'seafood', value: 'Merenelävät' },
];

function applyFixes() {
  let totalFixed = 0;
  const fixedLangs = new Set();

  // Group by lang
  const byLang = {};
  for (const fix of FIX_LIST) {
    if (!byLang[fix.lang]) byLang[fix.lang] = [];
    byLang[fix.lang].push(fix);
  }

  for (const [langCode, fixes] of Object.entries(byLang)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${langCode} — file non trovato`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fixCount = 0;

    for (const { section, key, value } of fixes) {
      const target = data[section];
      if (!target) { console.log(`  ⚠️  ${langCode}.${section} non trovata`); continue; }
      const oldValue = target[key];
      if (oldValue !== value) {
        target[key] = value;
        console.log(`  🔧 ${langCode}.${section}.${key}: "${oldValue}" → "${value}"`);
        fixCount++;
      }
    }

    if (fixCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✅ ${langCode} — ${fixCount} correzioni\n`);
      totalFixed += fixCount;
      fixedLangs.add(langCode);
    }
  }
  return { totalFixed, fixedLangs: [...fixedLangs] };
}

async function uploadToSupabase(langCodes) {
  const supabase = require('./lib/supabaseAdmin');
  console.log(`\nCaricamento ${langCodes.length} lingue su Supabase...\n`);
  let uploaded = 0;
  for (const langCode of langCodes) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) continue;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { error } = await supabase.from('translations').upsert({
      lang_code: langCode, allergens: raw.allergens, descriptions: raw.descriptions,
      warnings: raw.warnings || null, card_texts: raw.cardTexts,
      diet_foods: raw.dietFoods || null, other_foods: raw.otherFoods || null,
      restrictions: raw.restrictions || null, restriction_card_texts: raw.restrictionCardTexts || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'lang_code' });
    if (error) console.error(`  ERRORE ${langCode}:`, error.message);
    else { console.log(`  OK ${langCode}`); uploaded++; }
  }
  console.log(`\nUpload: ${uploaded}/${langCodes.length} lingue.\n`);
}

async function main() {
  console.log('\n🔍 Round 3: fig sistematico, allergen safety, duplicati\n');
  const { totalFixed, fixedLangs } = applyFixes();
  console.log(`\n✅ Totale: ${totalFixed} correzioni in ${fixedLangs.length} lingue\n`);
  if (process.argv.includes('--upload') && fixedLangs.length > 0) await uploadToSupabase(fixedLangs);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
