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
    // Leggero: qui il codice è largo settanta pixel e serve a farsi
    // riconoscere, non a essere inquadrato da un tavolo. Quello che si
    // SCARICA è invece l'altro, identico a quello della sezione in fondo
    // (v. lib/qr.ts).
    void qrDataUrl(indirizzo, 160, true).then((url) => {
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
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-100/70 p-2.5">
        <p className="min-w-0 text-[11px] leading-snug text-gray-500">
          {slug === '' ? d.menuEditor.liveNoAddress : d.menuEditor.liveNotYet}
        </p>
        <button
          onClick={onEdit}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {slug === '' ? d.menuEditor.liveChoose : d.common.edit}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
      {qr !== '' && (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL generata qui, non un file da ottimizzare
        <img src={qr} alt={d.menuEditor.qrAlt} className="h-14 w-14 shrink-0 rounded bg-white" />
      )}
      <div className="min-w-0 flex-1">
        {/* L'indirizzo per intero e selezionabile: è quello che si detta al
            telefono. Su una colonna da 380 pixel va a capo invece di essere
            tagliato — un indirizzo troncato non si può leggere ad alta voce. */}
        {/* Copiare è un gesto minuto e ovvio: sta come icona ATTACCATA al
            link, dove il link è, invece di prendersi un bottone in fila con
            gli altri. Il posto in fila lo merita quello che il ristoratore
            deve poter trovare — scaricare il codice da mettere sul tavolo. */}
        <p className="flex items-start gap-1 break-all text-[11px] leading-snug text-gray-600">
          <span className="min-w-0">{indirizzo}</span>
          <button
            onClick={() => void copia()}
            aria-label={d.menuEditor.qrCopy}
            title={copiato ? d.menuEditor.qrCopied : d.menuEditor.qrCopy}
            className={`mt-px shrink-0 transition-colors ${
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
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            onClick={() => void scaricaQrPng(indirizzo, slug)}
            className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            {d.menuEditor.qrPng}
          </button>
          <a
            href={indirizzo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {d.menuEditor.openLive}
          </a>
          {/* Non ripete i comandi della sezione in fondo: ci porta. Così il
              posto in cui si cambia l'indirizzo e si scaricano i file resta
              uno solo. */}
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.common.edit}
          </button>
        </div>
      </div>
    </div>
  );
}
