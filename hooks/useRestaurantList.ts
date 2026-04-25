import { useMemo } from 'react';
import type { Restaurant } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';

type Params = {
  restaurants: Restaurant[];
  activeFilters: RestaurantCategoryId[];
  searchQuery: string;
};

/**
 * Filtra i ristoranti per categoria cucina e ricerca testuale.
 * Il viewport culling è delegato a supercluster (ClusteredMapView).
 */
export function useRestaurantList({ restaurants, activeFilters, searchQuery }: Params) {
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

  return { mapRestaurants };
}
