/**
 * Wrapper per query Supabase con error handling consistente.
 * Logga l'errore in console e mostra un alert all'utente.
 * Restituisce i dati oppure null in caso di errore.
 */
export async function safeQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>,
  context?: string,
): Promise<T | null> {
  const { data, error } = await queryFn();
  if (error) {
    const msg = context ? `${context}: ${error.message}` : error.message;
    console.error('[safeQuery]', msg, error);
    alert(`Errore: ${msg}`);
    return null;
  }
  return data;
}

/**
 * Variante per query con count (head: true).
 * Restituisce il count oppure 0 in caso di errore.
 */
export async function safeCount(
  queryFn: () => PromiseLike<{ count: number | null; error: any }>,
): Promise<number> {
  const { count, error } = await queryFn();
  if (error) {
    console.error('[safeCount]', error.message, error);
    return 0;
  }
  return count ?? 0;
}
