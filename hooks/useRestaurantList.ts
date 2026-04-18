import { useMemo } from 'react';
import type { Restaurant } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Params = {
  restaurants: Restaurant[];
  activeFilters: RestaurantCategoryId[];
  searchQuery: string;
  mapRegion?: MapRegion | null;
};

/**
 * Filtra i ristoranti per viewport mappa, categorie cucina e ricerca testuale.
 * L'ordinamento è gestito a valle (NearbyListSheet per il pannello, RestaurantMap ignora l'ordine).
 */
export function useRestaurantList({ restaurants, activeFilters, searchQuery, mapRegion }: Params) {
  const mapRestaurants = useMemo(() => {
    let list = restaurants;

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

  return { mapRestaurants };
}
