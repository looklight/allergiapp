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
// Migrato dalla Legacy REST API per allineamento con Altrove e futuro Google.
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_API_KEY =
  (Constants.expoConfig?.extra?.googlePlacesApiKey as string) ?? '';

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
}

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

async function fetchAutocomplete(query: string): Promise<PlaceAutocompleteResult[]> {
  const response = await fetch(`${BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
    },
    body: JSON.stringify({
      input: query.trim(),
      languageCode: 'it',
      includedPrimaryTypes: ['restaurant'],
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
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
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
    const results = await deduplicatedSearch(query, () => fetchAutocomplete(query));
    setCachedSearch(query, results);
    return results;
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
