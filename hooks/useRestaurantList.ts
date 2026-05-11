import { useMemo } from 'react';
import type { Restaurant } from '../services/restaurantService';
import type { RestaurantCategoryId } from '../types';

type Params = {
  restaurants: Restaurant[];
  activeFilters: RestaurantCategoryId[];
  minRating: number | null;
};

/**
 * Filtra i ristoranti per categoria cucina e valutazione minima.
 * La ricerca testuale è gestita dall'autocomplete (useMapSearch) — filtrare anche
 * la mappa per testo causerebbe pin "fantasma": allPins copre il viewport con dati
 * leggeri privi di name/city, quindi il filtro testuale riduce solo geo.restaurants,
 * lasciando i pin nel viewport senza match di dati → renderizzati come placeholder
 * grigi. Il viewport culling è delegato a supercluster (ClusteredMapView).
 *
 * Nota su minRating: i pin leggeri (allPins) non includono average_rating/review_count,
 * quindi il filtro per valutazione si applica solo a `mapRestaurants` (lista completa
 * con stats) e a `filteredNearbyResults` nel parent. I pin sulla mappa restano visibili
 * per coerenza con il filtro cucina, dove allPins viene comunque filtrato via cuisine_types.
 */
export function useRestaurantList({ restaurants, activeFilters, minRating }: Params) {
  const mapRestaurants = useMemo(() => {
    let out = restaurants;
    if (activeFilters.length > 0) {
      out = out.filter(r =>
        r.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
      );
    }
    if (minRating !== null) {
      out = out.filter(r => (r.average_rating ?? 0) >= minRating);
    }
    return out;
  }, [restaurants, activeFilters, minRating]);

  return { mapRestaurants };
}
