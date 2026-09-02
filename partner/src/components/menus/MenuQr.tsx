'use client';

// Il link e il QR dell'indirizzo del menù.
//
// L'AVVISO "non stamparlo ancora" c'è SOLO finché il menù non è stato
// pubblicato: da lì in poi quell'indirizzo risponde davvero e la frase
// diventerebbe falsa — peggio che inutile, perché un avviso che mente
// insegna a non leggere gli avvisi. Sta attaccato ai bottoni di scarico e non
// in fondo alla card, perché è lì che si compie il gesto sbagliato: un QR
// stampato è un oggetto fisico che non si corregge da remoto.
//
// Due formati perché servono due mestieri diversi: il PNG è quello che si
// incolla in una mail o si guarda a schermo, il vettoriale è quello che vuole
// la tipografia — glielo si dà noi, o se lo fa rifare male da qualcun altro
// (DIGITAL_MENU.md, Tema 13).
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '@/lib/i18n';
import { MENU_DOMINIO } from '@/lib/slug';

// Correzione d'errore media: il QR resta leggibile con un quinto del disegno
// rovinato, che è la misura giusta per una cosa che vive su un tavolo fra
// bicchieri e tovaglioli. Più alta sprecherebbe spazio a parità di utilità.
const OPZIONI = { errorCorrectionLevel: 'M', margin: 2 } as const;

// Il lato del PNG da scaricare. Grande abbastanza da reggere la stampa di un
// cartoncino da tavolo: chi lo apre a schermo lo vede comunque rimpicciolito,
// mentre chi lo porta in stampa da un file piccolo ottiene un quadrato sfocato.
const LATO_PNG = 1024;

function scarica(contenuto: Blob | string, nome: string) {
  const url = typeof contenuto === 'string' ? contenuto : URL.createObjectURL(contenuto);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  // Solo gli oggetti creati qui vanno liberati: un data-URL non occupa niente
  if (typeof contenuto !== 'string') URL.revokeObjectURL(url);
}

export default function MenuQr({ slug, online }: { slug: string; online: boolean }) {
  const { d } = useI18n();
  const indirizzo = `https://${MENU_DOMINIO}${slug}`;
  // L'anteprima a schermo: piccola, serve solo a far vedere che il QR esiste
  // e che è cambiato quando cambia l'indirizzo.
  const [anteprima, setAnteprima] = useState('');
  const [copiato, setCopiato] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    void QRCode.toDataURL(indirizzo, { ...OPZIONI, width: 240 }).then((url) => {
      if (vivo) setAnteprima(url);
    });
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
      timer.current = setTimeout(() => setCopiato(false), 3000);
    } catch {
      // Niente permesso per gli appunti (succede fuori da HTTPS): il link
      // resta selezionabile a mano qui sopra, quindi non si spaventa nessuno
      // con un errore.
    }
  }

  async function scaricaPng() {
    scarica(await QRCode.toDataURL(indirizzo, { ...OPZIONI, width: LATO_PNG }), `qr-${slug}.png`);
  }

  async function scaricaSvg() {
    const svg = await QRCode.toString(indirizzo, { ...OPZIONI, type: 'svg' });
    scarica(new Blob([svg], { type: 'image/svg+xml' }), `qr-${slug}.svg`);
  }

  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 border-t border-gray-100 pt-3">
      {anteprima !== '' && (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL generata qui, non un file da ottimizzare
        <img
          src={anteprima}
          alt={d.menuEditor.qrAlt}
          className="h-24 w-24 shrink-0 rounded-lg border border-gray-200"
        />
      )}

      <div className="min-w-0 flex-1">
        {/* Il link per esteso, selezionabile: è quello che si detta al
            telefono o si incolla in un messaggio, e va potuto leggere tutto */}
        <p className="break-all text-xs text-gray-500">{indirizzo}</p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => void copia()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {copiato ? d.menuEditor.qrCopied : d.menuEditor.qrCopy}
          </button>
          <button
            onClick={() => void scaricaPng()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {d.menuEditor.qrPng}
          </button>
          <button
            onClick={() => void scaricaSvg()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {d.menuEditor.qrSvg}
          </button>
        </div>

        {/* Attaccato ai bottoni, non in fondo alla card: è qui che qualcuno
            sta per portare un file in tipografia. */}
        {!online && <p className="mt-2 text-xs text-amber-700">{d.menuEditor.qrWarning}</p>}
      </div>
    </div>
  );
}
