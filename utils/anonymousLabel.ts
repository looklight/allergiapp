/**
 * Genera un'etichetta anonima stabile e non reversibile da un userId.
 * Es. "Utente #4821"
 */
export function getAnonymousLabel(userId?: string): string {
  if (!userId) return 'Utente';
  const num = parseInt(userId.replace(/-/g, '').slice(0, 8), 16) % 10000;
  return `Utente #${num.toString().padStart(4, '0')}`;
}
