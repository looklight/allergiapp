import { useRef, useCallback, useState } from 'react';
import {
  Animated, Modal, View, FlatList, TouchableOpacity, StyleSheet,
  useWindowDimensions, type ViewStyle, type ViewToken,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import ZoomableImage from './ZoomableImage';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface ImageFullscreenModalProps {
  visible: boolean;
  /** Array of image URLs for swipeable gallery */
  images?: string[];
  /** Starting index when using images[] */
  initialIndex?: number;
  /** Single image URL (shorthand for images={[url]} initialIndex={0}) */
  imageUrl?: string | null;
  onClose: () => void;
  children?: ReactNode;
  placeholder?: ReactNode;
  overlayStyle?: ViewStyle;
}

export default function ImageFullscreenModal({
  visible,
  images,
  initialIndex = 0,
  imageUrl,
  onClose,
  children,
  placeholder,
  overlayStyle,
}: ImageFullscreenModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { translateY, backgroundOpacity, onPanGestureEvent, onPanStateChange, reset } =
    useSwipeToDismiss(onClose);

  const allImages = images ?? (imageUrl ? [imageUrl] : []);
  const showCounter = allImages.length > 1;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => { reset(); setCurrentIndex(initialIndex); }}
    >
      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanStateChange}
        activeOffsetY={20}
        failOffsetX={[-20, 20]}
      >
        <Animated.View
          style={[
            styles.overlay,
            overlayStyle,
            { transform: [{ translateY }], opacity: backgroundOpacity },
          ]}
        >
          <TouchableOpacity style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {showCounter && (
            <View style={[styles.counter, { top: insets.top + 16 }]}>
              <Text style={styles.counterText}>{currentIndex + 1} / {allImages.length}</Text>
            </View>
          )}

          {allImages.length > 0 ? (
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={[styles.pageContainer, { width }]}>
                  <ZoomableImage
                    uri={item}
                    style={{ width, height: height * 0.8 }}
                  />
                </View>
              )}
            />
          ) : placeholder ?? null}

          {children}
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
  pageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
