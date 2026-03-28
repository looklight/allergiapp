import { supabase } from './supabase';
import type { LeaderboardEntry } from './restaurant.types';

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<{
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
    console.warn('[LeaderboardService] Errore getLeaderboard:', error);
    return { topRestaurants: [], topReviewers: [] };
  }
}

export const LeaderboardService = {
  getLeaderboard,
};
