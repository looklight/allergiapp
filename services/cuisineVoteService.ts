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
    console.warn('[CuisineVoteService] Errore voteCuisines:', error);
  }
}

export const CuisineVoteService = {
  getCuisineVotes,
  voteCuisines,
};
