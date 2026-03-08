// ---------------------------------------------------------------------------
// Places Cache + Deduplicazione
// Versione semplificata da Altrove per AllergiApp (solo ristoranti)
// ---------------------------------------------------------------------------

import type { PlaceAutocompleteResult } from './placesService';
import type { PlaceSuggestion } from '../types/restaurants';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEARCH_CACHE_TTL = 5 * 60 * 1000;   // 5 minuti
const DETAILS_CACHE_TTL = 30 * 60 * 1000;  // 30 minuti
const MAX_SEARCH_ENTRIES = 50;
const MAX_DETAILS_ENTRIES = 100;

// ---------------------------------------------------------------------------
// Cache storage
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<PlaceAutocompleteResult[]>>();
const detailsCache = new Map<string, CacheEntry<PlaceSuggestion>>();

// ---------------------------------------------------------------------------
// In-flight deduplication
// ---------------------------------------------------------------------------

const pendingSearches = new Map<string, Promise<PlaceAutocompleteResult[]>>();
const pendingDetails = new Map<string, Promise<PlaceSuggestion | null>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValid(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp < ttl;
}

function evictOldest<T>(cache: Map<string, CacheEntry<T>>, max: number): void {
  if (cache.size <= max) return;
  const sorted = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = sorted.slice(0, cache.size - max + 5);
  for (const [key] of toRemove) cache.delete(key);
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Search cache
// ---------------------------------------------------------------------------

export function getCachedSearch(query: string): PlaceAutocompleteResult[] | null {
  const key = normalizeQuery(query);
  const entry = searchCache.get(key);
  if (!entry || !isValid(entry.timestamp, SEARCH_CACHE_TTL)) {
    if (entry) searchCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedSearch(query: string, results: PlaceAutocompleteResult[]): void {
  evictOldest(searchCache, MAX_SEARCH_ENTRIES);
  searchCache.set(normalizeQuery(query), { data: results, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Details cache
// ---------------------------------------------------------------------------

export function getCachedDetails(placeId: string): PlaceSuggestion | null {
  const entry = detailsCache.get(placeId);
  if (!entry || !isValid(entry.timestamp, DETAILS_CACHE_TTL)) {
    if (entry) detailsCache.delete(placeId);
    return null;
  }
  return entry.data;
}

export function setCachedDetails(placeId: string, details: PlaceSuggestion): void {
  evictOldest(detailsCache, MAX_DETAILS_ENTRIES);
  detailsCache.set(placeId, { data: details, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Deduplicated fetch wrappers
// ---------------------------------------------------------------------------

export async function deduplicatedSearch(
  query: string,
  fetcher: () => Promise<PlaceAutocompleteResult[]>,
): Promise<PlaceAutocompleteResult[]> {
  const key = normalizeQuery(query);
  const pending = pendingSearches.get(key);
  if (pending) return pending;

  const promise = fetcher().finally(() => pendingSearches.delete(key));
  pendingSearches.set(key, promise);
  return promise;
}

export async function deduplicatedDetails(
  placeId: string,
  fetcher: () => Promise<PlaceSuggestion | null>,
): Promise<PlaceSuggestion | null> {
  const pending = pendingDetails.get(placeId);
  if (pending) return pending;

  const promise = fetcher().finally(() => pendingDetails.delete(placeId));
  pendingDetails.set(placeId, promise);
  return promise;
}
