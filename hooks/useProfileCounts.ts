/**
 * Conteggi profilo (recensioni/preferiti) cache-first / stale-while-revalidate.
 *
 * Il profilo unificato carica le liste complete per renderle in pagina e ricava
 * i conteggi da `.length`: questo introduce una finestra in cui il numero vero
 * non è ancora noto. Senza cache si vedrebbe 0→N (flash). Qui:
 *  - all'apertura mostriamo subito l'ultimo conteggio salvato in locale (instant);
 *  - quando le liste risolvono usiamo il valore reale e lo ripersistiamo;
 *  - se non c'è ancora cache (primissimo avvio) restituiamo null → skeleton.
 *
 * Persistiamo solo quando ENTRAMBE le liste sono caricate, così la cache contiene
 * sempre uno snapshot coerente dei due numeri.
 */

import { useEffect, useState } from 'react';
import { storage, type ProfileCounts } from '../utils/storage';

type Live = ProfileCounts;
type Loading = { reviews: boolean; favorites: boolean };

export function useProfileCounts(
  userId: string | undefined,
  live: Live,
  loading: Loading,
): { reviews: number | null; favorites: number | null } {
  const [cached, setCached] = useState<ProfileCounts | null>(null);

  // Idrata la cache al cambio utente (null in attesa → skeleton al primo avvio).
  useEffect(() => {
    if (!userId) {
      setCached(null);
      return;
    }
    let active = true;
    storage.getProfileCounts(userId).then((v) => {
      if (active) setCached(v);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // Ripersisti quando entrambe le liste hanno finito: snapshot coerente.
  useEffect(() => {
    if (!userId || loading.reviews || loading.favorites) return;
    storage.setProfileCounts(userId, { reviews: live.reviews, favorites: live.favorites });
  }, [userId, loading.reviews, loading.favorites, live.reviews, live.favorites]);

  return {
    reviews: loading.reviews ? cached?.reviews ?? null : live.reviews,
    favorites: loading.favorites ? cached?.favorites ?? null : live.favorites,
  };
}
