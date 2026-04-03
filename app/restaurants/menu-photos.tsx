import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import { useImagePicker } from '../../hooks/useImagePicker';
import HeaderBar from '../../components/HeaderBar';
import ImageFullscreenModal from '../../components/ImageFullscreenModal';
import i18n from '../../utils/i18n';
import type { MenuPhoto } from '../../services/restaurantService';

const THUMB_SIZE = 72;

export default function MenuPhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { restaurantId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName?: string;
  }>();

  const [photos, setPhotos] = useState<MenuPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportedPhotoIds, setReportedPhotoIds] = useState<Set<string>>(new Set());
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await RestaurantService.getMenuPhotos(restaurantId);
      setPhotos(data);
    } catch {
      Alert.alert('Errore', 'Impossibile caricare le foto del menu.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const { pickFromGallery, takePhoto, resetPhotos } = useImagePicker({ maxPhotos: 1 });

  const handleAddPhoto = async () => {
    Alert.alert('Aggiungi foto', undefined, [
      { text: 'Galleria', onPress: async () => {
        const result = await pickFromGallery();
        if (!result.cancelled && result.uris[0]) await uploadPhoto(result.uris[0]);
      }},
      { text: 'Fotocamera', onPress: async () => {
        const result = await takePhoto();
        if (!result.cancelled && result.uris[0]) await uploadPhoto(result.uris[0]);
      }},
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string) => {
    if (!restaurantId || !user) return;
    setIsUploading(true);
    const photo = await RestaurantService.addMenuPhoto(restaurantId, uri, user.uid);
    if (photo) {
      setPhotos(prev => [photo, ...prev]);
      resetPhotos();
    } else {
      Alert.alert('Errore', 'Impossibile caricare la foto. Riprova.');
    }
    setIsUploading(false);
  };

  const handleReport = (photo: MenuPhoto) => {
    if (reportedPhotoIds.has(photo.id)) {
      Alert.alert('Segnalazione inviata', 'Hai già segnalato questa foto. La esamineremo al più presto.');
      return;
    }
    Alert.alert(
      'Segnala foto',
      'Perché vuoi segnalare questa foto?',
      [
        {
          text: 'Non è un menu / non pertinente',
          onPress: () => submitReport(photo, 'incorrect_image'),
        },
        {
          text: 'Contenuto inappropriato',
          onPress: () => submitReport(photo, 'inappropriate'),
        },
        {
          text: 'Altro',
          onPress: () => submitReport(photo, 'other'),
        },
        { text: 'Annulla', style: 'cancel' },
      ],
    );
  };

  const submitReport = async (photo: MenuPhoto, reason: string) => {
    if (!restaurantId || !user) return;
    const result = await RestaurantService.reportMenuPhoto(restaurantId, photo.id, reason);
    if (result) {
      setReportedPhotoIds(prev => new Set(prev).add(photo.id));
      Alert.alert('Grazie', 'La tua segnalazione è stata inviata. La esamineremo al più presto.');
    } else {
      Alert.alert('Errore', 'Impossibile inviare la segnalazione. Riprova.');
    }
  };

  const handleDelete = (photo: MenuPhoto) => {
    Alert.alert(
      'Elimina foto',
      'Vuoi eliminare questa foto del menu?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            if (!restaurantId || !user) return;
            setDeletingId(photo.id);
            const ok = await RestaurantService.deleteMenuPhoto(restaurantId, photo.id, user.uid);
            if (ok) {
              setPhotos(prev => prev.filter(p => p.id !== photo.id));
            } else {
              Alert.alert('Errore', 'Impossibile eliminare la foto.');
            }
            setDeletingId(null);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title="Foto menu" />

      {restaurantName && (
        <View style={styles.restaurantRow}>
          <MaterialCommunityIcons name="store" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Le foto del menu aiutano chi ha esigenze alimentari a sapere cosa può ordinare, prima ancora di entrare.
        </Text>
        <Text style={styles.infoSubtext}>
          Se hai il menu davanti o hai foto più aggiornate, aggiungile liberamente — ogni contributo rende l'app più utile per tutti.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.addRow, isUploading && styles.addRowDisabled]}
            onPress={handleAddPhoto}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons name="camera-plus-outline" size={20} color={theme.colors.primary} />
            )}
            <Text style={styles.addRowText}>
              {isUploading ? 'Caricamento...' : 'Aggiungi foto del menu'}
            </Text>
          </TouchableOpacity>

          {photos.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="image-outline" size={40} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>Ancora nessuna foto del menu</Text>
              <Text style={styles.emptySubtext}>Sii il primo ad aggiungerne una</Text>
            </View>
          ) : (
            photos.map((photo, idx) => (
              <View key={photo.id}>
                {idx > 0 && <Divider style={styles.divider} />}
                <View style={styles.photoRow}>
                  <TouchableOpacity onPress={() => setFullscreenIndex(idx)} activeOpacity={0.8}>
                    <Image
                      source={{ uri: photo.thumbnail_url ?? photo.image_url }}
                      style={styles.thumb}
                    />
                  </TouchableOpacity>
                  <View style={styles.photoMeta}>
                    <Text style={styles.uploaderName}>
                      {photo.user_id === user?.uid
                        ? 'Tu'
                        : (photo.user_display_name ?? 'Utente della community')}
                    </Text>
                    <Text style={styles.uploadDate}>
                      {new Date(photo.created_at).toLocaleDateString(i18n.locale, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {photo.user_id === user?.uid ? (
                    deletingId === photo.id ? (
                      <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                      <TouchableOpacity onPress={() => handleDelete(photo)} hitSlop={8} activeOpacity={0.6}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    )
                  ) : user ? (
                    <TouchableOpacity onPress={() => handleReport(photo)} hitSlop={8} activeOpacity={0.6} style={styles.reportButton}>
                      <MaterialCommunityIcons
                        name={reportedPhotoIds.has(photo.id) ? 'flag' : 'flag-outline'}
                        size={16}
                        color={theme.colors.textDisabled}
                      />
                      <Text style={styles.reportButtonText}>
                        {reportedPhotoIds.has(photo.id) ? 'Segnalata' : 'Segnala'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <ImageFullscreenModal
        visible={fullscreenIndex !== null}
        images={photos.map(p => p.image_url)}
        initialIndex={fullscreenIndex ?? 0}
        onClose={() => setFullscreenIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  restaurantName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 0,
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  infoSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  addRowDisabled: {
    opacity: 0.5,
  },
  addRowText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textDisabled,
  },
  divider: {
    marginHorizontal: 16,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  photoMeta: {
    flex: 1,
    gap: 3,
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  uploadDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reportButtonText: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
});
