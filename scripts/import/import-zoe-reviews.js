/**
 * =============================================================================
 * SCRIPT: Import recensioni Zoe (CSV "Locali Veg") → Supabase
 * =============================================================================
 *
 * COSA FA:
 *   Legge il CSV con i locali recensiti da un UTENTE REALE GIÀ ESISTENTE (Zoe,
 *   v@a.com), cerca ciascun locale su Google Places (nome + città + paese,
 *   retry nome + paese), inserisce il ristorante (se mancante) + voto cucina +
 *   recensione. Lo snapshot allergeni/diete è quello reale del profilo di Zoe.
 *
 *   A differenza di import-restaurants.js NON crea utenti seed: usa l'account
 *   reale già presente. Le recensioni ricevono un created_at esplicito:
 *   tutte il 28/06/2026, orario casuale 09:00–21:00 (Europe/Rome), ordine casuale.
 *
 * USO:
 *   cd allergiapp
 *   node scripts/import/import-zoe-reviews.js --dry-run   ← simulazione, nessuna scrittura
 *   node scripts/import/import-zoe-reviews.js             ← import reale
 *   node scripts/import/import-zoe-reviews.js "/path/altro.csv"
 *
 * ENV (.env + .env.local nella root di allergiapp/):
 *   EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY
 *
 * IDEMPOTENTE:
 *   - ristorante già presente (stesso google_place_id) → riusato
 *   - recensione già presente (stesso utente + ristorante) → saltata
 * =============================================================================
 */

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ZOE_USER_ID = '98852f8b-5d94-4425-b3df-43117f2b5c23'; // v@a.com (username "Zoe")
const REVIEW_DATE = '2026-06-28';
const TZ_OFFSET   = '+02:00'; // Europe/Rome (CEST, giugno)
const HOUR_START  = 9;
const HOUR_END    = 21;

// Locali da NON importare (match Places non affidabile) — confronto sul nome CSV normalizzato
const SKIP_NAMES = new Set(['chilling cafe']);

const csvArg   = process.argv.slice(2).find(a => a.endsWith('.csv'));
const CSV_PATH = csvArg ? path.resolve(csvArg) : '/Users/z003ymfn/Desktop/Locali Veg.csv';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLACES_KEY   = process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN      = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY || !PLACES_KEY) {
  console.error('❌ Variabili mancanti (EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Parsing CSV (delimitatore ';', ultima colonna = Recensione, può contenere ';')
// ---------------------------------------------------------------------------

function parseCsv(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = lines[0].split(';').map(h => h.trim());
  const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iNome = 0;
  const iCitta = idx('città') !== -1 ? idx('città') : 1;
  const iPaese = idx('paese') !== -1 ? idx('paese') : 2;
  const iStelle = idx('stelle') !== -1 ? idx('stelle') : 3;
  const iRec = header.length - 1; // ultima colonna

  return lines.slice(1).map(line => {
    const parts = line.split(';');
    // Se la recensione contiene ';' i campi extra vanno ricongiunti nell'ultima colonna
    const fixed = parts.length > header.length
      ? [...parts.slice(0, header.length - 1), parts.slice(header.length - 1).join(';')]
      : parts;
    return {
      nome:   (fixed[iNome]   || '').trim(),
      citta:  (fixed[iCitta]  || '').trim(),
      paese:  (fixed[iPaese]  || '').trim(),
      stelle: Number((fixed[iStelle] || '').trim()),
      rec:    (fixed[iRec]    || '').trim() || null,
    };
  }).filter(r => r.nome);
}

// ---------------------------------------------------------------------------
// Timestamp casuali: 28/06/2026, 09:00–21:00, ordine casuale
// ---------------------------------------------------------------------------

function randomTimestamps(n) {
  const span = (HOUR_END - HOUR_START) * 3600; // secondi nella finestra
  const ts = [];
  for (let i = 0; i < n; i++) {
    const secs = Math.floor(Math.random() * span);
    const h = HOUR_START + Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (x) => String(x).padStart(2, '0');
    ts.push(`${REVIEW_DATE}T${pad(h)}:${pad(m)}:${pad(s)}${TZ_OFFSET}`);
  }
  return ts; // già in ordine casuale (random indipendenti)
}

// ---------------------------------------------------------------------------
// Google Places API (New) — stessa logica di import-restaurants.js
// ---------------------------------------------------------------------------

const GOOGLE_TYPE_TO_CUISINE = {
  italian_restaurant: 'italian', modern_italian_restaurant: 'italian', pizza_restaurant: 'pizza',
  french_restaurant: 'french', modern_french_restaurant: 'french', bistro: 'french', crepe_restaurant: 'french',
  spanish_restaurant: 'spanish', tapas_bar: 'spanish', tapas_restaurant: 'spanish', basque_restaurant: 'spanish',
  mediterranean_restaurant: 'mediterranean', greek_restaurant: 'mediterranean', portuguese_restaurant: 'mediterranean',
  steak_house: 'meat_grill', barbecue_restaurant: 'meat_grill', bar_and_grill: 'meat_grill',
  seafood_restaurant: 'seafood', fish_and_chips_restaurant: 'seafood', poke_restaurant: 'seafood',
  hamburger_restaurant: 'hamburger', sandwich_shop: 'hamburger', fast_food_restaurant: 'hamburger',
  american_restaurant: 'hamburger', new_american_restaurant: 'hamburger', hot_dog_restaurant: 'hamburger',
  hoagie_restaurant: 'hamburger', deli: 'hamburger',
  sushi_restaurant: 'sushi', japanese_restaurant: 'japanese', ramen_restaurant: 'japanese',
  japanese_curry_restaurant: 'japanese', izakaya_restaurant: 'japanese', teppanyaki_restaurant: 'japanese',
  omakase_restaurant: 'japanese', shabu_shabu_restaurant: 'japanese', tempura_restaurant: 'japanese',
  tonkatsu_restaurant: 'japanese', udon_noodle_restaurant: 'japanese', yakitori_restaurant: 'japanese',
  yakiniku_restaurant: 'japanese',
  chinese_restaurant: 'chinese', dim_sum_restaurant: 'chinese', cantonese_restaurant: 'chinese',
  szechuan_restaurant: 'chinese', taiwanese_restaurant: 'chinese', hot_pot_restaurant: 'chinese',
  korean_restaurant: 'korean', korean_barbecue_restaurant: 'korean',
  vietnamese_restaurant: 'vietnamese', cambodian_restaurant: 'vietnamese',
  thai_restaurant: 'thai', indonesian_restaurant: 'thai', malaysian_restaurant: 'thai', singaporean_restaurant: 'thai',
  indian_restaurant: 'indian', modern_indian_restaurant: 'indian', pakistani_restaurant: 'indian',
  punjabi_restaurant: 'indian', sri_lankan_restaurant: 'indian', bangladeshi_restaurant: 'indian', nepalese_restaurant: 'indian',
  middle_eastern_restaurant: 'middle_eastern', lebanese_restaurant: 'middle_eastern', turkish_restaurant: 'middle_eastern',
  iranian_restaurant: 'middle_eastern', iraqi_restaurant: 'middle_eastern', israeli_restaurant: 'middle_eastern',
  moroccan_restaurant: 'middle_eastern', afghani_restaurant: 'middle_eastern', kebab_restaurant: 'middle_eastern',
  uzbek_restaurant: 'middle_eastern', caucasian_restaurant: 'middle_eastern', falafel_restaurant: 'middle_eastern',
  mexican_restaurant: 'mexican', tex_mex_restaurant: 'mexican',
  latin_american_restaurant: 'latin_american', brazilian_restaurant: 'latin_american', peruvian_restaurant: 'latin_american',
  caribbean_restaurant: 'latin_american', cuban_restaurant: 'latin_american', colombian_restaurant: 'latin_american',
  argentinian_restaurant: 'latin_american',
  bakery: 'bakery', pastry_shop: 'bakery', donut_shop: 'bakery', bagel_shop: 'bakery', chocolate_shop: 'bakery',
  candy_store: 'bakery', confectionery: 'bakery', waffle_shop: 'bakery',
  cafe: 'cafe', coffee_shop: 'cafe', coffee_roastery: 'cafe', pub: 'cafe', bar: 'cafe', tea_house: 'cafe',
  juice_shop: 'cafe', brewery: 'cafe', cocktail_bar: 'cafe', beer_garden: 'cafe', wine_bar: 'cafe',
  brunch_restaurant: 'cafe', breakfast_restaurant: 'cafe',
  ice_cream_shop: 'ice_cream', dessert_shop: 'ice_cream', gelato_shop: 'ice_cream',
};

async function searchPlaceQuery(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'it', maxResultCount: 1 }),
  });
  if (!res.ok) {
    console.warn(`  ⚠️  Places API error ${res.status} per "${query}"`);
    return null;
  }
  const data = await res.json();
  if (!data.places?.length) return null;
  const place = data.places[0];
  const components = place.addressComponents ?? [];
  const countryComp  = components.find(c => c.types?.includes('country'));
  const localityComp = components.find(c => c.types?.includes('locality') || c.types?.includes('postal_town'));
  const cuisineId = place.primaryType ? GOOGLE_TYPE_TO_CUISINE[place.primaryType] : null;
  return {
    googlePlaceId: place.id,
    name:          place.displayName?.text ?? null,
    address:       place.formattedAddress ?? null,
    city:          localityComp?.longText ?? null,
    country:       countryComp?.longText ?? null,
    countryCode:   countryComp?.shortText ?? null, // ISO-3166 alpha-2 (lingua-indipendente)
    latitude:      place.location?.latitude ?? null,
    longitude:     place.location?.longitude ?? null,
    primaryType:   place.primaryType ?? null,
    cuisineTypes:  cuisineId ? [cuisineId] : [],
  };
}

// Paese CSV → ISO alpha-2, per scartare match nel paese sbagliato
const COUNTRY_TO_ISO = { italy: 'IT', italia: 'IT', spain: 'ES', spagna: 'ES', 'españa': 'ES', japan: 'JP', giappone: 'JP' };

async function searchPlace(name, city, country) {
  const expectedIso = COUNTRY_TO_ISO[(country || '').trim().toLowerCase()] ?? null;
  const okCountry = (r) => !expectedIso || !r.countryCode || r.countryCode === expectedIso;

  let result = await searchPlaceQuery(`${name} ${city} ${country}`);
  if (result && okCountry(result)) return result;
  if (result) console.warn(`  ⚠️  Match scartato (paese ${result.countryCode} ≠ atteso ${expectedIso}): ${result.name}`);
  else console.warn(`  ⚠️  Nessun risultato per "${name}, ${city}" — retry con nome + paese`);

  result = await searchPlaceQuery(`${name} ${country}`);
  if (result && okCountry(result)) { console.warn(`  ↩️  Trovato con fallback (nome + paese)`); return result; }
  if (result) console.warn(`  ⚠️  Match fallback scartato (paese ${result.countryCode} ≠ atteso ${expectedIso}): ${result.name}`);
  console.warn(`  ❌ Nessun match valido`);
  return null;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function upsertRestaurant(p, userId) {
  if (p.googlePlaceId) {
    const { data: existing } = await supabase
      .from('restaurants').select('id, name').eq('google_place_id', p.googlePlaceId).maybeSingle();
    if (existing) { console.log(`  ⏭️  Ristorante già presente: ${existing.name}`); return existing.id; }
  }
  if (DRY_RUN) { console.log(`  [DRY] Inserirebbe ristorante: ${p.name} (${p.googlePlaceId})`); return randomUUID(); }
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name: p.name, address: p.address, city: p.city, country: p.country,
      country_code: p.countryCode, // ISO alpha-2 (come fa il form dell'app)
      location: `POINT(${p.longitude} ${p.latitude})`,
      google_place_id: p.googlePlaceId, added_by: userId,
    })
    .select('id').single();
  if (error) throw new Error(`Insert restaurant: ${error.message}`);
  return data.id;
}

async function voteCuisines(restaurantId, userId, cuisineIds) {
  if (!cuisineIds?.length) return;
  if (DRY_RUN) { console.log(`  [DRY] Voterebbe cuisine: ${cuisineIds.join(', ')}`); return; }
  await supabase.from('restaurant_cuisine_votes').delete().eq('restaurant_id', restaurantId).eq('user_id', userId);
  const rows = cuisineIds.map(id => ({ restaurant_id: restaurantId, user_id: userId, cuisine_id: id }));
  const { error } = await supabase.from('restaurant_cuisine_votes').insert(rows);
  if (error) console.warn(`  ⚠️  cuisine_votes: ${error.message}`);
}

async function insertReview(restaurantId, userId, rating, comment, allergens, diets, createdAt) {
  const { data: existing } = await supabase
    .from('reviews').select('id').eq('restaurant_id', restaurantId).eq('user_id', userId).maybeSingle();
  if (existing) { console.log(`  ⏭️  Review già presente`); return; }
  if (DRY_RUN) {
    console.log(`  [DRY] Review ${rating}⭐ @ ${createdAt} snap[allerg:${allergens}|diet:${diets}] "${(comment||'').slice(0,40)}…"`);
    return;
  }
  const { error } = await supabase.from('reviews').insert({
    id: randomUUID(), restaurant_id: restaurantId, user_id: userId,
    rating, comment: comment || null,
    allergens_snapshot: allergens, dietary_snapshot: diets,
    language: 'it', photos: [],
    created_at: createdAt, updated_at: createdAt,
  });
  if (error) throw new Error(`insert review: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN — nessuna scrittura su DB\n' : '🚀 Import recensioni Zoe\n');
  console.log(`📂 CSV: ${CSV_PATH}\n`);

  if (!fs.existsSync(CSV_PATH)) { console.error(`❌ File non trovato: ${CSV_PATH}`); process.exit(1); }

  // Snapshot dal profilo reale di Zoe
  const { data: prof, error: pErr } = await supabase
    .from('profiles').select('username, allergens, dietary_preferences').eq('id', ZOE_USER_ID).single();
  if (pErr || !prof) { console.error(`❌ Profilo Zoe non trovato: ${pErr?.message}`); process.exit(1); }
  const allergens = prof.allergens ?? [];
  const diets     = prof.dietary_preferences ?? [];
  console.log(`👤 Utente: ${prof.username} (${ZOE_USER_ID}) — snapshot allergens:[${allergens}] diets:[${diets}]\n`);

  const rows = parseCsv(CSV_PATH);
  console.log(`📋 ${rows.length} righe nel CSV\n`);
  const timestamps = randomTimestamps(rows.length);

  let ok = 0, errors = 0, skipped = 0;
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const { nome, citta, paese, stelle, rec } = rows[i];
    const createdAt = timestamps[i];
    console.log(`\n🍽️  ${nome} — ${citta} (${stelle}⭐)`);
    if (SKIP_NAMES.has(nome.trim().toLowerCase())) {
      console.log(`  ⏭️  Saltato volontariamente (in SKIP_NAMES)`);
      skipped++;
      continue;
    }
    try {
      const placeData = await searchPlace(nome, citta, paese);
      if (!placeData) {
        console.log(`  ❌ Saltato: nessuna coordinata trovata`);
        failed.push({ nome, citta, paese, motivo: 'place non trovato' });
        errors++; continue;
      }
      console.log(`  📍 ${placeData.name} — ${placeData.address}`);
      console.log(`  🏷️  ${placeData.primaryType ?? 'n/d'} → ${placeData.cuisineTypes[0] ?? 'nessuna categoria'}`);

      const restaurantId = await upsertRestaurant(placeData, ZOE_USER_ID);
      await voteCuisines(restaurantId, ZOE_USER_ID, placeData.cuisineTypes);
      await insertReview(restaurantId, ZOE_USER_ID, stelle, rec, allergens, diets, createdAt);
      console.log(`  ✅ OK (${createdAt})`);
      ok++;
    } catch (err) {
      console.error(`  ❌ Errore: ${err.message}`);
      failed.push({ nome, citta, paese, motivo: err.message });
      errors++;
    }
    await new Promise(r => setTimeout(r, 200)); // rate limit Places
  }

  if (!DRY_RUN && failed.length) {
    fs.writeFileSync(path.join(__dirname, 'failed-zoe.json'), JSON.stringify(failed, null, 2));
    console.log(`\n⚠️  Falliti salvati in scripts/import/failed-zoe.json`);
  }
  console.log(`\n─────────────────────────────`);
  console.log(`✅ OK: ${ok}   ⏭️  Saltati: ${skipped}   ❌ Falliti: ${errors}`);
  console.log(`─────────────────────────────`);
}

main().catch(err => { console.error('Errore fatale:', err); process.exit(1); });
