'use client';

// L'indirizzo pubblico del menù, scelto dal ristoratore.
//
// Vive nell'editor del menù perché è lì che si ragiona del menù al tavolo, ma
// appartiene al LOCALE come il logo e il colore: un locale, un indirizzo
// (DIGITAL_MENU.md, Temi 13 e 17).
//
// ⚠️ NON APRE NIENTE. La pagina pubblica non esiste ancora, e questo campo lo
// dice a chiare lettere: serve a scegliere il nome e a metterlo al sicuro
// prima che qualcun altro lo prenda. Chi un domani lo rende cliccabile deve
// prima assicurarsi che la pagina risponda, o consegna un indirizzo da
// stampare che porta a un errore.
//
// UN INDIRIZZO ALLA VOLTA: cambiandolo, il precedente torna libero e nessuno
// reindirizza. Finché non esiste la pubblicazione (Tema 20) è un gesto senza
// conseguenze — non c'è niente di stampato. Il giorno in cui il menù sarà
// pubblicato, QUI va l'avviso che i QR già in giro smetteranno di funzionare:
// è l'unico posto in cui il ristoratore può ancora fermarsi.
import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { MENU_DOMINIO, SLUG_MAX, slugProposto, slugValido } from '@/lib/slug';
import { slugOccupato, type Venue } from '@/lib/venues';
import MenuQr from './MenuQr';

// Cosa sappiamo del testo che c'è nel campo adesso. "ignoto" non è "libero":
// il controllo può non essere riuscito, e le due cose non vanno confuse.
type Stato = 'fermo' | 'controllo' | 'libero' | 'occupato' | 'ignoto' | 'malformato';

export default function MenuAddress({
  venue,
  onSave,
}: {
  venue: Venue;
  onSave: (slug: string) => Promise<boolean>;
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
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-gray-900">{d.menuEditor.addressTitle}</h2>
        {/* Che non sia ancora attivo si dice qui, accanto al titolo, e non in
            fondo: è la prima cosa da sapere prima di stamparlo da qualche
            parte. */}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          {d.menuEditor.addressNotLive}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.addressHint}</p>

      {senzaNome ? (
        <p className="mt-3 text-sm text-gray-500">{d.menuEditor.addressNeedName}</p>
      ) : (
        <>
          {/* Il dominio è testo, non un campo: si modifica solo la propria
              parte, e vederla attaccata al resto è l'unico modo di capire com'è
              fatto l'indirizzo per intero. */}
          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-gray-900">
            <span className="shrink-0 text-sm text-gray-400">{MENU_DOMINIO}</span>
            <input
              id={campo}
              type="text"
              value={bozza}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={SLUG_MAX}
              aria-label={d.menuEditor.addressTitle}
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
              onClick={() => void conferma()}
              disabled={!puoSalvare}
              className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900"
            >
              {venue.slug === '' ? d.menuEditor.addressChoose : d.menuEditor.addressChange}
            </button>
          </div>

          {/* Il link e il QR ci sono solo quando un indirizzo è stato scelto
              davvero: sulla bozza che si sta scrivendo sarebbero un QR che
              cambia sotto le dita, buono da scaricare per sbaglio. */}
          {venue.slug !== '' && <MenuQr slug={venue.slug} />}
        </>
      )}
    </div>
  );
}
