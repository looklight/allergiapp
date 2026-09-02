'use client';

// Il riquadro sotto l'anteprima: il menù così com'è raggiungibile dal mondo.
//
// È la cosa di TUTTI I GIORNI — guardo il codice, copio il link, apro la
// pagina — mentre la sezione in fondo all'editor è la configurazione: scegli
// l'indirizzo, scarica i file per la tipografia. Per questo il codice qui è
// piccolo e non si scarica: serve a riconoscerlo, non a stamparlo. "Modifica"
// porta là sotto invece di ripetere qui gli stessi comandi.
//
// Compare SOLO a menù pubblicato: prima quell'indirizzo non risponde a
// nessuno, e un riquadro che invita a copiare e aprire un link morto è un
// invito a sbagliare.
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '@/lib/i18n';
import { MENU_DOMINIO } from '@/lib/slug';

export default function LiveBox({ slug, onEdit }: { slug: string; onEdit: () => void }) {
  const { d } = useI18n();
  const indirizzo = `https://${MENU_DOMINIO}${slug}`;
  const [qr, setQr] = useState('');
  const [copiato, setCopiato] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    // Correzione d'errore bassa e margine stretto: qui il codice è largo
    // settanta pixel e serve a farsi riconoscere, non a essere inquadrato da
    // un tavolo. Quello buono per la stampa si scarica dalla sezione in fondo.
    void QRCode.toDataURL(indirizzo, { errorCorrectionLevel: 'L', margin: 1, width: 160 }).then(
      (url) => {
        if (vivo) setQr(url);
      }
    );
    return () => {
      vivo = false;
    };
  }, [indirizzo]);

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

  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
      {qr !== '' && (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL generata qui, non un file da ottimizzare
        <img src={qr} alt={d.menuEditor.qrAlt} className="h-14 w-14 shrink-0 rounded bg-white" />
      )}
      <div className="min-w-0 flex-1">
        {/* L'indirizzo per intero e selezionabile: è quello che si detta al
            telefono. Su una colonna da 380 pixel va a capo invece di essere
            tagliato — un indirizzo troncato non si può leggere ad alta voce. */}
        <p className="break-all text-[11px] leading-snug text-gray-600">{indirizzo}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            onClick={() => void copia()}
            className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            {copiato ? d.menuEditor.qrCopied : d.menuEditor.qrCopy}
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
