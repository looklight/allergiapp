import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PlaceSuggestion } from '../types/restaurants';
import {
  getCachedSearch,
  setCachedSearch,
  getCachedDetails,
  setCachedDetails,
  deduplicatedSearch,
  deduplicatedDetails,
} from './placesCache';

// ---------------------------------------------------------------------------
// Google Places API (New) — https://places.googleapis.com/v1
// Key separate per piattaforma con restrizioni app in Google Cloud Console.
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_API_KEY = Platform.OS === 'ios'
  ? (Constants.expoConfig?.extra?.googlePlacesApiKeyIos as string) ?? ''
  : (Constants.expoConfig?.extra?.googlePlacesApiKeyAndroid as string) ?? '';

// Header di identità per far funzionare le restrizioni app sulle chiamate REST
const PLATFORM_IDENTITY_HEADERS: Record<string, string> = Platform.OS === 'ios'
  ? { 'X-Ios-Bundle-Identifier': 'com.allergiapp' }
  : { 'X-Android-Package': 'com.allergiapp.mobile',
      'X-Android-Cert': '739F2289ED4F9A5693E63B8C2A06B0C0D0F3D1A2' };

const BASE_URL = 'https://places.googleapis.com/v1';

// ---------------------------------------------------------------------------
// Tipi pubblici (shape invariata per i consumer)
// ---------------------------------------------------------------------------

export interface PlaceAutocompleteResult {
  placeId: string;
  description: string;   // Nome + indirizzo formattato
  mainText: string;      // Solo nome del locale
  secondaryText: string; // Solo indirizzo/città
}

// ---------------------------------------------------------------------------
// Tipi interni — New API responses
// ---------------------------------------------------------------------------

interface NewApiPrediction {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
  };
}

interface NewApiAddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface NewApiPlaceDetails {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: NewApiAddressComponent[];
  primaryType?: string;
}

// Mappa primaryType di Google → cuisine ID dell'app
const GOOGLE_TYPE_TO_CUISINE: Record<string, string> = {
  // Italiana
  italian_restaurant:         'italian',
  modern_italian_restaurant:  'italian',

  // Pizza
  pizza_restaurant:           'pizza',

  // Francese
  french_restaurant:          'french',
  modern_french_restaurant:   'french',
  bistro:                     'french',
  crepe_restaurant:           'french',

  // Spagnola
  spanish_restaurant:         'spanish',
  tapas_bar:                  'spanish',
  tapas_restaurant:           'spanish',
  basque_restaurant:          'spanish',

  // Mediterranea
  mediterranean_restaurant:   'mediterranean',
  greek_restaurant:           'mediterranean',
  portuguese_restaurant:      'mediterranean',

  // Carne e grigliate
  steak_house:                'meat_grill',
  barbecue_restaurant:        'meat_grill',
  bar_and_grill:              'meat_grill',

  // Pesce
  seafood_restaurant:         'seafood',
  fish_and_chips_restaurant:  'seafood',
  poke_restaurant:            'seafood',

  // Hamburger e panini
  hamburger_restaurant:       'hamburger',
  sandwich_shop:              'hamburger',
  fast_food_restaurant:       'hamburger',
  american_restaurant:        'hamburger',
  new_american_restaurant:    'hamburger',
  hot_dog_restaurant:         'hamburger',
  hoagie_restaurant:          'hamburger',
  deli:                       'hamburger',

  // Sushi
  sushi_restaurant:           'sushi',

  // Giapponese
  japanese_restaurant:        'japanese',
  ramen_restaurant:           'japanese',
  japanese_curry_restaurant:  'japanese',
  izakaya_restaurant:         'japanese',
  teppanyaki_restaurant:      'japanese',
  omakase_restaurant:         'japanese',
  shabu_shabu_restaurant:     'japanese',
  tempura_restaurant:         'japanese',
  tonkatsu_restaurant:        'japanese',
  udon_noodle_restaurant:     'japanese',
  yakitori_restaurant:        'japanese',
  yakiniku_restaurant:        'japanese',

  // Cinese
  chinese_restaurant:         'chinese',
  dim_sum_restaurant:         'chinese',
  cantonese_restaurant:       'chinese',
  szechuan_restaurant:        'chinese',
  taiwanese_restaurant:       'chinese',
  hot_pot_restaurant:         'chinese',

  // Coreana
  korean_restaurant:          'korean',
  korean_barbecue_restaurant: 'korean',

  // Vietnamita
  vietnamese_restaurant:      'vietnamese',
  cambodian_restaurant:       'vietnamese',

  // Thailandese
  thai_restaurant:            'thai',
  indonesian_restaurant:      'thai',
  malaysian_restaurant:       'thai',
  singaporean_restaurant:     'thai',

  // Indiana
  indian_restaurant:          'indian',
  modern_indian_restaurant:   'indian',
  south_indian_restaurant:    'indian',
  north_indian_restaurant:    'indian',
  pakistani_restaurant:       'indian',
  punjabi_restaurant:         'indian',
  sri_lankan_restaurant:      'indian',
  bangladeshi_restaurant:     'indian',
  nepalese_restaurant:        'indian',

  // Arabo e mediorientale
  middle_eastern_restaurant:  'middle_eastern',
  lebanese_restaurant:        'middle_eastern',
  turkish_restaurant:         'middle_eastern',
  iranian_restaurant:         'middle_eastern',
  iraqi_restaurant:           'middle_eastern',
  israeli_restaurant:         'middle_eastern',
  moroccan_restaurant:        'middle_eastern',
  afghani_restaurant:         'middle_eastern',
  kebab_restaurant:           'middle_eastern',
  uzbek_restaurant:           'middle_eastern',
  caucasian_restaurant:       'middle_eastern',
  falafel_restaurant:         'middle_eastern',

  // Messicana
  mexican_restaurant:         'mexican',
  tex_mex_restaurant:         'mexican',

  // Latino americana
  latin_american_restaurant:  'latin_american',
  brazilian_restaurant:       'latin_american',
  peruvian_restaurant:        'latin_american',
  caribbean_restaurant:       'latin_american',
  cuban_restaurant:           'latin_american',
  colombian_restaurant:       'latin_american',
  argentinian_restaurant:     'latin_american',
  chilean_restaurant:         'latin_american',

  // Bakery
  bakery:                     'bakery',
  pastry_shop:                'bakery',
  cake_shop:                  'bakery',
  donut_shop:                 'bakery',
  bagel_shop:                 'bakery',
  chocolate_shop:             'bakery',
  candy_store:                'bakery',
  confectionery:              'bakery',
  waffle_shop:                'bakery',

  // Caffè e bar
  cafe:                       'cafe',
  coffee_shop:                'cafe',
  coffee_roastery:            'cafe',
  pub:                        'cafe',
  bar:                        'cafe',
  tea_house:                  'cafe',
  juice_shop:                 'cafe',
  brewery:                    'cafe',
  cocktail_bar:               'cafe',
  beer_garden:                'cafe',
  wine_bar:                   'cafe',
  brunch_restaurant:          'cafe',
  breakfast_restaurant:       'cafe',

  // Gelateria
  ice_cream_shop:             'ice_cream',
  dessert_shop:               'ice_cream',
  gelato_shop:                'ice_cream',
};

// Mappa primaryType di Google → tipo struttura dell'app (faccetta lodging).
// Speculare a GOOGLE_TYPE_TO_CUISINE. Gli ID a destra sono il vocabolario
// canonico dei tipi struttura (le label tradotte arrivano con
// ACCOMMODATION_CATEGORIES, step dettaglio). Le CHIAVI sono anche il set che
// definisce "è un lodging?": un primaryType qui dentro → flusso struttura,
// altrimenti → flusso ristorante (default). Espandere se Google introduce
// sottotipi non coperti (es. nuovi *_inn).
const GOOGLE_TYPE_TO_LODGING: Record<string, string> = {
  lodging:              'hotel',   // generico → fallback Hotel
  hotel:                'hotel',
  resort_hotel:         'hotel',
  motel:                'hotel',
  extended_stay_hotel:  'hotel',
  inn:                  'hotel',
  japanese_inn:         'hotel',
  budget_japanese_inn:  'hotel',
  bed_and_breakfast:    'bnb',
  guest_house:          'guest_house',
  private_guest_room:   'guest_house',
  hostel:               'hostel',
  farmstay:             'agriturismo',
  cottage:              'apartment',
  cabin:                'apartment',
  camping_cabin:        'apartment',
};

// ---------------------------------------------------------------------------
// Estrazione città/country dagli address components (da Altrove)
// Gestione speciale JP/KR/CN e rimozione suffissi romanizzati
// ---------------------------------------------------------------------------

function extractCityFromComponents(
  components: NewApiAddressComponent[],
  countryCode: string,
): string {
  const isMetroCountry = ['JP', 'KR', 'CN'].includes(countryCode);

  const cityTypes = isMetroCountry
    ? ['administrative_area_level_1', 'locality', 'administrative_area_level_2']
    : [
        'locality',
        'postal_town',
        'administrative_area_level_3',
        'administrative_area_level_2',
        'sublocality_level_1',
      ];

  for (const type of cityTypes) {
    const comp = components.find(c => c.types?.includes(type));
    if (comp) {
      let name = comp.longText || comp.shortText;
      if (isMetroCountry && countryCode === 'JP') {
        name = name.replace(/[-\s]?(to|fu|ken|shi|ku)$/i, '');
      } else if (isMetroCountry && countryCode === 'CN') {
        name = name.replace(/\s+(shi|sheng|qu|xian)$/i, '');
      }
      return name;
    }
  }

  return '';
}

// ---------------------------------------------------------------------------
// Autocomplete — POST /v1/places:autocomplete
// ---------------------------------------------------------------------------

// Gruppi di tipi (max 5 per chiamata API Google)
// Nota: 'gelato_shop' e 'waffle_shop' NON sono primary type validi in Google
// Places API (New), nonostante esistano in altre versioni dell'API — rifiutati
// con 400. Le gelaterie sono comunque catturate da 'ice_cream_shop'. Mantenerli
// come VALORE in GOOGLE_TYPE_TO_CUISINE è innocuo (è una mappa di lookup), ma NON
// includerli in includedPrimaryTypes della richiesta.
//
// 'tea_house' e 'wine_bar' vanno elencati ESPLICITAMENTE: a differenza degli
// altri tipi bevande/dolci (pub, cocktail_bar, donut_shop, confectionery…) che
// l'autocomplete intercetta già tramite i tipi larghi 'restaurant'/'cafe'/'bar',
// questi due hanno un primaryType che non viene espanso da nessun tipo del primo
// gruppo. Senza elencarli, locali come le sale da tè ("Casa de Chá") o i wine bar
// sono invisibili nella ricerca pur essendo mappati a una cucina. Verificato via
// API 2026-06-01.
//
// 'food_court' idem: primaryType a sé, non espanso da 'restaurant'. Serve per i
// mercati gastronomici (es. Eataly Genova, primaryType food_court) altrimenti
// invisibili. Nessuna cucina pre-selezionata (assente da GOOGLE_TYPE_TO_CUISINE,
// scelta deliberata): l'utente sceglie i chip a mano. Lo slot è stato liberato
// togliendo 'pastry_shop', ridondante: 'bakery' espande sia pastry_shop che
// cake_shop (verificato via API 2026-07-12 su primaryType esatti). NOTA: le sedi
// Eataly con primaryType 'grocery_store' (Milano Smeraldo, Torino Lingotto, Roma)
// restano fuori di proposito — includere grocery_store aprirebbe la ricerca a
// tutti i supermercati.
//
// LODGING ('lodging'): tipo broad delle strutture ricettive, aggiunto al secondo
// gruppo (che aveva 4 tipi su 5) per NON introdurre una terza chiamata API per
// ogni ricerca — la feature hotel è un "di più", non deve appesantire il flusso
// ristoranti di tutti. L'assunzione è che 'lodging' broad-catturi hotel/B&B/
// ostelli ecc. come 'restaurant' cattura le cucine specifiche. DA VERIFICARE
// contro l'API New (stesso rischio 400 di gelato_shop/waffle_shop): se 'lodging'
// non fosse un includedPrimaryType valido o non espandesse i sottotipi, passare
// a un terzo gruppo con tipi specifici (hotel, bed_and_breakfast, guest_house,
// resort_hotel, hostel). Il primaryType di dettaglio (hotel/bed_and_breakfast/…)
// resta mappato da GOOGLE_TYPE_TO_LODGING in ogni caso.
const PLACE_TYPE_GROUPS = [
  ['restaurant', 'bakery', 'food_court', 'cafe', 'bar'],
  ['ice_cream_shop', 'dessert_shop', 'tea_house', 'wine_bar', 'lodging'],
];

async function fetchAutocomplete(query: string, types: string[]): Promise<PlaceAutocompleteResult[]> {
  const response = await fetch(`${BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      ...PLATFORM_IDENTITY_HEADERS,
    },
    body: JSON.stringify({
      input: query.trim(),
      languageCode: 'it',
      includedPrimaryTypes: types,
    }),
  });

  if (!response.ok) {
    console.warn('[PlacesService] Autocomplete error:', response.status);
    return [];
  }

  const data: { suggestions?: NewApiPrediction[] } = await response.json();
  if (!data.suggestions?.length) return [];

  return data.suggestions
    .filter((s): s is { placePrediction: NonNullable<NewApiPrediction['placePrediction']> } =>
      !!s.placePrediction,
    )
    .map(s => {
      const p = s.placePrediction;
      return {
        placeId: p.placeId,
        description: p.text.text,
        mainText: p.structuredFormat.mainText.text,
        secondaryText: p.structuredFormat.secondaryText?.text ?? '',
      };
    });
}

// ---------------------------------------------------------------------------
// Place Details — GET /v1/places/{placeId}
// ---------------------------------------------------------------------------

async function fetchPlaceDetails(placeId: string): Promise<PlaceSuggestion | null> {
  const response = await fetch(`${BASE_URL}/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents,primaryType',
      ...PLATFORM_IDENTITY_HEADERS,
    },
  });

  if (!response.ok) {
    console.warn('[PlacesService] Details error:', response.status);
    return null;
  }

  const place: NewApiPlaceDetails = await response.json();

  if (!place.location) {
    console.warn('[PlacesService] Nessuna location per placeId:', placeId);
    return null;
  }

  const components = place.addressComponents ?? [];

  const countryComp = components.find(c => c.types?.includes('country'));
  const countryCode = countryComp?.shortText ?? '';
  const country = countryComp?.longText ?? '';
  const city = extractCityFromComponents(components, countryCode);

  if (!city || !countryCode) {
    console.warn('[PlacesService] Dati luogo incompleti: city o countryCode mancanti', {
      city, countryCode, placeId,
    });
  }

  const mappedCuisine = place.primaryType
    ? GOOGLE_TYPE_TO_CUISINE[place.primaryType]
    : undefined;

  // Faccetta lodging: se il primaryType è un tipo struttura, è un hotel/B&B/…
  // (mutuamente esclusivo con la cucina: Google dà un solo primaryType).
  const mappedLodging = place.primaryType
    ? GOOGLE_TYPE_TO_LODGING[place.primaryType]
    : undefined;

  return {
    googlePlaceId: placeId,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    city,
    country,
    countryCode,
    location: {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
    },
    cuisineTypes: mappedCuisine ? [mappedCuisine] : [],
    lodgingType: mappedLodging,
    isLodging: !!mappedLodging,
  };
}

// ---------------------------------------------------------------------------
// API pubblica con cache + deduplicazione
// ---------------------------------------------------------------------------

async function searchPlaces(query: string): Promise<PlaceAutocompleteResult[]> {
  if (!GOOGLE_PLACES_API_KEY || query.trim().length < 2) return [];

  const cached = getCachedSearch(query);
  if (cached) return cached;

  try {
    const groupResults = await Promise.all(
      PLACE_TYPE_GROUPS.map((types, i) =>
        deduplicatedSearch(`${query}:${i}`, () => fetchAutocomplete(query, types)),
      ),
    );

    // Unisci e deduplica per placeId
    const seen = new Set<string>();
    const merged = groupResults.flat().filter(r => {
      if (seen.has(r.placeId)) return false;
      seen.add(r.placeId);
      return true;
    });

    setCachedSearch(query, merged);
    return merged;
  } catch (error) {
    console.warn('[PlacesService] Errore searchPlaces:', error);
    return [];
  }
}

async function getPlaceDetails(placeId: string): Promise<PlaceSuggestion | null> {
  if (!GOOGLE_PLACES_API_KEY) return null;

  const cached = getCachedDetails(placeId);
  if (cached) return cached;

  try {
    const result = await deduplicatedDetails(placeId, () => fetchPlaceDetails(placeId));
    if (result) setCachedDetails(placeId, result);
    return result;
  } catch (error) {
    console.warn('[PlacesService] Errore getPlaceDetails:', error);
    return null;
  }
}

export const PlacesService = {
  searchPlaces,
  getPlaceDetails,
  isConfigured: () => !!GOOGLE_PLACES_API_KEY,
};
