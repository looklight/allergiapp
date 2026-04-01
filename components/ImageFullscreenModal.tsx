import { useCallback, useRef, useState } from 'react';
import {
  Modal, View, FlatList, TouchableOpacity, StyleSheet,
  useWindowDimensions, type ViewStyle, type ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  runOnJS, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import ZoomableImage from './ZoomableImage';

const DISMISS_THRESHOLD = 120;

interface ImageFullscreenModalProps {
  visible: boolean;
  images?: string[];
  initialIndex?: number;
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

  const allImages = images ?? (imageUrl ? [imageUrl] : []);
  const showCounter = allImages.length > 1;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // ─── Swipe-to-dismiss ───────────────────────────────────────────
  const translateY = useSharedValue(0);

  const dismissPan = Gesture.Pan()
    .activeOffsetY(20)
    .failOffsetX([-20, 20])
    .enabled(!isZoomed)
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        // Anima fuori, THEN chiudi — il callback viene eseguito a animazione completata
        translateY.value = withTiming(
          height,
          { duration: 200, easing: Easing.in(Easing.cubic) },
          (finished) => { if (finished) runOnJS(onClose)(); },
        );
      } else {
        // Rimbalzo leggero — spring rigido senza oscillazione visibile
        translateY.value = withSpring(0, { damping: 30, stiffness: 400 });
      }
    });

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(
      Math.abs(translateY.value),
      [0, 300],
      [1, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  const handleShow = useCallback(() => {
    translateY.value = 0;
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, translateY]);

  // ─── FlatList viewability ──────────────────────────────────────
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={handleShow}>
      <GestureDetector gesture={dismissPan}>
        <Animated.View style={[styles.overlay, overlayStyle, dismissStyle]}>
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
              scrollEnabled={!isZoomed}
              renderItem={({ item }) => (
                <View style={[styles.pageContainer, { width }]}>
                  <ZoomableImage
                    uri={item}
                    style={{ width, height: height * 0.8 }}
                    onZoomChange={handleZoomChange}
                    onSingleTap={onClose}
                  />
                </View>
              )}
            />
          ) : placeholder ?? null}

          {children}
        </Animated.View>
      </GestureDetector>
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
