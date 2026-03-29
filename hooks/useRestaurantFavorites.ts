import { useState, useCallback, useRef } from 'react';
import { RestaurantService, type Restaurant } from '../services/restaurantService';

type UpdateRestaurant = (id: string, updater: (r: Restaurant) => Restaurant) => void;

export function useRestaurantFavorites(userId: string | undefined, updateRestaurant: UpdateRestaurant) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // Ref per evitare che toggleFavorite si ricrei ad ogni cambio di favoriteIds
  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;

  const loadFavorites = useCallback(async () => {
    if (!userId) { setFavoriteIds(new Set()); return; }
    const favs = await RestaurantService.getFavorites(userId);
    setFavoriteIds(new Set(favs.map(f => f.restaurant_id)));
  }, [userId]);

  const pendingRef = useRef<Set<string>>(new Set());

  const toggleFavorite = useCallback(async (restaurantId: string): Promise<boolean> => {
    if (!userId) return false;
    if (pendingRef.current.has(restaurantId)) return false;
    pendingRef.current.add(restaurantId);
    const willBeFav = !favoriteIdsRef.current.has(restaurantId);
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (willBeFav) next.add(restaurantId);
      else next.delete(restaurantId);
      return next;
    });
    updateRestaurant(restaurantId, r => ({
      ...r, favorite_count: (r.favorite_count ?? 0) + (willBeFav ? 1 : -1),
    }));
    try {
      const actual = await RestaurantService.toggleFavorite(userId, restaurantId);
      if (actual !== willBeFav) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (actual) next.add(restaurantId);
          else next.delete(restaurantId);
          return next;
        });
        updateRestaurant(restaurantId, r => ({
          ...r, favorite_count: (r.favorite_count ?? 0) + (actual ? 1 : -1),
        }));
      }
      return true;
    } catch {
      // Rollback
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (willBeFav) next.delete(restaurantId);
        else next.add(restaurantId);
        return next;
      });
      updateRestaurant(restaurantId, r => ({
        ...r, favorite_count: (r.favorite_count ?? 0) + (willBeFav ? -1 : 1),
      }));
      return false;
    } finally {
      pendingRef.current.delete(restaurantId);
    }
  }, [userId, updateRestaurant]);

  /** Aggiorna solo lo stato locale di un singolo preferito (senza chiamata API).
   *  Usato dal callback onFavoriteToggled della detail sheet, che gestisce l'API da sé. */
  const syncFavoriteId = useCallback((id: string, isFavorite: boolean) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFavorite) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { favoriteIds, loadFavorites, toggleFavorite, syncFavoriteId };
}
