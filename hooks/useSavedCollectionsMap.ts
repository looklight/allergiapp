import { useState, useCallback } from 'react';
import { CollectionService } from '../services/collectionService';
import type { Restaurant } from '../services/restaurant.types';

/**
 * Carica i ristoranti salvati nelle liste **custom** dell'utente per la mappa:
 * il simbolo da mostrare come badge sul pin (emoji o bookmark) e gli oggetti
 * Restaurant per tenerli sempre visibili. Separato da useRestaurantFavorites
 * (cuore/lista di default): qui niente toggle, solo lettura + reload su focus.
 */
export function useSavedCollectionsMap(userId: string | undefined) {
  // restaurantId → emoji (string) | null (bookmark). Assenza = non in lista custom.
  const [savedSymbols, setSavedSymbols] = useState<Map<string, string | null>>(new Map());
  const [savedRestaurants, setSavedRestaurants] = useState<Map<string, Restaurant>>(new Map());

  const loadSaved = useCallback(async () => {
    if (!userId) {
      setSavedSymbols(new Map());
      setSavedRestaurants(new Map());
      return;
    }
    const { symbols, restaurants } = await CollectionService.getSavedCustomForMap(userId);
    setSavedSymbols(symbols);
    setSavedRestaurants(restaurants);
  }, [userId]);

  return { savedSymbols, savedRestaurants, loadSaved };
}
