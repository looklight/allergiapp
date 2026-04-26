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
import { getSnapshotColumnFor } from '../constants/foodRestrictions';

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
      // Per le condizioni `likes_to_restriction_reviews`: like dati dall'utente
      // a recensioni filtrate per restrizione del recensore. Selezioniamo
      // ENTRAMBI gli snapshot (dietary + allergens), il routing avviene per
      // category via getSnapshotColumnFor.
      supabase
        .from('review_likes')
        .select('review:reviews!review_id(dietary_snapshot, allergens_snapshot)')
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
    // Restrizioni da tracciare: quelle effettivamente usate dal catalogo AVATARS.
    // Aggiungere un nuovo `likes_to_restriction_reviews` al catalogo basta a popolarne
    // il count: il routing snapshot (dietary vs allergens) avviene per category
    // via getSnapshotColumnFor di constants/foodRestrictions.
    const restrictionsToTrack = Array.from(
      new Set(
        AVATARS.flatMap((a) =>
          a.unlock.type === 'likes_to_restriction_reviews' ? [a.unlock.restriction] : [],
        ),
      ),
    );
    const likesToRestrictionReviews: Record<string, number> = {};
    for (const r of restrictionsToTrack) likesToRestrictionReviews[r] = 0;
    for (const row of dietaryLikesRes.data ?? []) {
      const review = (row as any)?.review;
      if (!review) continue;
      const dietary: string[] = review.dietary_snapshot ?? [];
      const allergens: string[] = review.allergens_snapshot ?? [];
      for (const r of restrictionsToTrack) {
        const col = getSnapshotColumnFor(r);
        const arr = col === 'allergens_snapshot' ? allergens : dietary;
        if (arr.includes(r)) likesToRestrictionReviews[r]++;
      }
    }
    return {
      reviews: reviewsRes.count ?? 0,
      restaurants: restaurantsRes.count ?? 0,
      likes: likesTotal,
      uniqueLikersReceived: (uniqueLikersRes.data as number | null) ?? 0,
      countriesReviewed: countriesSet.size,
      likesToRestrictionReviews,
    };
  } catch (error) {
    console.warn('[UnlockedAvatarsService] fetchUnlockStats error:', error);
    return { reviews: 0, restaurants: 0, likes: 0, uniqueLikersReceived: 0, countriesReviewed: 0, likesToRestrictionReviews: {} };
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
 * Persiste su `profiles.unlocked_avatars` tutti gli id attualmente sbloccati
 * che non vi sono già presenti. Implementa il "grandfathering": una volta che
 * un avatar entra qui, resta sbloccato per l'utente anche se in futuro la
 * condizione di catalogo verrà inasprita.
 *
 * Idempotente: se non c'è delta non scrive nulla. Da chiamare prima della
 * logica popup, così lo sblocco è registrato anche se l'utente chiude l'app
 * prima di dismissare il popup.
 *
 * Ritorna l'unione (alreadyUnlocked ∪ currentlyUnlocked).
 */
export async function persistUnlocks(
  userId: string,
  alreadyUnlocked: readonly string[],
  currentlyUnlocked: readonly string[],
): Promise<string[]> {
  const alreadySet = new Set(alreadyUnlocked);
  const newOnes = currentlyUnlocked.filter((id) => !alreadySet.has(id));
  if (newOnes.length === 0) return [...alreadyUnlocked];
  const merged = [...alreadyUnlocked, ...newOnes];
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ unlocked_avatars: merged })
      .eq('id', userId);
    if (error) throw error;
  } catch (error) {
    console.warn('[UnlockedAvatarsService] persistUnlocks error:', error);
    return [...alreadyUnlocked];
  }
  return merged;
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
