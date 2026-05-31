/**
 * Regole condivise per i popup globali (annunci, avatar sbloccati) montati sopra
 * lo Stack di navigazione in `app/_layout.tsx`.
 *
 * Fonte di verità unica: così i vari popup non divergono (es. un nuovo path di
 * onboarding aggiunto a un popup ma dimenticato nell'altro).
 */

/** Path durante i quali i popup globali NON devono apparire, per non interrompere
 *  i flussi di autenticazione/onboarding. */
export function isPopupSuppressedPath(pathname: string | null | undefined): boolean {
  const p = pathname ?? '';
  return p.startsWith('/auth/') || p.startsWith('/legal');
}

/** Ritardo (ms) tra quando un popup diventa idoneo e quando appare davvero: lascia
 *  completare la transizione di rotta (es. router.replace da onboarding a Ristoranti),
 *  così il Modal non si mostra sulla coda della schermata che sta scorrendo via. */
export const POPUP_REVEAL_DELAY_MS = 500;
