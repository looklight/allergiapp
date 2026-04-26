/**
 * Service per il sistema di notifica avatar sbloccati.
 *
 * Responsabilità:
 *  - Leggere le stats utente che servono a valutare le condizioni di sblocco
 *    (recensioni, ristoranti, like ricevuti, ecc.).
 *  - Calcolare quali avatar sono "nuovi" rispetto a quelli già visti dall'utente.
 *  - Scrivere su Supabase l'aggiornamento di `seen_unlocked_avatars` quando
 *    l'utente conferma di aver visto i nuovi sblocchi.
 *
 * Design: la logica di valutazione delle condizioni vive in `constants/avatars.ts`
 * (`isAvatarUnlocked`). Questo service la usa ma non la duplica.
 */

import { supabase } from './supabase';
import { AVATARS, isAvatarUnlocked, type AvatarOption, type UnlockStats } from '../constants/avatars';

/**
 * Recupera dal DB tutte le metriche aggregate necessarie a valutare le condizioni
 * di sblocco di un utente. Una sola chiamata parallela per tutti i conteggi.
 */
export async function fetchUnlockStats(userId: string): Promise<UnlockStats> {
  try {
    const [reviewsRes, restaurantsRes, likesRes, uniqueLikersRes, countriesRes, dietaryLikesRes] = await Promise.all([
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('added_by', userId),
      supabase
        .from('reviews')
        .select('likes_count')
        .eq('user_id', userId),
      // Per `unique_likers_received`: usa RPC server-side per evitare doppio
      // JOIN lato client e fragilità della sintassi PostgREST.
      supabase.rpc('get_unique_likers_count', { p_user_id: userId }),
      // Per "Poliglotta": numero di paesi distinti in cui l'utente ha recensito.
      // JOIN inline su restaurants tramite la relazione restaurant_id.
      supabase
        .from('reviews')
        .select('restaurant:restaurants!restaurant_id(country_code)')
        .eq('user_id', userId),
      // Per le condizioni `likes_to_dietary_reviews`: like dati dall'utente
      // a recensioni filtrate per dieta del recensore (dietary_snapshot).
      // Una sola query per tutte le diete: filtraggio in memoria.
      supabase
        .from('review_likes')
        .select('review:reviews!review_id(dietary_snapshot)')
        .eq('user_id', userId),
    ]);
    const likesTotal = (likesRes.data ?? []).reduce(
      (sum, r: any) => sum + (r.likes_count ?? 0),
      0,
    );
    const countriesSet = new Set<string>();
    for (const row of countriesRes.data ?? []) {
      const code = (row as any)?.restaurant?.country_code;
      if (code) countriesSet.add(code);
    }
    // Diete da tracciare: quelle effettivamente usate dal catalogo AVATARS.
    // Aggiungere una nuova `likes_to_dietary_reviews` al catalogo basta a popolarne il count.
    const dietsToTrack = Array.from(
      new Set(
        AVATARS.flatMap((a) =>
          a.unlock.type === 'likes_to_dietary_reviews' ? [a.unlock.dietary] : [],
        ),
      ),
    );
    const likesToDietaryReviews: Record<string, number> = {};
    for (const diet of dietsToTrack) likesToDietaryReviews[diet] = 0;
    for (const row of dietaryLikesRes.data ?? []) {
      const snapshot: string[] | undefined = (row as any)?.review?.dietary_snapshot;
      if (!snapshot) continue;
      for (const diet of dietsToTrack) {
        if (snapshot.includes(diet)) likesToDietaryReviews[diet]++;
      }
    }
    return {
      reviews: reviewsRes.count ?? 0,
      restaurants: restaurantsRes.count ?? 0,
      likes: likesTotal,
      uniqueLikersReceived: (uniqueLikersRes.data as number | null) ?? 0,
      countriesReviewed: countriesSet.size,
      likesToDietaryReviews,
    };
  } catch (error) {
    console.warn('[UnlockedAvatarsService] fetchUnlockStats error:', error);
    return { reviews: 0, restaurants: 0, likes: 0, uniqueLikersReceived: 0, countriesReviewed: 0, likesToDietaryReviews: {} };
  }
}

/**
 * Funzione pura: dato lo stato attuale, ritorna gli avatar sbloccati che
 * NON sono ancora nel set "già visti" dell'utente.
 *
 * La galleria mostrerà comunque tutti gli avatar; questo serve solo a sapere
 * quanti popup di notifica mostrare al momento giusto.
 */
export function computeNewlyUnlocked(
  stats: UnlockStats,
  seenAvatarIds: readonly string[],
): AvatarOption[] {
  const seenSet = new Set(seenAvatarIds);
  return AVATARS.filter(
    (avatar) => isAvatarUnlocked(avatar, stats) && !seenSet.has(avatar.id),
  );
}

/**
 * Marca un set di avatar come "visti" lato server, fondendoli con quelli già
 * presenti su `profiles.seen_unlocked_avatars`.
 *
 * Lettura + UPDATE separati: race condition multi-device improbabile, e in caso
 * peggiore l'utente vedrebbe un popup duplicato (non perde dati).
 */
export async function markAvatarsAsSeen(
  userId: string,
  avatarIds: readonly string[],
): Promise<void> {
  if (avatarIds.length === 0) return;
  try {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('seen_unlocked_avatars')
      .eq('id', userId)
      .single();
    if (fetchErr) throw fetchErr;
    const merged = new Set<string>([
      ...(profile?.seen_unlocked_avatars ?? []),
      ...avatarIds,
    ]);
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ seen_unlocked_avatars: [...merged] })
      .eq('id', userId);
    if (updateErr) throw updateErr;
  } catch (error) {
    console.warn('[UnlockedAvatarsService] markAvatarsAsSeen error:', error);
  }
}
