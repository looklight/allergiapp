/**
 * Context globale per il sistema di notifica avatar sbloccati.
 *
 * Espone lo stato dei "nuovi sblocchi" (calcolati confrontando avatar attualmente
 * sbloccati vs `profiles.seen_unlocked_avatars`) e una funzione di acknowledge
 * che marca i nuovi come visti dopo che l'utente li ha visualizzati nel popup.
 *
 * Trigger di refresh:
 *  - Login utente / cambio profilo (automatico via useEffect su userProfile)
 *  - Foreground app (AppState listener)
 *  - Manualmente chiamando `refresh()` dopo azioni che potrebbero sbloccare
 *    nuovi avatar (es. nuova recensione)
 *
 * Limite: massimo 1 popup per sessione, anche se ci sono più sblocchi multipli
 * → il popup dice "X nuovi avatar" e rimanda alla galleria.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import {
  computeNewlyUnlocked,
  fetchUnlockStats,
  markAvatarsAsSeen,
} from '../services/unlockedAvatarsService';

interface UnlockedAvatarsContextValue {
  /** Numero di nuovi avatar sbloccati e non ancora confermati dall'utente. */
  newlyUnlockedCount: number;
  /**
   * Conferma e azzera i nuovi sblocchi. Da chiamare quando l'utente chiude
   * il popup (sia tramite "Vedi galleria" che "Più tardi").
   */
  acknowledgeUnlocks: () => Promise<void>;
  /**
   * Forza un re-check delle stats e degli sblocchi.
   * Da chiamare manualmente dopo azioni utente che potrebbero sbloccare
   * nuovi avatar (es. dopo `addReview`, `addRestaurant`).
   */
  refresh: () => Promise<void>;
}

const UnlockedAvatarsContext = createContext<UnlockedAvatarsContextValue>({
  newlyUnlockedCount: 0,
  acknowledgeUnlocks: async () => {},
  refresh: async () => {},
});

export function UnlockedAvatarsProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, refreshProfile } = useAuth();
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState<string[]>([]);
  // Mostra il popup al massimo una volta per sessione (anche se più sblocchi
  // si accumulano in background). Resettato al cambio utente.
  const shownThisSessionRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.uid || !userProfile) return;
    if (shownThisSessionRef.current) return;
    try {
      const stats = await fetchUnlockStats(user.uid);
      const newOnes = computeNewlyUnlocked(stats, userProfile.seen_unlocked_avatars ?? []);
      if (newOnes.length > 0) {
        setNewlyUnlockedIds(newOnes.map((a) => a.id));
      }
    } catch (err) {
      console.warn('[UnlockedAvatarsContext] refresh error:', err);
    }
  }, [user?.uid, userProfile]);

  const acknowledgeUnlocks = useCallback(async () => {
    if (!user?.uid || newlyUnlockedIds.length === 0) return;
    const idsToAck = newlyUnlockedIds;
    setNewlyUnlockedIds([]);
    shownThisSessionRef.current = true;
    await markAvatarsAsSeen(user.uid, idsToAck);
    await refreshProfile();
  }, [user?.uid, newlyUnlockedIds, refreshProfile]);

  // Reset del flag "mostrato in questa sessione" quando cambia l'utente
  // (logout/login con account diverso).
  useEffect(() => {
    shownThisSessionRef.current = false;
    setNewlyUnlockedIds([]);
  }, [user?.uid]);

  // Trigger primario: ogni volta che il profilo è disponibile o si aggiorna.
  // Copre login, refresh manuali e aggiornamenti dopo azioni utente.
  useEffect(() => {
    if (user && userProfile) refresh();
  }, [user, userProfile, refresh]);

  // Trigger secondario: ritorno in foreground (cattura sblocchi avvenuti
  // mentre l'app era in background, es. like ricevuti).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return (
    <UnlockedAvatarsContext.Provider
      value={{
        newlyUnlockedCount: newlyUnlockedIds.length,
        acknowledgeUnlocks,
        refresh,
      }}
    >
      {children}
    </UnlockedAvatarsContext.Provider>
  );
}

export function useUnlockedAvatars() {
  return useContext(UnlockedAvatarsContext);
}
