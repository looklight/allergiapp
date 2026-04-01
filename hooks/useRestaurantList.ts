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
  forMyNeeds: boolean;
};

export function useRestaurantList({
  restaurants,
  userLocation,
  activeFilters,
  searchQuery,
  sortBy,
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
