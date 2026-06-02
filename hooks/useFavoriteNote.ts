import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteNoteService } from '../services/favoriteNoteService';

export type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Gestisce la nota personale di un ristorante preferito, isolata dalla logica
 * del preferito stesso (che non deve sapere nulla della nota).
 *
 * Salvataggio senza pulsante: si scrive su `flush()`, chiamato dalla UI
 * all'uscita dal campo (onBlur) e allo smontaggio della schermata. La cascata
 * a livello DB (vedi migration 066) si occupa della cancellazione quando il
 * preferito viene rimosso, quindi qui non cancelliamo mai a mano.
 */
export function useFavoriteNote(restaurantId: string | undefined, isFavorite: boolean) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.uid;

  const [note, setNote] = useState('');
  const [status, setStatus] = useState<NoteSaveStatus>('idle');

  // Ref allineati a ogni render: servono al flush stabile (onBlur/unmount) per
  // leggere sempre il valore corrente senza ricrearsi a ogni battitura.
  const noteRef = useRef(note);
  noteRef.current = note;
  const savedRef = useRef('');
  const isFavoriteRef = useRef(isFavorite);
  isFavoriteRef.current = isFavorite;

  // Carica la nota quando il ristorante diventa preferito; resetta quando smette
  // di esserlo (la riga DB e' gia' stata cancellata in cascata dal preferito).
  useEffect(() => {
    if (!isAuthenticated || !userId || !restaurantId || !isFavorite) {
      setNote('');
      savedRef.current = '';
      setStatus('idle');
      return;
    }
    let cancelled = false;
    (async () => {
      const value = await FavoriteNoteService.getFavoriteNote(userId, restaurantId);
      if (cancelled) return;
      savedRef.current = value ?? '';
      setNote(value ?? '');
      setStatus('idle');
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, restaurantId, isFavorite]);

  const flush = useCallback(async () => {
    if (!userId || !restaurantId || !isFavoriteRef.current) return;
    const current = noteRef.current.trim();
    if (current === savedRef.current.trim()) return; // niente da salvare
    setStatus('saving');
    try {
      await FavoriteNoteService.saveFavoriteNote(userId, restaurantId, current);
      savedRef.current = current;
      setStatus('saved');
    } catch {
      // Es. corsa col preferito non ancora persistito (FK) o rete assente:
      // teniamo il testo, l'utente puo' ritentare al prossimo blur.
      setStatus('error');
    }
  }, [userId, restaurantId]);

  // Salvataggio anche allo smontaggio (uscita schermata / chiusura sheet senza
  // togliere il focus). flush e' stabile per (userId, restaurantId).
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => { flushRef.current(); }, []);

  const onChangeNote = useCallback((text: string) => {
    setNote(text);
    setStatus('idle');
  }, []);

  return { note, status, onChangeNote, flush };
}
