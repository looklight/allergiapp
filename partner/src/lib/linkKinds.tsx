// Tipi di link del locale: ordine, colori e icone sono gli stessi
// nell'editor (pill da attivare) e nella scheda dell'app (SchedaPreview),
// così la pill che il ristoratore accende è quella che vedrà l'utente.
import type { ReactNode } from 'react';

export type LinkKind = 'booking' | 'delivery' | 'menu' | 'website';

export const LINK_ORDER: LinkKind[] = ['booking', 'delivery', 'menu', 'website'];

// Pill link colorate (tinta + colore pieno, stile Material) per
// differenziarle dai chip neutri della scheda e tra loro.
export const LINK_COLORS: Record<LinkKind, { bg: string; fg: string }> = {
  booking: { bg: '#E3F2FD', fg: '#1976D2' },
  delivery: { bg: '#FFF3E0', fg: '#E65100' },
  menu: { bg: '#E8F5E9', fg: '#2E7D32' },
  website: { bg: '#F3E5F5', fg: '#7B1FA2' },
};

// Contenuto di un <svg viewBox="0 0 24 24"> con stroke (vedi Icon in SchedaPreview)
export const LINK_ICONS: Record<LinkKind, ReactNode> = {
  booking: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  delivery: (
    <>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M6 17l4-8h5l3 8M10 9h4M13 9l2-3h2" />
    </>
  ),
  menu: (
    <>
      <path d="M2 5h7a3 3 0 013 3v13a3 3 0 00-3-3H2z" />
      <path d="M22 5h-7a3 3 0 00-3 3v13a3 3 0 013-3h7z" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
};
