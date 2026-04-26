import { supabase } from './supabase';
import type { LeaderboardEntry } from './restaurant.types';

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<{
  topReviewers: LeaderboardEntry[];
  topLiked: LeaderboardEntry[];
}> {
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 20 });
    if (error) throw error;

    const topReviewers: LeaderboardEntry[] = [];
    const topLiked: LeaderboardEntry[] = [];

    for (const row of data ?? []) {
      const entry: LeaderboardEntry = {
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        allergens: row.allergens ?? [],
        dietary_preferences: row.dietary_preferences ?? [],
        count: Number(row.count),
      };
      if (row.category === 'likes') topLiked.push(entry);
      else topReviewers.push(entry);
    }

    return { topReviewers, topLiked };
  } catch (error) {
    console.warn('[LeaderboardService] Errore getLeaderboard:', error);
    return { topReviewers: [], topLiked: [] };
  }
}

export const LeaderboardService = {
  getLeaderboard,
};
