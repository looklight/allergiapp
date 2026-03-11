import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { StorageService, type UploadResult } from './storageService';
import { isRemoteUrl } from '../utils/url';


// ─── Costanti ────────────────────────────────────────────────────────────────

const QUERY_LIMITS: Record<string, number> = {
  ALL_RESTAURANTS: 200,
  NEARBY_DEFAULT: 50,
  USER_REVIEWS: 20,
};

const DEFAULTS: Record<string, number> = {
  NEARBY_RADIUS_KM: 5,
  ALLERGEN_RADIUS_KM: 10,
  MIN_RATING: 1,
};

/** PostgreSQL UNIQUE constraint violation */
const PG_UNIQUE_VIOLATION = '23505';

// ─── Tipi ────────────────────────────────────────────────────────────────────

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
  // Dal profilo utente (join)
  user_display_name?: string;
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

// ─── Helper: mappa riga RPC → Restaurant ────────────────────────────────────

type RestaurantRow = Omit<Restaurant, 'location' | 'review_count' | 'average_rating' | 'favorite_count' | 'distance_km' | 'matching_reviews' | 'matching_avg_rating' | 'covered_allergen_count' | 'covered_dietary_count' | 'total_allergen_filters' | 'total_dietary_filters'> & {
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

function mapRestaurant(row: RestaurantRow): Restaurant {
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
function extractLatLng(row: any): RestaurantRow {
  const loc = row.location;
  return {
    ...row,
    latitude: loc?.coordinates?.[1] ?? null,
    longitude: loc?.coordinates?.[0] ?? null,
  };
}

// ─── Restaurant CRUD ────────────────────────────────────────────────────────

async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Carica stats
  const { data: stats } = await supabase.rpc('get_restaurant_stats', {
    restaurant_uuid: restaurantId,
  });

  return mapRestaurant({
    ...extractLatLng(data),
    review_count: stats?.[0]?.review_count ?? 0,
    average_rating: stats?.[0]?.average_rating ?? 0,
    favorite_count: stats?.[0]?.favorite_count ?? 0,
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

async function getAllRestaurants(): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_restaurants', {
      max_results: QUERY_LIMITS.ALL_RESTAURANTS,
    });
    if (error) throw error;
    return (data ?? []).map(mapRestaurant);
  } catch (error) {
    console.warn('[RestaurantService] Errore getAllRestaurants:', error);
    return [];
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

    // Cleanup Storage delle menu_photos prima della CASCADE
    const { data: menuPhotos } = await supabase
      .from('menu_photos')
      .select('image_url, thumbnail_url')
      .eq('restaurant_id', restaurantId);

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);
    if (error) throw error;

    // Best-effort: elimina file dallo storage dopo la CASCADE
    for (const mp of menuPhotos ?? []) {
      StorageService.deleteImageWithThumbnail(mp.image_url, mp.thumbnail_url).catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore removeOwnRestaurant:', error);
    return false;
  }
}

// ─── Reviews ────────────────────────────────────────────────────────────────

async function getReviews(restaurantId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profile:profiles!user_id(display_name)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    photos: r.photos ?? [],
    user_display_name: r.profile?.display_name ?? null,
  }));
}

async function getUserReview(restaurantId: string, userId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getReviewsByUser(userId: string): Promise<(Review & { restaurant_name?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        restaurant:restaurants!restaurant_id(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(QUERY_LIMITS.USER_REVIEWS);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      restaurant_name: r.restaurant?.name ?? null,
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getReviewsByUser:', error);
    return [];
  }
}

async function addReview(params: {
  restaurantId: string;
  input: CreateReviewInput;
  userId: string;
  userDietaryNeeds?: { allergens: string[]; diets: string[] };
  language?: string;
}): Promise<Review | null> {
  const { restaurantId, input, userId, userDietaryNeeds, language } = params;
  try {
    const generatedId = Crypto.randomUUID();

    // Upload foto (full + thumbnail) — se uno fallisce, pulisci i riusciti
    const settled = await Promise.allSettled(
      input.photos
        .filter(uri => !!uri)
        .map((uri, i) => StorageService.uploadReviewPhoto(restaurantId, generatedId, i, uri))
    );
    const hasFailed = settled.some(r => r.status === 'rejected');
    if (hasFailed) {
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          StorageService.deleteByUrl(r.value.imageUrl).catch(() => {});
          StorageService.deleteByUrl(r.value.thumbnailUrl).catch(() => {});
        }
      }
      throw new Error('Upload foto fallito');
    }
    const photos: ReviewPhoto[] = (settled as PromiseFulfilledResult<UploadResult>[]).map(r => ({
      url: r.value.imageUrl,
      thumbnailUrl: r.value.thumbnailUrl,
    }));

    const { data: reviewId, error } = await supabase.rpc('upsert_review', {
      p_restaurant_id: restaurantId,
      p_user_id: userId,
      p_rating: input.rating,
      p_comment: input.comment ?? null,
      p_allergens_snapshot: userDietaryNeeds?.allergens ?? [],
      p_dietary_snapshot: userDietaryNeeds?.diets ?? [],
      p_photos: photos,
      p_generated_id: generatedId,
      p_language: language ?? null,
    });
    if (error) {
      // Cleanup foto orfane (DB insert fallito ma upload riuscito)
      for (const p of photos) {
        StorageService.deleteByUrl(p.url).catch(() => {});
        StorageService.deleteByUrl(p.thumbnailUrl).catch(() => {});
      }
      throw error;
    }

    if (!reviewId) return null;

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    return review;
  } catch (error) {
    console.warn('[RestaurantService] Errore addReview:', error);
    return null;
  }
}

async function updateReview(params: {
  reviewId: string;
  restaurantId: string;
  input: CreateReviewInput;
  userId: string;
  oldPhotos?: ReviewPhoto[];
  userDietaryNeeds?: { allergens: string[]; diets: string[] };
}): Promise<Review | null> {
  const { reviewId, restaurantId, input, userId, oldPhotos, userDietaryNeeds } = params;
  try {
    // Upload nuove foto, mantieni quelle remote esistenti
    const photos: ReviewPhoto[] = await Promise.all(
      input.photos.filter(uri => !!uri).map(async (uri, i) => {
        if (isRemoteUrl(uri)) {
          // Foto già caricata: cerca il suo thumbnail tra le vecchie
          const existing = oldPhotos?.find(p => p.url === uri);
          return existing ?? { url: uri, thumbnailUrl: uri };
        }
        const result = await StorageService.uploadReviewPhoto(restaurantId, reviewId, i, uri);
        return { url: result.imageUrl, thumbnailUrl: result.thumbnailUrl };
      })
    );

    const { data: returnedId, error } = await supabase.rpc('upsert_review', {
      p_restaurant_id: restaurantId,
      p_user_id: userId,
      p_rating: input.rating,
      p_comment: input.comment ?? null,
      p_allergens_snapshot: userDietaryNeeds?.allergens ?? [],
      p_dietary_snapshot: userDietaryNeeds?.diets ?? [],
      p_photos: photos,
      p_review_id: reviewId,
    });
    if (error) throw error;

    // Cleanup foto vecchie non riutilizzate (best-effort)
    if (oldPhotos) {
      const newUrls = new Set(photos.map(p => p.url));
      for (const old of oldPhotos) {
        if (!newUrls.has(old.url)) {
          StorageService.deleteByUrl(old.url).catch(() => {});
          StorageService.deleteByUrl(old.thumbnailUrl).catch(() => {});
        }
      }
    }

    if (!returnedId) return null;

    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', returnedId)
      .single();

    return review;
  } catch (error) {
    console.warn('[RestaurantService] Errore updateReview:', error);
    return null;
  }
}

async function deleteReview(reviewId: string, userId: string): Promise<boolean> {
  try {
    const { data: review } = await supabase
      .from('reviews')
      .select('photos')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userId);
    if (error) throw error;

    // Cleanup foto (best-effort)
    for (const photo of (review?.photos as ReviewPhoto[]) ?? []) {
      StorageService.deleteByUrl(photo.url).catch(() => {});
      StorageService.deleteByUrl(photo.thumbnailUrl).catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore deleteReview:', error);
    return false;
  }
}

// ─── Favorites ──────────────────────────────────────────────────────────────

async function getFavorites(userId: string): Promise<Favorite[]> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((f: any) => ({
      ...f,
      restaurant: f.restaurant ? mapRestaurant(f.restaurant) : undefined,
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getFavorites:', error);
    return [];
  }
}

async function isFavorite(userId: string, restaurantId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    // Prova insert — se UNIQUE violation (23505), il favorito esiste già → delete
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: userId, restaurant_id: restaurantId });

    if (!insertError) return true; // Aggiunto con successo

    if (insertError.code === PG_UNIQUE_VIOLATION) {
      // Già presente → rimuovi
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);
      if (deleteError) throw deleteError;
      return false;
    }

    throw insertError;
  } catch (error) {
    console.warn('[RestaurantService] Errore toggleFavorite:', error);
    throw error;
  }
}

async function removeFavorite(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) {
    console.warn('[RestaurantService] Errore removeFavorite:', error);
    throw error;
  }
}

// ─── Menu Photos ────────────────────────────────────────────────────────────

async function getMenuPhotos(restaurantId: string): Promise<MenuPhoto[]> {
  const { data, error } = await supabase
    .from('menu_photos')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function addMenuPhoto(
  restaurantId: string,
  localUri: string,
  userId: string,
): Promise<MenuPhoto | null> {
  try {
    // Genera un ID temporaneo per il path di upload
    const tempId = Crypto.randomUUID();
    const { imageUrl, thumbnailUrl } = await StorageService.uploadMenuPhoto(restaurantId, tempId, localUri);

    const { data, error } = await supabase
      .from('menu_photos')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();
    if (error) {
      StorageService.deleteImageWithThumbnail(imageUrl, thumbnailUrl).catch(() => {});
      throw error;
    }
    return data;
  } catch (error) {
    console.warn('[RestaurantService] Errore addMenuPhoto:', error);
    return null;
  }
}

async function deleteMenuPhoto(
  restaurantId: string,
  photoId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Recupera per verificare ownership e ottenere URL
    const { data: photo } = await supabase
      .from('menu_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();
    if (!photo) return false;

    const { error } = await supabase
      .from('menu_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);
    if (error) throw error;

    // Elimina immagini (best-effort)
    StorageService.deleteImageWithThumbnail(photo.image_url, photo.thumbnail_url).catch(() => {});
    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore deleteMenuPhoto:', error);
    return false;
  }
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function getReports(restaurantId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function getUserReport(restaurantId: string, userId: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function addReport(
  restaurantId: string,
  input: CreateReportInput,
  userId: string,
): Promise<Report | null> {
  try {
    const existing = await getUserReport(restaurantId, userId);

    if (existing) {
      const { data, error } = await supabase
        .from('reports')
        .update({
          reason: input.reason,
          details: input.details ?? null,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          restaurant_id: restaurantId,
          user_id: userId,
          reason: input.reason,
          details: input.details ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore addReport:', error);
    return null;
  }
}

// ─── Cuisine Votes ──────────────────────────────────────────────────────────

async function getCuisineVotes(restaurantId: string): Promise<CuisineVote[]> {
  const { data, error } = await supabase.rpc('get_restaurant_cuisine_votes', {
    restaurant_uuid: restaurantId,
  });
  if (error) throw error;
  return (data ?? []).map((v: any) => ({
    cuisine_id: v.cuisine_id,
    vote_count: Number(v.vote_count),
    user_voted: v.user_voted ?? false,
  }));
}

async function voteCuisines(
  restaurantId: string,
  userId: string,
  cuisineIds: string[],
): Promise<void> {
  try {
    // 1. Rimuovi tutti i voti precedenti dell'utente per questo ristorante
    await supabase
      .from('restaurant_cuisine_votes')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId);

    // 2. Inserisci i nuovi voti
    if (cuisineIds.length > 0) {
      const rows = cuisineIds.map(id => ({
        restaurant_id: restaurantId,
        user_id: userId,
        cuisine_id: id,
      }));
      const { error } = await supabase
        .from('restaurant_cuisine_votes')
        .insert(rows);
      if (error) throw error;
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore voteCuisines:', error);
  }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  allergens: string[];
  dietary_preferences: string[];
  count: number;
}

async function getLeaderboard(): Promise<{
  topRestaurants: LeaderboardEntry[];
  topReviewers: LeaderboardEntry[];
}> {
  try {
    const [restaurantsRes, reviewsRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select('added_by, profiles!added_by(display_name, avatar_url, profile_color, allergens, dietary_preferences)')
        .not('added_by', 'is', null),
      supabase
        .from('reviews')
        .select('user_id, profiles!user_id(display_name, avatar_url, profile_color, allergens, dietary_preferences)')
        .not('user_id', 'is', null),
    ]);

    const countByUser = (rows: any[], userField: string): LeaderboardEntry[] => {
      const map = new Map<string, { display_name: string | null; avatar_url: string | null; profile_color: string | null; allergens: string[]; dietary_preferences: string[]; count: number }>();
      for (const row of rows) {
        const uid = row[userField];
        if (!uid) continue;
        const existing = map.get(uid);
        if (existing) {
          existing.count++;
        } else {
          const profile = row.profiles;
          map.set(uid, {
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            profile_color: profile?.profile_color ?? null,
            allergens: profile?.allergens ?? [],
            dietary_preferences: profile?.dietary_preferences ?? [],
            count: 1,
          });
        }
      }
      return Array.from(map.entries())
        .map(([user_id, data]) => ({ user_id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    };

    return {
      topRestaurants: countByUser(restaurantsRes.data ?? [], 'added_by'),
      topReviewers: countByUser(reviewsRes.data ?? [], 'user_id'),
    };
  } catch (error) {
    console.warn('[RestaurantService] Errore getLeaderboard:', error);
    return { topRestaurants: [], topReviewers: [] };
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

// ─── Export ─────────────────────────────────────────────────────────────────

export const RestaurantService = {
  // Restaurant CRUD
  getRestaurant,
  getRestaurantByGooglePlaceId,
  checkExistingByPlaceIds,
  getNearbyRestaurants,
  getRestaurantsForMyNeeds,
  getAllRestaurants,
  addRestaurant,
  getRestaurantsByUser,
  removeOwnRestaurant,
  // Reviews
  getReviews,
  getUserReview,
  getReviewsByUser,
  addReview,
  updateReview,
  deleteReview,
  // Favorites
  getFavorites,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  // Menu Photos
  getMenuPhotos,
  addMenuPhoto,
  deleteMenuPhoto,
  // Reports
  getReports,
  getUserReport,
  addReport,
  // Cuisine Votes
  getCuisineVotes,
  voteCuisines,
  // Leaderboard
  getLeaderboard,
};
