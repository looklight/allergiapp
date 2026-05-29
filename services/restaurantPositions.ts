import { supabase } from './supabase';

/**
 * Mappa `restaurant_id → { latitude, longitude }` con coordinate REALI.
 *
 * Le coordinate vere arrivano solo dalle RPC che proiettano `ST_Y/ST_X`
 * (vedi migration 021): il select diretto della colonna GEOGRAPHY torna come
 * WKB non parsabile lato client. Usato per arricchire recensioni/preferiti
 * (che fanno join diretto su `restaurants`) prima di disegnarli sulla mappa profilo.
 *
 * NOTA scalabilità: carica le posizioni di TUTTI i ristoranti. Adeguato all'attuale
 * volume; se il dataset cresce, sostituire con un'RPC che accetta una lista di id.
 */
export async function fetchRestaurantPositions(): Promise<Map<string, { latitude: number; longitude: number }>> {
  const map = new Map<string, { latitude: number; longitude: number }>();
  const { data, error } = await supabase.rpc('get_all_restaurant_positions');
  if (error) {
    console.warn('[restaurantPositions] Errore get_all_restaurant_positions:', error);
    return map;
  }
  for (const row of (data ?? []) as any[]) {
    if (row.latitude != null && row.longitude != null) {
      map.set(row.id as string, { latitude: row.latitude, longitude: row.longitude });
    }
  }
  return map;
}
