import { supabase } from './supabase';
import type { CuisineVote } from './restaurant.types';

// ─── Cuisine Votes ──────────────────────────────────────────────────────────

export async function getCuisineVotes(restaurantId: string): Promise<CuisineVote[]> {
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

export async function voteCuisines(
  restaurantId: string,
  userId: string,
  cuisineIds: string[],
): Promise<void> {
  try {
    const { error } = await supabase.rpc('vote_cuisines', {
      p_restaurant_id: restaurantId,
      p_user_id: userId,
      p_cuisine_ids: cuisineIds,
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[CuisineVoteService] Errore voteCuisines:', error);
  }
}

export const CuisineVoteService = {
  getCuisineVotes,
  voteCuisines,
};
