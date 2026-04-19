import { useMemo } from 'react';
import type { Restaurant } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';

type Params = {
  restaurants: Restaurant[];
  activeFilters: RestaurantCategoryId[];
};

/**
 * Filtra i ristoranti per categoria cucina.
 * La ricerca testuale è gestita dall'autocomplete (useMapSearch) — filtrare anche
 * la mappa per testo causerebbe pin "fantasma": allPins copre il viewport con dati
 * leggeri privi di name/city, quindi il filtro testuale riduce solo geo.restaurants,
 * lasciando i pin nel viewport senza match di dati → renderizzati come placeholder
 * grigi. Il viewport culling è delegato a supercluster (ClusteredMapView).
 */
export function useRestaurantList({ restaurants, activeFilters }: Params) {
  const mapRestaurants = useMemo(() => {
    if (activeFilters.length === 0) return restaurants;
    return restaurants.filter(r =>
      r.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
    );
  }, [restaurants, activeFilters]);

  return { mapRestaurants };
}
