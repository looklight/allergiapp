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
}

// Motivi segnalazione
export type ReportReason = 'closed' | 'incorrect_info' | 'hygiene' | 'inappropriate' | 'other';
