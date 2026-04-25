import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { StorageService, type UploadResult } from './storageService';
import { isRemoteUrl } from '../utils/url';
import {
  QUERY_LIMITS,
  REVIEWS_PAGE_SIZE,
  type Review,
  type ReviewPhoto,
  type CreateReviewInput,
  type PaginatedReviews,
  type ReviewSortOrder,
} from './restaurant.types';

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(
  restaurantId: string,
  options?: {
    userId?: string;
    sort?: ReviewSortOrder;
    userAllergens?: string[];
    userDiets?: string[];
    limit?: number;
    offset?: number;
  },
): Promise<PaginatedReviews> {
  const {
    userId,
    sort = 'recent',
    userAllergens = [],
    userDiets = [],
    limit = REVIEWS_PAGE_SIZE,
    offset = 0,
  } = options ?? {};

  const { data, error } = await supabase.rpc('get_paginated_reviews', {
    p_restaurant_id: restaurantId,
    p_user_id: userId ?? null,
    p_sort: sort,
    p_user_allergens: userAllergens,
    p_user_diets: userDiets,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const reviews: Review[] = rows.map((r: any) => ({
    id: r.id,
    restaurant_id: r.restaurant_id,
    user_id: r.user_id,
    rating: r.rating,
    comment: r.comment,
    allergens_snapshot: r.allergens_snapshot ?? [],
    dietary_snapshot: r.dietary_snapshot ?? [],
    photos: r.photos ?? [],
    language: r.language,
    created_at: r.created_at,
    updated_at: r.updated_at,
    likes_count: r.likes_count ?? 0,
    liked_by_me: r.liked_by_me ?? false,
    user_display_name: r.user_display_name ?? null,
    user_avatar_url: r.user_avatar_url ?? null,
    user_is_anonymous: r.user_is_anonymous ?? false,
  }));

  return { reviews, totalCount };
}

export async function toggleReviewLike(reviewId: string): Promise<{ liked: boolean; likes_count: number }> {
  const { data, error } = await supabase.rpc('toggle_review_like', { p_review_id: reviewId });
  if (error) throw error;
  return data as { liked: boolean; likes_count: number };
}

export async function getUserReview(restaurantId: string, userId: string): Promise<Review | null> {
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

export async function getLikesReceivedByUser(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('likes_count')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).reduce((sum, r: any) => sum + (r.likes_count ?? 0), 0);
  } catch (error) {
    console.warn('[ReviewService] Errore getLikesReceivedByUser:', error);
    return 0;
  }
}

export async function getReviewsByUser(userId: string): Promise<(Review & { restaurant_name?: string })[]> {
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
    console.warn('[ReviewService] Errore getReviewsByUser:', error);
    return [];
  }
}

export async function addReview(params: {
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
    console.warn('[ReviewService] Errore addReview:', error);
    return null;
  }
}

export async function updateReview(params: {
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
    console.warn('[ReviewService] Errore updateReview:', error);
    return null;
  }
}

export async function deleteReview(reviewId: string, userId: string): Promise<boolean> {
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
    console.warn('[ReviewService] Errore deleteReview:', error);
    return false;
  }
}

export async function getUserHasAnyReview(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

export const ReviewService = {
  getReviews,
  getUserReview,
  getReviewsByUser,
  addReview,
  updateReview,
  deleteReview,
  toggleReviewLike,
  getUserHasAnyReview,
};
