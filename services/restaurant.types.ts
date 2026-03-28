// ─── Tipi condivisi per il modulo ristoranti ──────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  location: { latitude: number; longitude: number } | null;
  phone: string | null;
  website: string | null;
  cuisine_types: string[];
  price_range: number | null;
  photo_urls: string[];
  added_by: string | null;
  owner_id: string | null;
  google_place_id: string | null;
  is_premium: boolean;
  subscription_status: string;
  menu_url?: string | null;
  created_at: string;
  updated_at: string;
  // Calcolati (da RPC/join)
  review_count?: number;
  average_rating?: number;
  favorite_count?: number;
  distance_km?: number;
  matching_reviews?: number;
  matching_avg_rating?: number;
  covered_allergen_count?: number;
  covered_dietary_count?: number;
  total_allergen_filters?: number;
  total_dietary_filters?: number;
}

export interface ReviewPhoto {
  url: string;
  thumbnailUrl: string;
}

export interface Review {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  allergens_snapshot: string[];
  dietary_snapshot: string[];
  photos: ReviewPhoto[];
  language: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  liked_by_me: boolean;
  // Dal profilo utente (join)
  user_display_name?: string | null;
  user_avatar_url?: string | null;
  user_profile_color?: string | null;
  user_is_anonymous?: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
  // Join
  restaurant?: Restaurant;
}

export interface MenuPhoto {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  created_at: string;
  // Dal profilo utente (join)
  user_display_name?: string | null;
}

export interface Report {
  id: string;
  restaurant_id: string | null;
  review_id: string | null;
  user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

export interface CuisineVote {
  cuisine_id: string;
  vote_count: number;
  user_voted: boolean;
}

export type SortBy = 'recent' | 'rating' | 'distance' | 'relevance';

export interface CreateRestaurantInput {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  cuisine_types?: string[];
  price_range?: number;
  google_place_id?: string;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
  photos: string[]; // URI locali delle foto
}

export interface CreateReportInput {
  reason: string;
  details?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  allergens: string[];
  dietary_preferences: string[];
  count: number;
}

// ─── Costanti ────────────────────────────────────────────────────────────────

export const QUERY_LIMITS: Record<string, number> = {
  NEARBY_DEFAULT: 50,
  USER_REVIEWS: 20,
};

export const DEFAULTS: Record<string, number> = {
  NEARBY_RADIUS_KM: 5,
  ALLERGEN_RADIUS_KM: 10,
  MIN_RATING: 1,
};

/** PostgreSQL UNIQUE constraint violation */
export const PG_UNIQUE_VIOLATION = '23505';

// ─── Helper: mappa riga RPC → Restaurant ────────────────────────────────────

export type RestaurantRow = Omit<Restaurant, 'location' | 'review_count' | 'average_rating' | 'favorite_count' | 'distance_km' | 'matching_reviews' | 'matching_avg_rating' | 'covered_allergen_count' | 'covered_dietary_count' | 'total_allergen_filters' | 'total_dietary_filters'> & {
  latitude?: number | null;
  longitude?: number | null;
  review_count?: number;
  average_rating?: number | string;
  favorite_count?: number;
  distance_km?: number | string | null;
  matching_reviews?: number | string | null;
  matching_avg_rating?: number | string | null;
  covered_allergen_count?: number | null;
  covered_dietary_count?: number | null;
  total_allergen_filters?: number | null;
  total_dietary_filters?: number | null;
};

export function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    ...row,
    location: row.latitude != null && row.longitude != null
      ? { latitude: row.latitude, longitude: row.longitude }
      : null,
    review_count: row.review_count ?? 0,
    average_rating: Number(row.average_rating ?? 0),
    favorite_count: row.favorite_count ?? 0,
    distance_km: row.distance_km != null ? Number(row.distance_km) : undefined,
    matching_reviews: row.matching_reviews != null ? Number(row.matching_reviews) : undefined,
    matching_avg_rating: row.matching_avg_rating != null ? Number(row.matching_avg_rating) : undefined,
    covered_allergen_count: row.covered_allergen_count ?? undefined,
    covered_dietary_count: row.covered_dietary_count ?? undefined,
    total_allergen_filters: row.total_allergen_filters ?? undefined,
    total_dietary_filters: row.total_dietary_filters ?? undefined,
  };
}

/** Converte una riga da SELECT diretto (location GeoJSON) al formato lat/lng atteso da mapRestaurant */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLatLng(row: any): RestaurantRow {
  const loc = row.location;
  return {
    ...row,
    latitude: loc?.coordinates?.[1] ?? null,
    longitude: loc?.coordinates?.[0] ?? null,
  };
}
