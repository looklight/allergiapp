import type { AllergenId, DietaryNeeds, RestaurantCategoryId } from './index';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Usato nella schermata di aggiunta ristorante (ricerca Google Places)
export interface PlaceSuggestion {
  googlePlaceId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  countryCode: string;
  location: GeoPoint;
  cuisineTypes?: string[];
  // Faccetta lodging dedotta dal primaryType Google (vedi GOOGLE_TYPE_TO_LODGING).
  // lodgingType undefined + isLodging false = luogo trattato come ristorante.
  lodgingType?: string;
  isLodging?: boolean;
}

// Motivi segnalazione
export type ReportReason = 'closed' | 'incorrect_info' | 'hygiene' | 'inappropriate' | 'other';
