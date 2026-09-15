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

// L'ULTIMO STATO NOTO DI OGNI LOCALE, per tutta la sessione. Passando da un
// locale all'altro (i capitoli della home) o dall'editor alla home, lo stato
// c'è già e si vede subito; la richiesta parte lo stesso e lo corregge se nel
// frattempo è cambiato. Senza, ogni cambio di locale mostrava prima
// "non ancora pubblicato" e poi, a risposta arrivata, "online": pallino,
// sottofrase e pulsanti che cambiavano sotto gli occhi (segnalato
// dall'utente, 14/09).
const noti = new Map<string, PublishState>();

// Lo chiede la home per TUTTI i locali appena li conosce, così anche il primo
// passaggio a un locale mai aperto trova lo stato pronto.
export function prefetchPublishState(venueIds: string[]) {
  for (const id of venueIds) {
    if (noti.has(id)) continue;
    void menuPublishState(id).then((s) => {
      if (s && !noti.has(id)) noti.set(id, s);
    });
  }
}

// LO STATO DI PIÙ LOCALI INSIEME, per chi li elenca (l'elenco dei menù, col
// pallino accanto al nome di ogni locale). Solo lettura: pubblicare e ritirare
// passano dall'editor, con usePublishState. Parte da quello che è già in
// memoria e lo corregge a risposta arrivata; un locale mai letto resta null
// finché non si sa — meglio niente che affermare "non pubblicato".
export function usePublishStates(venueIds: string[]): Record<string, PublishState | null> {
  // una chiave stabile: l'elenco arriva come array nuovo a ogni disegno
  const chiave = [...venueIds].sort().join(',');
  const [letti, setLetti] = useState<Record<string, PublishState>>({});

  useEffect(() => {
    let vivo = true;
    for (const id of chiave === '' ? [] : chiave.split(',')) {
      void menuPublishState(id).then((s) => {
        if (!s) return;
        noti.set(id, s);
        if (vivo) setLetti((prima) => ({ ...prima, [id]: s }));
      });
    }
    return () => {
      vivo = false;
    };
  }, [chiave]);

  return Object.fromEntries(venueIds.map((id) => [id, letti[id] ?? noti.get(id) ?? null]));
}

export function usePublishState(venueId: string | null) {
  // savedAt cambia a ogni scrittura riuscita: è il segnale che la bozza si è
  // mossa, e quindi che lo stato va richiesto di nuovo. Il salvataggio ha già
  // la sua pausa, quindi qui non se ne aggiunge un'altra.
  const { savedAt } = useSaveState();
  // Lo stato porta con sé il locale a cui si riferisce. Prima c'era solo lo
  // stato, azzerato da un effetto al cambio di locale: ma l'effetto gira DOPO
  // il disegno, quindi per un fotogramma il locale nuovo si vedeva con lo
  // stato del vecchio — e una risposta in ritardo del vecchio poteva
  // scrivercisi sopra. Così invece uno stato di un altro locale non si
  // mostra mai, per costruzione.
  const [voce, setVoce] = useState<{ venueId: string; stato: PublishState } | null>(null);
  const stato =
    venueId === null
      ? null
      : voce?.venueId === venueId
        ? voce.stato
        : (noti.get(venueId) ?? null);
  const setStato = useCallback((id: string, s: PublishState) => {
    noti.set(id, s);
    setVoce({ venueId: id, stato: s });
  }, []);
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
      if (vivo && s) setStato(venueId, s);
    });
    return () => {
      vivo = false;
    };
  }, [venueId, savedAt, setStato]);

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
    setStato(venueId, {
      publishedAt: quando,
      hasChanges: false,
      contentChanged: false,
      appearanceChanged: false,
      allergensChanged: false,
    });
  }, [venueId, setStato]);

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
    setStato(venueId, {
      publishedAt: null,
      hasChanges: true,
      contentChanged: true,
      appearanceChanged: false,
      allergensChanged: false,
    });
  }, [venueId, setStato]);

  return {
    stato,
    pubblica,
    ritira,
    inCorso,
    nessunMenuAttivo,
    online: stato?.publishedAt != null,
  };
}
