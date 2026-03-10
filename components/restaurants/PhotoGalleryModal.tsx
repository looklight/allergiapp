import { useRef, useCallback, useState } from 'react';
import {
  Modal, View, FlatList, Image, TouchableOpacity, StyleSheet,
  useWindowDimensions, type ViewToken,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import StarRating from '../StarRating';

export interface GalleryPhoto {
  url: string;
  displayName: string;
  rating?: number;
  text?: string;
}

interface PhotoGalleryModalProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoGalleryModal({ photos, initialIndex, onClose }: PhotoGalleryModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const current = photos[currentIndex];

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Counter */}
        <View style={[styles.counter, { top: insets.top + 16 }]}>
          <Text style={styles.counterText}>{currentIndex + 1} / {photos.length}</Text>
        </View>

        {/* Swipeable images */}
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Review info overlay */}
        {current && (
          <View style={[styles.infoOverlay, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoAvatar}>
                <Text style={styles.infoAvatarText}>
                  {(current.displayName.charAt(0) || '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoMeta}>
                <Text style={styles.infoName}>{current.displayName}</Text>
                {current.rating != null && current.rating > 0 && (
                  <StarRating rating={current.rating} size={12} />
                )}
              </View>
            </View>
            {current.text && (
              <Text style={styles.infoText} numberOfLines={2}>{current.text}</Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  counter: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  counterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: '70%',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  infoMeta: {
    flex: 1,
    gap: 2,
  },
  infoName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
});
