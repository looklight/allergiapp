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
): { collections: CollectionMeta[]; hydrated: boolean } {
  const [cached, setCached] = useState<CollectionMeta[] | null>(null);
  // Utente per cui la lettura da storage è conclusa (anche se ha trovato null):
  // il confronto con userId dà `hydrated` senza reset sincroni al cambio utente.
  // Stesso significato del gemello useProfileCounts, per sequenziare sulle
  // cache locali (es. ripristino pill selezionata nel profilo).
  const [hydratedUser, setHydratedUser] = useState<string | null>(null);

  // Idrata dalla cache al cambio utente (mostra le pill istantanee a freddo).
  useEffect(() => {
    if (!userId) { setCached(null); return; }
    let active = true;
    storage.getCachedCollections(userId).then((v) => {
      if (active) { setCached(v); setHydratedUser(userId); }
    });
    return () => { active = false; };
  }, [userId]);

  // Quando i dati reali risolvono: ripersisti lo snapshot e aggiorna la cache in
  // memoria (così i revalidate successivi non ripiegano su un valore stale).
  useEffect(() => {
    if (!userId || isLoading) return;
    storage.setCachedCollections(userId, live);
    setCached(live);
  }, [userId, isLoading, live]);

  return {
    collections: isLoading ? (cached ?? []) : live,
    hydrated: userId != null && hydratedUser === userId,
  };
}
