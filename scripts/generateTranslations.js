/**
 * Genera file di traduzione pre-compilati usando Google Translate.
 *
 * Uso:
 *   node scripts/generateTranslations.js km lo ne         # genera solo le lingue specificate
 *   node scripts/generateTranslations.js --all-missing     # genera tutte le lingue mancanti
 *
 * Output: scripts/translations/{langCode}.json
 *
 * Requisiti:
 *   - npm install google-translate-api-x
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'translations');
const RATE_LIMIT_MS = 200; // delay tra richieste per evitare ban

// ── Testi sorgente inglesi ─────────────────────────────────────────────

const ALLERGEN_NAMES = {
  gluten: 'Gluten (cereals)',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  peanuts: 'Peanuts',
  soy: 'Soy',
  milk: 'Milk and dairy products',
  celery: 'Celery',
  mustard: 'Mustard',
  sesame: 'Sesame',
  sulfites: 'Sulfur dioxide and sulfites',
  lupin: 'Lupin',
  mollusks: 'Mollusks',
  nuts: 'Tree nuts',
  fava_beans: 'Fava beans (favism)',
};

const ALLERGEN_DESCRIPTIONS = {
  gluten: 'All foods with cereals or flour (wheat, barley, rye, spelt): bread, pasta, pizza, cakes, cookies, beer',
  crustaceans: 'Shrimp, lobster, crab, prawns',
  eggs: 'Eggs, omelettes, cakes, mayonnaise, fresh pasta',
  fish: 'Fish, sushi, fish sauces, broths',
  peanuts: 'Peanuts, peanut butter, snacks, desserts',
  soy: 'Tofu, soy sauce, soy milk, edamame',
  milk: 'Milk, cheese, butter, ice cream, cream',
  celery: 'Celery, salads, soups, vegetable broths',
  mustard: 'Mustard, sauces, dressings, marinades',
  sesame: 'Sesame seeds, sesame oil, hummus, bread',
  sulfites: 'Wine, beer, dried fruits, chips',
  lupin: 'Lupin flour, bread, pasta, snacks',
  mollusks: 'Mussels, clams, oysters, squid, octopus',
  nuts: 'Walnuts, almonds, hazelnuts, pistachios, cashews',
  fava_beans: 'Fava beans, fava bean soup, fava bean puree, stews',
};

const ALLERGEN_WARNINGS = {
  gluten: 'Warning: soy sauce may contain gluten',
  fava_beans: 'G6PD deficiency: even small amounts can cause hemolytic crisis',
};

const CARD_TEXTS = {
  header: 'ATTENTION',
  subtitle: 'FOOD ALLERGIES',
  pregnancySubtitle: 'PREGNANCY & FOOD ALLERGIES',
  message: 'I have the following food allergies. Please ensure my food does not contain these ingredients, including through cross-contamination.',
  pregnancyMessage: 'I am pregnant and I have the following food allergies. Please ensure my food does not contain these ingredients, including through cross-contamination.',
  thanks: 'Thank you so much for your understanding and your help.',
  tapToSee: 'Tap to see examples',
  examples: 'Examples:',
};

const DIET_FOODS = {
  meat: 'Meat',
  fish: 'Fish',
  seafood: 'Seafood',
  eggs: 'Eggs',
  dairy: 'Dairy',
  honey: 'Honey',
};

const OTHER_FOODS = {
  garlic: 'Garlic',
  onion: 'Onion',
  tomato: 'Tomato',
  bell_pepper: 'Bell pepper',
  mushrooms: 'Mushrooms',
  pumpkin: 'Pumpkin',
  eggplant: 'Eggplant',
  carrot: 'Carrot',
  coconut: 'Coconut',
  apple: 'Apple',
  pear: 'Pear',
  peach: 'Peach',
  cherry: 'Cherry',
  apricot: 'Apricot',
  strawberries: 'Strawberries',
  kiwi: 'Kiwi',
  banana: 'Banana',
  citrus: 'Citrus fruits',
  mango: 'Mango',
  avocado: 'Avocado',
  pineapple: 'Pineapple',
  lentils: 'Lentils',
  chickpeas: 'Chickpeas',
  corn: 'Corn',
  buckwheat: 'Buckwheat',
  coriander: 'Coriander',
  spicy: 'Spicy foods',
};

const RESTRICTIONS = {
  raw_fish: 'Raw fish / sushi',
  raw_cured_meats: 'Raw cured meats',
  raw_eggs: 'Raw eggs',
  raw_sprouts: 'Raw sprouts',
  unpasteurized_cheese: 'Unpasteurized cheeses',
  unpasteurized_milk: 'Unpasteurized milk',
  alcohol: 'Alcohol',
  excessive_caffeine: 'Excessive caffeine',
  nickel_chocolate: 'Chocolate / cocoa',
  nickel_tomato: 'Tomato and tomato sauces',
  nickel_legumes: 'Legumes (lentils, chickpeas, beans)',
  nickel_nuts: 'Nuts (walnuts, hazelnuts, cashews)',
  nickel_whole_grains: 'Whole grains / oats',
  nickel_spinach: 'Spinach and leafy greens',
  nickel_canned_food: 'Canned food',
  nickel_tea_coffee: 'Tea and coffee',
  histamine_aged_cheese: 'Aged cheeses',
  histamine_cured_meats: 'Cured meats and sausages',
  histamine_fish: 'Canned and smoked fish',
  histamine_fermented: 'Fermented foods (sauerkraut, kimchi, miso)',
  histamine_wine_beer: 'Wine and beer',
  histamine_vinegar: 'Vinegar and pickles',
  histamine_chocolate: 'Chocolate / cocoa',
  histamine_tomato: 'Tomato and tomato sauces',
  histamine_strawberries: 'Strawberries',
  histamine_eggplant: 'Eggplant',
  histamine_avocado: 'Avocado',
  histamine_spinach: 'Spinach',
  diabetes_added_sugar: 'Added sugar / syrups',
  diabetes_honey_sweeteners: 'Honey and sweeteners',
  diabetes_sweet_sauces: 'Sweet sauces (ketchup, sweet and sour, teriyaki)',
  diabetes_sweet_glazes: 'Sweet glazes and marinades',
  diabetes_fruit_juice: 'Fruit juice as ingredient',
  diabetes_candied_fruit: 'Candied fruit / jams',
};

const RESTRICTION_CARD_TEXTS = {
  header: 'FOODS TO AVOID',
  message: 'For health reasons, I need to avoid the following foods:',
};

const DIET_MODE_TEXTS = {
  pregnancy: {
    header: 'PREGNANCY',
    message: 'I am pregnant. Please ensure my food does not contain the following:',
    sectionMessage: 'Additionally, due to my pregnancy, I must also avoid:',
  },
  no_meat: {
    header: 'VEGETARIAN DIET',
    message: 'I do not eat meat.\nFish and other animal products are fine.',
    sectionMessage: 'Additionally, I do not eat meat.\nFish and other animal products are fine.',
  },
  no_meat_fish: {
    header: 'VEGETARIAN DIET',
    message: 'I follow a vegetarian diet.\nI do not eat meat or fish.',
    sectionMessage: 'Additionally, I follow a vegetarian diet and do not eat meat or fish.',
  },
  no_animal_products: {
    header: 'VEGAN DIET',
    message: 'I follow a vegan diet.\nI do not eat meat, fish, seafood, eggs, dairy, honey or any animal products.',
    sectionMessage: 'Additionally, I follow a vegan diet and do not eat meat, fish, seafood, eggs, dairy, honey or any animal products.',
  },
  nickel: {
    header: 'NICKEL ALLERGY',
    message: 'I have a nickel allergy. Nickel is a metal found in many foods. Please make sure my food does not contain:',
    sectionMessage: 'Additionally, I have a nickel allergy. Nickel is a metal found in many foods. Please make sure my food does not contain:',
  },
  histamine: {
    header: 'HISTAMINE INTOLERANCE',
    message: 'I cannot eat foods rich in histamine. Histamine is found in aged, fermented or long-preserved foods. For example:',
    sectionMessage: 'Additionally, I cannot eat foods rich in histamine. Histamine is found in aged, fermented or long-preserved foods. For example:',
  },
  diabetes: {
    header: 'DIABETES',
    message: 'I have diabetes and need to control my sugar intake. Please do not add sugar to my food and let me know if it contains:',
    sectionMessage: 'Additionally, I have diabetes and need to control my sugar intake. Please do not add sugar to my food and let me know if it contains:',
  },
};

// ── Funzioni di traduzione ─────────────────────────────────────────────

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

async function translateObject(obj, targetLang, label) {
  const keys = Object.keys(obj);
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result[key] = await translateText(obj[key], targetLang);
    await delay(RATE_LIMIT_MS);
    process.stdout.write(`\r    ${label}: ${i + 1}/${keys.length}`);
  }
  process.stdout.write('\n');
  return result;
}

async function generateTranslation(langCode) {
  console.log(`\n  🌐 ${langCode} — traduzione in corso...`);

  const allergens = await translateObject(ALLERGEN_NAMES, langCode, 'Allergeni');
  const descriptions = await translateObject(ALLERGEN_DESCRIPTIONS, langCode, 'Descrizioni');

  const warningsRaw = await translateObject(ALLERGEN_WARNINGS, langCode, 'Avvertenze');
  // Prepend warning emoji
  const warnings = {};
  for (const [key, val] of Object.entries(warningsRaw)) {
    warnings[key] = key === 'gluten' ? `⚠️ ${val}` : val;
  }

  const cardTexts = await translateObject(CARD_TEXTS, langCode, 'Testi card');
  const dietFoods = await translateObject(DIET_FOODS, langCode, 'Dieta cibi');
  const otherFoods = await translateObject(OTHER_FOODS, langCode, 'Altri cibi');
  const restrictions = await translateObject(RESTRICTIONS, langCode, 'Restrizioni');

  const restrictionHeader = await translateText(RESTRICTION_CARD_TEXTS.header, langCode);
  await delay(RATE_LIMIT_MS);
  const restrictionMessage = await translateText(RESTRICTION_CARD_TEXTS.message, langCode);
  await delay(RATE_LIMIT_MS);

  const dietModeTexts = {};
  const modeKeys = Object.keys(DIET_MODE_TEXTS);
  for (let i = 0; i < modeKeys.length; i++) {
    const modeKey = modeKeys[i];
    const mode = DIET_MODE_TEXTS[modeKey];
    const header = await translateText(mode.header, langCode);
    await delay(RATE_LIMIT_MS);
    const message = await translateText(mode.message, langCode);
    await delay(RATE_LIMIT_MS);
    const sectionMessage = await translateText(mode.sectionMessage, langCode);
    await delay(RATE_LIMIT_MS);
    dietModeTexts[modeKey] = { header, message, sectionMessage };
    process.stdout.write(`\r    Diet modes: ${i + 1}/${modeKeys.length}`);
  }
  process.stdout.write('\n');

  return {
    allergens,
    descriptions,
    warnings,
    cardTexts,
    dietFoods,
    otherFoods,
    restrictions,
    restrictionCardTexts: {
      header: restrictionHeader,
      message: restrictionMessage,
      dietModeTexts,
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  await initTranslator();

  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
  }

  const args = process.argv.slice(2);

  let langCodes;
  if (args.includes('--all-missing')) {
    // Tutte le lingue definite nel tipo ma senza file JSON
    const ALL_DOWNLOADABLE = [
      'el','tr','cs','hu','ro','uk','da','fi','no','hr','bg','sk','sl','sr',
      'lt','lv','et','is','mk','sq','bs','mt','ga','cy','ca','eu','gl',
      'he','hi','pa','gu','kn','ml','vi','id','ms','tl','bn','ta','te',
      'mr','ur','fa','ps','ku','ne','si','dv','km','lo','my','ka','hy',
      'az','kk','uz','tg','ky','tk','mn',
      'sw','af','am','ha','yo','zu','so','mg',
      'ht','eo',
    ];
    const existing = fs.readdirSync(TRANSLATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    langCodes = ALL_DOWNLOADABLE.filter(l => !existing.includes(l));
  } else {
    langCodes = args.filter(a => !a.startsWith('-'));
  }

  if (langCodes.length === 0) {
    console.log('Nessuna lingua da generare. Uso: node scripts/generateTranslations.js km lo ne');
    return;
  }

  console.log(`\nGenerazione traduzioni per ${langCodes.length} lingue: ${langCodes.join(', ')}\n`);

  let generated = 0;
  for (const langCode of langCodes) {
    try {
      const data = await generateTranslation(langCode);
      const filePath = path.join(TRANSLATIONS_DIR, `${langCode}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  ✅ ${langCode} — salvato`);
      generated++;
    } catch (err) {
      console.error(`  ❌ ${langCode} — errore: ${err.message}`);
    }
  }

  console.log(`\n✅ Fatto: ${generated}/${langCodes.length} lingue generate.`);
  console.log(`\nPer caricarle su Firestore:`);
  console.log(`  node scripts/uploadTranslations.js ${langCodes.join(' ')}\n`);
}

main().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
