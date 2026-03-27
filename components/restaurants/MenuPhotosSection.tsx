import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import type { MenuPhoto } from '../../services/restaurantService';

interface MenuPhotosSectionProps {
  menuPhotos: MenuPhoto[];
  currentUserId?: string;
  isUploading: boolean;
  canUpload: boolean;
  menuUrl?: string | null;
  onAddPhoto: () => void;
  onDeletePhoto: (photo: MenuPhoto) => void;
  onPhotoPress: (imageUrl: string) => void;
  onUpdateMenuUrl: () => void;
  isUpdatingMenuUrl?: boolean;
}

export default function MenuPhotosSection({
  menuPhotos,
  currentUserId,
  isUploading,
  canUpload,
  menuUrl,
  onAddPhoto,
  onDeletePhoto,
  onPhotoPress,
  onUpdateMenuUrl,
  isUpdatingMenuUrl,
}: MenuPhotosSectionProps) {
  const hasPhotos = menuPhotos.length > 0;

  return (
    <View style={styles.menuSection}>
      {/* Titolo */}
      {/* Link menu: nascosto — funzionalità premium, da riabilitare */}
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Menu{hasPhotos ? ` (${menuPhotos.length})` : ''}</Text>
      </View>

      {/* Foto */}
      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuScroll}
          style={styles.menuScrollOuter}
        >
          {menuPhotos.map(photo => (
            <View key={photo.id} style={styles.menuThumbWrap}>
              <TouchableOpacity onPress={() => onPhotoPress(photo.image_url)} activeOpacity={0.8}>
                <Image source={{ uri: photo.thumbnail_url ?? photo.image_url }} style={styles.menuThumb} />
              </TouchableOpacity>
              {photo.user_id === currentUserId && (
                <TouchableOpacity style={styles.menuDeleteBtn} onPress={() => onDeletePhoto(photo)} hitSlop={6}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {canUpload && (
            <TouchableOpacity
              onPress={onAddPhoto}
              disabled={isUploading}
              activeOpacity={0.7}
              style={styles.menuAddThumb}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera-plus-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.menuAddText}>Aggiungi</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : !menuUrl && (
        canUpload ? (
          <TouchableOpacity onPress={onAddPhoto} disabled={isUploading} activeOpacity={0.7} style={styles.menuEmpty}>
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={styles.ctaHint}>Tocca per aggiungere una foto del menu</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.menuEmpty}>
            <MaterialCommunityIcons name="image-outline" size={28} color={theme.colors.textDisabled} />
            <Text style={styles.ctaHint}>
              {currentUserId
                ? 'Scrivi una recensione per aggiungere foto del menu'
                : 'Ancora nessuna foto del menu'}
            </Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menuSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  linkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkActionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  menuLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    marginBottom: 12,
  },
  menuLinkText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  menuScrollOuter: {
    marginHorizontal: -16,
  },
  menuScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  menuThumbWrap: {
    position: 'relative',
  },
  menuThumb: {
    width: 110,
    height: 150,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  menuDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.overlayLight,
    borderRadius: 10,
  },
  menuAddThumb: {
    width: 80,
    height: 150,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  menuAddText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  menuEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
