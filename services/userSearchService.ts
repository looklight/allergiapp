import { supabase } from './supabase';
import { SupabaseAnalytics } from './supabaseAnalytics';

export type UserSearchResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

/**
 * Ricerca utenti per username (RPC search_users, mig 076+077): sottostringa
 * case-insensitive, prefissi in testa. Anonimi, bloccati e se stessi sono
 * esclusi server-side.
 */
export async function searchUsers(
  query: string,
  limit: number = 20,
): Promise<UserSearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const { data, error } = await supabase.rpc('search_users', {
    p_query: term,
    p_limit: limit,
  });
  if (error) throw error;

  const results: UserSearchResult[] = data ?? [];
  SupabaseAnalytics.track('user_search', { query: term, results: results.length });
  return results;
}
