// ---------------------------------------------------------------------------
// Geocoding Cache + Deduplicazione
// Cache in-memory per i risultati "place" dell'autocomplete mappa (Nominatim).
// TTL 10 min: bilanciato tra risparmio richieste ripetute nella stessa sessione
// e freschezza (le coordinate delle città non cambiano).
// ---------------------------------------------------------------------------

export type CachedPlace = {
  type: 'place';
  name: string;
  subtitle?: string;
  placeType?: string;
  latitude: number;
  longitude: number;
};

const CACHE_TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 50;

interface CacheEntry {
  data: CachedPlace[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<CachedPlace[]>>();

function normalizeKey(query: string, lang: string): string {
  return `${lang}:${query.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}

function isValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

function evictOldest(): void {
  if (cache.size <= MAX_ENTRIES) return;
  const sorted = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = sorted.slice(0, cache.size - MAX_ENTRIES + 5);
  for (const [key] of toRemove) cache.delete(key);
}

export function getCachedPlaces(query: string, lang: string): CachedPlace[] | null {
  const key = normalizeKey(query, lang);
  const entry = cache.get(key);
  if (!entry || !isValid(entry.timestamp)) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPlaces(query: string, lang: string, data: CachedPlace[]): void {
  evictOldest();
  cache.set(normalizeKey(query, lang), { data, timestamp: Date.now() });
}

/** Se una richiesta identica è già in volo, ritorna la stessa promise invece di duplicare. */
export async function deduplicatedPlaces(
  query: string,
  lang: string,
  fetcher: () => Promise<CachedPlace[]>,
): Promise<CachedPlace[]> {
  const key = normalizeKey(query, lang);
  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = fetcher().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
