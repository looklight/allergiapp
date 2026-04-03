import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'images';

function extractStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

async function deleteStorageFiles(supabase: SupabaseClient, urls: (string | null | undefined)[]): Promise<void> {
  const paths = urls
    .filter((u): u is string => !!u)
    .map(extractStoragePath)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn('[storageCleanup] Errore eliminazione file:', error.message);
}

/**
 * Elimina un ristorante e tutti i file storage associati
 * (foto menu + foto recensioni). Il CASCADE DB gestisce i record.
 */
export async function deleteRestaurantWithCleanup(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<{ error: string | null }> {
  // 1. Recupera tutti gli URL da eliminare PRIMA del DELETE
  const [menuPhotosRes, reviewsRes] = await Promise.all([
    supabase
      .from('menu_photos')
      .select('image_url, thumbnail_url')
      .eq('restaurant_id', restaurantId),
    supabase
      .from('reviews')
      .select('photos')
      .eq('restaurant_id', restaurantId),
  ]);

  // 2. Elimina il ristorante (CASCADE gestisce menu_photos, reviews, reports, favorites)
  const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
  if (error) return { error: error.message };

  // 3. Cleanup storage (best-effort, non blocca se fallisce)
  const storageUrls: string[] = [];

  for (const mp of menuPhotosRes.data ?? []) {
    if (mp.image_url) storageUrls.push(mp.image_url);
    if (mp.thumbnail_url) storageUrls.push(mp.thumbnail_url);
  }
  for (const rv of reviewsRes.data ?? []) {
    for (const p of (rv.photos as { url: string; thumbnailUrl?: string }[]) ?? []) {
      if (p.url) storageUrls.push(p.url);
      if (p.thumbnailUrl) storageUrls.push(p.thumbnailUrl);
    }
  }

  await deleteStorageFiles(supabase, storageUrls);

  return { error: null };
}

/**
 * Elimina una foto del menu e il relativo file storage.
 */
export async function deleteMenuPhotoWithCleanup(
  supabase: SupabaseClient,
  photoId: string,
): Promise<{ error: string | null }> {
  const { data: photo } = await supabase
    .from('menu_photos')
    .select('image_url, thumbnail_url')
    .eq('id', photoId)
    .single();

  const { error } = await supabase.from('menu_photos').delete().eq('id', photoId);
  if (error) return { error: error.message };

  await deleteStorageFiles(supabase, [photo?.image_url, photo?.thumbnail_url]);
  return { error: null };
}

/**
 * Elimina una recensione e i relativi file storage.
 */
/**
 * Rimuove una singola foto da una recensione (aggiorna il JSONB photos).
 */
export async function deleteReviewPhotoWithCleanup(
  supabase: SupabaseClient,
  reviewId: string,
  photoIndex: number,
): Promise<{ error: string | null }> {
  const { data: review } = await supabase
    .from('reviews')
    .select('photos')
    .eq('id', reviewId)
    .single();

  const photos = (review?.photos as { url: string; thumbnailUrl?: string }[]) ?? [];
  if (photoIndex < 0 || photoIndex >= photos.length) return { error: 'Indice foto non valido' };

  const removed = photos[photoIndex];
  const updated = photos.filter((_, i) => i !== photoIndex);

  const { error } = await supabase
    .from('reviews')
    .update({ photos: updated })
    .eq('id', reviewId);
  if (error) return { error: error.message };

  await deleteStorageFiles(supabase, [removed.url, removed.thumbnailUrl]);
  return { error: null };
}

export async function deleteReviewWithCleanup(
  supabase: SupabaseClient,
  reviewId: string,
): Promise<{ error: string | null }> {
  // 1. Recupera le foto PRIMA del DELETE
  const { data: review } = await supabase
    .from('reviews')
    .select('photos')
    .eq('id', reviewId)
    .single();

  // 2. Elimina la recensione
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) return { error: error.message };

  // 3. Cleanup storage (best-effort)
  const urls: string[] = [];
  for (const p of (review?.photos as { url: string; thumbnailUrl?: string }[]) ?? []) {
    if (p.url) urls.push(p.url);
    if (p.thumbnailUrl) urls.push(p.thumbnailUrl);
  }
  await deleteStorageFiles(supabase, urls);

  return { error: null };
}
