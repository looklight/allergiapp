/**
 * Appiattisce i risultati di un join Supabase, estraendo i campi
 * dalle relazioni annidate e rimuovendo le chiavi di join.
 *
 * Esempio:
 *   flattenJoin(row, {
 *     profiles: { display_name: 'reviewer_name' },
 *     restaurants: { name: 'restaurant_name', city: 'restaurant_city' },
 *   })
 *
 * Trasforma: { ...row, profiles: { display_name: 'Mario' }, restaurants: { name: 'Pizzeria', city: 'Roma' } }
 * In:        { ...row, reviewer_name: 'Mario', restaurant_name: 'Pizzeria', restaurant_city: 'Roma' }
 */
export function flattenJoin<T extends Record<string, any>>(
  row: T,
  mapping: Record<string, Record<string, string>>,
): any {
  const result: any = { ...row };
  for (const [joinKey, fields] of Object.entries(mapping)) {
    const joined = row[joinKey];
    for (const [sourceField, targetField] of Object.entries(fields)) {
      result[targetField] = joined?.[sourceField] ?? null;
    }
    result[joinKey] = undefined;
  }
  return result;
}

/**
 * Applica flattenJoin a un array di righe.
 */
export function flattenJoinAll<T extends Record<string, any>>(
  rows: T[],
  mapping: Record<string, Record<string, string>>,
): any[] {
  return rows.map((row) => flattenJoin(row, mapping));
}

/**
 * Appiattisce i join annidati di un report Supabase.
 * Gestisce il caso speciale reviews.profiles (join a 2 livelli).
 *
 * Usato sia in reports/page.tsx che in restaurants/[id]/page.tsx.
 */
export function flattenReportJoins(row: Record<string, any>, includeRestaurant = false): any {
  const result: any = {
    ...row,
    reporter_name: row.profiles?.display_name ?? null,
    reporter_is_anonymous: row.profiles?.is_anonymous ?? null,
    menu_photo_thumbnail_url: row.menu_photos?.thumbnail_url ?? null,
    menu_photo_image_url: row.menu_photos?.image_url ?? null,
    review_comment: row.reviews?.comment ?? null,
    review_rating: row.reviews?.rating ?? null,
    review_reviewer_name: row.reviews?.profiles?.display_name ?? null,
    profiles: undefined,
    menu_photos: undefined,
    reviews: undefined,
  };
  if (includeRestaurant) {
    result.restaurant_name = row.restaurants?.name ?? null;
    result.restaurant_city = row.restaurants?.city ?? null;
    result.restaurants = undefined;
  }
  return result;
}
