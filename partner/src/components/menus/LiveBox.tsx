'use client';

// Il riquadro sotto l'anteprima: il menù così com'è raggiungibile dal mondo.
//
// È la cosa di TUTTI I GIORNI — guardo il codice, copio il link, apro la
// pagina — mentre la sezione in fondo all'editor è la configurazione: scegli
// l'indirizzo, scarica i file per la tipografia. Per questo il codice qui è
// piccolo e non si scarica: serve a riconoscerlo, non a stamparlo. "Modifica"
// porta là sotto invece di ripetere qui gli stessi comandi.
//
// C'È SEMPRE, ma dice tre cose diverse — ed è il motivo per cui c'è sempre:
// lo spazio sotto l'anteprima, vuoto, non spiega perché non c'è niente.
//
//   online          il codice, il link da copiare, la pagina da aprire
//   indirizzo scelto ma non pubblicato → dice che non risponde a nessuno
//   nemmeno l'indirizzo → invita a sceglierlo
//
// Nelle prime due il codice e i comandi NON ci sono, e non è una dimenticanza:
// un riquadro che invita a copiare e aprire un link morto è un invito a
// sbagliare, e un QR a portata di schermata è un QR che qualcuno stampa.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { MENU_DOMINIO } from '@/lib/slug';
import { qrDataUrl, scaricaQrPng } from '@/lib/qr';

export default function LiveBox({
  slug,
  online,
  onEdit,
}: {
  // può essere vuoto: l'indirizzo si sceglie nella sezione in fondo
  slug: string;
  online: boolean;
  onEdit: () => void;
}) {
  const { d } = useI18n();
  const indirizzo = `https://${MENU_DOMINIO}${slug}`;
  const [qr, setQr] = useState('');
  const [copiato, setCopiato] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!online || slug === '') return;
    let vivo = true;
    // Qui il codice serve a farsi riconoscere, non a essere inquadrato da un
    // tavolo. Si genera a 240 e non a 160 anche ora che è largo 64px (era 96
    // dal 06/09, 56 prima): a 160, sullo schermo denso del portatile, i moduli
    // si impastavano. Quello che si SCARICA resta un altro, identico a quello
    // della sezione in fondo (v. lib/qr.ts).
    void qrDataUrl(indirizzo, 240, true).then((url) => {
      if (vivo) setQr(url);
    });
    return () => {
      vivo = false;
    };
  }, [indirizzo, online, slug]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copia() {
    try {
      await navigator.clipboard.writeText(indirizzo);
      setCopiato(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiato(false), 2500);
    } catch {
      // Niente permesso per gli appunti (succede fuori da HTTPS): il link
      // resta selezionabile a mano qui sopra.
    }
  }

  // Le due varianti di attesa: stessa forma, tratteggiata come le cose non
  // ancora finite, e un solo comando che porta dov'è la risposta.
  if (!online || slug === '') {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-2.5 shadow-sm">
        <p className="min-w-0 flex-1 text-xs leading-snug text-gray-500">
          {slug === '' ? d.menuEditor.liveNoAddress : d.menuEditor.liveNotYet}
        </p>
        <button
          onClick={onEdit}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {slug === '' ? d.menuEditor.liveChoose : d.common.edit}
        </button>
      </div>
    );
  }

  return (
    // COMPATTO IN ALTEZZA (richiesta dell'utente, 15/09): sta sotto il telefono
    // dell'anteprima, in una colonna alta quanto la finestra, e ogni pixel in
    // più qui spinge in su il telefono e lo taglia. Prima era codice da 96px,
    // indirizzo accanto e una fila di tre bottoni sotto — circa 170px. Ora il
    // codice è da 64 e accanto stanno, su due righe, l'indirizzo e i comandi
    // come pastiglie minute: circa 90px.
    //
    // Resta il VERDE, che qui è il segnale «è in sala» e non una decorazione:
    // è quello che dice, senza scriverlo, che il menù risponde davvero.
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-sm">
      {qr !== '' && (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL generata qui, non un file da ottimizzare
        <img
          src={qr}
          alt={d.menuEditor.qrAlt}
          className="h-16 w-16 shrink-0 rounded-lg border border-emerald-200 bg-white p-0.5"
        />
      )}
      <div className="min-w-0 flex-1">
        {/* L'indirizzo per intero, selezionabile, al massimo su due righe: è
            quello che si detta al telefono, e troncato a metà non si leggerebbe
            ad alta voce. Copiarlo è un gesto minuto: un'icona attaccata. */}
        <p className="flex min-w-0 items-start gap-1 text-xs leading-snug text-gray-600">
          <span className="line-clamp-2 min-w-0 break-all">{indirizzo}</span>
          <button
            onClick={() => void copia()}
            aria-label={d.menuEditor.qrCopy}
            title={copiato ? d.menuEditor.qrCopied : d.menuEditor.qrCopy}
            className={`shrink-0 transition-colors ${
              copiato ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-900'
            }`}
          >
            {copiato ? (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 012-2h10" />
              </svg>
            )}
          </button>
        </p>

        {/* I comandi in pastiglie minute sotto l'indirizzo, con nomi brevi
            (liveOpenShort, liveQrShort): accanto al codice restano ~200px, e
            con «Apri il menù online» la fila andava a capo. «Apri online» resta
            il pieno, perché è il gesto di tutti i giorni; «Modifica» non
            ripete i comandi della sezione in fondo, ci porta — così il posto
            in cui si cambia l'indirizzo e si scaricano i file resta uno solo. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <a
            href={indirizzo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {d.menuEditor.liveOpenShort}
          </a>
          <button
            onClick={() => void scaricaQrPng(indirizzo, slug)}
            className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            {d.menuEditor.liveQrShort}
          </button>
          <button
            onClick={onEdit}
            className="rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.common.edit}
          </button>
        </div>
      </div>
    </div>
  );
}
