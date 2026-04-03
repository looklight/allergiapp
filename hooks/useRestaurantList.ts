import { useMemo, useCallback } from 'react';
import type { Restaurant, SortBy } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';
import { haversineKm } from '../utils/geo';

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Params = {
  restaurants: Restaurant[];
  userLocation: { latitude: number; longitude: number } | null;
  activeFilters: RestaurantCategoryId[];
  searchQuery: string;
  sortBy: SortBy;
  forMyNeeds: boolean;
  mapRegion?: MapRegion | null;
};

export function useRestaurantList({
  restaurants,
  userLocation,
  activeFilters,
  searchQuery,
  sortBy,
  forMyNeeds,
  mapRegion,
}: Params) {
  /** Ristoranti filtrati per viewport mappa, ricerca e categorie */
  const mapRestaurants = useMemo(() => {
    let list = restaurants;
    // Filtra per viewport mappa (con margine 50%) — la lista mostra solo
    // i ristoranti coerenti con l'area visualizzata sulla mappa
    if (mapRegion) {
      const latMargin = mapRegion.latitudeDelta * 0.5;
      const lngMargin = mapRegion.longitudeDelta * 0.5;
      const minLat = mapRegion.latitude - mapRegion.latitudeDelta / 2 - latMargin;
      const maxLat = mapRegion.latitude + mapRegion.latitudeDelta / 2 + latMargin;
      const minLng = mapRegion.longitude - mapRegion.longitudeDelta / 2 - lngMargin;
      const maxLng = mapRegion.longitude + mapRegion.longitudeDelta / 2 + lngMargin;
      list = list.filter(r => {
        if (!r.location) return false;
        const { latitude, longitude } = r.location;
        return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng;
      });
    }
    if (activeFilters.length > 0) {
      list = list.filter(r =>
        r.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
      );
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [restaurants, searchQuery, activeFilters, mapRegion]);

  /** Distanza per ristorante: sempre dalla posizione utente (haversine).
   *  Il distance_km del server è relativo al centro del fetch (mappa), non all'utente. */
  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!userLocation) return map;
    for (const r of mapRestaurants) {
      if (r.location) {
        map.set(r.id, haversineKm(userLocation.latitude, userLocation.longitude, r.location.latitude, r.location.longitude));
      }
    }
    return map;
  }, [mapRestaurants, userLocation]);

  const compareMyNeeds = useCallback((a: Restaurant, b: Restaurant) => {
    const aCov = (a.covered_allergen_count ?? 0) + (a.covered_dietary_count ?? 0);
    const bCov = (b.covered_allergen_count ?? 0) + (b.covered_dietary_count ?? 0);
    if (bCov !== aCov) return bCov - aCov;
    const aMatch = a.matching_reviews ?? 0;
    const bMatch = b.matching_reviews ?? 0;
    if (bMatch !== aMatch) return bMatch - aMatch;
    return (distanceMap.get(a.id) ?? 999) - (distanceMap.get(b.id) ?? 999);
  }, [distanceMap]);

  /** Lista finale ordinata (il cap marker è gestito dalla logica zoom in RestaurantMap) */
  const filteredRestaurants = useMemo(() => {
    let list = mapRestaurants;

    if (forMyNeeds) {
      list = [...list].sort(compareMyNeeds);
    } else if (sortBy === 'distance' && userLocation) {
      list = [...list].sort((a, b) =>
        (distanceMap.get(a.id) ?? Infinity) - (distanceMap.get(b.id) ?? Infinity)
      );
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    }

    return list;
  }, [mapRestaurants, distanceMap, sortBy, userLocation, forMyNeeds, compareMyNeeds]);

  return { mapRestaurants, distanceMap, filteredRestaurants };
}
