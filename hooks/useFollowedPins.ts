import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getFollowedPins } from '../services/followService';
import type { RestaurantPin } from '../services/restaurant.types';

/**
 * Set dei ristoranti recensiti dai seguiti per il filtro mappa "Recensiti
 * dai seguiti". Vive SOPRA la pipeline viewport (useRestaurantGeo non è
 * coinvolto): il set è piccolo per natura (decine di seguiti × decine di
 * recensioni) e arriva già pin-shaped dalla RPC get_followed_pins (mig 081).
 *
 * Ricariche: all'attivazione e al cambio modalità alloggi (effect interno);
 * al focus della schermata via `load` esposto (stesso pattern di loadSaved —
 * copre follow/unfollow altrove E nuove recensioni dei seguiti, che nessuna
 * graphVersion locale può vedere). A filtro spento il set resta in memoria:
 * un re-toggle nella stessa sessione mostra subito i pin vecchi mentre il
 * refresh è in volo (niente flash di mappa vuota).
 */
export function useFollowedPins(userId: string | undefined, enabled: boolean, showLodging: boolean) {
  const [pins, setPins] = useState<RestaurantPin[]>([]);
  /** null = nessun load risolto con successo. Dopo un load riuscito: true se
   *  il set è vuoto. Distingue "vuoto confermato" (il ripristino può
   *  auto-spegnere il filtro) da "fetch fallito" (offline: la preferenza
   *  persistita resta intatta e il prossimo focus ritenta). */
  const [confirmedEmpty, setConfirmedEmpty] = useState<boolean | null>(null);

  // Refs per un `load` stabile (callable dal focus effect della schermata
  // senza rimbalzi di identità) che legge sempre i valori correnti.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const showLodgingRef = useRef(showLodging);
  showLodgingRef.current = showLodging;
  /** Epoch anti-race: un toggle alloggi rapido non deve far vincere la
   *  risposta vecchia su quella nuova. */
  const loadEpoch = useRef(0);

  const load = useCallback(async () => {
    if (!userIdRef.current) return;
    const epoch = ++loadEpoch.current;
    try {
      const result = await getFollowedPins(showLodgingRef.current);
      if (loadEpoch.current !== epoch) return;
      setPins(result);
      setConfirmedEmpty(result.length === 0);
    } catch {
      // Rete assente o RPC non ancora applicata: tieni il set precedente,
      // non toccare confirmedEmpty (nessun auto-spegnimento su errore).
    }
  }, []);

  // Logout: il set appartiene all'utente precedente.
  useEffect(() => {
    if (!userId) {
      loadEpoch.current++;
      setPins([]);
      setConfirmedEmpty(null);
    }
  }, [userId]);

  // Attivazione + cambio modalità alloggi (il SET cambia: serves_food vs
  // offers_lodging, speculare a get_pins_in_bounds). Il refresh al focus
  // resta alla schermata.
  useEffect(() => {
    if (enabled && userId) load();
  }, [enabled, userId, showLodging, load]);

  const ids = useMemo(() => new Set(pins.map(p => p.id)), [pins]);

  return { followedPins: pins, followedIds: ids, loadFollowedPins: load, followedConfirmedEmpty: confirmedEmpty };
}
