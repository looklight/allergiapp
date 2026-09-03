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
// SU TELEFONO LA RIGA DIVENTA DUE, e non è una rifinitura: a 375px, fra il
// link "Tutti i menù" e il bottone, all'avviso restavano una cinquantina di
// pixel — cioè "Modifiche…" al posto della frase che nomina gli allergeni non
// pubblicati. Un avviso che si tronca proprio lì è peggio che non averlo,
// perché occupa il posto di quello vero. Sopra `sm` la riga resta una sola,
// dove lo spazio c'è davvero.
//
// ⚠️ E LO SPAZIO DI QUELLA SECONDA RIGA È SEMPRE OCCUPATO, anche quando non
// c'è niente da dire. Scrivendo nell'editor la frase cambia — da "Pubblicato
// il…" a "Modifiche non pubblicate…" — e col bottone che nasce insieme la
// riga in cima cresceva di una cinquantina di pixel: tutto il menù scendeva
// mentre ci si stava scrivendo dentro, alla prima lettera battuta. Quindi il
// posto se lo prende da fermo (min-h di due righe minute, e il link del
// ritorno alto quanto il bottone che può comparirgli accanto) e niente si
// muove più. È il motivo per cui questo componente rende un paragrafo anche
// quando non sa ancora niente: lo spazio dev'esserci già.
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

  // Lo spazio della frase è sempre lo stesso: due righe minute su telefono,
  // riservate anche prima di sapere cosa scriverci. Senza questo paragrafo
  // vuoto, la riga in cima nascerebbe bassa e crescerebbe appena lo stato
  // arriva — cioè un attimo dopo che si è aperto il menù.
  const spazio =
    'order-last line-clamp-2 min-h-[2.5em] w-full text-balance text-[11px] leading-tight ' +
    'sm:order-none sm:min-h-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:text-right sm:text-xs';

  if (stato === null) return <p className={spazio} aria-hidden="true" />;

  const mai = stato.publishedAt === null;
  const daPubblicare = mai || stato.hasChanges;
  const allarme = daPubblicare && stato.allergensChanged;
  // Tre frasi, in ordine di gravità (migration 710). Quella dell'aspetto vale
  // solo quando NON c'è nient'altro in sospeso: se sono cambiati anche i
  // piatti, dire "modifiche all'aspetto" nasconderebbe la metà che pesa.
  //
  // Pubblicato e senza modifiche: una riga grigia che dice da quando. Non è
  // rumore — è la risposta alla domanda "ma quello che vedono i clienti è
  // questo?", che senza una data scritta da qualche parte non ha risposta.
  const soloAspetto = stato.appearanceChanged && !stato.contentChanged;
  const messaggio = !daPubblicare
    ? fill(d.menuEditor.publishedOn, { date: quandoLeggibile(stato.publishedAt, locale) })
    : mai
      ? d.menuEditor.publishNever
      : allarme
        ? d.menuEditor.publishAllergens
        : soloAspetto
          ? d.menuEditor.publishAppearance
          : d.menuEditor.publishPending;

  // Due figli diretti della riga sticky e non un involucro: è la riga stessa
  // che va a capo (flex-wrap), e solo così su telefono l'avviso può prendersi
  // tutta la larghezza sotto al bottone invece della fetta che avanza.
  //
  // Il messaggio va a capo su DUE righe invece di accorciarsi con i puntini:
  // è un avviso, e mezzo avviso non serve a niente. Oltre le due righe si
  // taglia: a quel punto il testo sarebbe sbagliato, non lungo — e a tutta
  // larghezza due righe bastano per la più lunga delle tre frasi.
  return (
    <>
      <p
        className={`${spazio} ${
          !daPubblicare ? 'text-gray-400' : allarme ? 'text-amber-800' : 'text-gray-600'
        }`}
        title={messaggio}
      >
        {messaggio}
      </p>
      {daPubblicare && (
        <button
          onClick={pubblica}
          disabled={inCorso}
          // ml-auto perché su telefono il bottone è solo, in fondo alla prima
          // riga: senza, resterebbe appiccicato al link del ritorno.
          className={`ml-auto shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
            allarme ? 'bg-amber-700 hover:bg-amber-800' : 'bg-gray-900 hover:bg-gray-700'
          }`}
        >
          {inCorso ? d.menuEditor.publishing : mai ? d.menuEditor.publishFirst : d.menuEditor.publish}
        </button>
      )}
    </>
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
