import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type Options = {
  /** Numero massimo di foto selezionabili (default: 1) */
  maxPhotos?: number;
  /** Qualità immagine 0-1 (default: 0.8) */
  quality?: number;
  /** Consenti selezione multipla dalla gallery (default: false) */
  allowsMultipleSelection?: boolean;
  /** Aspect ratio per il crop dalla camera (default: nessuno) */
  cameraAspect?: [number, number];
};

type PickResult = {
  uris: string[];
  cancelled: boolean;
};

export function useImagePicker(options: Options = {}) {
  const {
    maxPhotos = 1,
    quality = 0.8,
    allowsMultipleSelection = false,
    cameraAspect,
  } = options;

  const [photos, setPhotos] = useState<string[]>([]);

  const remaining = maxPhotos - photos.length;

  const pickFromGallery = useCallback(async (): Promise<PickResult> => {
    if (remaining <= 0) return { uris: [], cancelled: true };
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality,
      allowsMultipleSelection,
      selectionLimit: remaining,
      exif: false,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || result.assets.length === 0) {
      return { uris: [], cancelled: true };
    }
    const uris = result.assets.map(a => a.uri);
    setPhotos(prev => [...prev, ...uris].slice(0, maxPhotos));
    return { uris, cancelled: false };
  }, [remaining, quality, allowsMultipleSelection, maxPhotos]);

  const takePhoto = useCallback(async (): Promise<PickResult> => {
    if (remaining <= 0) return { uris: [], cancelled: true };
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'Consenti l\'accesso alla fotocamera per scattare foto.');
      return { uris: [], cancelled: true };
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality,
      allowsEditing: !!cameraAspect,
      aspect: cameraAspect,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) {
      return { uris: [], cancelled: true };
    }
    const uri = result.assets[0].uri;
    setPhotos(prev => [...prev, uri]);
    return { uris: [uri], cancelled: false };
  }, [remaining, quality, cameraAspect]);

  const showPickerAlert = useCallback(() => {
    if (remaining <= 0) return;
    Alert.alert('Aggiungi foto', undefined, [
      { text: 'Galleria', onPress: pickFromGallery },
      { text: 'Fotocamera', onPress: takePhoto },
      { text: 'Annulla', style: 'cancel' },
    ]);
  }, [remaining, pickFromGallery, takePhoto]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetPhotos = useCallback((initial?: string[]) => {
    setPhotos(initial ?? []);
  }, []);

  return {
    photos,
    remaining,
    pickFromGallery,
    takePhoto,
    showPickerAlert,
    removePhoto,
    resetPhotos,
  };
}
