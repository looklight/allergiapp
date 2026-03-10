import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
}

// Bucket Supabase Storage (Public per lettura, RLS per scrittura/cancellazione)
const BUCKET = 'images';

// Presets compressione immagini: { maxWidth, quality }
const IMAGE_PRESETS = {
  thumbnail: { width: 150, quality: 0.5 },
  dish:      { width: 600, quality: 0.7 },
  review:    { width: 800, quality: 0.7 },
  menu:      { width: 1200, quality: 0.8 },
} as const;

async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Utente non autenticato');
  return session.user.id;
}

async function compressImage(
  uri: string,
  maxWidth: number,
  quality: number,
): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return manipulated.uri;
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

async function uploadSingle(localUri: string, storagePath: string): Promise<string> {
  const buffer = await uriToArrayBuffer(localUri);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function uploadWithThumbnail(
  localUri: string,
  fullPath: string,
  thumbPath: string,
  fullMaxWidth: number,
  fullQuality: number,
): Promise<UploadResult> {
  const [fullUri, thumbUri] = await Promise.all([
    compressImage(localUri, fullMaxWidth, fullQuality),
    compressImage(localUri, IMAGE_PRESETS.thumbnail.width, IMAGE_PRESETS.thumbnail.quality),
  ]);
  const [imageUrl, thumbnailUrl] = await Promise.all([
    uploadSingle(fullUri, fullPath),
    uploadSingle(thumbUri, thumbPath),
  ]);
  return { imageUrl, thumbnailUrl };
}

async function uploadReviewImage(
  restaurantId: string,
  reviewId: string,
  localUri: string,
): Promise<string> {
  const userId = await getCurrentUserId();
  const compressed = await compressImage(localUri, IMAGE_PRESETS.review.width, IMAGE_PRESETS.review.quality);
  return uploadSingle(compressed, `${userId}/reviews/${restaurantId}/${reviewId}.jpg`);
}

async function uploadDishImage(
  restaurantId: string,
  reviewId: string,
  dishIndex: number,
  localUri: string,
): Promise<UploadResult> {
  const userId = await getCurrentUserId();
  const base = `${userId}/dishes/${restaurantId}/${reviewId}_dish${dishIndex}`;
  return uploadWithThumbnail(localUri, `${base}.jpg`, `${base}_thumb.jpg`, IMAGE_PRESETS.dish.width, IMAGE_PRESETS.dish.quality);
}

async function uploadMenuPhoto(
  restaurantId: string,
  photoId: string,
  localUri: string,
): Promise<UploadResult> {
  const userId = await getCurrentUserId();
  const base = `${userId}/menus/${restaurantId}/${photoId}`;
  return uploadWithThumbnail(localUri, `${base}.jpg`, `${base}_thumb.jpg`, IMAGE_PRESETS.menu.width, IMAGE_PRESETS.menu.quality);
}

async function deleteByUrl(url: string): Promise<void> {
  // Estrai il path dal public URL: .../storage/v1/object/public/images/PATH
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (!match) return;
  const { error } = await supabase.storage.from(BUCKET).remove([match[1]]);
  if (error) console.warn('[Storage] Errore eliminazione:', error.message);
}

async function deleteImageWithThumbnail(imageUrl: string, thumbnailUrl?: string): Promise<void> {
  const promises: Promise<void>[] = [deleteByUrl(imageUrl)];
  if (thumbnailUrl) {
    promises.push(deleteByUrl(thumbnailUrl));
  }
  await Promise.all(promises);
}

export const StorageService = {
  uploadReviewImage,
  uploadDishImage,
  uploadMenuPhoto,
  deleteByUrl,
  deleteImageWithThumbnail,
};
