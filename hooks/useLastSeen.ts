import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { AuthService } from '../services/auth';

// Throttle: al massimo una scrittura ogni THROTTLE_MS di utilizzo per utente.
// La dashboard admin mostra "Oggi / Ieri / N gg fa", quindi 1h e' piu' che
// sufficiente come granularita' e tiene bassissimo il numero di UPDATE su
// profiles (a scala: ~1 scrittura/ora di utilizzo per utente attivo).
const THROTTLE_MS = 60 * 60 * 1000;

/**
 * Aggiorna profiles.last_seen_at (presence operativa per la dashboard admin)
 * al primo avvio con sessione e a ogni ritorno in foreground, con throttle.
 * Da montare una sola volta, dove e' disponibile l'utente autenticato.
 */
export function useLastSeen(userId: string | null | undefined) {
  // Timestamp dell'ultima scrittura (per il throttle). In ref: persiste tra i
  // render ma si resetta al cambio utente (vedi sotto).
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (!userId) return;

    // Nuovo utente (login / cambio account): azzera il throttle cosi' la prima
    // apparizione del nuovo utente viene registrata subito.
    lastTouchRef.current = 0;

    const touch = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < THROTTLE_MS) return;
      lastTouchRef.current = now;
      void AuthService.touchLastSeen();
    };

    // Cold-start / login: AppState parte gia' su 'active' e NON emette l'evento
    // 'change', quindi la prima apertura la registriamo esplicitamente qui.
    touch();

    // Ritorno in foreground dopo background/suspension (senza cold-start).
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') touch();
    });
    return () => sub.remove();
  }, [userId]);
}
