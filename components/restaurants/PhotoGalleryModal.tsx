import { useRef, useCallback, useState, useMemo } from 'react';
import {
  Modal, View, FlatList, TouchableOpacity, StyleSheet, ScrollView, Platform, Pressable, Alert,
  useWindowDimensions, type ViewToken,
} from 'react-native';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ZoomableImage from '../ZoomableImage';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import StarRating from '../StarRating';
import { getRestrictionById, type FoodRestrictionCategory } from '../../constants/foodRestrictions';
import Avatar from '../Avatar';
import ReportReviewPanel, { type ReviewReportReason } from './ReportReviewPanel';
import i18n from '../../utils/i18n';

export interface GalleryPhoto {
  url: string;
  reviewId?: string;
  displayName: string;
  avatarUrl?: string | null;
  isAnonymous?: boolean;
  isInactive?: boolean;
  rating?: number;
  text?: string;
  allergensSnapshot?: string[];
  dietarySnapshot?: string[];
}

const makeCategoryColors = (theme: AppTheme): Record<FoodRestrictionCategory, { bg: string; text: string }> => ({
  eu_allergen:      { bg: 'rgba(255,140,0,0.25)',  text: theme.colors.warning },
  intolerance:      { bg: 'rgba(255,180,0,0.25)',  text: theme.colors.intoleranceAccent },
  diet:             { bg: 'rgba(76,175,80,0.25)',   text: theme.colors.primary },
  food_sensitivity: { bg: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.7)' },
});

const DISMISS_THRESHOLD = 120;

interface PhotoGalleryModalProps {
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
  userNeeds?: string[];
  /**
   * Invia la segnalazione della recensione della foto corrente. Il panel di
   * segnalazione è renderizzato internamente alla galleria (non come secondo
   * <Modal>), quindi qui basta la submission vera e propria.
   */
  onSubmitReport?: (reviewId: string, reason: ReviewReportReason) => Promise<void>;
  /** Set di reviewId già segnalati (per mostrare la flag piena). */
  reportedReviewIds?: Set<string>;
}

export default function PhotoGalleryModal({ photos, initialIndex, onClose, userNeeds, onSubmitReport, reportedReviewIds }: PhotoGalleryModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const CATEGORY_COLORS = useMemo(() => makeCategoryColors(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [textTruncated, setTextTruncated] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  // ─── Swipe-to-dismiss (Reanimated) ──────────────────────────────
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
        translateY.value = withTiming(
          height,
          { duration: 200, easing: Easing.in(Easing.cubic) },
          (finished) => { if (finished) runOnJS(onClose)(); },
        );
      } else {
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

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
      setTextExpanded(false);
      // Non azzeriamo textTruncated: onTextLayout del testo di misura aggiorna
      // il valore quando il testo cambia davvero. Per foto-sorelle della stessa
      // recensione (stesso testo) onTextLayout non riscatta, e il valore già
      // corretto va conservato — azzerarlo qui faceva sparire "leggi tutto".
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  const current = photos[currentIndex];

  return (
    <Modal visible transparent animationType="fade" onShow={handleShow} onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={dismissPan}>
        <ReAnimated.View style={[styles.container, dismissStyle]}>
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            onPress={onClose}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={28} color={theme.colors.onPrimary} />
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
            scrollEnabled={!isZoomed}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pageContainer, { width }]}
                onPress={Platform.OS === 'android' ? onClose : undefined}
              >
                <ZoomableImage
                  uri={item.url}
                  style={{ width, height: height * 0.7 }}
                  onZoomChange={handleZoomChange}
                  onSingleTap={onClose}
                />
              </Pressable>
            )}
          />

          {/* Review info overlay */}
          {current && (
            <View style={[styles.infoOverlay, { paddingBottom: insets.bottom + 16 }]}>
              {/* Reviewer info */}
              <View style={styles.infoRow}>
                <Avatar
                  avatarId={current.avatarUrl}
                  isAnonymous={current.isAnonymous}
                  isInactive={current.isInactive}
                  initial={current.isAnonymous || current.isInactive ? undefined : current.displayName}
                  size="xs"
                  backgroundColor={theme.colors.primary}
                />
                <View style={styles.infoMeta}>
                  <Text style={styles.infoName}>{current.displayName}</Text>
                  {current.rating != null && current.rating > 0 && (
                    <StarRating rating={current.rating} size={12} />
                  )}
                </View>
                {onSubmitReport && current.reviewId && (
                  <TouchableOpacity
                    onPress={() => {
                      if (!current.reviewId) return;
                      if (reportedReviewIds?.has(current.reviewId)) {
                        Alert.alert(i18n.t('restaurants.detail.reportAlreadySent'), i18n.t('restaurants.detail.reportAlreadyMsg'));
                        return;
                      }
                      setReportingReviewId(current.reviewId);
                    }}
                    hitSlop={10}
                    activeOpacity={0.6}
                  >
                    <MaterialCommunityIcons
                      name={reportedReviewIds?.has(current.reviewId) ? 'flag' : 'flag-outline'}
                      size={18}
                      color="rgba(255,255,255,0.5)"
                    />
                  </TouchableOpacity>
                )}
              </View>
              {current.text && (
                <TouchableOpacity
                  activeOpacity={textTruncated || textExpanded ? 0.7 : 1}
                  onPress={() => { if (textTruncated || textExpanded) setTextExpanded(e => !e); }}
                >
                  {/* Testo nascosto per misurare le righe reali senza il limite numberOfLines */}
                  <Text
                    style={[styles.infoText, styles.measureText]}
                    onTextLayout={(e) => setTextTruncated(e.nativeEvent.lines.length > 2)}
                  >
                    {current.text}
                  </Text>
                  <Text
                    style={styles.infoText}
                    numberOfLines={textExpanded ? undefined : 2}
                  >
                    {current.text}
                  </Text>
                  {textTruncated && !textExpanded && (
                    <Text style={styles.readMore}>{i18n.t('gallery.readMore')}</Text>
                  )}
                  {textExpanded && (
                    <Text style={styles.readMore}>{i18n.t('gallery.readLess')}</Text>
                  )}
                </TouchableOpacity>
              )}
              {/* Reviewer dietary needs */}
              {((current.allergensSnapshot?.length ?? 0) + (current.dietarySnapshot?.length ?? 0)) > 0 && (
                <>
                  <Text style={styles.needsLabel}>{i18n.t('gallery.reviewerNeeds')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.allergenRow}
                  >
                    {[...(current.dietarySnapshot ?? []), ...(current.allergensSnapshot ?? [])].map(id => {
                      const r = getRestrictionById(id);
                      if (!r) return null;
                      const label = r.translations[i18n.locale as keyof typeof r.translations] ?? r.translations.en;
                      const isMatch = userNeeds?.includes(id) ?? false;
                      const bg = isMatch ? 'rgba(76,175,80,0.30)' : CATEGORY_COLORS[r.category].bg;
                      const color = isMatch ? '#66BB6A' : CATEGORY_COLORS[r.category].text;
                      return (
                        <View key={id} style={[styles.allergenChip, { backgroundColor: bg }]}>
                          {isMatch && (
                            <MaterialCommunityIcons name="shield-check" size={11} color={color} />
                          )}
                          <Text style={[styles.allergenChipText, { color }]}>{label}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </ReAnimated.View>
      </GestureDetector>

      {/* Panel di segnalazione come overlay interno (fuori dal GestureDetector
          della galleria, così lo swipe-to-dismiss non interferisce). Niente
          secondo <Modal> nativo → niente stacking su iOS. */}
      {reportingReviewId && onSubmitReport && (
        <ReportReviewPanel
          onClose={() => setReportingReviewId(null)}
          onSubmit={async (reason) => {
            await onSubmitReport(reportingReviewId, reason);
            setReportingReviewId(null);
          }}
        />
      )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
  pageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  infoMeta: {
    flex: 1,
    gap: 2,
  },
  infoName: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  measureText: {
    // left/right: 0 vincola la misura alla stessa larghezza del testo visibile
    // (altrimenti, da absolute senza larghezza, conterebbe meno righe del reale).
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  readMore: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  needsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  allergenRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  allergenChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
