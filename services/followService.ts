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
  review_count: number;
  country_count: number;
  // Totale dell'insieme (uguale su ogni riga, stile total_count del feed):
  // resta esatto anche quando la lista e' cappata a FOLLOWING_LIST_LIMIT.
  total_count: number;
};

export type FollowStats = {
  followers: number;
  following: number;
};

// Cap v1 della lista seguiti: la RPC e' gia' limit/offset, il "carica altri"
// si aggiunge senza toccare il DB. Sotto il max-rows PostgREST (1000).
export const FOLLOWING_LIST_LIMIT = 500;

// Cap v1 del feed: la RPC e' gia' limit/offset, il "carica altri" si aggiunge
// senza toccare il DB quando i grafi cresceranno.
export const FEED_LIMIT = 100;

// Versione del grafo follow: incrementata a ogni follow/unfollow/blocco.
// Le schermate che mostrano dati derivati (pill Seguiti, feed) la confrontano
// al focus per ricaricare solo quando qualcosa e' davvero cambiato altrove.
let graphVersion = 0;
export function bumpFollowGraphVersion(): void {
  graphVersion += 1;
}
export function getFollowGraphVersion(): number {
  return graphVersion;
}

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
  bumpFollowGraphVersion();
  SupabaseAnalytics.track('user_followed', { target_id: targetId });
}

export async function unfollow(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetId);
  if (error) throw error;
  bumpFollowGraphVersion();
  SupabaseAnalytics.track('user_unfollowed', { target_id: targetId });
}

// Le due liste del grafo (mig 080) condividono forma e mapping: valgono per
// qualunque profilo non anonimo (o per se stessi), con l'attivita'
// (recensioni/paesi) come nei risultati della ricerca Community.
async function fetchFollowList(
  rpcName: 'get_following_public' | 'get_followers_public',
  profileId: string,
): Promise<FollowedProfile[]> {
  const { data, error } = await supabase.rpc(rpcName, {
    p_profile_id: profileId,
    p_limit: FOLLOWING_LIST_LIMIT,
  });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    username: p.username ?? null,
    avatar_url: p.avatar_url ?? null,
    is_anonymous: p.is_anonymous ?? false,
    review_count: Number(p.review_count ?? 0),
    country_count: Number(p.country_count ?? 0),
    total_count: Number(p.total_count ?? 0),
  }));
}

export async function getFollowing(profileId: string): Promise<FollowedProfile[]> {
  return fetchFollowList('get_following_public', profileId);
}

export async function getFollowers(profileId: string): Promise<FollowedProfile[]> {
  return fetchFollowList('get_followers_public', profileId);
}

// Conteggi follower/seguiti (mig 080): per il profilo proprio e, con la
// stessa chiamata, per i profili pubblici non anonimi. Sui profili anonimi
// altrui la RPC non restituisce righe: qui diventa null (stat non mostrate).
export async function getFollowStats(profileId: string): Promise<FollowStats | null> {
  const { data, error } = await supabase.rpc('get_follow_counts', {
    p_profile_id: profileId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    followers: Number(row.follower_count ?? 0),
    following: Number(row.following_count ?? 0),
  };
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
  getFollowers,
  getFollowStats,
  getFollowingFeed,
};
