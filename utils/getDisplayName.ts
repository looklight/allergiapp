import i18n from './i18n';
import { getAnonymousLabel } from './anonymousLabel';

/**
 * Restituisce il nome da mostrare nell'UI per un profilo/recensione/voce leaderboard.
 *
 * Centralizzato per consentire una futura estensione (es. aggiunta di un
 * display_name libero Unicode sopra l'username, stile Instagram): in quel
 * caso bastera' aggiornare il corpo di questa funzione senza toccare i consumer.
 */
export function getDisplayName(input: {
  username?: string | null;
}): string | null {
  return input.username ?? null;
}

/**
 * Restituisce la label di attribuzione per contenuti utente (review, foto, ecc.).
 * Risolve la priority: inattivo (orfano) → anonimo → username → fallback hash.
 *
 *  - `userId IS NULL` → account cancellato → "Utente inattivo"
 *  - `isAnonymous` true → utente vivo che ha scelto di nascondersi → "Utente #XXXX"
 *  - altrimenti → username
 */
export function getAuthorLabel(input: {
  userId?: string | null;
  username?: string | null;
  isAnonymous?: boolean;
}): string {
  if (input.userId == null) return i18n.t('common.userInactive');
  if (input.isAnonymous) return getAnonymousLabel(input.userId);
  return input.username ?? getAnonymousLabel(input.userId);
}
