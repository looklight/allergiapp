import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { RestaurantService, type Restaurant, type RestaurantPin } from '../services/restaurantService';
import { haversineKm } from '../utils/geo';

export type LatLng = { latitude: number; longitude: number };
export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };
export type CenterOn = LatLng & { sheetFraction: number; latDelta?: number };

type FilterParams = {
  forMyNeeds: boolean;
  filterAllergens: string[];
  filterDiets: string[];
  /** Frazione corrente dello sheet (usata per calcolare l'offset camera) */
  getSheetFraction: () => number;
};

type FetchedArea = { center: LatLng; radiusKm: number };

const AUTO_FETCH_DEBOUNCE = 800;
const CACHE_MAX_SIZE = 1000;
const OVERLAP_MARGIN = 0.7; // 30% overlap: fetch solo se centro fuori dal 70% del raggio
const MAX_FETCHED_AREAS = 50; // Limita la crescita di fetchedAreas

export function useRestaurantGeo(params: FilterParams) {
  const { forMyNeeds, filterAllergens, filterDiets, getSheetFraction } = params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [viewportPins, setViewportPins] = useState<RestaurantPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [centerOn, setCenterOn] = useState<CenterOn | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeoMode, setIsGeoMode] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // ---- Cache accumulativa ----
  const restaurantCache = useRef<Map<string, Restaurant>>(new Map());
  const fetchedAreas = useRef<FetchedArea[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedGeo = useRef(false);
  const isFetching = useRef(false);
  /** Area pendente: se un fetch era in corso durante la richiesta, esegui dopo */
  const pendingFetch = useRef<{ center: LatLng; radiusKm: number } | null>(null);
  /** Epoch per clearAndReload — toggle rapidi scartano risultati stale */
  const reloadEpoch = useRef(0);
  /** Cache pin viewport — accumula pin leggeri da viste diverse */
  const pinCache = useRef<Map<string, RestaurantPin>>(new Map());
  const pinDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Epoch per loadPinsForViewport — scarta risposte stale durante pan veloce */
  const pinFetchEpoch = useRef(0);
  /** Centro mappa corrente — aggiornato ad ogni region change */
  const lastMapCenterRef = useRef<LatLng | null>(null);

  // Refs per accedere a valori correnti nei callback stabili
  const forMyNeedsRef = useRef(forMyNeeds);
  forMyNeedsRef.current = forMyNeeds;
  const filterAllergensRef = useRef(filterAllergens);
  filterAllergensRef.current = filterAllergens;
  const filterDietsRef = useRef(filterDiets);
  filterDietsRef.current = filterDiets;

  /** Sincronizza lo state React con il contenuto della cache */
  const syncState = useCallback(() => {
    setRestaurants(Array.from(restaurantCache.current.values()));
  }, []);

  /** Merge risultati nella cache. Sovrascrive se il nuovo record ha distance_km (piu fresco). */
  const mergeIntoCache = useCallback((results: Restaurant[]) => {
    for (const r of results) {
      const existing = restaurantCache.current.get(r.id);
      if (!existing || r.distance_km != null) {
        restaurantCache.current.set(r.id, r);
      }
    }
  }, []);

  /** Evict ristoranti piu lontani dal centro corrente.
   *  I preferiti sono gestiti separatamente in favoriteRestaurants (useRestaurantFavorites),
   *  quindi possono essere tranquillamente evicti dalla cache geo senza perdita. */
  const evictDistant = useCallback((center: LatLng) => {
    if (restaurantCache.current.size <= CACHE_MAX_SIZE) return;

    const entries = Array.from(restaurantCache.current.entries())
      .map(([id, r]) => ({
        id,
        dist: r.location
          ? haversineKm(center.latitude, center.longitude, r.location.latitude, r.location.longitude)
          : Infinity,
      }))
      .sort((a, b) => b.dist - a.dist);

    const toRemove = restaurantCache.current.size - CACHE_MAX_SIZE;
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      restaurantCache.current.delete(entries[i].id);
    }
  }, []);

  /** Controlla se un centro e coperto da aree gia fetchate */
  const isCovered = useCallback((center: LatLng): boolean => {
    return fetchedAreas.current.some(area => {
      const dist = haversineKm(
        area.center.latitude, area.center.longitude,
        center.latitude, center.longitude,
      );
      return dist < area.radiusKm * OVERLAP_MARGIN;
    });
  }, []);

  /** Fetch generico: chiama la RPC appropriata, merge nella cache.
   *  Se un fetch e gia in corso, accoda la richiesta (eseguita al termine). */
  const fetchArea = useCallback(async (center: LatLng, radiusKm: number) => {
    if (isFetching.current) {
      pendingFetch.current = { center, radiusKm };
      return;
    }
    isFetching.current = true;
    // Cattura l'epoch prima dell'await: se clearAndReload scatta durante il fetch
    // (es. toggle forMyNeeds), i risultati stale vengono scartati e non
    // sovrascrivono i dati già ricaricati con il nuovo filtro.
    const epoch = reloadEpoch.current;
    try {
      const results = forMyNeedsRef.current
        ? await RestaurantService.getRestaurantsForMyNeeds(
            center.latitude, center.longitude,
            filterAllergensRef.current, filterDietsRef.current, radiusKm,
          )
        : await RestaurantService.getNearbyRestaurants(center.latitude, center.longitude, radiusKm);

      if (reloadEpoch.current !== epoch) return;
      mergeIntoCache(results);
      if (fetchedAreas.current.length >= MAX_FETCHED_AREAS) {
        fetchedAreas.current = fetchedAreas.current.slice(-MAX_FETCHED_AREAS / 2);
      }
      fetchedAreas.current.push({ center, radiusKm });
      evictDistant(center);
      syncState();
    } finally {
      isFetching.current = false;
      const next = pendingFetch.current;
      if (next) {
        pendingFetch.current = null;
        fetchArea(next.center, next.radiusKm);
      }
    }
  }, [mergeIntoCache, evictDistant, syncState]);

  // ---- Caricamento iniziale ----

  const loadGeo = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const center = { latitude: lat, longitude: lng };
    await fetchArea(center, 50);
    setIsGeoMode(true);
    setIsLoading(false);
  }, [fetchArea]);

  /** Svuota cache e ricarica (usato quando si toggl forMyNeeds).
   *  Fetch diretto (bypassa la coda fetchArea) per evitare race condition
   *  con toggle rapidi. Epoch counter scarta risultati stale.
   *  forMyNeedsOverride: usa questo valore invece di forMyNeedsRef.current.
   *  Necessario perché setForMyNeeds è asincrono — la ref non è ancora
   *  aggiornata quando clearAndReload è chiamato nello stesso handler. */
  const clearAndReload = useCallback(async (forMyNeedsOverride?: boolean) => {
    const epoch = ++reloadEpoch.current;
    pendingFetch.current = null;
    fetchedAreas.current = [];
    // NON svuotare pinCache — i pin viewport sono dati geometrici,
    // non dipendono da forMyNeeds. Svuotandoli i pallini spariscono.
    // Usa il centro mappa corrente (se disponibile) invece della posizione GPS:
    // l'utente potrebbe star esplorando un'area diversa dalla propria posizione.
    const fetchCenter = lastMapCenterRef.current ?? userLocation;
    if (!fetchCenter) {
      restaurantCache.current.clear();
      setRestaurants([]);
      return;
    }
    setIsLoading(true);
    try {
      const useForMyNeeds = forMyNeedsOverride !== undefined ? forMyNeedsOverride : forMyNeedsRef.current;
      const results = useForMyNeeds
        ? await RestaurantService.getRestaurantsForMyNeeds(
            fetchCenter.latitude, fetchCenter.longitude,
            filterAllergensRef.current, filterDietsRef.current, 50,
          )
        : await RestaurantService.getNearbyRestaurants(
            fetchCenter.latitude, fetchCenter.longitude, 50,
          );
      if (reloadEpoch.current !== epoch) return;
      restaurantCache.current.clear();
      for (const r of results) restaurantCache.current.set(r.id, r);
      fetchedAreas.current = [{ center: fetchCenter, radiusKm: 50 }];
      syncState();
    } finally {
      if (reloadEpoch.current === epoch) {
        setIsGeoMode(true);
        setIsLoading(false);
      }
    }
  }, [userLocation, syncState]);

  // Al mount, centra la mappa sulla posizione dell'utente
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setLocationDenied(true);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        setCenterOn({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
      } catch {
        // GPS non disponibile
      }
    })();
    return () => { mounted = false; };
  }, []);

  /** Carica pin leggeri per il viewport corrente.
   *  Chiamato dal handleRegionChange (debounced separatamente). */
  const loadPinsForViewport = useCallback((region: MapRegion) => {
    // Epoch locale: se arriva una risposta più vecchia di un fetch successivo, viene scartata.
    // Fondamentale durante pan veloce dove più richieste sono in volo contemporaneamente.
    const epoch = ++pinFetchEpoch.current;

    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    const margin = Math.min(latDelta * 0.3, 10);
    const minLat = Math.max(-90, region.latitude - latDelta / 2 - margin);
    const maxLat = Math.min(90, region.latitude + latDelta / 2 + margin);
    const minLng = Math.max(-180, region.longitude - lngDelta / 2 - margin);
    const maxLng = Math.min(180, region.longitude + lngDelta / 2 + margin);

    RestaurantService.getPinsInBounds(minLat, minLng, maxLat, maxLng)
      .then(pins => {
        if (pinFetchEpoch.current !== epoch) return; // risposta stale, ignora
        const sizeBefore = pinCache.current.size;
        for (const p of pins) pinCache.current.set(p.id, p);
        let trimmed = false;
        if (pinCache.current.size > 3000) {
          const entries = Array.from(pinCache.current.entries());
          pinCache.current = new Map(entries.slice(-2000));
          trimmed = true;
        }
        if (pinCache.current.size !== sizeBefore || trimmed) {
          setViewportPins(Array.from(pinCache.current.values()));
        }
      })
      .catch(() => { /* rete non disponibile — mantieni i pin precedenti */ });
  }, []);

  /** Carica pin per un'area ampia intorno alla posizione corrente.
   *  Usato al focus della schermata per avere subito i pallini visibili. */
  const refreshPinsAroundUser = useCallback(() => {
    if (!userLocation) return;
    // Area ampia (±0.5° ≈ 50km) per coprire la vista iniziale
    loadPinsForViewport({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 1.0,
      longitudeDelta: 1.0,
    });
  }, [userLocation, loadPinsForViewport]);

  // Carica ristoranti + pin al primo GPS fix
  useEffect(() => {
    if (userLocation && !hasLoadedGeo.current) {
      hasLoadedGeo.current = true;
      loadGeo(userLocation.latitude, userLocation.longitude);
      // Pin immediati per la vista iniziale (nessun debounce)
      loadPinsForViewport({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 1.0,
        longitudeDelta: 1.0,
      });
    }
  }, [userLocation, loadGeo, loadPinsForViewport]);

  // Fallback: se dopo 3s non c'e GPS, ferma il loading e mostra lista vuota
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoadedGeo.current) {
        hasLoadedGeo.current = true;
        setIsLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  /** Auto-fetch debounced on region change */
  const handleRegionChange = useCallback((region: MapRegion) => {
    lastMapCenterRef.current = { latitude: region.latitude, longitude: region.longitude };
    // 1. Fetch dati completi ristoranti (debounce lungo)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const center = { latitude: region.latitude, longitude: region.longitude };
      if (isCovered(center)) return;
      const radiusKm = Math.max(3, Math.min(50, (region.latitudeDelta * 111) / 2));
      await fetchArea(center, radiusKm);
    }, AUTO_FETCH_DEBOUNCE);

    // 2. Fetch pin leggeri per viewport (300ms: bilancia reattività e numero di fetch
    //    concorrenti durante pan veloce; l'epoch in loadPinsForViewport scarta i stale)
    if (pinDebounceTimer.current) clearTimeout(pinDebounceTimer.current);
    pinDebounceTimer.current = setTimeout(() => {
      loadPinsForViewport(region);
    }, 300);
  }, [isCovered, fetchArea, loadPinsForViewport]);

  const handleLocateMe = useCallback(async (): Promise<LatLng | null> => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setIsLocating(false);
        return null;
      }
      setLocationDenied(false);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setCenterOn({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
      await loadGeo(coords.latitude, coords.longitude);
      setIsLocating(false);
      return coords;
    } catch {
      setIsLocating(false);
      return null;
    }
  }, [loadGeo, getSheetFraction]);

  /** Resetta la vista alla posizione utente */
  const resetToUserLocation = useCallback(() => {
    if (userLocation) {
      setCenterOn({ ...userLocation, sheetFraction: getSheetFraction(), latDelta: 0.02 });
    } else {
      setCenterOn(null);
    }
  }, [userLocation, getSheetFraction]);

  /** Aggiorna un singolo ristorante nello state e nella cache (per optimistic updates) */
  const updateRestaurant = useCallback((id: string, updater: (r: Restaurant) => Restaurant) => {
    const cached = restaurantCache.current.get(id);
    if (cached) restaurantCache.current.set(id, updater(cached));
    setRestaurants(prev => prev.map(r => r.id === id ? updater(r) : r));
  }, []);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (pinDebounceTimer.current) clearTimeout(pinDebounceTimer.current);
    };
  }, []);

  return {
    restaurants,
    /** Pin leggeri caricati per viewport (scalabile) */
    allPins: viewportPins,
    refreshAllPins: refreshPinsAroundUser,
    isLoading,
    userLocation,
    centerOn,
    setCenterOn,
    isLocating,
    isGeoMode,
    locationDenied,
    loadGeo,
    clearAndReload,
    handleRegionChange,
    handleLocateMe,
    resetToUserLocation,
    updateRestaurant,
  };
}
