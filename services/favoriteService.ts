import { supabase } from './supabase';
import { mapRestaurant, PG_UNIQUE_VIOLATION } from './restaurant.types';
import type { Favorite } from './restaurant.types';
import { getDefaultCollectionId } from './collectionService';

// ─── Favorites ──────────────────────────────────────────────────────────────
// Modello unificato (migration 069): "Preferiti" e' la lista `is_default`
// dell'utente. Il cuore opera sui `collection_items` di quella lista; le firme
// restano identiche cosi' i chiamanti (useRestaurantDetail, useRestaurantFavorites,
// myRestaurantsService) non cambiano. La vista `favorites` resta per i conteggi
// community/RPC, ma le scritture passano da qui su collection_items.

export async function getFavorites(userId: string): Promise<Favorite[]> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('restaurant_id, created_at, restaurant:restaurants(*), collections!inner(user_id, is_default)')
      .eq('collections.user_id', userId)
      .eq('collections.is_default', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      // La vecchia tabella aveva un `id` proprio: nel modello a liste non esiste,
      // sintetizziamo dal restaurant_id (nessun chiamante usa Favorite.id).
      id: row.restaurant_id,
      user_id: userId,
      restaurant_id: row.restaurant_id,
      created_at: row.created_at,
      restaurant: row.restaurant ? mapRestaurant(row.restaurant) : undefined,
    }));
  } catch (error) {
    console.warn('[FavoriteService] Errore getFavorites:', error);
    return [];
  }
}

export async function isFavorite(userId: string, restaurantId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('collection_items')
    .select('restaurant_id, collections!inner(user_id, is_default)', { count: 'exact', head: true })
    .eq('collections.user_id', userId)
    .eq('collections.is_default', true)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const collectionId = await getDefaultCollectionId(userId);
    // Prova insert — se UNIQUE violation (23505), e' gia' nei preferiti → delete
    const { error: insertError } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, restaurant_id: restaurantId });

    if (!insertError) return true; // Aggiunto con successo

    if (insertError.code === PG_UNIQUE_VIOLATION) {
      const { error: deleteError } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('restaurant_id', restaurantId);
      if (deleteError) throw deleteError;
      return false;
    }

    throw insertError;
  } catch (error) {
    console.warn('[FavoriteService] Errore toggleFavorite:', error);
    throw error;
  }
}

/**
 * Imposta esplicitamente lo stato preferito (Preferiti = lista di default).
 * Usato dal bottom sheet "Salva in…" che conosce lo stato target (a differenza
 * di toggleFavorite). Idempotente.
 */
export async function setFavorite(userId: string, restaurantId: string, value: boolean): Promise<void> {
  const collectionId = await getDefaultCollectionId(userId);
  if (value) {
    const { error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, restaurant_id: restaurantId });
    if (error && error.code !== PG_UNIQUE_VIOLATION) throw error;
  } else {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
  }
}

export async function removeFavorite(userId: string, restaurantId: string): Promise<void> {
  const collectionId = await getDefaultCollectionId(userId);
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('restaurant_id', restaurantId);
  if (error) {
    console.warn('[FavoriteService] Errore removeFavorite:', error);
    throw error;
  }
}

export const FavoriteService = {
  getFavorites,
  isFavorite,
  toggleFavorite,
  setFavorite,
  removeFavorite,
};
