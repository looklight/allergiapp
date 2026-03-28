import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { StorageService } from './storageService';
import type { MenuPhoto } from './restaurant.types';

// ─── Menu URL ───────────────────────────────────────────────────────────────

export async function updateMenuUrl(
  restaurantId: string,
  menuUrl: string | null,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_restaurant_menu_url', {
      p_restaurant_id: restaurantId,
      p_menu_url: menuUrl,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[MenuService] Errore updateMenuUrl:', error);
    return false;
  }
}

// ─── Menu Photos ────────────────────────────────────────────────────────────

export async function getMenuPhotos(restaurantId: string): Promise<MenuPhoto[]> {
  const { data, error } = await supabase
    .from('menu_photos')
    .select(`*, profile:profiles!user_id(display_name, is_anonymous)`)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    user_display_name: p.profile?.is_anonymous ? null : (p.profile?.display_name ?? null),
    profile: undefined,
  }));
}

export async function addMenuPhoto(
  restaurantId: string,
  localUri: string,
  userId: string,
): Promise<MenuPhoto | null> {
  try {
    // Genera un ID temporaneo per il path di upload
    const tempId = Crypto.randomUUID();
    const { imageUrl, thumbnailUrl } = await StorageService.uploadMenuPhoto(restaurantId, tempId, localUri);

    const { data, error } = await supabase
      .from('menu_photos')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();
    if (error) {
      StorageService.deleteImageWithThumbnail(imageUrl, thumbnailUrl).catch(() => {});
      throw error;
    }
    return data;
  } catch (error) {
    console.warn('[MenuService] Errore addMenuPhoto:', error);
    return null;
  }
}

export async function deleteMenuPhoto(
  restaurantId: string,
  photoId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Recupera per verificare ownership e ottenere URL
    const { data: photo } = await supabase
      .from('menu_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();
    if (!photo) return false;

    const { error } = await supabase
      .from('menu_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);
    if (error) throw error;

    // Elimina immagini (best-effort)
    StorageService.deleteImageWithThumbnail(photo.image_url, photo.thumbnail_url).catch(() => {});
    return true;
  } catch (error) {
    console.warn('[MenuService] Errore deleteMenuPhoto:', error);
    return false;
  }
}

export const MenuService = {
  updateMenuUrl,
  getMenuPhotos,
  addMenuPhoto,
  deleteMenuPhoto,
};
