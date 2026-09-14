// Data e ora leggibili, nella lingua del portale.
//
// Non "3 minuti fa": il ristoratore la confronta con quello che si ricorda
// di aver fatto ("ho corretto i prezzi dopo pranzo"), e un tempo relativo lo
// costringe a fare il conto da solo. Prima viveva solo dentro PublishBar.tsx;
// ora la usa anche il dashboard, per lo stesso "Pubblicato il…" quando non
// c'è nient'altro da dire (richiesta dell'utente, 14/09).
export function quandoLeggibile(iso: string | null, locale: 'it' | 'en'): string {
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
