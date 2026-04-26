import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import type { MenuPhoto } from '../../services/restaurantService';

interface MenuPhotosSectionProps {
  menuPhotos: MenuPhoto[];
  currentUserId?: string;
  isUploading: boolean;
  canUpload: boolean;
  menuUrl?: string | null;
  onAddPhoto: () => void;
  onDeletePhoto: (photo: MenuPhoto) => void;
  onPhotoPress: (index: number) => void;
  onUpdateMenuUrl: () => void;
  isUpdatingMenuUrl?: boolean;
  onManage?: () => void;
}

export default function MenuPhotosSection({
  menuPhotos,
  currentUserId,
  canUpload,
  menuUrl,
  onPhotoPress,
  onManage,
}: MenuPhotosSectionProps) {
  const hasPhotos = menuPhotos.length > 0;

  return (
    <View style={styles.menuSection}>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{i18n.t('restaurants.menu.title')}{hasPhotos ? ` (${menuPhotos.length})` : ''}</Text>
        {canUpload && (
          <TouchableOpacity onPress={onManage} activeOpacity={0.7} style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>{i18n.t('restaurants.menu.manage')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuScroll}
          style={styles.menuScrollOuter}
        >
          {menuPhotos.map((photo, index) => (
            <TouchableOpacity key={photo.id} onPress={() => onPhotoPress(index)} activeOpacity={0.8}>
              <Image source={{ uri: photo.thumbnail_url ?? photo.image_url }} style={styles.menuThumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : !menuUrl && (
        <Text style={styles.menuEmptyHint}>
          {canUpload ? i18n.t('restaurants.menu.addFirst') : i18n.t('restaurants.menu.empty')}
        </Text>
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
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
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
  menuThumb: {
    width: 110,
    height: 150,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  menuEmptyHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    paddingVertical: 4,
  },
});
