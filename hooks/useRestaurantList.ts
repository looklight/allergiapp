import { useMemo, useCallback } from 'react';
import type { Restaurant, SortBy } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';
import { haversineKm } from '../utils/geo';

type Params = {
  restaurants: Restaurant[];
  userLocation: { latitude: number; longitude: number } | null;
  activeFilters: RestaurantCategoryId[];
  searchQuery: string;
  sortBy: SortBy;
  isAreaSearch: boolean;
  forMyNeeds: boolean;
};

export function useRestaurantList({
  restaurants,
  userLocation,
  activeFilters,
  searchQuery,
  sortBy,
  isAreaSearch,
  forMyNeeds,
}: Params) {
  /** Ristoranti filtrati per ricerca e categorie (usati anche per i pin mappa) */
  const mapRestaurants = useMemo(() => {
    let list = restaurants;
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
  }, [restaurants, searchQuery, activeFilters]);

  /** Distanza per ristorante: PostGIS se disponibile, altrimenti haversine */
  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of mapRestaurants) {
      if (r.distance_km != null) {
        map.set(r.id, r.distance_km);
      } else if (userLocation && r.location) {
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
    return (a.distance_km ?? 999) - (b.distance_km ?? 999);
  }, []);

  /** Lista finale ordinata e con cap progressivo */
  const filteredRestaurants = useMemo(() => {
    let list = mapRestaurants;

    // Ordinamento
    if (forMyNeeds) {
      list = [...list].sort(compareMyNeeds);
    } else if (sortBy === 'distance' && userLocation) {
      list = [...list].sort((a, b) =>
        (distanceMap.get(a.id) ?? Infinity) - (distanceMap.get(b.id) ?? Infinity)
      );
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    }

    // Cap progressivo per distanza reale (solo caricamento iniziale, non "Cerca in quest'area")
    if (!isAreaSearch && userLocation && list.length > 0) {
      const withDist = list
        .filter(r => distanceMap.has(r.id))
        .map(r => ({ r, d: distanceMap.get(r.id)! }));
      withDist.sort((a, b) => a.d - b.d);
      const capped: Restaurant[] = [];
      for (const { r, d } of withDist) {
        if (d <= 10) { capped.push(r); continue; }
        if (d <= 30 && capped.length < 50) { capped.push(r); continue; }
        if (d <= 50 && capped.length < 15) { capped.push(r); continue; }
        if (capped.length < 5) { capped.push(r); continue; }
      }
      const noLocation = list.filter(r => !distanceMap.has(r.id));
      const allCapped = [...capped, ...noLocation];
      if (forMyNeeds) {
        list = allCapped.sort(compareMyNeeds);
      } else if (sortBy === 'distance') {
        list = allCapped;
      } else if (sortBy === 'rating') {
        list = allCapped.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
      } else {
        list = allCapped;
      }
    }

    return list;
  }, [mapRestaurants, distanceMap, sortBy, userLocation, isAreaSearch, forMyNeeds, compareMyNeeds]);

  return { mapRestaurants, distanceMap, filteredRestaurants };
}
