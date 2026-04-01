import { useState, useRef, useCallback } from 'react';
import { RestaurantService, type Restaurant } from '../services/restaurantService';
import i18n from '../utils/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchResult =
  | {
      type: 'restaurant';
      id: string;
      name: string;
      city: string | null;
      latitude: number;
      longitude: number;
      rating: number;
      distance_km: number | null;
    }
  | {
      type: 'place';
      name: string;
      city?: string;
      state?: string;
      country?: string;
      /** Tipo OSM: country, state, city, district, street, house, locality, etc. */
      placeType?: string;
      latitude: number;
      longitude: number;
    };

type Params = {
  restaurants: Restaurant[];
  userLocation: { latitude: number; longitude: number } | null;
};

const SEARCH_DEBOUNCE = 300;
const MIN_QUERY_LENGTH = 2;
const PHOTON_URL = 'https://photon.komoot.io/api/';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMapSearch({ restaurants, userLocation }: Params) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const sequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Cerca nei ristoranti già in cache (sincrono, istantaneo) */
  const searchLocalCache = useCallback((query: string): SearchResult[] => {
    const q = query.toLowerCase();
    return restaurants
      .filter(r => r.location && (
        r.name.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q)
      ))
      .slice(0, 3)
      .map(r => ({
        type: 'restaurant' as const,
        id: r.id,
        name: r.name,
        city: r.city,
        latitude: r.location!.latitude,
        longitude: r.location!.longitude,
        rating: r.average_rating ?? 0,
        distance_km: r.distance_km ?? null,
      }));
  }, [restaurants]);

  /** Cerca ristoranti su Supabase (fuzzy, pg_trgm) */
  const searchSupabase = useCallback(async (query: string): Promise<SearchResult[]> => {
    try {
      const results = await RestaurantService.searchRestaurantsByName(
        query,
        userLocation?.latitude,
        userLocation?.longitude,
      );
      return results.map(r => ({
        type: 'restaurant' as const,
        id: r.id,
        name: r.name,
        city: r.city,
        latitude: r.latitude,
        longitude: r.longitude,
        rating: r.average_rating,
        distance_km: r.distance_km,
      }));
    } catch {
      return [];
    }
  }, [userLocation]);

  /** Cerca luoghi su Photon (geocoding OSM) */
  const searchPhoton = useCallback(async (query: string): Promise<SearchResult[]> => {
    try {
      const PHOTON_LANGS = new Set(['de', 'en', 'fr']);
      const userLang = i18n.locale?.substring(0, 2) || 'en';
      const lang = PHOTON_LANGS.has(userLang) ? userLang : 'default';
      const params = new URLSearchParams({ q: query, lang, limit: '5' });
      if (userLocation) {
        params.set('lat', String(userLocation.latitude));
        params.set('lon', String(userLocation.longitude));
      }
      const response = await fetch(`${PHOTON_URL}?${params}`);
      if (!response.ok) return [];

      const data = await response.json();
      const features: any[] = data.features ?? [];

      return features
        .filter((f: any) => f.geometry?.coordinates?.length === 2)
        .map((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties ?? {};
          return {
            type: 'place' as const,
            name: props.name || props.street || 'Unknown',
            city: props.city || props.county || undefined,
            state: props.state || undefined,
            country: props.country || undefined,
            placeType: props.type || undefined, // country, state, city, district, street, etc.
            latitude: lat,
            longitude: lng,
          };
        });
    } catch {
      return [];
    }
  }, [userLocation]);

  /** Esegue la ricerca completa (cache + Supabase + Photon) con debounce */
  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Risultati istantanei dalla cache locale
    const localResults = searchLocalCache(query);
    if (localResults.length > 0) {
      setResults(localResults);
    }

    const seq = ++sequenceRef.current;
    setIsSearching(true);

    timerRef.current = setTimeout(async () => {
      // Fetch parallelo: Supabase + Photon
      const [supabaseResults, photonResults] = await Promise.all([
        searchSupabase(query),
        searchPhoton(query),
      ]);

      // Se è arrivata una query più recente, ignora questi risultati
      if (sequenceRef.current !== seq) return;

      // Merge: luoghi prima (caso d'uso: cerco una città per esplorare),
      // poi ristoranti (cache locale + Supabase dedup)
      const seen = new Set(localResults.map(r => r.type === 'restaurant' ? r.id : ''));
      const restaurantMerged: SearchResult[] = [...localResults];

      for (const r of supabaseResults) {
        if (r.type === 'restaurant' && !seen.has(r.id)) {
          seen.add(r.id);
          restaurantMerged.push(r);
        }
      }

      const placeResults = photonResults.slice(0, 3);
      const restaurantResults = restaurantMerged.slice(0, 5);

      setResults([...placeResults, ...restaurantResults]);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE);
  }, [searchLocalCache, searchSupabase, searchPhoton]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sequenceRef.current++;
    setResults([]);
    setIsSearching(false);
  }, []);

  return { results, isSearching, search, clear };
}
