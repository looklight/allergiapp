import { supabase } from './supabase';
import { StorageService } from './storageService';
import {
  DEFAULTS, QUERY_LIMITS,
  mapRestaurant, extractLatLng,
  type Restaurant, type RestaurantPin, type RestaurantRow, type CreateRestaurantInput,
  type RestaurantSearchResult,
} from './restaurant.types';
import { voteCuisines } from './cuisineVoteService';

// ─── Re-export tipi e servizi per retrocompatibilità ────────────────────────
// I consumer possono continuare a importare tutto da 'restaurantService'.

export type {
  Restaurant, RestaurantPin, RestaurantRow, ReviewPhoto, Review, Favorite, MenuPhoto,
  Report, CuisineVote, SortBy, CreateRestaurantInput, CreateReviewInput,
  CreateReportInput, LeaderboardEntry, ReviewSortOrder, PaginatedReviews,
  RestaurantSearchResult,
} from './restaurant.types';
export { mapRestaurant, extractLatLng, QUERY_LIMITS, DEFAULTS, PG_UNIQUE_VIOLATION, REVIEWS_PAGE_SIZE } from './restaurant.types';

// ─── Restaurant CRUD ────────────────────────────────────────────────────────

async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Carica stats (non blocca il caricamento del ristorante se fallisce)
  let reviewCount = 0, averageRating = 0, favoriteCount = 0;
  try {
    const { data: stats, error: statsError } = await supabase.rpc('get_restaurant_stats', {
      restaurant_uuid: restaurantId,
    });
    if (statsError) console.warn('[RestaurantService] Errore caricamento stats:', statsError);
    else if (stats?.[0]) {
      reviewCount = stats[0].review_count ?? 0;
      averageRating = stats[0].average_rating ?? 0;
      favoriteCount = stats[0].favorite_count ?? 0;
    }
  } catch (e) {
    console.warn('[RestaurantService] Errore caricamento stats:', e);
  }

  return mapRestaurant({
    ...extractLatLng(data),
    review_count: reviewCount,
    average_rating: averageRating,
    favorite_count: favoriteCount,
  });
}

async function getNearbyRestaurants(
  lat: number,
  lng: number,
  radiusKm = DEFAULTS.NEARBY_RADIUS_KM,
  maxResults = QUERY_LIMITS.NEARBY_DEFAULT,
): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_restaurants', {
      lat,
      lng,
      radius_km: radiusKm,
      max_results: maxResults,
    });
    if (error) throw error;
    return (data ?? []).map(mapRestaurant);
  } catch (error) {
    console.warn('[RestaurantService] Errore getNearbyRestaurants:', error);
    return [];
  }
}

async function getRestaurantsForMyNeeds(
  lat: number,
  lng: number,
  allergens: string[],
  dietary: string[],
  radiusKm = DEFAULTS.ALLERGEN_RADIUS_KM,
): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase.rpc('get_restaurants_for_my_needs', {
      lat,
      lng,
      filter_allergens: allergens,
      filter_dietary: dietary,
      radius_km: radiusKm,
    });
    if (error) throw error;
    return (data ?? []).map(mapRestaurant);
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurantsForMyNeeds:', error);
    return [];
  }
}

async function batchLoadStats(ids: string[]): Promise<Map<string, { review_count: number; total_rating: number; favorite_count: number }>> {
  const [reviewStats, favCounts] = await Promise.all([
    supabase.from('reviews').select('restaurant_id, rating').in('restaurant_id', ids),
    supabase.from('favorites').select('restaurant_id').in('restaurant_id', ids),
  ]);

  if (reviewStats.error) console.warn('[RestaurantService] Errore caricamento stats recensioni:', reviewStats.error);
  if (favCounts.error) console.warn('[RestaurantService] Errore caricamento stats favoriti:', favCounts.error);

  const statsMap = new Map<string, { review_count: number; total_rating: number; favorite_count: number }>();
  for (const r of reviewStats.data ?? []) {
    const s = statsMap.get(r.restaurant_id) ?? { review_count: 0, total_rating: 0, favorite_count: 0 };
    s.review_count++;
    s.total_rating += r.rating;
    statsMap.set(r.restaurant_id, s);
  }
  for (const f of favCounts.data ?? []) {
    const s = statsMap.get(f.restaurant_id) ?? { review_count: 0, total_rating: 0, favorite_count: 0 };
    s.favorite_count++;
    statsMap.set(f.restaurant_id, s);
  }
  return statsMap;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStats(rows: any[], statsMap: Map<string, { review_count: number; total_rating: number; favorite_count: number }>): Restaurant[] {
  return rows.map(row => {
    const s = statsMap.get(row.id);
    return mapRestaurant({
      ...extractLatLng(row),
      review_count: s?.review_count ?? 0,
      average_rating: s && s.review_count > 0 ? s.total_rating / s.review_count : 0,
      favorite_count: s?.favorite_count ?? 0,
    });
  });
}

async function getAllPositions(): Promise<RestaurantPin[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_restaurant_positions');
    if (error) throw error;
    if (__DEV__) console.log(`[RestaurantService] getAllPositions: ${(data ?? []).length} pin caricati`);
    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getAllPositions:', error);
    return [];
  }
}

/** Pin leggeri limitati al bounding box visibile — sostituisce getAllPositions per scalabilità */
async function getPinsInBounds(
  minLat: number, minLng: number, maxLat: number, maxLng: number, limit = 1000,
): Promise<RestaurantPin[]> {
  try {
    const { data, error } = await supabase.rpc('get_pins_in_bounds', {
      min_lat: minLat, min_lng: minLng, max_lat: maxLat, max_lng: maxLng, lim: limit,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getPinsInBounds:', error);
    return [];
  }
}

async function checkNearbyDuplicates(
  name: string,
  lat: number,
  lng: number,
): Promise<{ id: string; name: string } | null> {
  try {
    const nearby = await getNearbyRestaurants(lat, lng, 0.05, 10); // 50m
    const normName = name.trim().toLowerCase();
    const match = nearby.find(r => r.name.trim().toLowerCase() === normName);
    return match ? { id: match.id, name: match.name } : null;
  } catch {
    return null; // In caso di errore, non bloccare l'aggiunta
  }
}

async function addRestaurant(
  input: CreateRestaurantInput,
  userId: string,
): Promise<Restaurant | null> {
  try {
    const lat = Number(input.latitude);
    const lng = Number(input.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('[RestaurantService] Coordinate non valide:', { lat, lng });
      return null;
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        location: `POINT(${lng} ${lat})`,
        phone: input.phone ?? null,
        website: input.website ?? null,
        price_range: input.price_range ?? null,
        google_place_id: input.google_place_id ?? null,
        added_by: userId,
      })
      .select()
      .single();
    if (error) throw error;

    // Inserisci voti iniziali del creatore per i tag scelti
    if (input.cuisine_types?.length) {
      await voteCuisines(data.id, userId, input.cuisine_types);
    }

    return mapRestaurant(data);
  } catch (error) {
    console.warn('[RestaurantService] Errore addRestaurant:', error);
    return null;
  }
}

async function getRestaurantsByUser(userId: string): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('added_by', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const statsMap = await batchLoadStats(data.map(r => r.id));
    return applyStats(data, statsMap);
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurantsByUser:', error);
    return [];
  }
}

async function removeOwnRestaurant(restaurantId: string, userId: string): Promise<boolean> {
  try {
    // Verifica: chi ha aggiunto, non claimed, nessuna review
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('added_by, owner_id')
      .eq('id', restaurantId)
      .single();
    if (!restaurant || restaurant.added_by !== userId) return false;
    if (restaurant.owner_id) return false; // Ristorante claimed, non eliminabile

    const { count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);
    if ((count ?? 0) > 0) return false;

    // Cleanup Storage delle menu_photos e review photos prima della CASCADE
    const [{ data: menuPhotos }, { data: reviewsWithPhotos }] = await Promise.all([
      supabase.from('menu_photos').select('image_url, thumbnail_url').eq('restaurant_id', restaurantId),
      supabase.from('reviews').select('photos').eq('restaurant_id', restaurantId),
    ]);

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);
    if (error) throw error;

    // Best-effort: elimina file dallo storage dopo la CASCADE
    for (const mp of menuPhotos ?? []) {
      StorageService.deleteImageWithThumbnail(mp.image_url, mp.thumbnail_url).catch(() => {});
    }
    for (const rv of reviewsWithPhotos ?? []) {
      for (const p of rv.photos ?? []) {
        StorageService.deleteImageWithThumbnail(p.url, p.thumbnailUrl).catch(() => {});
      }
    }

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore removeOwnRestaurant:', error);
    return false;
  }
}

// ─── Fuzzy search per nome (autocomplete) ───────────────────────────────────

async function searchRestaurantsByName(
  query: string,
  userLat?: number,
  userLng?: number,
): Promise<RestaurantSearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('search_restaurants_by_name', {
      query,
      user_lat: userLat ?? null,
      user_lng: userLng ?? null,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      city: row.city ?? null,
      country: row.country ?? null,
      latitude: row.latitude,
      longitude: row.longitude,
      average_rating: Number(row.average_rating ?? 0),
      distance_km: row.distance_km != null ? Number(row.distance_km) : null,
      similarity_score: row.similarity_score ?? 0,
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore searchRestaurantsByName:', error);
    return [];
  }
}

// ─── Lookup by Google Place ID ───────────────────────────────────────────────

async function getRestaurantByGooglePlaceId(googlePlaceId: string): Promise<Restaurant | null> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('google_place_id', googlePlaceId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRestaurant(data) : null;
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurantByGooglePlaceId:', error);
    return null;
  }
}

async function checkExistingByPlaceIds(
  placeIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const result = new Map<string, { id: string; name: string }>();
  if (placeIds.length === 0) return result;
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, google_place_id')
      .in('google_place_id', placeIds);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.google_place_id) {
        result.set(row.google_place_id, { id: row.id, name: row.name });
      }
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore checkExistingByPlaceIds:', error);
  }
  return result;
}

// ─── Import dai servizi separati ────────────────────────────────────────────

import { getReviews, getUserReview, getReviewsByUser, addReview, updateReview, deleteReview, toggleReviewLike, getUserHasAnyReview } from './reviewService';
import { getFavorites, isFavorite, toggleFavorite, removeFavorite } from './favoriteService';
import { updateMenuUrl, getMenuPhotos, addMenuPhoto, deleteMenuPhoto } from './menuService';
import { getReports, getUserReport, addReport, reportMenuPhoto, reportReview } from './reportService';
import { getCuisineVotes } from './cuisineVoteService';
import { getLeaderboard } from './leaderboardService';

// ─── Export unificato ───────────────────────────────────────────────────────

export const RestaurantService = {
  // Restaurant CRUD
  getAllPositions,
  getPinsInBounds,
  getRestaurant,
  getRestaurantByGooglePlaceId,
  checkExistingByPlaceIds,
  getNearbyRestaurants,
  getRestaurantsForMyNeeds,
  addRestaurant,
  checkNearbyDuplicates,
  getRestaurantsByUser,
  removeOwnRestaurant,
  searchRestaurantsByName,
  // Reviews (da reviewService)
  getReviews,
  getUserReview,
  getReviewsByUser,
  addReview,
  updateReview,
  deleteReview,
  toggleReviewLike,
  // Favorites (da favoriteService)
  getFavorites,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  // Menu (da menuService)
  getUserHasAnyReview,
  updateMenuUrl,
  getMenuPhotos,
  addMenuPhoto,
  deleteMenuPhoto,
  // Reports (da reportService)
  getReports,
  getUserReport,
  addReport,
  reportMenuPhoto,
  reportReview,
  // Cuisine Votes (da cuisineVoteService)
  getCuisineVotes,
  voteCuisines,
  // Leaderboard (da leaderboardService)
  getLeaderboard,
};
