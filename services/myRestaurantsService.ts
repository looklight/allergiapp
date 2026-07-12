import { supabase } from './supabase';
import { mapRestaurant, type Restaurant } from './restaurant.types';
import { getFavorites } from './favoriteService';
import { getReviewsByUser } from './reviewService';
import { fetchRestaurantPositionsByIds } from './restaurantPositions';
import { batchLoadStats } from './restaurantService';
import { getFavoriteNotesMap } from './favoriteNoteService';
import type { CollectionWithCount } from './collectionService';

// ─── "I miei ristoranti" (diario privato) ────────────────────────────────────
// Feature isolata: unione preferiti + recensiti dell'utente, deduplicata.
// Versione semplice: nessuna RPC/migration: riusa i due endpoint esistenti
// (getFavorites, getReviewsByUser) e fonde i risultati lato client.
// Rimuovere la feature = cancellare questo file + la schermata my-restaurants.

/** Riga del diario: il minimo che servono lista (e, in futuro, mappa). */
export type MyRestaurantItem = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  /** Coordinate per la futura mappa; oggi disponibili solo se il join le espone. */
  location: { latitude: number; longitude: number } | null;
  is_favorite: boolean;
  my_rating: number | null;
  /** Media di tutte le recensioni del locale (community), distinta da my_rating. */
  average_rating: number | null;
  /** Numero totale di recensioni del locale. */
  review_count: number;
  my_review_id: string | null;
  my_review_date: string | null;
  my_review_photos: number;
  /** Nota personale privata (solo preferiti). Mostrata nella card al posto della recensione. */
  note: string | null;
  /** Faccetta lodging: true = struttura ricettiva (hotel/B&B), false = ristorante.
   *  Usata dal filtro tipo nei profili (Ristoranti/Hotel). */
  offers_lodging: boolean;
};

/**
 * Unione preferiti + recensiti dell'utente, deduplicata per ristorante.
 * I due fetch gestiscono già i propri errori (ritornano []), quindi qui niente try/catch.
 */
export async function getMyRestaurants(userId: string): Promise<MyRestaurantItem[]> {
  const [favorites, reviews, notesMap] = await Promise.all([
    getFavorites(userId),
    getReviewsByUser(userId),
    getFavoriteNotesMap(userId),
  ]);
  // By-ids: solo i preferiti — le recensioni hanno gia' lat/lng da getReviewsByUser.
  const positions = await fetchRestaurantPositionsByIds(
    favorites.map((f) => f.restaurant?.id).filter((id): id is string => id != null),
  );

  const byId = new Map<string, MyRestaurantItem>();

  for (const f of favorites) {
    const r = f.restaurant;
    if (!r) continue;
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      city: r.city,
      country: r.country,
      country_code: r.country_code,
      // Coordinate reali via RPC: il join diretto su restaurants non espone location parsabile.
      location: positions.get(r.id) ?? r.location ?? null,
      is_favorite: true,
      my_rating: null,
      average_rating: null,
      review_count: 0,
      my_review_id: null,
      my_review_date: null,
      my_review_photos: 0,
      note: notesMap.get(r.id) ?? null,
      offers_lodging: r.offers_lodging ?? false,
    });
  }

  for (const rev of reviews) {
    const id = rev.restaurant_id;
    const review = {
      my_rating: rev.rating,
      my_review_id: rev.id,
      my_review_date: rev.created_at,
      my_review_photos: rev.photos?.length ?? 0,
    };
    const existing = byId.get(id);
    if (existing) {
      Object.assign(existing, review);
    } else {
      byId.set(id, {
        id,
        name: rev.restaurant_name ?? '',
        city: rev.restaurant_city ?? null,
        country: rev.restaurant_country ?? null,
        country_code: rev.restaurant_country_code ?? null,
        location: rev.restaurant_lat != null && rev.restaurant_lng != null
          ? { latitude: rev.restaurant_lat, longitude: rev.restaurant_lng }
          : null,
        is_favorite: false,
        average_rating: null,
        review_count: 0,
        // Nota "per posto salvato" (post-069): vale anche per i recensiti, se il
        // posto e' salvato in almeno una lista (la notesMap e' gia' caricata).
        note: notesMap.get(id) ?? null,
        offers_lodging: rev.restaurant_offers_lodging ?? false,
        ...review,
      });
    }
  }

  // Media community + conteggio recensioni in un'unica passata batch (no RPC/migration).
  const ids = Array.from(byId.keys());
  if (ids.length > 0) {
    const statsMap = await batchLoadStats(ids);
    for (const [id, item] of byId) {
      const s = statsMap.get(id);
      item.review_count = s?.review_count ?? 0;
      item.average_rating = s && s.review_count > 0 ? s.total_rating / s.review_count : null;
    }
  }

  return Array.from(byId.values());
}

export type CollectionWithItems = CollectionWithCount & { items: MyRestaurantItem[] };

/** Riga "ristorante salvato in lista" nel formato MyRestaurantItem, con
 *  l'arricchimento (posizione, stats community, nota) risolto dal chiamante. */
function buildSavedItem(
  r: Restaurant,
  positions: Map<string, { latitude: number; longitude: number }>,
  statsMap: Map<string, { review_count: number; total_rating: number }>,
  note: string | null,
): MyRestaurantItem {
  const s = statsMap.get(r.id);
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    country: r.country,
    country_code: r.country_code,
    location: positions.get(r.id) ?? r.location ?? null,
    is_favorite: false,
    my_rating: null,
    average_rating: s && s.review_count > 0 ? s.total_rating / s.review_count : null,
    review_count: s?.review_count ?? 0,
    my_review_id: null,
    my_review_date: null,
    my_review_photos: 0,
    note,
    offers_lodging: r.offers_lodging ?? false,
  };
}

/**
 * TUTTE le liste custom dell'utente con i loro ristoranti, in un'unica passata
 * batch (una query collezioni+item+ristoranti + posizioni/note/stats condivise).
 * Caricata una volta al mount come i preferiti (useUserItemList): selezionare
 * una lista e' istantaneo, niente fetch on-demand, niente spinner. La nota e'
 * "per posto salvato", quindi vale anche qui.
 */
export async function getCollectionsWithItems(userId: string): Promise<CollectionWithItems[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, user_id, name, is_default, emoji, visibility, slug, position, created_at, collection_items(restaurant_id, created_at, restaurant:restaurants(*))')
    .eq('user_id', userId)
    .eq('is_default', false)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[myRestaurantsService] Errore getCollectionsWithItems:', error);
    return [];
  }

  // Arricchimento condiviso (posizioni, note, stats) calcolato UNA volta per
  // l'unione di tutti i ristoranti di tutte le liste.
  const allIds = new Set<string>();
  for (const c of data ?? []) {
    for (const it of (c as any).collection_items ?? []) {
      if (it.restaurant) allIds.add(it.restaurant.id);
    }
  }
  const [positions, notesMap] = await Promise.all([fetchRestaurantPositionsByIds(allIds), getFavoriteNotesMap(userId)]);
  const statsMap = allIds.size > 0 ? await batchLoadStats([...allIds]) : new Map();

  return (data ?? []).map((c: any) => {
    const items: MyRestaurantItem[] = (c.collection_items ?? [])
      .filter((it: any) => it.restaurant)
      .map((it: any) => {
        const r = mapRestaurant(it.restaurant);
        return buildSavedItem(r, positions, statsMap, notesMap.get(r.id) ?? null);
      });
    return { ...c, emoji: c.emoji ?? null, item_count: items.length, items };
  });
}

// ─── Liste pubbliche sul profilo altrui ──────────────────────────────────────
// La RLS (mig 069) espone gia' liste e item con visibility='public' a chiunque;
// il filtro esplicito qui rende la semantica indipendente dal chiamante (anche
// l'owner, passando di qui, vede solo cio' che vedono gli altri).

/** Metadati pill di una lista pubblica altrui (niente visibility/slug: qui e' pubblica per definizione). */
export type PublicCollectionMeta = { id: string; name: string; emoji: string | null; item_count: number };

/**
 * Liste pubbliche NON vuote di un utente, per le pill del suo profilo pubblico.
 * Query leggera (solo meta + conteggio): gli item si caricano al primo tap con
 * getPublicCollectionItems, la maggior parte dei visitatori non le apre.
 */
export async function getPublicCollections(userId: string): Promise<PublicCollectionMeta[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('id, name, emoji, collection_items(count)')
    .eq('user_id', userId)
    .eq('is_default', false)
    .eq('visibility', 'public')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[myRestaurantsService] Errore getPublicCollections:', error);
    return [];
  }
  return (data ?? [])
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji ?? null,
      item_count: c.collection_items?.[0]?.count ?? 0,
    }))
    // Le liste vuote sono rumore per i visitatori: pill nascosta.
    .filter((c) => c.item_count > 0);
}

/**
 * Ristoranti di una lista pubblica altrui nel formato MyRestaurantItem (stessa
 * card/mappa del profilo). Niente note: sono personali dell'owner (e la RLS
 * owner-only non le darebbe comunque).
 */
export async function getPublicCollectionItems(collectionId: string): Promise<MyRestaurantItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('restaurant:restaurants(*), collections!inner(visibility)')
    .eq('collection_id', collectionId)
    .eq('collections.visibility', 'public');
  if (error) {
    console.warn('[myRestaurantsService] Errore getPublicCollectionItems:', error);
    return [];
  }
  const restaurants = (data ?? [])
    .filter((it: any) => it.restaurant)
    .map((it: any) => mapRestaurant(it.restaurant));
  const ids = restaurants.map((r) => r.id);
  const [positions, statsMap] = await Promise.all([
    fetchRestaurantPositionsByIds(ids),
    ids.length > 0 ? batchLoadStats(ids) : Promise.resolve(new Map()),
  ]);
  return restaurants.map((r) => buildSavedItem(r, positions, statsMap, null));
}
