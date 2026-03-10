import { useState, useCallback } from 'react';
import { RestaurantService } from '../services/restaurantService';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

/**
 * Hook centralizzato per gestire i like sui piatti di un ristorante.
 * Non carica automaticamente — il chiamante deve invocare `reloadLikes` (es. via useFocusEffect).
 */
export function useDishLikes(restaurantId: string | undefined) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [dishLikes, setDishLikes] = useState<Map<string, string[]>>(new Map());

  const loadLikes = useCallback(async () => {
    if (!restaurantId) return;
    const likes = await RestaurantService.getDishLikes(restaurantId);
    setDishLikes(likes);
  }, [restaurantId]);

  const toggleLike = useCallback(async (reviewDishId: string) => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    if (!restaurantId) return;

    const currentLikers = dishLikes.get(reviewDishId) ?? [];
    const alreadyLiked = currentLikers.includes(user.uid);

    // Optimistic update
    setDishLikes(prev => {
      const next = new Map(prev);
      if (alreadyLiked) {
        next.set(reviewDishId, currentLikers.filter(uid => uid !== user.uid));
      } else {
        next.set(reviewDishId, [...currentLikers, user.uid]);
      }
      return next;
    });

    try {
      const liked = await RestaurantService.toggleDishLike(reviewDishId, user.uid);
      // Se il server non concorda con l'update ottimistico, ricarica
      if (liked === alreadyLiked) {
        const fresh = await RestaurantService.getDishLikes(restaurantId);
        setDishLikes(fresh);
      }
    } catch {
      // Rollback optimistic update
      setDishLikes(prev => {
        const next = new Map(prev);
        next.set(reviewDishId, currentLikers);
        return next;
      });
    }
  }, [restaurantId, user, isAuthenticated, dishLikes, router]);

  /** Controlla se l'utente corrente ha messo like */
  const isLiked = useCallback((reviewDishId: string): boolean => {
    if (!user) return false;
    const likers = dishLikes.get(reviewDishId) ?? [];
    return likers.includes(user.uid);
  }, [dishLikes, user]);

  /** Ritorna la lista di userId che hanno messo like */
  const getLikers = useCallback((reviewDishId: string): string[] => {
    return dishLikes.get(reviewDishId) ?? [];
  }, [dishLikes]);

  return { dishLikes, toggleLike, isLiked, getLikers, reloadLikes: loadLikes };
}
