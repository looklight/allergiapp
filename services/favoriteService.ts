import { supabase } from './supabase';
import { mapRestaurant, PG_UNIQUE_VIOLATION } from './restaurant.types';
import type { Favorite } from './restaurant.types';

// ─── Favorites ──────────────────────────────────────────────────────────────

export async function getFavorites(userId: string): Promise<Favorite[]> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((f: any) => ({
      ...f,
      restaurant: f.restaurant ? mapRestaurant(f.restaurant) : undefined,
    }));
  } catch (error) {
    console.warn('[FavoriteService] Errore getFavorites:', error);
    return [];
  }
}

export async function isFavorite(userId: string, restaurantId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    // Prova insert — se UNIQUE violation (23505), il favorito esiste già → delete
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: userId, restaurant_id: restaurantId });

    if (!insertError) return true; // Aggiunto con successo

    if (insertError.code === PG_UNIQUE_VIOLATION) {
      // Già presente → rimuovi
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
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

export async function removeFavorite(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
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
  removeFavorite,
};
