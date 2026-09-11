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
  // Niente testo cercato: sarebbe il nome di un'altra persona, legato all'id di
  // chi cerca e conservato per sempre — e nessuna RPC admin lo legge (la lista
  // "Top ricerche" guarda solo restaurant_search). Il numero di risultati resta:
  // dice quante ricerche di persone non trovano nessuno.
  SupabaseAnalytics.track('user_search', { results: results.length });
  return results;
}

/**
 * Risolve uno username in id profilo per il deep link /u/{username}
 * (RPC get_profile_id_by_username, mig 078). Anonimi mai risolti (guardia
 * server-side). Ritorna null se non trovato.
 */
export async function getProfileIdByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_profile_id_by_username', {
    p_username: username,
  });
  if (error) throw error;
  return data ?? null;
}
