import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { StorageService } from './storageService';
import { isRemoteUrl } from '../utils/url';
import type { DietaryNeeds } from '../types';

// ─── Costanti ────────────────────────────────────────────────────────────────

const QUERY_LIMITS = {
  ALL_RESTAURANTS: 200,
  NEARBY_DEFAULT: 50,
  USER_REVIEWS: 20,
} as const;

const DEFAULTS = {
  NEARBY_RADIUS_KM: 5,
  ALLERGEN_RADIUS_KM: 10,
  MIN_RATING: 1,
} as const;

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
  cuisine_type: string | null;
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
}

export interface ReviewDish {
  id: string;
  review_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  thumbnail_url: string | null;
}

export interface Review {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  allergens_snapshot: string[];
  dietary_snapshot: string[];
  created_at: string;
  updated_at: string;
  // Join
  dishes?: ReviewDish[];
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

export interface DishLike {
  id: string;
  review_dish_id: string;
  user_id: string;
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

export type SortBy = 'recent' | 'rating' | 'distance';

export interface CreateRestaurantInput {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  cuisine_type?: string;
  price_range?: number;
  google_place_id?: string;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
  dishes: {
    name: string;
    description?: string;
    imageUri?: string;
  }[];
}

export interface CreateReportInput {
  reason: string;
  details?: string;
}

// ─── Helper: parse PostGIS point ─────────────────────────────────────────────

function parseLocation(loc: any): { latitude: number; longitude: number } | null {
  if (!loc) return null;
  // GeoJSON (da RPC functions)
  if (typeof loc === 'object' && loc.coordinates) {
    return { longitude: loc.coordinates[0], latitude: loc.coordinates[1] };
  }
  return null;
}

function mapRestaurant(row: any): Restaurant {
  return {
    ...row,
    location: parseLocation(row.location),
    review_count: row.review_count ?? 0,
    average_rating: Number(row.average_rating ?? 0),
    favorite_count: row.favorite_count ?? 0,
    distance_km: row.distance_km != null ? Number(row.distance_km) : undefined,
    matching_reviews: row.matching_reviews != null ? Number(row.matching_reviews) : undefined,
  };
}

// ─── Restaurant CRUD ────────────────────────────────────────────────────────

async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();
    if (error) throw error;

    // Carica stats
    const { data: stats } = await supabase.rpc('get_restaurant_stats', {
      restaurant_uuid: restaurantId,
    });

    return mapRestaurant({
      ...data,
      review_count: stats?.[0]?.review_count ?? 0,
      average_rating: stats?.[0]?.average_rating ?? 0,
      favorite_count: stats?.[0]?.favorite_count ?? 0,
    });
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurant:', error);
    return null;
  }
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

async function getRestaurantsByAllergens(
  lat: number,
  lng: number,
  allergens: string[],
  dietary: string[],
  radiusKm = DEFAULTS.ALLERGEN_RADIUS_KM,
  minRating = DEFAULTS.MIN_RATING,
): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase.rpc('get_restaurants_by_allergens', {
      lat,
      lng,
      radius_km: radiusKm,
      filter_allergens: allergens,
      filter_dietary: dietary,
      min_rating: minRating,
    });
    if (error) throw error;
    return (data ?? []).map(mapRestaurant);
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurantsByAllergens:', error);
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

function applyStats(rows: any[], statsMap: Map<string, { review_count: number; total_rating: number; favorite_count: number }>): Restaurant[] {
  return rows.map(row => {
    const s = statsMap.get(row.id);
    return mapRestaurant({
      ...row,
      review_count: s?.review_count ?? 0,
      average_rating: s && s.review_count > 0 ? s.total_rating / s.review_count : 0,
      favorite_count: s?.favorite_count ?? 0,
    });
  });
}

async function getAllRestaurants(): Promise<Restaurant[]> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(QUERY_LIMITS.ALL_RESTAURANTS);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const statsMap = await batchLoadStats(data.map(r => r.id));
    return applyStats(data, statsMap);
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
        cuisine_type: input.cuisine_type ?? null,
        price_range: input.price_range ?? null,
        google_place_id: input.google_place_id ?? null,
        added_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
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

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore removeOwnRestaurant:', error);
    return false;
  }
}

// ─── Reviews ────────────────────────────────────────────────────────────────

async function getReviews(restaurantId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        dishes:review_dishes(*),
        profile:profiles!user_id(display_name)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      user_display_name: r.profile?.display_name ?? null,
      dishes: r.dishes ?? [],
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getReviews:', error);
    return [];
  }
}

async function getUserReview(restaurantId: string, userId: string): Promise<Review | null> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, dishes:review_dishes(*)')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[RestaurantService] Errore getUserReview:', error);
    return null;
  }
}

async function getReviewsByUser(userId: string): Promise<(Review & { restaurant_name?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        dishes:review_dishes(*),
        restaurant:restaurants!restaurant_id(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(QUERY_LIMITS.USER_REVIEWS);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      restaurant_name: r.restaurant?.name ?? null,
      dishes: r.dishes ?? [],
    }));
  } catch (error) {
    console.warn('[RestaurantService] Errore getReviewsByUser:', error);
    return [];
  }
}

async function uploadDishPhotos(
  dishes: CreateReviewInput['dishes'],
  restaurantId: string,
  reviewId: string,
): Promise<{ name: string; description: string | null; photo_url: string | null; thumbnail_url: string | null }[]> {
  return Promise.all(
    dishes.map(async (dish, index) => {
      let photoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      if (dish.imageUri && !isRemoteUrl(dish.imageUri)) {
        const result = await StorageService.uploadDishImage(restaurantId, reviewId, index, dish.imageUri);
        photoUrl = result.imageUrl;
        thumbnailUrl = result.thumbnailUrl;
      } else if (dish.imageUri) {
        photoUrl = dish.imageUri;
      }
      return { name: dish.name, description: dish.description ?? null, photo_url: photoUrl, thumbnail_url: thumbnailUrl };
    })
  );
}

async function addReview(params: {
  restaurantId: string;
  input: CreateReviewInput;
  userId: string;
  userDietaryNeeds?: DietaryNeeds;
}): Promise<Review | null> {
  const { restaurantId, input, userId, userDietaryNeeds } = params;
  try {
    // 1. Pre-genera UUID: usato sia come path Storage che come ID review nel DB
    const generatedId = Crypto.randomUUID();

    // 2. Upload foto con l'ID definitivo (non più 'tmp')
    const dishData = await uploadDishPhotos(input.dishes, restaurantId, generatedId);

    // 3. RPC atomica: insert review con ID pre-generato + insert piatti
    const { data: reviewId, error } = await supabase.rpc('upsert_review', {
      p_restaurant_id: restaurantId,
      p_user_id: userId,
      p_rating: input.rating,
      p_comment: input.comment ?? null,
      p_allergens_snapshot: userDietaryNeeds?.allergens ?? [],
      p_dietary_snapshot: userDietaryNeeds?.diets ?? [],
      p_dishes: dishData,
      p_generated_id: generatedId,
    });
    if (error) throw error;

    // 3. Recupera la review completa
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
  oldDishes?: ReviewDish[];
}): Promise<Review | null> {
  const { reviewId, restaurantId, input, userId, oldDishes } = params;
  try {
    // 1. Upload nuove foto (prima di toccare il DB)
    const dishData = await uploadDishPhotos(input.dishes, restaurantId, reviewId);

    // 2. RPC atomica: update review + delete vecchi piatti + insert nuovi in una transaction
    const { data: returnedId, error } = await supabase.rpc('upsert_review', {
      p_restaurant_id: restaurantId,
      p_user_id: userId,
      p_rating: input.rating,
      p_comment: input.comment ?? null,
      p_dishes: dishData,
      p_review_id: reviewId,
    });
    if (error) throw error;

    // 3. Cleanup immagini vecchie non piu usate (best-effort, dopo successo)
    if (oldDishes) {
      const newUrls = new Set([
        ...dishData.map(d => d.photo_url).filter(Boolean),
        ...dishData.map(d => d.thumbnail_url).filter(Boolean),
      ]);
      for (const oldDish of oldDishes) {
        if (oldDish.photo_url && !newUrls.has(oldDish.photo_url)) {
          StorageService.deleteByUrl(oldDish.photo_url).catch(() => {});
        }
        if (oldDish.thumbnail_url && !newUrls.has(oldDish.thumbnail_url)) {
          StorageService.deleteByUrl(oldDish.thumbnail_url).catch(() => {});
        }
      }
    }

    // 4. Recupera la review aggiornata
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
    // Recupera i piatti per eliminare le immagini
    const { data: dishes } = await supabase
      .from('review_dishes')
      .select('photo_url, thumbnail_url')
      .eq('review_id', reviewId);

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userId);
    if (error) throw error;

    // Elimina immagini + thumbnail (best-effort)
    for (const dish of dishes ?? []) {
      if (dish.photo_url) StorageService.deleteByUrl(dish.photo_url).catch(() => {});
      if (dish.thumbnail_url) StorageService.deleteByUrl(dish.thumbnail_url).catch(() => {});
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
  try {
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
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
  try {
    const { data, error } = await supabase
      .from('menu_photos')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.warn('[RestaurantService] Errore getMenuPhotos:', error);
    return [];
  }
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
    if (error) throw error;
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

// ─── Dish Likes ─────────────────────────────────────────────────────────────

async function getDishLikes(restaurantId: string): Promise<Map<string, string[]>> {
  try {
    // Recupera tutti i like dei piatti di review di questo ristorante
    // 1. Recupera gli ID dei piatti di questo ristorante
    const { data: dishes } = await supabase
      .from('review_dishes')
      .select('id, review_id!inner(restaurant_id)')
      .eq('review_id.restaurant_id', restaurantId);
    const dishIds = (dishes ?? []).map((d: any) => d.id);
    if (dishIds.length === 0) return new Map();

    // 2. Recupera i like su quei piatti
    const { data: likes, error } = await supabase
      .from('dish_likes')
      .select('review_dish_id, user_id')
      .in('review_dish_id', dishIds);
    if (error) throw error;

    const map = new Map<string, string[]>();
    for (const like of likes ?? []) {
      const existing = map.get(like.review_dish_id) ?? [];
      existing.push(like.user_id);
      map.set(like.review_dish_id, existing);
    }
    return map;
  } catch (error) {
    console.warn('[RestaurantService] Errore getDishLikes:', error);
    return new Map();
  }
}

async function toggleDishLike(
  reviewDishId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('dish_likes')
      .select('*', { count: 'exact', head: true })
      .eq('review_dish_id', reviewDishId)
      .eq('user_id', userId);

    if ((count ?? 0) > 0) {
      const { error } = await supabase
        .from('dish_likes')
        .delete()
        .eq('review_dish_id', reviewDishId)
        .eq('user_id', userId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase
        .from('dish_likes')
        .insert({ review_dish_id: reviewDishId, user_id: userId });
      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore toggleDishLike:', error);
    throw error;
  }
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function getReports(restaurantId: string): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.warn('[RestaurantService] Errore getReports:', error);
    return [];
  }
}

async function getUserReport(restaurantId: string, userId: string): Promise<Report | null> {
  try {
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
  } catch (error) {
    console.warn('[RestaurantService] Errore getUserReport:', error);
    return null;
  }
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

// ─── Export ─────────────────────────────────────────────────────────────────

export const RestaurantService = {
  // Restaurant CRUD
  getRestaurant,
  getRestaurantByGooglePlaceId,
  getNearbyRestaurants,
  getRestaurantsByAllergens,
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
  // Dish Likes
  getDishLikes,
  toggleDishLike,
  // Reports
  getReports,
  getUserReport,
  addReport,
};
