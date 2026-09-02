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
import { fill, useI18n } from '@/lib/i18n';
import type { PublishState } from '@/lib/venues';

export default function PublishBar({
  stato,
  pubblica,
  inCorso,
}: {
  // null = non ancora saputo. Lo stato lo tiene la pagina (usePublishState),
  // perché in questa schermata lo leggono in tre: questa riga, la sezione
  // della messa online e il collegamento sotto l'anteprima.
  stato: PublishState | null;
  pubblica: () => void;
  inCorso: boolean;
}) {
  const { d, locale } = useI18n();

  if (stato === null) return null;

  const mai = stato.publishedAt === null;
  const daPubblicare = mai || stato.hasChanges;

  // Pubblicato e senza modifiche: una riga grigia che dice da quando. Non è
  // rumore — è la risposta alla domanda "ma quello che vedono i clienti è
  // questo?", che senza una data scritta da qualche parte non ha risposta.
  if (!daPubblicare) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-end gap-x-3">
        <p className="line-clamp-2 min-w-0 text-right text-xs leading-tight text-gray-400">
          {fill(d.menuEditor.publishedOn, { date: quandoLeggibile(stato.publishedAt, locale) })}
        </p>
      </div>
    );
  }

  const allarme = stato.allergensChanged;
  // Tre frasi, in ordine di gravità (migration 710). Quella dell'aspetto vale
  // solo quando NON c'è nient'altro in sospeso: se sono cambiati anche i
  // piatti, dire "modifiche all'aspetto" nasconderebbe la metà che pesa.
  const soloAspetto = stato.appearanceChanged && !stato.contentChanged;
  const messaggio = mai
    ? d.menuEditor.publishNever
    : allarme
      ? d.menuEditor.publishAllergens
      : soloAspetto
        ? d.menuEditor.publishAppearance
        : d.menuEditor.publishPending;

  return (
    // Il messaggio va a capo su DUE righe invece di accorciarsi con i
    // puntini: è un avviso, e mezzo avviso non serve a niente. Due righe di
    // testo minuto stanno nell'altezza che il bottone occupa comunque, quindi
    // la riga di servizio non cresce — era quello il motivo per cui prima si
    // troncava. Oltre le due righe si taglia: a quel punto il testo sarebbe
    // sbagliato, non lungo.
    <div
      className={`flex min-w-0 flex-1 items-center justify-end gap-x-3 ${
        allarme ? 'text-amber-800' : 'text-gray-600'
      }`}
    >
      <p
        className="line-clamp-2 min-w-0 text-balance text-right text-xs leading-tight"
        title={messaggio}
      >
        {messaggio}
      </p>
      <button
        onClick={pubblica}
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
