import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { PG_UNIQUE_VIOLATION, mapRestaurant, type Restaurant } from './restaurant.types';

// ─── Liste (collezioni) di ristoranti ─────────────────────────────────────────
// Modello unificato (vedi migration 069): ogni lista e' una riga in `collections`.
// "Preferiti" e' la lista `is_default` dell'utente; le altre sono liste custom.
// Il cuore/bookmark opera sulla lista di default tramite favoriteService.

export interface Collection {
  id: string;
  user_id: string;
  /** Nome libero (custom). Per la lista di default usare la label localizzata in UI. */
  name: string;
  is_default: boolean;
  /** Emoji opzionale (liste custom). La default ha un simbolo fisso lato app. */
  emoji: string | null;
  visibility: 'private' | 'public';
  slug: string | null;
  position: number;
  created_at: string;
}

/** Lista con il numero di ristoranti salvati (per la schermata elenco liste). */
export interface CollectionWithCount extends Collection {
  item_count: number;
}

// Cache dell'id della lista di default per utente: evita un round-trip ripetuto.
const defaultIdCache = new Map<string, string>();

const LAST_USED_KEY = 'lastUsedCollectionId';

/** Ultima lista in cui l'utente ha salvato (per la pre-selezione del modal). */
export async function getLastUsedCollectionId(): Promise<string | null> {
  try { return await AsyncStorage.getItem(LAST_USED_KEY); }
  catch { return null; }
}
export async function setLastUsedCollectionId(id: string): Promise<void> {
  try { await AsyncStorage.setItem(LAST_USED_KEY, id); } catch { /* best-effort */ }
}

/**
 * Id della lista di default ("Preferiti") dell'utente, creandola se non esiste.
 * Un solo default per utente e' garantito dall'indice unico parziale (069); in
 * caso di corsa, l'insert fallisce con unique-violation e rileggiamo.
 */
export async function getDefaultCollectionId(userId: string): Promise<string> {
  const cached = defaultIdCache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) {
    defaultIdCache.set(userId, data.id);
    return data.id;
  }

  const { data: created, error: insErr } = await supabase
    .from('collections')
    .insert({ user_id: userId, name: 'Preferiti', is_default: true })
    .select('id')
    .single();
  if (!insErr && created?.id) {
    defaultIdCache.set(userId, created.id);
    return created.id;
  }

  if (insErr?.code === PG_UNIQUE_VIOLATION) {
    const { data: again, error: againErr } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    if (againErr) throw againErr;
    defaultIdCache.set(userId, again.id);
    return again.id;
  }
  throw insErr;
}

/**
 * Tutte le liste dell'utente con il conteggio item, default per prima.
 * Niente N+1: un'unica query con il count aggregato dall'embed.
 */
export async function getCollections(userId: string): Promise<CollectionWithCount[]> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*, collection_items(count)')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((c: any) => ({
      ...c,
      item_count: c.collection_items?.[0]?.count ?? 0,
    }));
  } catch (error) {
    console.warn('[CollectionService] Errore getCollections:', error);
    return [];
  }
}

/** Crea una nuova lista custom (non default). Ritorna la lista creata o null. */
export async function createCollection(userId: string, name: string, emoji: string | null = null): Promise<Collection | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name: trimmed, emoji, is_default: false })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[CollectionService] Errore createCollection:', error);
    return null;
  }
}

/** Aggiorna nome e/o emoji di una lista. La default non e' modificabile (guardia). */
export async function updateCollection(
  collectionId: string,
  patch: { name?: string; emoji?: string | null },
): Promise<boolean> {
  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return false;
    fields.name = trimmed;
  }
  if (patch.emoji !== undefined) fields.emoji = patch.emoji;
  if (Object.keys(fields).length === 0) return true;

  const { error } = await supabase
    .from('collections')
    .update(fields)
    .eq('id', collectionId)
    .eq('is_default', false);
  if (error) {
    console.warn('[CollectionService] Errore updateCollection:', error);
    return false;
  }
  return true;
}

/** Elimina una lista (e in cascata i suoi item). La default non e' eliminabile. */
export async function deleteCollection(collectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('is_default', false);
  if (error) {
    console.warn('[CollectionService] Errore deleteCollection:', error);
    return false;
  }
  return true;
}

/** Aggiunge un ristorante a una lista (idempotente: ignora se gia' presente). */
export async function addToCollection(collectionId: string, restaurantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('collection_items')
    .insert({ collection_id: collectionId, restaurant_id: restaurantId });
  if (error && error.code !== PG_UNIQUE_VIOLATION) {
    console.warn('[CollectionService] Errore addToCollection:', error);
    return false;
  }
  return true;
}

/** Rimuove un ristorante da una lista. */
export async function removeFromCollection(collectionId: string, restaurantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('restaurant_id', restaurantId);
  if (error) {
    console.warn('[CollectionService] Errore removeFromCollection:', error);
    return false;
  }
  return true;
}

/**
 * Insieme degli id delle liste dell'utente che contengono un ristorante.
 * Usato dal bottom sheet "Salva in…" per lo stato dei check.
 */
export async function getCollectionIdsForRestaurant(
  userId: string,
  restaurantId: string,
): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('collection_id, collections!inner(user_id)')
      .eq('collections.user_id', userId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
    return new Set((data ?? []).map((row: any) => row.collection_id));
  } catch (error) {
    console.warn('[CollectionService] Errore getCollectionIdsForRestaurant:', error);
    return new Set();
  }
}

/**
 * Per la mappa: ristoranti salvati nelle liste **custom** (esclusa la default,
 * gestita dal cuore/favoriteService) con il simbolo risolto da mostrare come
 * badge sul pin. Una sola query, niente N+1.
 *
 * `symbols`: restaurantId → emoji (string) | null (bookmark = simbolo neutro).
 *   Precedenza quando un ristorante e' in piu' liste: vince l'emoji (prima per
 *   `position`); se nessuna lista ha emoji → null (bookmark).
 * `restaurants`: oggetti Restaurant per renderli sempre visibili sulla mappa
 *   (come i preferiti), anche fuori dal viewport corrente.
 */
export async function getSavedCustomForMap(
  userId: string,
): Promise<{ symbols: Map<string, string | null>; restaurants: Map<string, Restaurant> }> {
  const symbols = new Map<string, string | null>();
  const restaurants = new Map<string, Restaurant>();
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('restaurant_id, restaurant:restaurants(*), collections!inner(user_id, is_default, emoji, position)')
      .eq('collections.user_id', userId)
      .eq('collections.is_default', false);
    if (error) throw error;

    // Risoluzione deterministica della priorita' lato client (PostgREST non
    // ordina le righe padre per una colonna di un embed to-one): vince l'emoji
    // sul bookmark; a parita' di tipo vince la `position` piu' bassa.
    const best = new Map<string, { emoji: string | null; pos: number }>();
    for (const row of (data ?? []) as any[]) {
      const rid: string = row.restaurant_id;
      const emoji: string | null = row.collections?.emoji ?? null;
      const pos: number = row.collections?.position ?? 0;
      const cur = best.get(rid);
      if (!cur) {
        best.set(rid, { emoji, pos });
      } else {
        const curIsEmoji = cur.emoji != null;
        const newIsEmoji = emoji != null;
        if (newIsEmoji && !curIsEmoji) best.set(rid, { emoji, pos });
        else if (newIsEmoji === curIsEmoji && pos < cur.pos) best.set(rid, { emoji, pos });
      }
      if (row.restaurant && !restaurants.has(rid)) {
        restaurants.set(rid, mapRestaurant(row.restaurant));
      }
    }
    for (const [rid, { emoji }] of best) symbols.set(rid, emoji);
  } catch (error) {
    console.warn('[CollectionService] Errore getSavedCustomForMap:', error);
  }
  return { symbols, restaurants };
}

export const CollectionService = {
  getLastUsedCollectionId,
  setLastUsedCollectionId,
  getDefaultCollectionId,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  getCollectionIdsForRestaurant,
  getSavedCustomForMap,
};
