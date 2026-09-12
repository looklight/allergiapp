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
import { menuPublishState, publishMenu, unpublishMenu, type PublishState } from './venues';

export function usePublishState(venueId: string | null) {
  // savedAt cambia a ogni scrittura riuscita: è il segnale che la bozza si è
  // mossa, e quindi che lo stato va richiesto di nuovo. Il salvataggio ha già
  // la sua pausa, quindi qui non se ne aggiunge un'altra.
  const { savedAt } = useSaveState();
  const [stato, setStato] = useState<PublishState | null>(null);
  const [inCorso, setInCorso] = useState(false);
  // publish_menu() nel database rifiuta silenziosamente (nessun errore
  // Postgres) quando non c'è nessun menù attivo da mettere nello scatto: per
  // write() è una scrittura RIUSCITA (data null, error null), quindi la
  // barra di stato generica avrebbe mostrato "Salvato" mentendo. Qui si
  // distingue quel caso apposta, per dirlo davvero (bug trovato durante il
  // censimento richiesto dall'utente, 14/09 — reso comunque quasi
  // irraggiungibile dal blocco sull'ultimo menù attivo in /menu).
  const [nessunMenuAttivo, setNessunMenuAttivo] = useState(false);

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

  // Ogni scrittura successiva (per esempio riaccendere un menù) azzera
  // l'avviso: non è detto che valga ancora, e tenerlo finché non si ripreme
  // Pubblica lo farebbe leggere come un guasto permanente.
  useEffect(() => {
    setNessunMenuAttivo(false);
  }, [savedAt]);

  const pubblica = useCallback(async () => {
    if (venueId === null) return;
    setInCorso(true);
    setNessunMenuAttivo(false);
    const quando = await publishMenu(venueId);
    setInCorso(false);
    // Fallita: lo stato NON si tocca. Qui dire "pubblicato" sarebbe una
    // bugia — ma NON è detto che sia un guasto di rete o del server (quello
    // lo mostra già la barra di stato generica, col suo "Riprova"): è
    // altrettanto spesso "hai spento tutti i menù", che quella barra non
    // vede affatto (v. il commento sopra). PublishBar lo dice per esteso.
    if (quando === null) {
      setNessunMenuAttivo(true);
      return;
    }
    setStato({
      publishedAt: quando,
      hasChanges: false,
      contentChanged: false,
      appearanceChanged: false,
      allergensChanged: false,
    });
  }, [venueId]);

  // Il ritiro rimette lo stato a "mai pubblicato" per quello che si vede a
  // schermo: l'indirizzo non risponde più, quindi il riquadro sotto
  // l'anteprima e la sezione in fondo tornano quelli di una bozza. Le
  // modifiche in sospeso restano tali — non è stato pubblicato niente.
  const ritira = useCallback(async () => {
    if (venueId === null) return;
    setInCorso(true);
    const fatto = await unpublishMenu(venueId);
    setInCorso(false);
    if (!fatto) return;
    // Senza uno scatto in sala non esiste un "prima" a cui tornare: quello
    // che c'era in sospeso diventa tutto contenuto da pubblicare, come per un
    // menù mai pubblicato (v. migration 710).
    setStato({
      publishedAt: null,
      hasChanges: true,
      contentChanged: true,
      appearanceChanged: false,
      allergensChanged: false,
    });
  }, [venueId]);

  return {
    stato,
    pubblica,
    ritira,
    inCorso,
    nessunMenuAttivo,
    online: stato?.publishedAt != null,
  };
}
