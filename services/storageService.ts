import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

export interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
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

/**
 * Converte un URI locale in Blob via XMLHttpRequest.
 * Metodo raccomandato da Expo per Firebase Storage su React Native.
 * @see https://github.com/expo/examples/tree/master/with-firebase-storage-upload
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadSingle(localUri: string, storagePath: string): Promise<string> {
  const blob = await uriToBlob(localUri);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Carica un'immagine full + thumbnail in parallelo.
 * Thumbnail: 150px, quality 0.5 (~10-15 KB).
 */
async function uploadWithThumbnail(
  localUri: string,
  fullPath: string,
  thumbPath: string,
  fullMaxWidth: number,
  fullQuality: number,
): Promise<UploadResult> {
  const [fullUri, thumbUri] = await Promise.all([
    compressImage(localUri, fullMaxWidth, fullQuality),
    compressImage(localUri, 150, 0.5),
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
  const compressed = await compressImage(localUri, 800, 0.7);
  return uploadSingle(compressed, `reviews/${restaurantId}/${reviewId}.jpg`);
}

async function uploadDishImage(
  restaurantId: string,
  contributionId: string,
  dishIndex: number,
  localUri: string,
): Promise<UploadResult> {
  const base = `contributions/${restaurantId}/${contributionId}_dish${dishIndex}`;
  return uploadWithThumbnail(localUri, `${base}.jpg`, `${base}_thumb.jpg`, 600, 0.7);
}

async function uploadMenuPhoto(
  restaurantId: string,
  photoId: string,
  localUri: string,
): Promise<UploadResult> {
  const base = `menus/${restaurantId}/${photoId}`;
  return uploadWithThumbnail(localUri, `${base}.jpg`, `${base}_thumb.jpg`, 1200, 0.8);
}

/**
 * Elimina un file da Storage. Non lancia errori se il file non esiste.
 */
async function deleteFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // File già eliminato o non esiste — ignora
  }
}

/**
 * Elimina un'immagine e il suo thumbnail dato l'URL di download.
 * Estrae il path dallo Storage URL.
 */
async function deleteByUrl(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Ignora — file già eliminato o URL non valido
  }
}

/**
 * Elimina immagine full + thumbnail dato l'URL full.
 */
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
  deleteFile,
  deleteByUrl,
  deleteImageWithThumbnail,
};
