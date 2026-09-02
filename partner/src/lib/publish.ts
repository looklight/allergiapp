'use client';

// LO STATO DELLA MESSA ONLINE, letto una volta sola per schermata.
//
// Lo tiene la pagina e lo passa a chi serve — la riga in cima (PublishBar),
// la sezione dell'indirizzo (MenuAddress) e il collegamento sotto
// l'anteprima. Se ognuno se lo leggesse per conto suo sarebbero tre
// interrogazioni identiche a ogni tasto premuto, e potrebbero pure
// raccontare tre cose diverse per un istante.
import { useCallback, useEffect, useState } from 'react';
import { useSaveState } from './saveState';
import { menuPublishState, publishMenu, type PublishState } from './venues';

export function usePublishState(venueId: string | null) {
  // savedAt cambia a ogni scrittura riuscita: è il segnale che la bozza si è
  // mossa, e quindi che lo stato va richiesto di nuovo. Il salvataggio ha già
  // la sua pausa, quindi qui non se ne aggiunge un'altra.
  const { savedAt } = useSaveState();
  const [stato, setStato] = useState<PublishState | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (venueId === null) return;
    let vivo = true;
    void menuPublishState(venueId).then((s) => {
      if (vivo && s) setStato(s);
    });
    return () => {
      vivo = false;
    };
  }, [venueId, savedAt]);

  const pubblica = useCallback(async () => {
    if (venueId === null) return;
    setInCorso(true);
    const quando = await publishMenu(venueId);
    setInCorso(false);
    // Fallita: lo stato NON si tocca. L'errore lo mostra la barra di stato
    // con il suo "Riprova"; qui dire "pubblicato" sarebbe una bugia.
    if (quando === null) return;
    setStato({ publishedAt: quando, hasChanges: false, allergensChanged: false });
  }, [venueId]);

  return { stato, pubblica, inCorso, online: stato?.publishedAt != null };
}
