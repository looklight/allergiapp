'use client';

// Il codice QR dell'indirizzo del menù, e i suoi scarichi.
//
// Sta in un posto solo perché il QR si genera in DUE punti — il riquadro
// sotto l'anteprima e la sezione in fondo all'editor — e quello che si
// scarica deve essere identico ovunque lo si prenda: due impostazioni
// diverse vorrebbero dire due codici diversi per lo stesso indirizzo, e uno
// dei due finirebbe in tipografia.
import QRCode from 'qrcode';

// Correzione d'errore media: il QR resta leggibile con un quinto del disegno
// rovinato, che è la misura giusta per una cosa che vive su un tavolo fra
// bicchieri e tovaglioli. Più alta sprecherebbe spazio a parità di utilità.
export const OPZIONI_QR = { errorCorrectionLevel: 'M', margin: 2 } as const;

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

// L'anteprima a schermo: piccola, e con la correzione d'errore che decide chi
// chiama — nel riquadro sotto l'anteprima il codice è largo settanta pixel e
// serve solo a farsi riconoscere.
export function qrDataUrl(indirizzo: string, lato: number, leggero = false) {
  return QRCode.toDataURL(indirizzo, {
    ...OPZIONI_QR,
    errorCorrectionLevel: leggero ? 'L' : OPZIONI_QR.errorCorrectionLevel,
    margin: leggero ? 1 : OPZIONI_QR.margin,
    width: lato,
  });
}

export async function scaricaQrPng(indirizzo: string, slug: string) {
  scarica(await QRCode.toDataURL(indirizzo, { ...OPZIONI_QR, width: LATO_PNG }), `qr-${slug}.png`);
}

// Il vettoriale non è un lusso: è quello che chiede la tipografia, e se non
// glielo diamo il ristoratore se lo fa rifare male altrove (Tema 13).
export async function scaricaQrSvg(indirizzo: string, slug: string) {
  const svg = await QRCode.toString(indirizzo, { ...OPZIONI_QR, type: 'svg' });
  scarica(new Blob([svg], { type: 'image/svg+xml' }), `qr-${slug}.svg`);
}
