import { getFavorites } from './favoriteService';
import { getReviewsByUser } from './reviewService';

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
  my_review_id: string | null;
  /** Estratto recensione mostrato nella card (solo se recensito). */
  my_review_comment: string | null;
  my_review_date: string | null;
  my_review_photos: number;
};

/**
 * Unione preferiti + recensiti dell'utente, deduplicata per ristorante.
 * I due fetch gestiscono già i propri errori (ritornano []), quindi qui niente try/catch.
 */
export async function getMyRestaurants(userId: string): Promise<MyRestaurantItem[]> {
  const [favorites, reviews] = await Promise.all([
    getFavorites(userId),
    getReviewsByUser(userId),
  ]);

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
      location: r.location ?? null,
      is_favorite: true,
      my_rating: null,
      my_review_id: null,
      my_review_comment: null,
      my_review_date: null,
      my_review_photos: 0,
    });
  }

  for (const rev of reviews) {
    const id = rev.restaurant_id;
    const review = {
      my_rating: rev.rating,
      my_review_id: rev.id,
      my_review_comment: rev.comment ?? null,
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
        location: null,
        is_favorite: false,
        ...review,
      });
    }
  }

  return Array.from(byId.values());
}
