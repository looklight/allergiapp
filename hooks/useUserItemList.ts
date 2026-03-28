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
    const result = await fetchFn(user.uid);
    setItems(result);
    setIsLoading(false);
  }, [user, fetchFn]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, isLoading, reload: load, user };
}
