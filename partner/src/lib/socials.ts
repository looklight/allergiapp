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

// I SIMBOLI, uno per servizio, nella stessa griglia da 24 delle altre icone
// del portale. Sono FORME SEMPLIFICATE disegnate da noi, non i loghi
// ufficiali: quelli sono marchi altrui, si prendono dai kit dei rispettivi
// proprietari e non si ridisegnano a mano. Qui servono a far riconoscere la
// riga a colpo d'occhio, e accanto resta sempre scritto il nome — che è
// anche quello che legge chi usa un lettore di schermo.
//
// ⚠️ Chi non è riconosciuto NON resta senza simbolo: prende il globo. Un
// dominio sconosciuto non è un errore (Linktree, un blog, un Mastodon), e
// una riga senza icona in mezzo ad altre con l'icona sembra rotta.
export const SOCIAL_ICONS: Record<string, string[]> = {
  instagram: [
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z',
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M17.5 6.5h.01',
  ],
  facebook: ['M14 8h2V5h-2a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13v-2a1 1 0 0 1 1-1z'],
  tiktok: [
    'M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5',
    'M14 4c.5 2.5 2 4 4.5 4.2',
  ],
  whatsapp: [
    'M4 20l1.2-3.6A7.5 7.5 0 1 1 8 19.2L4 20z',
    'M9 9.5c0 3 2.5 5.5 5.5 5.5',
  ],
  youtube: [
    'M3 8.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z',
    'M11 10l3.5 2-3.5 2z',
  ],
  x: ['M5 5l14 14', 'M19 5L5 19'],
  linkedin: [
    'M4 9h3v11H4z',
    'M5.5 4.5h.01',
    'M11 20V9h3v1.5A3.5 3.5 0 0 1 20 13v7h-3v-6a2 2 0 0 0-4 0v6z',
  ],
  tripadvisor: [
    'M12 7c4 0 7 2 9 2',
    'M12 7c-4 0-7 2-9 2',
    'M7 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M17 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  ],
  other: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M3.5 9h17',
    'M3.5 15h17',
    'M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z',
  ],
};

/** I tracciati del servizio di quell'indirizzo, globo se non lo conosciamo. */
export function socialIcon(url: string): string[] {
  return SOCIAL_ICONS[socialProvider(url)] ?? SOCIAL_ICONS.other;
}
