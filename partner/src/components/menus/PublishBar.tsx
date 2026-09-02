'use client';

// "Pubblica le modifiche": la riga in cima all'editor del menù.
//
// BOZZA E PUBBLICATO SONO DUE COSE (DIGITAL_MENU.md, Tema 24). Il portale
// continua a salvare da solo mentre si scrive — la bozza non si perde mai —
// ma quello che il cliente legge al tavolo cambia solo quando il ristoratore
// preme questo bottone. Senza, chi riorganizza la carta alle sette e mezza la
// darebbe in pasto ai clienti a metà; e il gesto, come ha detto l'utente, dà
// peso al lavoro: prima di premere si guarda meglio.
//
// ⚠️ STA IN ALTO E RESTA IN ALTO (sticky), e non è una scelta estetica:
// l'avviso più importante che questa riga può dare è che un ALLERGENE
// corretto non è ancora arrivato in sala. Un avviso del genere non può
// scorrere via mentre si lavora sul menù, che è lungo.
//
// QUI NON C'È il "Salvato": c'era, ed è tornato nella sua pill (in basso a
// destra, v. SaveStatus). Su questa riga rubava larghezza proprio alla frase
// che deve leggersi per intera — quella che dice che al tavolo c'è ancora la
// versione precedente — e la mandava sotto i puntini. La parentela fra le due
// notizie si può insegnare in altro modo; togliere spazio a un avviso sugli
// allergeni no.
import { useEffect, useState } from 'react';
import { fill, useI18n } from '@/lib/i18n';
import { useSaveState } from '@/lib/saveState';
import { menuPublishState, publishMenu, type PublishState } from '@/lib/venues';

export default function PublishBar({ venueId }: { venueId: string }) {
  const { d, locale } = useI18n();
  // savedAt cambia a ogni scrittura riuscita: è il segnale che la bozza si è
  // mossa, e quindi che lo stato di pubblicazione va richiesto di nuovo. Il
  // salvataggio ha già la sua pausa, quindi qui non se ne aggiunge un'altra.
  const { savedAt } = useSaveState();
  const [stato, setStato] = useState<PublishState | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    let vivo = true;
    void menuPublishState(venueId).then((s) => {
      if (vivo && s) setStato(s);
    });
    return () => {
      vivo = false;
    };
  }, [venueId, savedAt]);

  async function pubblica() {
    setInCorso(true);
    const quando = await publishMenu(venueId);
    setInCorso(false);
    // Fallita: lo stato NON si tocca. L'errore lo mostra la barra di stato
    // con il suo "Riprova"; qui dire "pubblicato" sarebbe una bugia.
    if (quando === null) return;
    setStato({ publishedAt: quando, hasChanges: false, allergensChanged: false });
  }

  if (stato === null) return null;

  const mai = stato.publishedAt === null;
  const daPubblicare = mai || stato.hasChanges;

  // Pubblicato e senza modifiche: una riga grigia che dice da quando. Non è
  // rumore — è la risposta alla domanda "ma quello che vedono i clienti è
  // questo?", che senza una data scritta da qualche parte non ha risposta.
  if (!daPubblicare) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-end gap-x-3">
        <p className="min-w-0 truncate text-xs text-gray-400">
          {fill(d.menuEditor.publishedOn, { date: quandoLeggibile(stato.publishedAt, locale) })}
        </p>
      </div>
    );
  }

  const allarme = stato.allergensChanged;
  const messaggio = mai
    ? d.menuEditor.publishNever
    : allarme
      ? d.menuEditor.publishAllergens
      : d.menuEditor.publishPending;

  return (
    // min-w-0 + truncate sul messaggio: su una finestra stretta si accorcia
    // invece di mandare a capo il bottone e raddoppiare l'altezza della riga
    // di servizio, che sta in cima e ruba spazio al menù per tutto il tempo.
    // Il testo intero resta nel title, quindi non si perde.
    <div
      className={`flex min-w-0 flex-1 items-center justify-end gap-x-3 ${
        allarme ? 'text-amber-800' : 'text-gray-600'
      }`}
    >
      <p className="min-w-0 truncate text-xs leading-snug" title={messaggio}>
        {messaggio}
      </p>
      <button
        onClick={() => void pubblica()}
        disabled={inCorso}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
          allarme ? 'bg-amber-700 hover:bg-amber-800' : 'bg-gray-900 hover:bg-gray-700'
        }`}
      >
        {inCorso ? d.menuEditor.publishing : mai ? d.menuEditor.publishFirst : d.menuEditor.publish}
      </button>
    </div>
  );
}

// Data e ora, non "3 minuti fa": il ristoratore la confronta con quello che
// si ricorda di aver fatto ("ho corretto i prezzi dopo pranzo"), e un tempo
// relativo lo costringe a fare il conto da solo.
function quandoLeggibile(iso: string | null, locale: 'it' | 'en'): string {
  if (iso === null) return '';
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return '';
  return quando.toLocaleString(locale === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
