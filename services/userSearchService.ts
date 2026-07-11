import { supabase } from './supabase';
import { getBlockedIds } from './blockService';
import { SupabaseAnalytics } from './supabaseAnalytics';

export type UserSearchResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

/**
 * Ricerca utenti per username (RPC search_users, mig 076): sottostringa
 * case-insensitive, prefissi in testa, anonimi esclusi server-side.
 * Se `userId` è fornito, gli utenti bloccati vengono filtrati (best-effort).
 */
export async function searchUsers(
  query: string,
  userId?: string,
  limit: number = 20,
): Promise<UserSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const { data, error } = await supabase.rpc('search_users', {
    p_query: term,
    p_limit: limit,
  });
  if (error) throw error;

  let results: UserSearchResult[] = data ?? [];
  if (userId) {
    try {
      const blockedIds = await getBlockedIds(userId);
      if (blockedIds.size > 0) {
        results = results.filter((r) => !blockedIds.has(r.id));
      }
    } catch (err) {
      if (__DEV__) console.warn('[UserSearch] filtro bloccati saltato:', err);
    }
  }

  SupabaseAnalytics.track('user_search', { query: term, results: results.length });
  return results;
}
