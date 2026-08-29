/**
 * Confronto di versioni "1.4.0" per COMPONENTI NUMERICHE, non per stringa
 * (come stringa "1.10.0" < "1.9.0", che e' l'errore classico di questo gate).
 *
 * Usato dal gate versione minima (`services/appConfig.ts`): dato che una
 * valutazione sbagliata puo' bloccare l'app a tutti senza rimedio OTA, qui la
 * regola e' che TUTTO cio' che non e' una versione inequivocabile ritorna null,
 * e il chiamante tratta null come "non bloccare".
 */

/** Numero massimo di componenti significative: major.minor.patch. */
const MAX_PARTS = 3;

/**
 * "1.4.0" -> [1, 4, 0]. Accetta anche forme corte ("1.4" -> [1, 4, 0]) e
 * spazi ai bordi. Ritorna null per qualunque cosa non sia interamente
 * numerica: stringa vuota, "latest", "1.4.0-beta", "1..0", numeri negativi.
 */
export function parseVersion(value: unknown): number[] | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parts = trimmed.split('.');
  if (parts.length > MAX_PARTS) return null;

  const numbers: number[] = [];
  for (const part of parts) {
    // `Number('')` e `Number(' ')` danno 0 e `parseInt('1a')` da' 1: serve un
    // match esplicito di sole cifre.
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isSafeInteger(n)) return null;
    numbers.push(n);
  }
  while (numbers.length < MAX_PARTS) numbers.push(0);
  return numbers;
}

/**
 * -1 se a < b, 0 se uguali, 1 se a > b. null se una delle due non e' parsabile
 * (il chiamante deve interpretarlo come "non so" -> fail-open).
 */
export function compareVersions(a: unknown, b: unknown): -1 | 0 | 1 | null {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return null;

  for (let i = 0; i < MAX_PARTS; i++) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
}

/**
 * true SOLO se `current` e' dimostrabilmente piu' vecchia di `target`.
 * Versioni non parsabili, uguali o piu' recenti -> false. E' la forma da usare
 * nel gate: la risposta affermativa richiede una prova, il dubbio non blocca.
 */
export function isOlderThan(current: unknown, target: unknown): boolean {
  return compareVersions(current, target) === -1;
}
