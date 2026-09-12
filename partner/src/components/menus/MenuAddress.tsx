'use client';

// L'indirizzo pubblico del menù, scelto dal ristoratore.
//
// Vive nell'editor del menù perché è lì che si ragiona del menù al tavolo, ma
// appartiene al LOCALE come il logo e il colore: un locale, un indirizzo
// (DIGITAL_MENU.md, Temi 13 e 17).
//
// PRIMA DI ESSERE ONLINE NON APRE NIENTE: scegliere l'indirizzo serve solo a
// metterlo al sicuro prima che qualcun altro lo prenda, e cambiarlo è un
// gesto senza conseguenze — non c'è niente di stampato.
//
// UN INDIRIZZO ALLA VOLTA: cambiandolo, il precedente torna libero e nessuno
// reindirizza. Da quando esiste la pubblicazione (Tema 20) questo NON è più
// gratis: se il menù è online, il sottotesto sotto l'interruttore (v.
// `addressHintLive`) avvisa SEMPRE — non solo nell'istante in cui si tocca il
// campo — che i QR già stampati smetteranno di funzionare.
//
// ⚠️ IL SOTTOTESTO NON BASTA A FERMARE NESSUNO: è un avviso passivo, e chi ha
// fretta lo scavalca senza leggerlo. Il gesto vero e proprio — premere "Cambia
// indirizzo" mentre il menù è online — passa quindi da una conferma esplicita
// (v. `confermaCambio` più sotto): l'unica occasione in cui il ristoratore
// deve leggere la conseguenza PRIMA che diventi irreversibile, non a fianco.
// Annullando, il campo torna all'indirizzo che c'è già: non ha senso lasciare
// nel campo una bozza che si è appena deciso di non salvare.
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { MENU_DOMINIO, SLUG_MAX, slugProposto, slugValido } from '@/lib/slug';
import { slugOccupato, type Venue } from '@/lib/venues';
import ConfirmDialog from './ConfirmDialog';
import Interruttore from './Interruttore';
import MenuQr from './MenuQr';

// L'ancora a cui punta il "Modifica" del riquadro sotto l'anteprima
// (LiveBox): il posto in cui si cambia l'indirizzo e si scaricano i file per
// la stampa è uno solo, e ci si arriva scorrendo invece di ripeterlo.
export const ANCORA_INDIRIZZO = 'indirizzo-del-menu';

// Cosa sappiamo del testo che c'è nel campo adesso. "ignoto" non è "libero":
// il controllo può non essere riuscito, e le due cose non vanno confuse.
type Stato = 'fermo' | 'controllo' | 'libero' | 'occupato' | 'ignoto' | 'malformato';

export default function MenuAddress({
  venue,
  online,
  onSave,
  onOnline,
  inCorso,
}: {
  venue: Venue;
  // il menù è già stato pubblicato almeno una volta: l'indirizzo risponde
  // davvero, e da quel momento il QR si può stampare
  online: boolean;
  onSave: (slug: string) => Promise<boolean>;
  // L'interruttore: acceso mette il menù in sala (ne prende uno scatto
  // nuovo), spento lo stacca. Non c'è una finestra di conferma perché il
  // ripensamento è un tocco — e perché la conferma diceva quello che adesso
  // dice il sottotesto, sempre e non solo al momento del gesto.
  onOnline: (online: boolean) => void;
  inCorso: boolean;
}) {
  const { d } = useI18n();
  const campo = useId();
  // Il campo parte dall'indirizzo che c'è già; se non c'è, dalla proposta
  // ricavata dal nome del locale — che è la risposta giusta nove volte su
  // dieci, e va comunque confermata da un clic.
  const [bozza, setBozza] = useState(venue.slug || slugProposto(venue.venueName));
  const [stato, setStato] = useState<Stato>('fermo');
  const [salvato, setSalvato] = useState(false);
  const [fallito, setFallito] = useState(false);
  // La conferma prima di cambiare un indirizzo che risponde già: si apre solo
  // premendo "Cambia indirizzo" mentre il menù è online (v. il commento in
  // cima al file). Da vuota non c'è nessuna finestra: il bottone stesso salva.
  const [confermaCambio, setConfermaCambio] = useState(false);
  const scatola = useRef<HTMLDivElement>(null);

  // QUANDO L'INDIRIZZO NASCE, il riquadro si allunga di colpo: sotto al campo
  // compaiono il QR, il link e i tre bottoni per scaricarlo. Se la pagina non
  // si muove, tutto questo nasce sotto il bordo dello schermo e il
  // ristoratore vede solo un bottone che si spegne — quindi la si porta lì.
  // Solo alla PRIMA volta (da vuoto a qualcosa): sui cambi successivi il
  // riquadro c'è già e spostare la pagina sarebbe uno strattone senza motivo.
  const primoIndirizzo = useRef(venue.slug !== '');
  useEffect(() => {
    if (venue.slug === '' || primoIndirizzo.current) return;
    primoIndirizzo.current = true;
    scatola.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [venue.slug]);

  const pulita = bozza.trim().toLowerCase();
  const suo = pulita === venue.slug && venue.slug !== '';
  const valido = slugValido(pulita);

  // Il controllo di disponibilità parte dopo una pausa, non a ogni tasto: chi
  // scrive "trattoria" passerebbe per nove indirizzi che non ha mai avuto
  // intenzione di usare. Nessun controllo sul PROPRIO indirizzo, che
  // risulterebbe "occupato" da sé stesso.
  //
  // La risposta che arriva tardi si butta (`vivo`): scrivendo ancora, quella
  // della richiesta precedente racconterebbe di un testo che non c'è più nel
  // campo.
  useEffect(() => {
    if (venue.slug === pulita) {
      setStato('fermo');
      return;
    }
    if (pulita === '') {
      setStato('fermo');
      return;
    }
    if (!slugValido(pulita)) {
      setStato('malformato');
      return;
    }
    let vivo = true;
    setStato('controllo');
    const attesa = setTimeout(async () => {
      const esito = await slugOccupato(pulita);
      if (!vivo) return;
      setStato(esito === null ? 'ignoto' : esito ? 'occupato' : 'libero');
    }, 500);
    return () => {
      vivo = false;
      clearTimeout(attesa);
    };
  }, [pulita, venue.slug]);

  // La conferma sparisce da sola: è un "fatto", non uno stato della pagina, e
  // lasciarla lì la farebbe leggere come l'esito di qualcosa fatto adesso.
  const timerConferma = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerConferma.current) clearTimeout(timerConferma.current);
  }, []);

  async function conferma() {
    setFallito(false);
    const fatta = await onSave(pulita);
    if (!fatta) {
      // Il database ha l'ultima parola: fra il controllo e questa scrittura
      // può essersi infilato qualcun altro
      setFallito(true);
      setStato('occupato');
      return;
    }
    setSalvato(true);
    if (timerConferma.current) clearTimeout(timerConferma.current);
    timerConferma.current = setTimeout(() => setSalvato(false), 4000);
  }

  const senzaNome = venue.venueName.trim() === '' && venue.slug === '';
  const puoSalvare = valido && !suo && stato !== 'occupato' && stato !== 'controllo';

  const messaggio: { testo: string; classe: string } | null = fallito
    ? { testo: d.menuEditor.addressFailed, classe: 'text-red-600' }
    : salvato
      ? { testo: d.menuEditor.addressSaved, classe: 'text-emerald-600' }
      : stato === 'malformato'
        ? { testo: d.menuEditor.addressInvalid, classe: 'text-gray-500' }
        : stato === 'occupato'
          ? { testo: d.menuEditor.addressTaken, classe: 'text-red-600' }
          : stato === 'libero'
            ? { testo: d.menuEditor.addressFree, classe: 'text-emerald-600' }
            : stato === 'ignoto'
              ? { testo: d.menuEditor.addressUnknown, classe: 'text-gray-500' }
              : stato === 'controllo'
                ? { testo: d.menuEditor.addressChecking, classe: 'text-gray-400' }
                : null;

  return (
    // SI VEDE CHE NON È UNA SEZIONE COME LE ALTRE, ed è voluto: qui dentro
    // non si scrive il menù, si decide se e come va in sala. Le altre schede
    // dell'editor sono bianche su grigio; questa ha un fondo suo, e cambia
    // colore quando il menù è davvero online — verde quando risponde,
    // tratteggiata finché è una bozza, come una cosa non ancora finita.
    <div
      id={ANCORA_INDIRIZZO}
      ref={scatola}
      // mt-8: qui comincia la TERZA area della pagina — l'aspetto, il
      // contenuto, e questa. Lo stacco grande dice che non è l'ultimo pezzo
      // del menù ma un'altra cosa, ed è il motivo per cui le condizioni al
      // tavolo, che invece sono contenuto, stanno a mt-4.
      className={`mt-8 scroll-mt-16 rounded-2xl border p-4 ${
        online
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-dashed border-gray-300 bg-gray-100/70'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* L'INTESTAZIONE DELL'AREA, uguale a quella dell'aspetto e del
            contenuto: parola sola in maiuscoletto grigio. Prima cambiava —
            "Indirizzo web del menù" diventava "Il menù è online" — ed è la
            sola cosa che questa sistemazione perde: adesso che il menù
            risponda lo dicono l'interruttore qui accanto e il colore del
            riquadro, che è verde solo quando risponde davvero. */}
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {d.menuEditor.addressTitle}
        </h2>
        {/* L'INTERRUTTORE, e adesso si vede che lo è. Prima qui c'era una
            pastiglia che scriveva "Attivo" o "Inattivo": diceva lo stato e lo
            cambiava anche, ma letta com'era — una parola sola su fondo
            colorato — sembrava un'etichetta, e nessuno la premeva. Adesso
            l'etichetta è una sola e ferma ("Attivo"), e accanto c'è la cosa
            che tutti riconoscono come premibile, accesa o spenta.

            Spento e bloccato finché non c'è un indirizzo: non si mette in
            sala un menù che non ha un posto dove stare. */}
        <Interruttore
          acceso={online}
          disabilitato={venue.slug === '' || inCorso}
          etichetta={d.menuEditor.addressActive}
          titolo={
            venue.slug === ''
              ? undefined
              : online
                ? d.menuEditor.addressTurnOff
                : d.menuEditor.addressTurnOn
          }
          onChange={() => onOnline(!online)}
        />
      </div>
      {/* Il sottotesto dice COSA VEDE CHI APRE il link e il QR, sempre e non
          solo nel momento in cui si tocca l'interruttore: è l'unica cosa che
          il ristoratore non può controllare da solo — il QR ce l'hanno in
          mano i suoi clienti, non lui. */}
      <p className="mt-0.5 text-xs text-gray-500">
        {venue.slug === ''
          ? d.menuEditor.addressHint
          : online
            ? d.menuEditor.addressHintLive
            : d.menuEditor.addressHintOffline}
      </p>

      {senzaNome ? (
        <p className="mt-3 text-sm text-gray-500">{d.menuEditor.addressNeedName}</p>
      ) : (
        <>
          {/* Il dominio è testo, non un campo: si modifica solo la propria
              parte, e vederla attaccata al resto è l'unico modo di capire com'è
              fatto l'indirizzo per intero. */}
          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-gray-900">
            <span className="shrink-0 text-sm text-gray-400">{MENU_DOMINIO}</span>
            <input
              id={campo}
              type="text"
              value={bozza}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={SLUG_MAX}
              aria-label={d.menuEditor.addressField}
              onChange={(e) => {
                setSalvato(false);
                setFallito(false);
                // Si ripulisce mentre si scrive invece di rimproverare dopo:
                // gli spazi diventano trattini e le maiuscole scendono, che è
                // quello che il ristoratore intendeva comunque
                setBozza(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              className="min-w-0 flex-1 text-sm text-gray-900 focus:outline-none"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className={`text-xs ${messaggio?.classe ?? 'text-gray-400'}`}>
              {messaggio?.testo ?? (venue.slug === '' ? d.menuEditor.addressNotChosen : '')}
            </p>
            <button
              onClick={() => (online ? setConfermaCambio(true) : void conferma())}
              disabled={!puoSalvare}
              className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900"
            >
              {venue.slug === '' ? d.menuEditor.addressChoose : d.menuEditor.addressChange}
            </button>
          </div>

          {/* Il link e il QR ci sono solo quando un indirizzo è stato scelto
              davvero: sulla bozza che si sta scrivendo sarebbero un QR che
              cambia sotto le dita, buono da scaricare per sbaglio. */}
          {venue.slug !== '' && <MenuQr slug={venue.slug} online={online} />}

        </>
      )}

      {/* LA CONFERMA, solo quando c'è davvero qualcosa da rompere: un
          indirizzo che risponde già. Annullando si torna all'indirizzo
          attuale — non ha senso lasciare nel campo una bozza che si è appena
          deciso di non salvare, o il bottone "Cambia indirizzo" resterebbe lì
          pronto a riaprire la stessa domanda.
          NIENTE riquadro con l'indirizzo: era quello attuale (quello che sta
          per smettere di rispondere), ma un URL da solo in un riquadro sotto
          "Cambiare l'indirizzo?" si legge come "è questo il nuovo" tanto
          quanto "è questo il vecchio" — il corpo del messaggio già distingue
          i due senza bisogno di mostrarne uno (bug segnalato dall'utente,
          14/09). */}
      {confermaCambio && (
        <ConfirmDialog
          title={d.menuEditor.addressChangeConfirmTitle}
          body={d.menuEditor.addressChangeConfirmBody}
          confirmLabel={d.menuEditor.addressChange}
          onCancel={() => {
            setConfermaCambio(false);
            setBozza(venue.slug);
          }}
          onConfirm={() => {
            setConfermaCambio(false);
            void conferma();
          }}
        />
      )}

    </div>
  );
}
