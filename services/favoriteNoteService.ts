import { supabase } from './supabase';

// ─── Note personali sui preferiti ────────────────────────────────────────────
// Nota privata per (utente, ristorante). La tabella ha una FK con ON DELETE
// CASCADE verso `favorites`: la nota esiste solo finche' esiste il preferito,
// quindi non serve cancellarla a mano quando l'utente toglie il cuore — ci
// pensa il database. Vedi migration 066.

export async function getFavoriteNote(userId: string, restaurantId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('favorite_notes')
      .select('note')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    if (error) throw error;
    return data?.note ?? null;
  } catch (error) {
    console.warn('[FavoriteNoteService] Errore getFavoriteNote:', error);
    return null;
  }
}

/**
 * Salva la nota. Testo vuoto → elimina la riga (niente note fantasma).
 * Upsert sulla PK (user_id, restaurant_id): una sola nota per ristorante.
 */
export async function saveFavoriteNote(userId: string, restaurantId: string, note: string): Promise<void> {
  const trimmed = note.trim();

  if (!trimmed) {
    const { error } = await supabase
      .from('favorite_notes')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('favorite_notes')
    .upsert(
      { user_id: userId, restaurant_id: restaurantId, note: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,restaurant_id' },
    );
  if (error) throw error;
}

/**
 * Tutte le note dell'utente in un colpo, indicizzate per restaurant_id.
 * Una sola query (RLS filtra gia' su auth.uid()), niente N+1: usata dalle liste
 * (es. profilo personale) per mostrare la nota nelle card dei preferiti.
 */
export async function getFavoriteNotesMap(userId: string): Promise<Map<string, string>> {
  try {
    const { data, error } = await supabase
      .from('favorite_notes')
      .select('restaurant_id, note')
      .eq('user_id', userId);
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of data ?? []) map.set(row.restaurant_id, row.note);
    return map;
  } catch (error) {
    console.warn('[FavoriteNoteService] Errore getFavoriteNotesMap:', error);
    return new Map();
  }
}

export const FavoriteNoteService = {
  getFavoriteNote,
  saveFavoriteNote,
  getFavoriteNotesMap,
};
