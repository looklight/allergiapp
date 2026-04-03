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
      /** Sottotitolo derivato da display_name di Nominatim (es. "Lazio, Italia") */
      subtitle?: string;
      /** Tipo OSM: country, state, city, district, street, house, locality, etc. */
      placeType?: string;
      latitude: number;
      longitude: number;
    };

type Params = {
  restaurants: Restaurant[];
  userLocation: { latitude: number; longitude: number } | null;
};

const SEARCH_DEBOUNCE = 1000;
const MIN_QUERY_LENGTH = 2;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

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

  /** Cerca luoghi su Nominatim (geocoding OSM, supporta tutte le lingue) */
  const searchPlaces = useCallback(async (query: string): Promise<SearchResult[]> => {
    try {
      const userLang = i18n.locale?.substring(0, 2) || 'en';
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        'accept-language': userLang,
        limit: '5',
        addressdetails: '1',
        // Solo città e nazioni — nessun viewbox, l'importanza conta più della vicinanza
        featuretype: 'country,city',
      });
      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'AllergiApp/1.0' },
      });
      if (!response.ok) return [];

      const data: any[] = await response.json();

      return data.map((item: any) => {
        const name = item.name || 'Unknown';
        // display_name è "Roma, Lazio, Italia" — togliamo il nome per ottenere "Lazio, Italia"
        const display = (item.display_name as string) || '';
        const subtitle = display.startsWith(name)
          ? display.slice(name.length).replace(/^[,\s]+/, '')
          : display;
        return {
          type: 'place' as const,
          name,
          subtitle: subtitle || undefined,
          placeType: item.addresstype || item.type || undefined,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
      });
    } catch {
      return [];
    }
  }, [userLocation]);

  /** Esegue la ricerca completa (cache + Supabase + Nominatim) con debounce */
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
      // Fetch parallelo: Supabase + Nominatim
      const [supabaseResults, placeResults_] = await Promise.all([
        searchSupabase(query),
        searchPlaces(query),
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

      const placeResults = placeResults_.slice(0, 3);
      const restaurantResults = restaurantMerged.slice(0, 5);

      setResults([...placeResults, ...restaurantResults]);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE);
  }, [searchLocalCache, searchSupabase, searchPlaces]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sequenceRef.current++;
    setResults([]);
    setIsSearching(false);
  }, []);

  return { results, isSearching, search, clear };
}
