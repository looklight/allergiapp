// CHI È IL SERVIZIO, DEDOTTO DALL'INDIRIZZO.
//
// Il ristoratore incolla un link e basta: nessuna tendina da scegliere
// (deciso il 2026-09-06). Non è il clic risparmiato — è che **così l'etichetta
// non può mentire**: incollato un indirizzo di Facebook sotto la voce
// Instagram, l'errore normale e senza cattive intenzioni, ce ne accorgiamo
// noi invece che i suoi clienti.
//
// ⚠️ IL DOMINIO SCONOSCIUTO NON È UN ERRORE. Linktree, un blog, un Mastodon
// di quartiere: si mostra il nome del sito e il link funziona lo stesso. Se
// il ristoratore dovesse indovinare quali indirizzi accettiamo, la fila
// diventerebbe un modulo da compilare.
//
// ⚠️ IL PROVIDER NON SI CONSERVA A PARTE: si ricalcola a ogni salvataggio
// (fromLinks riscrive tutte le righe del locale), così un indirizzo corretto
// non lascia dietro l'etichetta di prima.

export interface Social {
  code: string;
  name: string;
  /** Pezzi di dominio che identificano il servizio, senza il punto finale. */
  domini: string[];
}

export const SOCIALS: Social[] = [
  { code: 'instagram', name: 'Instagram', domini: ['instagram.com', 'instagr.am'] },
  { code: 'facebook', name: 'Facebook', domini: ['facebook.com', 'fb.com', 'fb.me'] },
  { code: 'tiktok', name: 'TikTok', domini: ['tiktok.com'] },
  { code: 'tripadvisor', name: 'Tripadvisor', domini: ['tripadvisor.'] },
  { code: 'whatsapp', name: 'WhatsApp', domini: ['wa.me', 'whatsapp.com'] },
  { code: 'youtube', name: 'YouTube', domini: ['youtube.com', 'youtu.be'] },
  { code: 'x', name: 'X', domini: ['twitter.com', 'x.com'] },
  { code: 'linkedin', name: 'LinkedIn', domini: ['linkedin.com'] },
];

/** Il codice del servizio, o 'other' se l'indirizzo non è di nessuno dei noti. */
export function socialProvider(url: string): string {
  const host = hostDi(url);
  if (host === '') return 'other';
  const trovato = SOCIALS.find((s) => s.domini.some((d) => host === d || host.endsWith(`.${d}`) || host.includes(d)));
  return trovato?.code ?? 'other';
}

/**
 * Come si chiama, per chi legge. Per i servizi noti il nome proprio; per gli
 * altri il dominio così com'è (`ilmiosito.it`), che dice al ristoratore cosa
 * ha incollato meglio di un generico «Sito».
 */
export function socialName(url: string, label = ''): string {
  if (label.trim() !== '') return label.trim();
  const code = socialProvider(url);
  const noto = SOCIALS.find((s) => s.code === code);
  if (noto) return noto.name;
  return hostDi(url) || '';
}

function hostDi(url: string): string {
  try {
    // `URL` vuole uno schema: normalizeUrl lo mette già, ma questa funzione
    // gira anche mentre si sta ancora scrivendo.
    const completo = /^https?:\/\//i.test(url) ? url : `https://${url.trim()}`;
    return new URL(completo).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}
