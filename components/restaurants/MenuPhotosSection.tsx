import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import type { MenuPhoto } from '../../types/restaurants';

interface MenuPhotosSectionProps {
  menuPhotos: MenuPhoto[];
  currentUserId?: string;
  isUploading: boolean;
  onAddPhoto: () => void;
  onDeletePhoto: (photo: MenuPhoto) => void;
  onPhotoPress: (imageUrl: string) => void;
}

export default function MenuPhotosSection({
  menuPhotos,
  currentUserId,
  isUploading,
  onAddPhoto,
  onDeletePhoto,
  onPhotoPress,
}: MenuPhotosSectionProps) {
  return (
    <Surface style={styles.menuSection} elevation={1}>
      <Text style={styles.sectionTitle}>Menu {menuPhotos.length > 0 ? `(${menuPhotos.length})` : ''}</Text>
      {menuPhotos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuScroll}
          style={styles.menuScrollOuter}
        >
          {menuPhotos.map(photo => (
            <View key={photo.id} style={styles.menuThumbWrap}>
              <TouchableOpacity onPress={() => onPhotoPress(photo.imageUrl)} activeOpacity={0.8}>
                <Image source={{ uri: photo.thumbnailUrl ?? photo.imageUrl }} style={styles.menuThumb} />
              </TouchableOpacity>
              {photo.uploadedBy === currentUserId && (
                <TouchableOpacity style={styles.menuDeleteBtn} onPress={() => onDeletePhoto(photo)} hitSlop={6}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
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
        </ScrollView>
      ) : (
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
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  menuSection: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
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
    backgroundColor: 'rgba(255,255,255,0.9)',
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
