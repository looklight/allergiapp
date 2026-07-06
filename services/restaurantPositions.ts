import { supabase } from './supabase';

/**
 * Mappa `restaurant_id → { latitude, longitude }` con coordinate REALI.
 *
 * Le coordinate vere arrivano solo dalle RPC che proiettano `ST_Y/ST_X`
 * (vedi migration 021): il select diretto della colonna GEOGRAPHY torna come
 * WKB non parsabile lato client. Usato per arricchire recensioni/preferiti
 * (che fanno join diretto su `restaurants`) prima di disegnarli sulla mappa profilo.
 *
 * Si chiede SOLO gli id che servono (RPC by-ids, migration 072): la vecchia
 * get_all_restaurant_positions caricava tutti i ristoranti, ma PostgREST tronca
 * ogni risposta a 1000 righe (vale anche per le RPC) — superati i 1000 ristoranti
 * tornava un sottoinsieme arbitrario e i pin esclusi sparivano dalla mappa profilo.
 */
type Position = { latitude: number; longitude: number };
type PositionMap = Map<string, Position>;

// Le posizioni sono di fatto immutabili: una volta lette restano valide per
// tutta la sessione. Cache accumulativa per id — si interroga il DB solo per
// gli id non ancora noti (i reload del profilo a regime costano zero query).
const knownPositions: PositionMap = new Map();

// Margine ampio sotto il tetto PostgREST di 1000 righe per risposta.
const CHUNK_SIZE = 500;

export async function fetchRestaurantPositionsByIds(ids: Iterable<string>): Promise<PositionMap> {
  const wanted = [...new Set(ids)];
  const missing = wanted.filter((id) => !knownPositions.has(id));

  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.rpc('get_restaurant_positions_by_ids', { p_ids: chunk });
    if (error) {
      // Gli id non risolti restano semplicemente senza pin; niente cache del fallimento,
      // il prossimo accesso riprova.
      console.warn('[restaurantPositions] Errore get_restaurant_positions_by_ids:', error);
      break;
    }
    for (const row of (data ?? []) as any[]) {
      if (row.latitude != null && row.longitude != null) {
        knownPositions.set(row.id as string, { latitude: row.latitude, longitude: row.longitude });
      }
    }
  }

  const map: PositionMap = new Map();
  for (const id of wanted) {
    const pos = knownPositions.get(id);
    if (pos) map.set(id, pos);
  }
  return map;
}
