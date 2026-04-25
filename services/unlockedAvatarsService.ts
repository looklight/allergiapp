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
    const [reviewsRes, restaurantsRes, likesRes] = await Promise.all([
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
    ]);
    const likesTotal = (likesRes.data ?? []).reduce(
      (sum, r: any) => sum + (r.likes_count ?? 0),
      0,
    );
    return {
      reviews: reviewsRes.count ?? 0,
      restaurants: restaurantsRes.count ?? 0,
      likes: likesTotal,
    };
  } catch (error) {
    console.warn('[UnlockedAvatarsService] fetchUnlockStats error:', error);
    return { reviews: 0, restaurants: 0, likes: 0 };
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
