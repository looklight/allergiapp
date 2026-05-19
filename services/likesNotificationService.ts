/**
 * Service per il sistema di notifica "nuovi like ricevuti".
 *
 * Cosa fa:
 *  - Persiste su profiles.last_seen_likes_count il totale visto dall'utente
 *    quando ha aperto il profilo l'ultima volta.
 *  - Il delta unseen = currentLikes - lastSeenLikesCount viene calcolato
 *    altrove (hook useLikesNotification) componendo questa colonna con
 *    getLikesReceivedByUser.
 *
 * Idempotente: chiamare markLikesAsSeen con lo stesso count non fa danni.
 */

import { supabase } from './supabase';

export async function markLikesAsSeen(userId: string, count: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_likes_count: count })
    .eq('id', userId);
  if (error) {
    console.warn('[LikesNotification] markLikesAsSeen failed:', error);
    throw error;
  }
}
