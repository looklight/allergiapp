/**
 * =============================================================================
 * SCRIPT: Import ristoranti da XLS → Supabase
 * =============================================================================
 *
 * COSA FA:
 *   Legge un file Excel con l'elenco dei ristoranti, cerca ciascuno su Google
 *   Places per ottenere dati precisi (indirizzo, coordinate, tipo cucina), poi
 *   inserisce nel database Supabase: ristorante + voto cucina + recensione.
 *   Simula esattamente quello che farebbe un utente reale dalla app.
 *
 * USO:
 *   cd allergiapp
 *   node scripts/import/import-restaurants.js                          ← import reale (file XLS di default)
 *   node scripts/import/import-restaurants.js --dry-run                ← solo simulazione, nessuna scrittura
 *   node scripts/import/import-restaurants.js /path/to/altro-file.xlsx ← usa un file XLS specifico
 *   node scripts/import/import-restaurants.js /path/to/file.xlsx --dry-run
 *
 * FORMATI EXCEL SUPPORTATI:
 *
 *   Formato A — colonna "Utente" (lettera a/b/c…, vedi seed-users.js):
 *     Nome, Città, Nazione, Stelle, Utente, Recensione, Link Google Maps
 *
 *   Formato B — colonna "Nickname" (nome diretto, vedi seed-users.js):
 *     Nome Locale, Città, Nazione, ⭐, glutine, vegetariano, vegano,
 *     Nickname, email, Recensione
 *     (Link Google Maps assente — fallback: retry Places con nome+nazione)
 *
 *   Lo script rileva il formato automaticamente dalle colonne presenti.
 *
 * VARIABILI D'AMBIENTE (file .env nella root di allergiapp/):
 *   GOOGLE_PLACES_API_KEY        → API key Google Places (New API)
 *   EXPO_PUBLIC_SUPABASE_URL     → URL del progetto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY    → chiave service role (bypassa RLS e email verification)
 *
 * UTENTI SEED:
 *   Definiti in seed-users.js nella stessa cartella.
 *   Vengono creati automaticamente la prima volta e riutilizzati nei run successivi.
 *   I dati di accesso vengono salvati in seed-users-log.json (gitignored).
 *
 * IDEMPOTENZA (puoi eseguirlo più volte senza problemi):
 *   - Ristorante già presente (stesso google_place_id) → saltato
 *   - Recensione già presente (stesso utente + ristorante) → saltata
 *   - Utente seed già esistente → riutilizzato
 *   - In caso di interruzione: rilancia lo script, riparte dai mancanti
 *
 * OUTPUT FILE DI ERRORI:
 *   Se alcuni ristoranti falliscono, vengono salvati in failed-restaurants.json
 *   nella stessa cartella. Correggili manualmente e reinseriscili nel DB.
 *
 * NOTE:
 *   - Pausa di 200ms tra ogni ristorante per rispettare i rate limit di Places API
 *   - Ricerca Places: prima nome+città+nazione, poi retry nome+nazione se nessun risultato
 *   - Se Places non trova nulla dopo il retry, il ristorante va in failed-restaurants.json
 * =============================================================================
 */

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SEED_USERS      = require('./seed-users');
const SEED_USERS_LOG  = path.join(__dirname, 'seed-users-log.json');
const FAILED_LOG      = path.join(__dirname, 'failed-restaurants.json');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const xlsArg = process.argv.slice(2).find(a => a.endsWith('.xlsx'));
const XLS_PATH = xlsArg
  ? path.resolve(xlsArg)
  : path.join(__dirname, '../../..', 'gf_europa_recensioni_reali.xlsx');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLACES_KEY   = process.env.GOOGLE_PLACES_API_KEY;
const DRY_RUN      = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY || !PLACES_KEY) {
  console.error('❌ Variabili mancanti nel .env (EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_API_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Normalizzazione riga Excel — supporta formato A (Utente) e formato B (Nickname)
// ---------------------------------------------------------------------------

function normalizeRow(row, format) {
  if (format === 'B') {
    const userKey = row['Nickname'];
    const user    = SEED_USERS[userKey];

    // "Nazione" classico, oppure "Stato" (US state code / country name)
    let nazione = row['Nazione'];
    if (!nazione && row['Stato']) {
      const stato = row['Stato'].trim();
      // Codici US a 2 lettere → aggiungi ", USA" per Google Places
      const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
      nazione = US_STATES.includes(stato) ? `${stato}, USA` : stato;
    }

    return {
      nome:     row['Nome Locale'],
      citta:    row['Città'] || row['Citta'],
      nazione,
      stelle:   Number(row['⭐']),
      rec:      row['Recensione'] || null,
      url:      null,
      userKey,
      allergens: user?.allergens ?? ['gluten'],
      diets:     user?.diets     ?? [],
    };
  }

  // Formato A
  const letter = row['Utente'];
  const user   = SEED_USERS[letter];
  return {
    nome:     row['Nome'],
    citta:    row['Città'] || row['Citta'],
    nazione:  row['Nazione'],
    stelle:   Number(row['Stelle']),
    rec:      row['Recensione'] || null,
    url:      row['Link Google Maps'] || null,
    userKey:  letter,
    allergens: user?.allergens ?? [],
    diets:     user?.diets     ?? [],
  };
}

// ---------------------------------------------------------------------------
// Mappa Google primaryType → cuisine ID app
// ---------------------------------------------------------------------------

const GOOGLE_TYPE_TO_CUISINE = {
  italian_restaurant:          'italian',
  modern_italian_restaurant:   'italian',
  pizza_restaurant:            'pizza',
  french_restaurant:           'french',
  modern_french_restaurant:    'french',
  bistro:                      'french',
  crepe_restaurant:            'french',
  spanish_restaurant:          'spanish',
  tapas_bar:                   'spanish',
  tapas_restaurant:            'spanish',
  basque_restaurant:           'spanish',
  mediterranean_restaurant:    'mediterranean',
  greek_restaurant:            'mediterranean',
  portuguese_restaurant:       'mediterranean',
  steak_house:                 'meat_grill',
  barbecue_restaurant:         'meat_grill',
  bar_and_grill:               'meat_grill',
  seafood_restaurant:          'seafood',
  fish_and_chips_restaurant:   'seafood',
  poke_restaurant:             'seafood',
  hamburger_restaurant:        'hamburger',
  sandwich_shop:               'hamburger',
  fast_food_restaurant:        'hamburger',
  american_restaurant:         'hamburger',
  new_american_restaurant:     'hamburger',
  hot_dog_restaurant:          'hamburger',
  hoagie_restaurant:           'hamburger',
  deli:                        'hamburger',
  sushi_restaurant:            'sushi',
  japanese_restaurant:         'japanese',
  ramen_restaurant:            'japanese',
  japanese_curry_restaurant:   'japanese',
  izakaya_restaurant:          'japanese',
  teppanyaki_restaurant:       'japanese',
  omakase_restaurant:          'japanese',
  shabu_shabu_restaurant:      'japanese',
  tempura_restaurant:          'japanese',
  tonkatsu_restaurant:         'japanese',
  udon_noodle_restaurant:      'japanese',
  yakitori_restaurant:         'japanese',
  yakiniku_restaurant:         'japanese',
  chinese_restaurant:          'chinese',
  dim_sum_restaurant:          'chinese',
  cantonese_restaurant:        'chinese',
  szechuan_restaurant:         'chinese',
  taiwanese_restaurant:        'chinese',
  hot_pot_restaurant:          'chinese',
  korean_restaurant:           'korean',
  korean_barbecue_restaurant:  'korean',
  vietnamese_restaurant:       'vietnamese',
  cambodian_restaurant:        'vietnamese',
  thai_restaurant:             'thai',
  indonesian_restaurant:       'thai',
  malaysian_restaurant:        'thai',
  singaporean_restaurant:      'thai',
  indian_restaurant:           'indian',
  modern_indian_restaurant:    'indian',
  pakistani_restaurant:        'indian',
  punjabi_restaurant:          'indian',
  sri_lankan_restaurant:       'indian',
  bangladeshi_restaurant:      'indian',
  nepalese_restaurant:         'indian',
  middle_eastern_restaurant:   'middle_eastern',
  lebanese_restaurant:         'middle_eastern',
  turkish_restaurant:          'middle_eastern',
  iranian_restaurant:          'middle_eastern',
  iraqi_restaurant:            'middle_eastern',
  israeli_restaurant:          'middle_eastern',
  moroccan_restaurant:         'middle_eastern',
  afghani_restaurant:          'middle_eastern',
  kebab_restaurant:            'middle_eastern',
  uzbek_restaurant:            'middle_eastern',
  caucasian_restaurant:        'middle_eastern',
  falafel_restaurant:          'middle_eastern',
  mexican_restaurant:          'mexican',
  tex_mex_restaurant:          'mexican',
  latin_american_restaurant:   'latin_american',
  brazilian_restaurant:        'latin_american',
  peruvian_restaurant:         'latin_american',
  caribbean_restaurant:        'latin_american',
  cuban_restaurant:            'latin_american',
  colombian_restaurant:        'latin_american',
  argentinian_restaurant:      'latin_american',
  bakery:                      'bakery',
  pastry_shop:                 'bakery',
  donut_shop:                  'bakery',
  bagel_shop:                  'bakery',
  chocolate_shop:              'bakery',
  candy_store:                 'bakery',
  confectionery:               'bakery',
  waffle_shop:                 'bakery',
  cafe:                        'cafe',
  coffee_shop:                 'cafe',
  coffee_roastery:             'cafe',
  pub:                         'cafe',
  bar:                         'cafe',
  tea_house:                   'cafe',
  juice_shop:                  'cafe',
  brewery:                     'cafe',
  cocktail_bar:                'cafe',
  beer_garden:                 'cafe',
  wine_bar:                    'cafe',
  brunch_restaurant:           'cafe',
  breakfast_restaurant:        'cafe',
  ice_cream_shop:              'ice_cream',
  dessert_shop:                'ice_cream',
  gelato_shop:                 'ice_cream',
};

// ---------------------------------------------------------------------------
// Google Places API
// ---------------------------------------------------------------------------

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
  const localityComp = components.find(c =>
    c.types?.includes('locality') || c.types?.includes('postal_town')
  );
  const cuisineId = place.primaryType ? GOOGLE_TYPE_TO_CUISINE[place.primaryType] : null;

  return {
    googlePlaceId: place.id,
    name:          place.displayName?.text ?? null,
    address:       place.formattedAddress ?? null,
    city:          localityComp?.longText ?? null,
    country:       countryComp?.longText ?? null,
    latitude:      place.location?.latitude ?? null,
    longitude:     place.location?.longitude ?? null,
    primaryType:   place.primaryType ?? null,
    cuisineTypes:  cuisineId ? [cuisineId] : [],
  };
}

async function searchPlace(name, city, country) {
  // Tentativo 1: nome + città + nazione
  let result = await searchPlaceQuery(`${name} ${city} ${country}`);
  if (result) return result;

  console.warn(`  ⚠️  Nessun risultato per "${name}, ${city}" — retry con nome + nazione`);

  // Tentativo 2: nome + nazione (senza città)
  result = await searchPlaceQuery(`${name} ${country}`);
  if (result) {
    console.warn(`  ↩️  Trovato con fallback (nome + nazione)`);
    return result;
  }

  console.warn(`  ❌ Nessun risultato nemmeno con fallback`);
  return null;
}

// Estrae lat/lng dall'URL Google Maps (es. https://www.google.com/maps?q=48.19,16.36)
function extractCoords(url) {
  if (!url) return null;
  const m = url.match(/[?&]q=([\d.+-]+),([\d.+-]+)/);
  if (!m) return null;
  return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) };
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function getOrCreateUser(userKey) {
  const userData = SEED_USERS[userKey];
  if (!userData) throw new Error(`Utente "${userKey}" non trovato in seed-users.js`);

  const { username, allergens, diets = [] } = userData;
  const email = `seed.${username.toLowerCase().replace(/_/g, '.')}@allergiapp.com`;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', username)
    .single();

  if (existing) {
    console.log(`  👤 Utente esistente: ${username} (${existing.id})`);
    return existing.id;
  }

  if (DRY_RUN) {
    const fakeId = randomUUID();
    console.log(`  [DRY] Creerebbe utente: ${username} → ${email}`);
    return fakeId;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { display_name: username },
  });

  if (authError) {
    if (authError.message?.includes('already')) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find(u => u.email === email);
      if (found) return found.id;
    }
    throw new Error(`Auth error per ${username}: ${authError.message}`);
  }

  const userId = authData.user.id;

  await supabase.from('profiles').upsert({
    id: userId,
    display_name: username,
    allergens,
    dietary_preferences: diets,
    role: 'user',
  }, { onConflict: 'id' });

  console.log(`  ✅ Utente creato: ${username} (${userId}) — allergens: [${allergens}], diets: [${diets}]`);
  return userId;
}

async function upsertRestaurant(placeData, userId) {
  if (DRY_RUN) {
    console.log(`  [DRY] Inserirebbe ristorante: ${placeData.name} (${placeData.googlePlaceId})`);
    return randomUUID();
  }

  if (placeData.googlePlaceId) {
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('google_place_id', placeData.googlePlaceId)
      .single();

    if (existing) {
      console.log(`  ⏭️  Ristorante già presente: ${placeData.name}`);
      return existing.id;
    }
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name:            placeData.name,
      address:         placeData.address,
      city:            placeData.city,
      country:         placeData.country,
      location:        `POINT(${placeData.longitude} ${placeData.latitude})`,
      google_place_id: placeData.googlePlaceId,
      added_by:        userId,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Insert restaurant: ${error.message}`);
  return data.id;
}

async function voteCuisines(restaurantId, userId, cuisineIds) {
  if (!cuisineIds?.length) return;
  if (DRY_RUN) {
    console.log(`  [DRY] Voterebbe cuisine: ${cuisineIds.join(', ')}`);
    return;
  }
  await supabase
    .from('restaurant_cuisine_votes')
    .delete()
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId);

  const rows = cuisineIds.map(id => ({ restaurant_id: restaurantId, user_id: userId, cuisine_id: id }));
  const { error } = await supabase.from('restaurant_cuisine_votes').insert(rows);
  if (error) console.warn(`  ⚠️  cuisine_votes: ${error.message}`);
}

async function upsertReview(restaurantId, userId, rating, comment, allergens, diets) {
  if (DRY_RUN) {
    console.log(`  [DRY] Inserirebbe review: ${rating}⭐ "${comment ?? ''}" allergens:[${allergens}] diets:[${diets}]`);
    return;
  }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log(`  ⏭️  Review già presente`);
    return;
  }

  const { error } = await supabase.rpc('upsert_review', {
    p_restaurant_id:       restaurantId,
    p_user_id:             userId,
    p_rating:              rating,
    p_comment:             comment || null,
    p_allergens_snapshot:  allergens,
    p_dietary_snapshot:    diets,
    p_photos:              [],
    p_generated_id:        randomUUID(),
    p_language:            'it',
  });

  if (error) throw new Error(`upsert_review: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '🧪 DRY RUN — nessuna scrittura su DB\n' : '🚀 Import ristoranti\n');
  console.log(`📂 File XLS: ${XLS_PATH}\n`);

  if (!fs.existsSync(XLS_PATH)) {
    console.error(`❌ File non trovato: ${XLS_PATH}`);
    process.exit(1);
  }

  // 1. Leggi XLS
  const wb = XLSX.readFile(XLS_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`📋 Trovate ${rows.length} righe nel file\n`);

  // Rileva formato
  const format = rows[0]?.['Nickname'] !== undefined ? 'B' : 'A';
  console.log(`📐 Formato rilevato: ${format === 'B' ? 'B (Nickname/email)' : 'A (Utente/lettera)'}\n`);

  // 2. Raccogli utenti unici e creali
  console.log('👥 Creazione utenti seed...');
  const userKeys = [...new Set(rows.map(r => format === 'B' ? r['Nickname'] : r['Utente']).filter(Boolean))];
  const userIds = {};
  const seedLog = {};

  for (const key of userKeys) {
    if (!SEED_USERS[key]) {
      console.warn(`  ⚠️  Utente "${key}" non trovato in seed-users.js — saltato`);
      continue;
    }
    userIds[key] = await getOrCreateUser(key);
    const { username, allergens, diets = [] } = SEED_USERS[key];
    const email = `seed.${username.toLowerCase().replace(/_/g, '.')}@allergiapp.com`;
    seedLog[key] = { username, email, userId: userIds[key], allergens, diets };
  }

  if (!DRY_RUN) {
    fs.writeFileSync(SEED_USERS_LOG, JSON.stringify(seedLog, null, 2));
    console.log(`\n💾 Log utenti seed salvato in scripts/import/seed-users-log.json`);
  }
  console.log('');

  // 3. Import ristoranti
  let ok = 0, skipped = 0, errors = 0;
  const failedRows = [];

  for (const row of rows) {
    const { nome, citta, nazione, stelle, rec, url, userKey, allergens, diets } = normalizeRow(row, format);

    if (!nome || !userKey || !userIds[userKey]) {
      console.log(`⚠️  Riga saltata (dati mancanti o utente sconosciuto): ${nome || '(senza nome)'}`);
      skipped++;
      continue;
    }

    console.log(`\n🍽️  ${nome} — ${citta} (utente: ${SEED_USERS[userKey]?.username})`);

    try {
      // 4. Cerca su Google Places (con retry automatico)
      let placeData = await searchPlace(nome, citta, nazione);

      // Fallback finale: usa coordinate dall'URL (solo formato A)
      if (!placeData && url) {
        const coords = extractCoords(url);
        if (coords) {
          placeData = {
            googlePlaceId: null,
            name:     nome,
            address:  null,
            city:     citta,
            country:  nazione,
            latitude:  coords.latitude,
            longitude: coords.longitude,
            cuisineTypes: [],
          };
          console.log(`  ⚠️  Uso coordinate dall'URL come fallback`);
        }
      }

      if (!placeData) {
        console.log(`  ❌ Saltato: nessuna coordinata disponibile — aggiungilo manualmente`);
        failedRows.push({ nome, citta, nazione, motivo: 'nessuna coordinata trovata' });
        errors++;
        continue;
      } else if (placeData.googlePlaceId) {
        console.log(`  📍 ${placeData.name} — ${placeData.address}`);
        console.log(`  🏷️  primaryType: ${placeData.primaryType ?? 'n/d'} → ${placeData.cuisineTypes[0] ?? 'nessuna categoria'}`);
      }

      const userId = userIds[userKey];

      // 5. Inserisci ristorante
      const restaurantId = await upsertRestaurant(placeData, userId);

      // 6. Vota cuisines
      await voteCuisines(restaurantId, userId, placeData.cuisineTypes);

      // 7. Inserisci recensione con allergens + diets snapshot
      await upsertReview(restaurantId, userId, stelle, rec, allergens, diets);

      console.log(`  ✅ OK`);
      ok++;

    } catch (err) {
      console.error(`  ❌ Errore: ${err.message}`);
      failedRows.push({ nome, citta, nazione, motivo: err.message });
      errors++;
    }

    // Pausa per non superare i rate limit di Places API
    await new Promise(r => setTimeout(r, 200));
  }

  // 8. Salva ristoranti falliti
  if (!DRY_RUN && failedRows.length > 0) {
    fs.writeFileSync(FAILED_LOG, JSON.stringify(failedRows, null, 2));
    console.log(`\n⚠️  Ristoranti non trovati salvati in scripts/import/failed-restaurants.json`);
    console.log(`   Inseriscili manualmente nel DB.`);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅ Inseriti:  ${ok}`);
  console.log(`⏭️  Saltati:   ${skipped}`);
  console.log(`❌ Non trovati: ${errors}`);
  console.log(`─────────────────────────────`);
}

main().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
