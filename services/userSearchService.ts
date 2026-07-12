import { supabase } from './supabase';
import { SupabaseAnalytics } from './supabaseAnalytics';

export type UserSearchResult = {
  id: string;
  username: string;
  avatar_url: string | null;
  review_count: number;
  country_count: number;
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

  const results: UserSearchResult[] = (data ?? []).map((r: any) => ({
    id: r.id,
    username: r.username,
    avatar_url: r.avatar_url ?? null,
    // BIGINT arriva come stringa/numero a seconda del driver: normalizza.
    review_count: Number(r.review_count ?? 0),
    country_count: Number(r.country_count ?? 0),
  }));
  SupabaseAnalytics.track('user_search', { query: term, results: results.length });
  return results;
}
