import { supabase } from './supabase';
import type { LeaderboardEntry } from './restaurant.types';

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<{
  topRestaurants: LeaderboardEntry[];
  topReviewers: LeaderboardEntry[];
}> {
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 20 });
    if (error) throw error;

    const topRestaurants: LeaderboardEntry[] = [];
    const topReviewers: LeaderboardEntry[] = [];

    for (const row of data ?? []) {
      const entry: LeaderboardEntry = {
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        profile_color: row.profile_color,
        allergens: row.allergens ?? [],
        dietary_preferences: row.dietary_preferences ?? [],
        count: Number(row.count),
      };
      if (row.category === 'restaurants') topRestaurants.push(entry);
      else topReviewers.push(entry);
    }

    return { topRestaurants, topReviewers };
  } catch (error) {
    console.warn('[LeaderboardService] Errore getLeaderboard:', error);
    return { topRestaurants: [], topReviewers: [] };
  }
}

export const LeaderboardService = {
  getLeaderboard,
};
