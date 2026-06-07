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
type PositionMap = Map<string, { latitude: number; longitude: number }>;

// Cache in-memory: le posizioni dei ristoranti sono di fatto immutabili, quindi
// non ha senso ricaricarle TUTTE a ogni apertura profilo (oggi era chiamata 2x
// in parallelo al mount, da getMyRestaurants e getCollectionsWithItems). La
// cache (a) deduplica le chiamate concorrenti condividendo la stessa promise e
// (b) evita refetch entro la TTL. Un risultato vuoto (errore o nessun dato) NON
// viene cachato, così il prossimo accesso riprova invece di servire vuoto.
const POSITIONS_TTL_MS = 5 * 60 * 1000;
let positionsCache: { at: number; promise: Promise<PositionMap> } | null = null;

export function fetchRestaurantPositions(): Promise<PositionMap> {
  if (positionsCache && Date.now() - positionsCache.at < POSITIONS_TTL_MS) {
    return positionsCache.promise;
  }
  const promise = loadRestaurantPositions();
  positionsCache = { at: Date.now(), promise };
  promise.then((map) => {
    if (map.size === 0 && positionsCache?.promise === promise) positionsCache = null;
  });
  return promise;
}

async function loadRestaurantPositions(): Promise<PositionMap> {
  const map: PositionMap = new Map();
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
