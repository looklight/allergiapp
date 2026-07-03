// ─── Tipi condivisi per il modulo ristoranti ──────────────────────────────

/** Pin leggero con dati di copertura allergenica aggregati dalle recensioni */
export type RestaurantPin = {
  id: string;
  latitude: number;
  longitude: number;
  /** Unione degli allergens_snapshot di tutte le recensioni del ristorante */
  supported_allergens: string[];
  /** Unione dei dietary_snapshot di tutte le recensioni del ristorante */
  supported_diets: string[];
  /** Tipi di cucina votati per il ristorante */
  cuisine_types: string[];
  /** Faccette lodging (per icona pin distinta / futura UI) */
  offers_lodging?: boolean;
  lodging_type?: string | null;
};

export interface Restaurant {
  id: string;
  /**
   * Identificatore stabile per URL pubblici (es. /r/da-mario-roma).
   * Generato lato DB al CREATE, immutabile, NOT NULL.
   *
   * Marcato opzionale qui perche' alcune RPC esistenti (es. get_nearby_restaurants)
   * non lo proiettano ancora — verra' aggiunto progressivamente quando serve.
   * La scheda dettaglio (getRestaurant via SELECT *) lo include sempre.
   */
  slug?: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  location: { latitude: number; longitude: number } | null;
  phone: string | null;
  website: string | null;
  cuisine_types: string[];
  // Faccette lodging (colonne reali, vedi migration 067). Opzionali per resilienza
  // verso RPC/cache che non le proiettano. mapRestaurant le porta via spread `...row`.
  lodging_type?: string | null;
  offers_lodging?: boolean;
  serves_food?: boolean;
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
  inferred_allergen_count?: number;
  inferred_dietary_count?: number;
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
  user_username?: string | null;
  user_avatar_url?: string | null;
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
  user_username?: string | null;
}

export interface Report {
  id: string;
  restaurant_id: string | null;
  review_id: string | null;
  menu_photo_id: string | null;
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

export type ReviewSortOrder = 'recent' | 'rating' | 'rating-asc' | 'relevance' | 'likes';

export const REVIEWS_PAGE_SIZE = 15;

export interface PaginatedReviews {
  reviews: Review[];
  totalCount: number;
}

export interface CreateRestaurantInput {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  cuisine_types?: string[];
  price_range?: number;
  google_place_id?: string;
  // Faccette lodging. Se omessi, il DB applica i default (serves_food=true,
  // offers_lodging=false): un ristorante normale non li passa.
  offers_lodging?: boolean;
  serves_food?: boolean;
  lodging_type?: string;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
  photos: string[]; // URI locali delle foto
}

/** Risultato leggero dalla RPC search_restaurants_by_name (per autocomplete) */
export interface RestaurantSearchResult {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  average_rating: number;
  distance_km: number | null;
  similarity_score: number;
}

export interface CreateReportInput {
  reason: string;
  details?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  allergens: string[];
  dietary_preferences: string[];
  count: number;
}

// ─── Costanti ────────────────────────────────────────────────────────────────

export const QUERY_LIMITS: Record<string, number> = {
  NEARBY_DEFAULT: 100,
};

export const DEFAULTS: Record<string, number> = {
  NEARBY_RADIUS_KM: 5,
  ALLERGEN_RADIUS_KM: 10,
  MIN_RATING: 1,
};

/** PostgreSQL UNIQUE constraint violation */
export const PG_UNIQUE_VIOLATION = '23505';

// ─── Helper: mappa riga RPC → Restaurant ────────────────────────────────────

export type RestaurantRow = Omit<Restaurant, 'location' | 'review_count' | 'average_rating' | 'favorite_count' | 'distance_km' | 'matching_reviews' | 'matching_avg_rating' | 'covered_allergen_count' | 'covered_dietary_count' | 'inferred_allergen_count' | 'inferred_dietary_count' | 'total_allergen_filters' | 'total_dietary_filters'> & {
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
  inferred_allergen_count?: number | null;
  inferred_dietary_count?: number | null;
  total_allergen_filters?: number | null;
  total_dietary_filters?: number | null;
};

export function mapRestaurant(row: RestaurantRow): Restaurant {
  // Latitude/longitude can come as separate fields (from RPC with explicit lat/lng)
  // or inside a GeoJSON `location` object (from RPC returning GEOGRAPHY).
  // Handle both for resilience.
  let lat = row.latitude;
  let lng = row.longitude;
  if (lat == null || lng == null) {
    const loc = (row as any).location;
    if (loc?.coordinates) {
      lat = loc.coordinates[1];
      lng = loc.coordinates[0];
    }
  }
  return {
    ...row,
    location: lat != null && lng != null
      ? { latitude: lat, longitude: lng }
      : null,
    review_count: row.review_count ?? 0,
    average_rating: Number(row.average_rating ?? 0),
    favorite_count: row.favorite_count ?? 0,
    distance_km: row.distance_km != null ? Number(row.distance_km) : undefined,
    matching_reviews: row.matching_reviews != null ? Number(row.matching_reviews) : undefined,
    matching_avg_rating: row.matching_avg_rating != null ? Number(row.matching_avg_rating) : undefined,
    covered_allergen_count: row.covered_allergen_count ?? undefined,
    covered_dietary_count: row.covered_dietary_count ?? undefined,
    inferred_allergen_count: row.inferred_allergen_count ?? undefined,
    inferred_dietary_count: row.inferred_dietary_count ?? undefined,
    total_allergen_filters: row.total_allergen_filters ?? undefined,
    total_dietary_filters: row.total_dietary_filters ?? undefined,
  };
}

/**
 * Decodifica una colonna PostGIS `geography(Point)` così come arriva da un SELECT
 * diretto via PostgREST: una stringa EWKB esadecimale, es.
 * "0101000020E6100000<lon:float64LE><lat:float64LE>".
 * Parser difensivo: gestisce solo il caso Point little-endian che il DB produce
 * (verificato: byte endianness 0x01, type 0x0000_0001 con flag SRID 0x2000_0000);
 * su qualunque formato inatteso ritorna null (degrada senza coordinate-spazzatura).
 */
function decodeEwkbPoint(hex: string): { lat: number; lng: number } | null {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  // Solo little-endian (0x01). Big-endian (0x00) non è prodotto dal nostro DB.
  if (hex.slice(0, 2).toLowerCase() !== '01') return null;
  // type (uint32 LE) con eventuale flag SRID (0x20000000): il tipo base dev'essere Point (1).
  const typeWord = parseInt(hex.slice(2, 10).match(/../g)!.reverse().join(''), 16);
  const hasSrid = (typeWord & 0x20000000) !== 0;
  if ((typeWord & 0xff) !== 1) return null; // non è un Point
  // header = endian(1B) + type(4B) [+ SRID(4B)] → 5 o 9 byte = 10 o 18 char hex.
  const offset = hasSrid ? 18 : 10;
  const body = hex.slice(offset);
  if (body.length < 32) return null; // servono due float64 (8B = 16 char) ciascuno
  const toDouble = (h: string): number => {
    const bytes = h.match(/../g)!.map(b => parseInt(b, 16));
    return new DataView(new Uint8Array(bytes).buffer).getFloat64(0, true /* little-endian */);
  };
  const lng = toDouble(body.slice(0, 16));
  const lat = toDouble(body.slice(16, 32));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Converte una riga da SELECT diretto al formato lat/lng atteso da mapRestaurant.
 * `location` può arrivare come oggetto GeoJSON ({coordinates:[lng,lat]}) oppure,
 * dal SELECT * su PostgREST, come stringa EWKB esadecimale: gestiamo entrambi.
 */

export function extractLatLng(row: any): RestaurantRow {
  const loc = row.location;
  let latitude: number | null = loc?.coordinates?.[1] ?? null;
  let longitude: number | null = loc?.coordinates?.[0] ?? null;
  if ((latitude == null || longitude == null) && typeof loc === 'string') {
    const point = decodeEwkbPoint(loc);
    if (point) {
      latitude = point.lat;
      longitude = point.lng;
    }
  }
  return { ...row, latitude, longitude };
}
