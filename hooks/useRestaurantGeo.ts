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
const CACHE_MAX_SIZE = 500;
const OVERLAP_MARGIN = 0.7; // 30% overlap: fetch solo se centro fuori dal 70% del raggio

export function useRestaurantGeo(params: FilterParams) {
  const { forMyNeeds, filterAllergens, filterDiets, getSheetFraction } = params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allPins, setAllPins] = useState<RestaurantPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [centerOn, setCenterOn] = useState<CenterOn | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [isGeoMode, setIsGeoMode] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // ---- Cache accumulativa ----
  const restaurantCache = useRef<Map<string, Restaurant>>(new Map());
  const fetchedAreas = useRef<FetchedArea[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedGeo = useRef(false);
  const isFetching = useRef(false);

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

  /** Merge risultati nella cache. Sovrascrive se il nuovo record ha distance_km (più fresco). */
  const mergeIntoCache = useCallback((results: Restaurant[]) => {
    for (const r of results) {
      const existing = restaurantCache.current.get(r.id);
      if (!existing || r.distance_km != null) {
        restaurantCache.current.set(r.id, r);
      }
    }
  }, []);

  /** Evict ristoranti più lontani dal centro corrente.
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

  /** Controlla se un centro è coperto da aree già fetchate */
  const isCovered = useCallback((center: LatLng): boolean => {
    return fetchedAreas.current.some(area => {
      const dist = haversineKm(
        area.center.latitude, area.center.longitude,
        center.latitude, center.longitude,
      );
      return dist < area.radiusKm * OVERLAP_MARGIN;
    });
  }, []);

  /** Fetch generico: chiama la RPC appropriata, merge nella cache */
  const fetchArea = useCallback(async (center: LatLng, radiusKm: number) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const results = forMyNeedsRef.current
        ? await RestaurantService.getRestaurantsForMyNeeds(
            center.latitude, center.longitude,
            filterAllergensRef.current, filterDietsRef.current, radiusKm,
          )
        : await RestaurantService.getNearbyRestaurants(center.latitude, center.longitude, radiusKm);

      mergeIntoCache(results);
      fetchedAreas.current.push({ center, radiusKm });
      evictDistant(center);
      syncState();
    } finally {
      isFetching.current = false;
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

  const loadAll = useCallback(() => {
    setRestaurants([]);
    setIsGeoMode(false);
    setIsLoading(false);
  }, []);

  const loadForMyNeeds = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const center = { latitude: lat, longitude: lng };
    await fetchArea(center, 50);
    setIsGeoMode(true);
    setIsLoading(false);
  }, [fetchArea]);

  /** Svuota cache e ricarica (usato quando si toggl forMyNeeds) */
  const clearAndReload = useCallback(async () => {
    restaurantCache.current.clear();
    fetchedAreas.current = [];
    setRestaurants([]);
    if (userLocation) {
      setIsLoading(true);
      await fetchArea(userLocation, 50);
      setIsGeoMode(true);
      setIsLoading(false);
    }
  }, [userLocation, fetchArea]);

  // Al mount, centra la mappa sulla posizione dell'utente
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationDenied(true);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        setCenterOn({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
      } catch {
        // GPS non disponibile
      }
    })();
  }, []);

  // Fetch leggero di tutte le posizioni — usato per i pallini a zoom lontano
  const refreshAllPins = useCallback(() => {
    RestaurantService.getAllPositions().then(setAllPins);
  }, []);

  useEffect(() => { refreshAllPins(); }, [refreshAllPins]);

  // Carica ristoranti al primo GPS fix (rispetta forMyNeeds da storage restore)
  useEffect(() => {
    if (userLocation && !hasLoadedGeo.current) {
      hasLoadedGeo.current = true;
      if (forMyNeeds && filterAllergens.length > 0) {
        loadForMyNeeds(userLocation.latitude, userLocation.longitude);
      } else {
        loadGeo(userLocation.latitude, userLocation.longitude);
      }
    }
  }, [userLocation, forMyNeeds, filterAllergens, loadGeo, loadForMyNeeds]);

  // Fallback: se dopo 3s non c'è GPS, ferma il loading e mostra lista vuota
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
    setMapRegion(region);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const center = { latitude: region.latitude, longitude: region.longitude };

      if (isCovered(center)) return;

      // Raggio basato sul viewport, min 3km max 50km
      const radiusKm = Math.max(3, Math.min(50, (region.latitudeDelta * 111) / 2));
      await fetchArea(center, radiusKm);
    }, AUTO_FETCH_DEBOUNCE);
  }, [isCovered, fetchArea]);

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setIsLocating(false);
        return;
      }
      setLocationDenied(false);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setCenterOn({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
      await loadGeo(coords.latitude, coords.longitude);
    } catch {
      // GPS non disponibile
    }
    setIsLocating(false);
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

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    restaurants,
    allPins,
    refreshAllPins,
    isLoading,
    userLocation,
    centerOn,
    setCenterOn,
    isLocating,
    isGeoMode,
    mapRegion,
    locationDenied,
    loadGeo,
    loadAll,
    loadForMyNeeds,
    clearAndReload,
    handleRegionChange,
    handleLocateMe,
    resetToUserLocation,
    updateRestaurant,
  };
}
