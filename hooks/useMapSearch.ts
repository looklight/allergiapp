import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RestaurantService, type Restaurant } from '../services/restaurantService';
import {
  getCachedPlaces,
  setCachedPlaces,
  deduplicatedPlaces,
  type CachedPlace,
} from '../services/geocodingCache';
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
  /** Se true, il fetch "Ristoranti nell'area" usa getRestaurantsForMyNeeds per popolare il match coverage. */
  forMyNeeds?: boolean;
  filterAllergens?: string[];
  filterDiets?: string[];
};

// Debounce differenziato: Supabase/cache locali costano poco e rispondono veloci,
// Nominatim è esterno e ha policy più severa → aspettiamo di più prima di colpirlo.
const RESTAURANT_DEBOUNCE = 300;
const PLACE_DEBOUNCE = 700;
const PLACE_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 2;
// Nominatim restituisce risultati di bassa qualità sotto i 3 caratteri e spreca rate limit.
// Esportato: i consumer (es. onSubmitEditing) hanno bisogno di sapere se la query
// è eleggibile per una ricerca di luoghi prima di forzare un fetch immediato.
export const MIN_PLACE_QUERY_LENGTH = 3;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api';
// Nominatim usage policy chiede un User-Agent identificabile con contatto.
const USER_AGENT = 'AllergiApp/1.0 (lucapuliga@outlook.com)';

// Tipi OSM geografici accettati nella sezione "Luoghi" dell'autocomplete.
// Nominatim senza filtro restituirebbe anche POI (ristoranti, negozi, edifici):
// qui teniamo solo confini amministrativi e tipi di insediamento.
const GEO_PLACE_TYPES = new Set([
  'country', 'state', 'region', 'province', 'county', 'municipality',
  'city', 'town', 'village', 'hamlet',
  'suburb', 'neighbourhood', 'district', 'locality', 'quarter', 'borough',
]);

function isGeographicPlace(osmClass?: string, osmType?: string): boolean {
  if (osmClass === 'boundary' && osmType === 'administrative') return true;
  if (osmClass === 'place' && osmType && GEO_PLACE_TYPES.has(osmType)) return true;
  return false;
}

// Raggio usato per la sezione "Ristoranti a [Città]" dopo il tap su un luogo.
// Scelto in base al placeType: country/state troppo ampi → ridotto a scala città.
function nearbyRadiusKm(placeType?: string): number {
  switch (placeType) {
    case 'country': return 50;
    case 'state':
    case 'region': return 30;
    case 'county':
    case 'province': return 20;
    case 'city':
    case 'town': return 15;
    case 'district':
    case 'locality':
    case 'village': return 5;
    default: return 10;
  }
}

export type NearbyPlace = {
  name: string;
  latitude: number;
  longitude: number;
  placeType?: string;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMapSearch({
  restaurants,
  userLocation,
  forMyNeeds = false,
  filterAllergens = [],
  filterDiets = [],
}: Params) {
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyPlace, setNearbyPlace] = useState<NearbyPlace | null>(null);
  const [nearbyResults, setNearbyResults] = useState<Restaurant[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Ordine finale: luoghi prima (caso d'uso "cerco una città per esplorare"),
  // poi ristoranti. Memoized per stabilità referenziale su consumer che fanno
  // deep compare (es. SearchAutocomplete memoizzato).
  const results = useMemo(
    () => [...placeResults, ...restaurantResults],
    [placeResults, restaurantResults],
  );

  const sequenceRef = useRef(0);
  const restaurantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeAbortRef = useRef<AbortController | null>(null);
  const nearbySeqRef = useRef(0);

  // Refs per accedere ai filtri correnti dentro selectPlace senza destabilizzarlo
  const forMyNeedsRef = useRef(forMyNeeds);
  forMyNeedsRef.current = forMyNeeds;
  const allergensRef = useRef(filterAllergens);
  allergensRef.current = filterAllergens;
  const dietsRef = useRef(filterDiets);
  dietsRef.current = filterDiets;

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

  /** Nominatim (provider primario): geocoding OSM con `accept-language` per nomi localizzati. */
  const fetchNominatim = useCallback(async (query: string, lang: string, signal: AbortSignal): Promise<CachedPlace[]> => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      'accept-language': lang,
      limit: '10',
      addressdetails: '1',
    });
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal,
    });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);

    const data: any[] = await response.json();
    return data
      .filter((item: any) => isGeographicPlace(item.class, item.type))
      .map((item: any) => {
        const name = item.name || 'Unknown';
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
  }, []);

  /** Photon (fallback): Komoot non supporta `lang=it` (solo en/de/fr), quindi i nomi
   *  non saranno localizzati. Usato solo se Nominatim fallisce: meglio risultati in
   *  lingua originale che nessun risultato. */
  const fetchPhoton = useCallback(async (query: string, signal: AbortSignal): Promise<CachedPlace[]> => {
    const params = new URLSearchParams({
      q: query,
      limit: '10',
      // Photon accetta più osm_tag in OR per filtrare i tipi geografici a monte.
      osm_tag: 'place',
    });
    // URLSearchParams sovrascrive le chiavi duplicate: append manuale per osm_tag multipli.
    params.append('osm_tag', 'boundary:administrative');
    const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
    if (!response.ok) throw new Error(`Photon ${response.status}`);

    const data = await response.json();
    const features: any[] = Array.isArray(data?.features) ? data.features : [];
    return features
      .filter((f: any) => isGeographicPlace(f?.properties?.osm_key, f?.properties?.osm_value))
      .map((f: any) => {
        const p = f.properties || {};
        const [lng, lat] = f.geometry?.coordinates ?? [NaN, NaN];
        const subtitleParts = [p.city, p.state, p.country].filter(Boolean);
        return {
          type: 'place' as const,
          name: p.name || 'Unknown',
          subtitle: subtitleParts.join(', ') || undefined,
          placeType: p.osm_value || undefined,
          latitude: lat,
          longitude: lng,
        };
      })
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  }, []);

  /** Cerca luoghi: cache → Nominatim (primario) → Photon (fallback).
   *  Cancellabile via AbortSignal, timeout di sicurezza a PLACE_TIMEOUT_MS. */
  const searchPlaces = useCallback(async (query: string, signal: AbortSignal): Promise<CachedPlace[]> => {
    const userLang = i18n.locale?.substring(0, 2) || 'en';

    const cached = getCachedPlaces(query, userLang);
    if (cached) return cached;

    return deduplicatedPlaces(query, userLang, async () => {
      // Combiniamo il signal esterno (cancellazione per nuovo keystroke) con un timeout
      // di sicurezza: se una delle due condizioni si verifica, il controller interno aborta.
      const internal = new AbortController();
      const onExternalAbort = () => internal.abort();
      if (signal.aborted) internal.abort();
      else signal.addEventListener('abort', onExternalAbort);
      const timeout = setTimeout(() => internal.abort(), PLACE_TIMEOUT_MS);

      try {
        try {
          const results = await fetchNominatim(query, userLang, internal.signal);
          setCachedPlaces(query, userLang, results);
          return results;
        } catch (err: any) {
          if (signal.aborted || err?.name === 'AbortError') throw err;
          // Nominatim ha fallito (rete, 429, 5xx): tentiamo Photon come rete di sicurezza.
          // I nomi non saranno in italiano (Photon non supporta `lang=it`) ma restituire
          // qualcosa è preferibile a lasciare la UI vuota.
          const results = await fetchPhoton(query, internal.signal);
          setCachedPlaces(query, userLang, results);
          return results;
        }
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', onExternalAbort);
      }
    });
  }, [fetchNominatim, fetchPhoton]);

  /** Esegue la ricerca a due corsie:
   *  - Ristoranti: cache locale istantanea + Supabase con debounce breve
   *  - Luoghi: Nominatim con debounce più lungo + cache + fallback Photon
   *  Le due corsie aggiornano il loro slice di stato indipendentemente.
   *
   *  `opts.immediate`: bypassa i debounce (fetch parte a delay 0). Usato da
   *  onSubmitEditing quando l'utente preme invio prima del debounce naturale. */
  const search = useCallback((query: string, opts?: { immediate?: boolean }) => {
    if (restaurantTimerRef.current) clearTimeout(restaurantTimerRef.current);
    if (placeTimerRef.current) clearTimeout(placeTimerRef.current);
    if (placeAbortRef.current) placeAbortRef.current.abort();

    if (query.length < MIN_QUERY_LENGTH) {
      setPlaceResults([]);
      setRestaurantResults([]);
      setIsSearching(false);
      return;
    }

    const seq = ++sequenceRef.current;
    const willSearchPlaces = query.length >= MIN_PLACE_QUERY_LENGTH;
    const restaurantDelay = opts?.immediate ? 0 : RESTAURANT_DEBOUNCE;
    const placeDelay = opts?.immediate ? 0 : PLACE_DEBOUNCE;

    // Corsia ristoranti: cache locale subito, Supabase dopo RESTAURANT_DEBOUNCE.
    const localResults = searchLocalCache(query);
    setRestaurantResults(localResults);
    setIsSearching(true);

    restaurantTimerRef.current = setTimeout(async () => {
      const supabaseResults = await searchSupabase(query);
      if (sequenceRef.current !== seq) return;

      const seen = new Set(localResults.map(r => r.type === 'restaurant' ? r.id : ''));
      const merged: SearchResult[] = [...localResults];
      for (const r of supabaseResults) {
        if (r.type === 'restaurant' && !seen.has(r.id)) {
          seen.add(r.id);
          merged.push(r);
        }
      }
      setRestaurantResults(merged.slice(0, 5));
      // Se non stiamo cercando luoghi, il completamento della corsia ristoranti
      // chiude la ricerca. Altrimenti lasciamo la chiusura al place timer.
      if (!willSearchPlaces) setIsSearching(false);
    }, restaurantDelay);

    // Corsia luoghi: Nominatim dopo PLACE_DEBOUNCE, solo se query abbastanza lunga.
    if (!willSearchPlaces) {
      setPlaceResults([]);
      return;
    }

    placeTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      placeAbortRef.current = controller;
      try {
        const places = await searchPlaces(query, controller.signal);
        if (sequenceRef.current !== seq || controller.signal.aborted) return;
        setPlaceResults(places.slice(0, 3));
      } catch {
        // Nominatim e Photon entrambi falliti (o abort): lasciamo i luoghi vuoti.
        if (sequenceRef.current !== seq) return;
        setPlaceResults([]);
      } finally {
        if (sequenceRef.current === seq) setIsSearching(false);
      }
    }, placeDelay);
  }, [searchLocalCache, searchSupabase, searchPlaces]);

  const clear = useCallback(() => {
    if (restaurantTimerRef.current) clearTimeout(restaurantTimerRef.current);
    if (placeTimerRef.current) clearTimeout(placeTimerRef.current);
    if (placeAbortRef.current) placeAbortRef.current.abort();
    sequenceRef.current++;
    nearbySeqRef.current++;
    setPlaceResults([]);
    setRestaurantResults([]);
    setIsSearching(false);
    setNearbyPlace(null);
    setNearbyResults([]);
    setIsLoadingNearby(false);
  }, []);

  /** Chiave dei filtri usati nell'ultimo fetch nearby: serve al useEffect per
   *  saltare refetch quando il risultato non cambierebbe (fmn=false) o quando
   *  i filtri correnti combaciano con quelli appena usati da selectPlace. */
  const lastFetchKeyRef = useRef<string>('');

  const computeFilterKey = (fmn: boolean, allergens: string[], diets: string[]) =>
    fmn
      ? `fmn:${[...allergens].sort().join(',')}|${[...diets].sort().join(',')}`
      : 'no-fmn';

  /** Esegue la query nearby per un place con i filtri correnti.
   *  Aggiorna lastFetchKeyRef prima dell'await per evitare che il useEffect reattivo
   *  avvii un fetch duplicato quando il render successivo osserva nearbyPlace cambiato. */
  const fetchNearby = useCallback(async (place: NearbyPlace) => {
    const fmn = forMyNeedsRef.current;
    const allergens = allergensRef.current;
    const diets = dietsRef.current;
    const seq = ++nearbySeqRef.current;
    lastFetchKeyRef.current = computeFilterKey(fmn, allergens, diets);
    setIsLoadingNearby(true);

    const radius = nearbyRadiusKm(place.placeType);
    const nearby = fmn
      ? await RestaurantService.getRestaurantsForMyNeeds(
          place.latitude, place.longitude,
          allergens, diets, radius,
        )
      : await RestaurantService.getNearbyRestaurants(place.latitude, place.longitude, radius, 50);

    if (nearbySeqRef.current !== seq) return;
    setNearbyResults(nearby);
    setIsLoadingNearby(false);
  }, []);

  /** Selezione di un luogo: carica ristoranti entro un raggio coerente col placeType.
   *  Se forMyNeeds è attivo, usa l'RPC che restituisce anche il match coverage (covered/inferred). */
  const selectPlace = useCallback(async (place: NearbyPlace) => {
    setNearbyPlace(place);
    setNearbyResults([]);
    await fetchNearby(place);
  }, [fetchNearby]);

  /** Re-fetch nearby quando filtri/esigenze cambiano mentre un place è selezionato.
   *  I badge di copertura (covered/inferred) sono calcolati server-side al momento del
   *  fetch iniziale: senza questo effetto, qualsiasi modifica alle allergie o al toggle
   *  "Per me" lascerebbe la lista nearby stale. Copre in modo uniforme tutti i callsite
   *  (apply filtri, rimuovi chip "Per me", reset, sync profilo da altra schermata). */
  useEffect(() => {
    if (!nearbyPlace) return;
    const key = computeFilterKey(forMyNeeds, filterAllergens, filterDiets);
    if (key === lastFetchKeyRef.current) return;
    fetchNearby(nearbyPlace).catch(() => {});
  }, [forMyNeeds, filterAllergens, filterDiets, nearbyPlace, fetchNearby]);

  const clearNearbyPlace = useCallback(() => {
    nearbySeqRef.current++;
    setNearbyPlace(null);
    setNearbyResults([]);
    setIsLoadingNearby(false);
  }, []);

  return {
    results,
    isSearching,
    search,
    clear,
    nearbyPlace,
    nearbyResults,
    isLoadingNearby,
    selectPlace,
    clearNearbyPlace,
  };
}
