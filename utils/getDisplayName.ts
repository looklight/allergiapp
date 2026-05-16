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
