import { supabase } from './supabase';
import { SupabaseAnalytics } from './supabaseAnalytics';
import type { UserReview } from './reviewService';

// Recensione del feed "Seguiti": UserReview + attribuzione autore.
export type FeedReview = UserReview & {
  author_username: string | null;
  author_avatar_url: string | null;
};

export type FollowedProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
};

// Cap v1 del feed: la RPC e' gia' limit/offset, il "carica altri" si aggiunge
// senza toccare il DB quando i grafi cresceranno.
export const FEED_LIMIT = 100;

export async function isFollowing(targetId: string): Promise<boolean> {
  // La RLS espone solo le righe del follower corrente: basta filtrare sul target.
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('following_id', targetId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function follow(userId: string, targetId: string): Promise<void> {
  // Le guardie (no anonimi, no bloccati, no self) stanno nella policy INSERT.
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, following_id: targetId });
  if (error) throw error;
  SupabaseAnalytics.track('user_followed', { target_id: targetId });
}

export async function unfollow(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetId);
  if (error) throw error;
  SupabaseAnalytics.track('user_unfollowed', { target_id: targetId });
}

export async function getFollowing(): Promise<FollowedProfile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('created_at, profile:profiles!following_id(id, username, avatar_url, is_anonymous)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.profile)
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      username: p.username ?? null,
      avatar_url: p.avatar_url ?? null,
      is_anonymous: p.is_anonymous ?? false,
    }));
}

export async function getFollowingCount(): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingFeed(
  limit: number = FEED_LIMIT,
  offset: number = 0,
): Promise<{ items: FeedReview[]; totalCount: number }> {
  const { data, error } = await supabase.rpc('get_following_feed', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const items: FeedReview[] = rows.map((r: any) => ({
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
    liked_by_me: false,
    author_username: r.author_username ?? null,
    author_avatar_url: r.author_avatar_url ?? null,
    restaurant_name: r.restaurant_name ?? null,
    restaurant_city: r.restaurant_city ?? null,
    restaurant_country: r.restaurant_country ?? null,
    restaurant_country_code: r.restaurant_country_code ?? null,
    restaurant_offers_lodging: r.restaurant_offers_lodging ?? null,
    restaurant_lat: r.restaurant_lat ?? null,
    restaurant_lng: r.restaurant_lng ?? null,
  }));

  return { items, totalCount };
}

export const FollowService = {
  isFollowing,
  follow,
  unfollow,
  getFollowing,
  getFollowingCount,
  getFollowingFeed,
};
