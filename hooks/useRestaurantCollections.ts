import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { CollectionService, type CollectionWithCount } from '../services/collectionService';

/**
 * Loader delle liste **custom** dell'utente + appartenenza di un ristorante,
 * per il bottom sheet "Salva in…" e le pill read-only sulla scheda. La lista di
 * default ("Preferiti") e' gestita a parte da useRestaurantDetail (isFavorite/
 * setFavorite), quindi qui escludiamo sempre is_default.
 * Le scritture (aggiungi/togli/crea) le fa lo sheet alla Conferma; questo hook
 * carica e basta, ed espone reload() per riallinearsi dopo la conferma.
 */
export function useRestaurantCollections(restaurantId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.uid;

  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [membership, setMembership] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId || !restaurantId) {
      setCollections([]);
      setMembership(new Set());
      return;
    }
    setIsLoading(true);
    try {
      const [cols, ids] = await Promise.all([
        CollectionService.getCollections(userId),
        CollectionService.getCollectionIdsForRestaurant(userId, restaurantId),
      ]);
      const custom = cols.filter((c) => !c.is_default);
      const customIds = new Set(custom.map((c) => c.id));
      setCollections(custom);
      // Membership delle SOLE liste custom (la default = isFavorite, gestita altrove).
      setMembership(new Set([...ids].filter((id) => customIds.has(id))));
    } finally {
      setIsLoading(false);
    }
  }, [userId, restaurantId]);

  // Ricarica al focus della schermata (non solo al montaggio): rientrando sul
  // dettaglio le liste si riallineano se l'utente ne ha create/eliminate/rinominate
  // altrove, cosi' lo sheet "Salva in…" non mostra mai uno snapshot stale.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { collections, membership, isLoading, reload };
}
