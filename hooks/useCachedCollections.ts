/**
 * Pill liste custom cache-first / stale-while-revalidate — gemello di
 * useProfileCounts, così TUTTE le pill del profilo (Recensioni, Preferiti, liste)
 * si comportano allo stesso modo: a freddo mostrano subito l'ultimo snapshot
 * noto (niente comparsa ritardata), poi si riallineano quando i dati risolvono.
 */

import { useEffect, useState } from 'react';
import { storage, type CollectionMeta } from '../utils/storage';

export function useCachedCollections(
  userId: string | undefined,
  live: CollectionMeta[],
  isLoading: boolean,
): CollectionMeta[] {
  const [cached, setCached] = useState<CollectionMeta[] | null>(null);

  // Idrata dalla cache al cambio utente (mostra le pill istantanee a freddo).
  useEffect(() => {
    if (!userId) { setCached(null); return; }
    let active = true;
    storage.getCachedCollections(userId).then((v) => { if (active) setCached(v); });
    return () => { active = false; };
  }, [userId]);

  // Quando i dati reali risolvono: ripersisti lo snapshot e aggiorna la cache in
  // memoria (così i revalidate successivi non ripiegano su un valore stale).
  useEffect(() => {
    if (!userId || isLoading) return;
    storage.setCachedCollections(userId, live);
    setCached(live);
  }, [userId, isLoading, live]);

  return isLoading ? (cached ?? []) : live;
}
