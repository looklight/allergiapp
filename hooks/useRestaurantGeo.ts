import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { RestaurantService, type Restaurant } from '../services/restaurantService';
import { haversineKm } from '../utils/geo';

export type LatLng = { latitude: number; longitude: number };
export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };
export type CenterOn = LatLng & { sheetFraction: number };

type FilterParams = {
  forMyNeeds: boolean;
  filterAllergens: string[];
  filterDiets: string[];
  /** Frazione corrente dello sheet (usata per calcolare l'offset camera) */
  getSheetFraction: () => number;
};

export function useRestaurantGeo(params: FilterParams) {
  const { forMyNeeds, filterAllergens, filterDiets, getSheetFraction } = params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [centerOn, setCenterOn] = useState<CenterOn | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [isGeoMode, setIsGeoMode] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [isAreaSearch, setIsAreaSearch] = useState(false);

  const lastQueryCenter = useRef<LatLng | null>(null);
  const lastQueryRadius = useRef(50);
  const hasLoadedGeo = useRef(false);

  const loadGeo = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const RADIUS = 50;
    const results = await RestaurantService.getNearbyRestaurants(lat, lng, RADIUS);
    setRestaurants(results);
    lastQueryCenter.current = { latitude: lat, longitude: lng };
    lastQueryRadius.current = RADIUS;
    setIsGeoMode(results.length > 0);
    setIsLoading(false);
  }, []);

  const loadAll = useCallback(() => {
    setRestaurants([]);
    setIsGeoMode(false);
    setIsLoading(false);
  }, []);

  const loadForMyNeeds = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const results = await RestaurantService.getRestaurantsForMyNeeds(
      lat, lng, filterAllergens, filterDiets, 50,
    );
    setRestaurants(results);
    lastQueryCenter.current = { latitude: lat, longitude: lng };
    lastQueryRadius.current = 50;
    setIsGeoMode(true);
    setIsLoading(false);
  }, [filterAllergens, filterDiets]);

  // Al mount, centra la mappa sulla posizione dell'utente
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        setCenterOn({ ...coords, sheetFraction: getSheetFraction() });
      } catch {
        // GPS non disponibile
      }
    })();
  }, []);

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

  const handleRegionChange = useCallback((region: MapRegion) => {
    setMapRegion(region);
    if (lastQueryCenter.current) {
      const dist = haversineKm(
        lastQueryCenter.current.latitude, lastQueryCenter.current.longitude,
        region.latitude, region.longitude,
      );
      const viewportRadiusKm = (region.latitudeDelta * 111) / 2;
      setShowSearchArea(dist > lastQueryRadius.current * 0.7 && viewportRadiusKm >= 2 && viewportRadiusKm <= 500);
    }
  }, []);

  const handleSearchArea = useCallback(async () => {
    if (!mapRegion) return;
    const radiusKm = Math.max(1, Math.min(500, (mapRegion.latitudeDelta * 111) / 2));
    setIsLoading(true);
    setShowSearchArea(false);
    setIsAreaSearch(true);
    const results = forMyNeeds
      ? await RestaurantService.getRestaurantsForMyNeeds(
          mapRegion.latitude, mapRegion.longitude,
          filterAllergens, filterDiets, radiusKm,
        )
      : await RestaurantService.getNearbyRestaurants(
          mapRegion.latitude, mapRegion.longitude, radiusKm,
        );
    setRestaurants(results);
    lastQueryCenter.current = { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
    lastQueryRadius.current = radiusKm;
    setIsGeoMode(true);
    setIsLoading(false);
  }, [mapRegion, forMyNeeds, filterAllergens, filterDiets]);

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setIsLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setCenterOn({ ...coords, sheetFraction: getSheetFraction() });
      setIsAreaSearch(false);
      setShowSearchArea(false);
      await loadGeo(coords.latitude, coords.longitude);
    } catch {
      // GPS non disponibile
    }
    setIsLocating(false);
  }, [loadGeo, getSheetFraction]);

  /** Geocode una query di ricerca. Ritorna true se trovato, false altrimenti. */
  const searchByCity = useCallback(async (query: string): Promise<boolean> => {
    if (query.length < 2) return false;
    try {
      const results = await Location.geocodeAsync(query);
      if (results.length === 0) return false;
      const { latitude, longitude } = results[0];
      setCenterOn({ latitude, longitude, sheetFraction: getSheetFraction() });
      setIsAreaSearch(true);
      setShowSearchArea(false);
      setIsLoading(true);
      const nearby = await RestaurantService.getNearbyRestaurants(latitude, longitude, 50);
      setRestaurants(nearby);
      lastQueryCenter.current = { latitude, longitude };
      lastQueryRadius.current = 50;
      setIsGeoMode(true);
      setIsLoading(false);
      return true;
    } catch {
      return false;
    }
  }, [getSheetFraction]);

  /** Resetta la vista alla posizione utente */
  const resetToUserLocation = useCallback(() => {
    setIsAreaSearch(false);
    if (userLocation) {
      setCenterOn({ ...userLocation, sheetFraction: getSheetFraction() });
      loadGeo(userLocation.latitude, userLocation.longitude);
    } else {
      setCenterOn(null);
    }
  }, [userLocation, loadGeo, getSheetFraction]);

  /** Aggiorna un singolo ristorante nello state (per optimistic updates) */
  const updateRestaurant = useCallback((id: string, updater: (r: Restaurant) => Restaurant) => {
    setRestaurants(prev => prev.map(r => r.id === id ? updater(r) : r));
  }, []);

  return {
    restaurants,
    isLoading,
    userLocation,
    centerOn,
    isLocating,
    isGeoMode,
    isAreaSearch,
    showSearchArea,
    loadGeo,
    loadAll,
    loadForMyNeeds,
    handleRegionChange,
    handleSearchArea,
    handleLocateMe,
    searchByCity,
    resetToUserLocation,
    updateRestaurant,
  };
}
