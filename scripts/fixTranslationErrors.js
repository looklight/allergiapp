/**
 * Corregge errori di traduzione critici e gravi trovati durante l'audit.
 * Ogni fix è documentato con il problema e la correzione.
 *
 * Uso:
 *   node scripts/fixTranslationErrors.js            # corregge i file locali
 *   node scripts/fixTranslationErrors.js --upload    # corregge + carica su Supabase
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');

// ── CRITICAL + HIGH SEVERITY FIXES ──────────────────────────────────────

const FIXES = {
  // ── HINDI (hi) ──────────────────────────────────────────────────────
  hi: {
    allergens: {
      // CRITICAL: अजवाइन = carom seeds (wrong plant). Celery = अजमोद / सेलेरी
      celery: 'सेलेरी',
    },
    otherFoods: {
      // CRITICAL: सरसों के बीज = mustard seeds. Sunflower = सूरजमुखी
      sunflower_seeds: 'सूरजमुखी के बीज',
      // CRITICAL: melon and watermelon both = तरबूज
      melon: 'खरबूजा',
      // HIGH: celeriac same as (wrong) celery
      celeriac: 'सेलेरी जड़',
      // HIGH: अफीम के बीज = "opium seeds" (stigmatized). Use खसखस
      poppy_seeds: 'खसखस',
      // HIGH: मुर्गा = rooster. Use मुर्गी (hen) for food context
      chicken: 'चिकन',
    },
  },

  // ── CZECH (cs) ──────────────────────────────────────────────────────
  cs: {
    otherFoods: {
      // CRITICAL: "Obr" = giant/ogre. Fig = Fík
      fig: 'Fík',
      // HIGH: celeriac same as celery
      celeriac: 'Celerový kořen',
    },
  },

  // ── FINNISH (fi) ────────────────────────────────────────────────────
  fi: {
    otherFoods: {
      // CRITICAL: "Kuva" = picture/image. Fig = Viikuna
      fig: 'Viikuna',
      // HIGH: celeriac same as celery
      celeriac: 'Juuriselleri',
      // HIGH: "Porsaan" = genitive of pork. Use standard form
      pork: 'Sianliha',
    },
  },

  // ── GREEK (el) ──────────────────────────────────────────────────────
  el: {
    allergens: {
      // CRITICAL: Φιστίκια = pistachios in Greek. Peanuts = Αραχίδες
      peanuts: 'Αραχίδες',
    },
    otherFoods: {
      // HIGH: pumpkin and zucchini both = Κολοκύθι
      zucchini: 'Κολοκυθάκι',
      // HIGH: celeriac same as celery
      celeriac: 'Σελινόριζα',
    },
  },

  // ── GEORGIAN (ka) ──────────────────────────────────────────────────
  ka: {
    allergens: {
      // CRITICAL: ცერცვი = vetch/lentils. Fava beans = ბაქლა
      fava_beans: 'ბაქლა (ფავიზმი)',
    },
    otherFoods: {
      // HIGH: fig wrong
      fig: 'ლეღვი',
      // HIGH: წიწილა = baby chick. Chickpeas = ნუტი
      chickpeas: 'ნუტი',
      // HIGH: celeriac same as celery
      celeriac: 'ფესვნიახური',
    },
  },

  // ── VIETNAMESE (vi) ────────────────────────────────────────────────
  vi: {
    otherFoods: {
      // CRITICAL: đậu xanh = mung beans. Chickpeas = đậu gà
      chickpeas: 'Đậu gà',
    },
  },

  // ── INDONESIAN (id) ───────────────────────────────────────────────
  id: {
    otherFoods: {
      // CRITICAL: buncis = green beans. Chickpeas = kacang arab
      chickpeas: 'Kacang arab',
      // HIGH: beans and peas both = kacang polong
      beans: 'Kacang merah',
      // HIGH: "Biji opium" = opium seeds (stigmatized)
      poppy_seeds: 'Biji kas-kas',
      // HIGH: "Soba" = Japanese noodle, not the grain
      buckwheat: 'Gandum kuda',
    },
  },

  // ── SWAHILI (sw) ──────────────────────────────────────────────────
  sw: {
    otherFoods: {
      // CRITICAL: apricot and avocado both = Parachichi
      apricot: 'Aprikoti',
      // CRITICAL: Njegere = pigeon peas. Chickpeas = Dengu
      chickpeas: 'Dengu',
      // HIGH: untranslated English words
      peach: 'Pichi',
      apple: 'Tufaha',
      cherry: 'Cheri',
      coriander: 'Dhania',
    },
  },

  // ── HUNGARIAN (hu) ────────────────────────────────────────────────
  hu: {
    otherFoods: {
      // HIGH: celeriac same as celery
      celeriac: 'Gumós zeller',
    },
  },

  // ── ROMANIAN (ro) ─────────────────────────────────────────────────
  ro: {
    otherFoods: {
      // HIGH: untranslated
      zucchini: 'Dovlecel',
      // Diacritics fixes
      red_meat: 'Carne roșie',
      poppy_seeds: 'Semințe de mac',
      sunflower_seeds: 'Semințe de floarea soarelui',
    },
  },

  // ── HEBREW (he) ───────────────────────────────────────────────────
  he: {
    otherFoods: {
      // HIGH: pure transliteration, use proper Hebrew
      celeriac: 'סלרי שורש',
    },
  },
};

// ── Apply fixes ──────────────────────────────────────────────────────────

function applyFixes() {
  let totalFixed = 0;
  const fixedLangs = [];

  for (const [langCode, sections] of Object.entries(FIXES)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${langCode} — file non trovato, skip`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fixCount = 0;

    for (const [section, fixes] of Object.entries(sections)) {
      if (!data[section]) {
        // Try camelCase version (otherFoods)
        if (section === 'otherFoods' && !data.otherFoods) {
          console.log(`  ⚠️  ${langCode} — sezione ${section} non trovata`);
          continue;
        }
      }
      const target = data[section];
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
      console.log(`  ✅ ${langCode} — ${fixCount} correzioni applicate\n`);
      totalFixed += fixCount;
      fixedLangs.push(langCode);
    } else {
      console.log(`  ✅ ${langCode} — nessuna correzione necessaria\n`);
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
  console.log('\n🔍 Correzione errori di traduzione (audit quality)\n');

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
