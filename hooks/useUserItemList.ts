import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook generico per liste di dati dell'utente autenticato.
 * Elimina il pattern duplicato fetch + loading + FlatList in
 * favorites, my-reviews, my-restaurants.
 */
export function useUserItemList<T>(
  fetchFn: (userId: string) => Promise<T[]>,
) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await fetchFn(user.uid);
      setItems(result);
    } catch (err) {
      // Un fetcher che rigetta (es. RPC assente/rete) non deve inchiodare
      // isLoading a true: gli item precedenti restano, il loading si chiude.
      console.warn('[useUserItemList] fetch fallito:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchFn]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, isLoading, reload: load, user };
}
