import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../StarRating';
import ImageFullscreenModal from '../ImageFullscreenModal';
import RestaurantHeader from './RestaurantHeader';
import MenuPhotosSection from './MenuPhotosSection';
import ReviewsSection from './ReviewsSection';
import ReportsSection from './ReportsSection';
import PhotoGalleryModal from './PhotoGalleryModal';
import LoginGateCta from './LoginGateCta';
import { useRestaurantDetail, type ReviewSortOrder } from '../../hooks/useRestaurantDetail';
import { RestaurantService } from '../../services/restaurantService';
import { getExpandedCoverage, forwardMap } from '../../constants/restrictionImplications';
import type { AppLanguage } from '../../types';
import i18n from '../../utils/i18n';

// ─── Photo thumbnail carousel ───────────────────────────────────────────────
const THUMB_SIZE = 110;
const THUMB_GAP = 8;
const MAX_CAROUSEL_PHOTOS = 20;
const THUMB_ITEM_LENGTH = THUMB_SIZE + THUMB_GAP;
const getThumbLayout = (_: unknown, index: number) => ({
  length: THUMB_ITEM_LENGTH,
  offset: THUMB_ITEM_LENGTH * index + 16,
  index,
});

// ─── Types ──────────────────────────────────────────────────────────────────
type Props = {
  restaurantId: string;
  detail: ReturnType<typeof useRestaurantDetail>;
  onDismiss: () => void;
  /** Hide name/rating inside RestaurantHeader (used when parent shows them) */
  hideNameAndRating?: boolean;
  /** Controls whether the ScrollView can scroll (false when sheet is not fully open) */
  scrollEnabled?: boolean;
  /**
   * Ref to the NativeViewGestureHandler wrapping the ScrollView.
   * Used by the parent DraggableBottomSheet for simultaneousHandlers coordination
   * (fluid drag-to-collapse from the body when the sheet is fully open).
   */
  scrollHandlerRef?: React.RefObject<any>;
  /** Scroll callback (e.g. for compact header in sheet mode) */
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
};

export default function RestaurantDetailBody({
  restaurantId,
  detail,
  onDismiss,
  hideNameAndRating,
  scrollEnabled = true,
  scrollHandlerRef,
  onScroll,
}: Props) {
  const router = useRouter();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const { user, isAuthenticated, dietaryNeeds } = useAuth();
  const lang = i18n.locale as AppLanguage;

  const {
    restaurant, allReviews, reviewsTotalCount, hasMoreReviews, loadMoreReviews, isLoadingMoreReviews,
    menuPhotos, reports, cuisineVotes, userReview, userReport, isFavorite,
    isLoading, error, isUploadingMenu, userHasReviews, isUpdatingMenuUrl,
    reviewSortOrder, setReviewSortOrder, hasUserNeeds,
    handleToggleFavorite, handleToggleReviewLike, navigateToContribute,
    handleAddMenuPhoto, handleDeleteMenuPhoto, handleUpdateMenuUrl,
  } = detail;

  const scrollViewRef = useRef<ScrollView>(null);
  const reviewsOffsetY = useRef(0);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [menuGalleryIndex, setMenuGalleryIndex] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(new Set());

  // ─── Derived data ───────────────────────────────────────────────────────
  const userNeedsSet = useMemo(
    () => new Set<string>([...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])]),
    [dietaryNeeds],
  );

  const reviewPhotos = useMemo(
    () => allReviews.flatMap(r => {
      const allergenCount = (r.allergensSnapshot?.length ?? 0) + (r.dietarySnapshot?.length ?? 0);
      const snap = [...(r.allergensSnapshot ?? []), ...(r.dietarySnapshot ?? [])];
      const matchCount = userNeedsSet.size > 0 ? snap.filter(a => userNeedsSet.has(a)).length : 0;
      return r.photos.map(p => ({
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        reviewId: r.reviewId,
        displayName: r.displayName ?? '',
        avatarUrl: r.avatarUrl,
        profileColor: r.profileColor,
        rating: r.rating,
        text: r.text,
        allergensSnapshot: r.allergensSnapshot,
        dietarySnapshot: r.dietarySnapshot,
        allergenCount,
        matchCount,
      }));
    }),
    [allReviews, userNeedsSet],
  );

  const matchInfo = useMemo(() => {
    if (!hasUserNeeds) return { reviewCount: 0, coveredCount: 0, totalFilters: 0, covered: [] as string[], uncovered: [] as string[], inferredSources: {} as Record<string, string> };
    const userAll: string[] = [...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])];
    const userSet = new Set(userAll);
    const directCovered = new Set<string>();
    const inferredSources: Record<string, string> = {}; // need -> source (es. eggs -> vegan)
    let reviewCount = 0;
    for (const r of allReviews) {
      const snap = [...(r.allergensSnapshot ?? []), ...(r.dietarySnapshot ?? [])];
      const expanded = getExpandedCoverage(snap);
      const expandedArr = [...expanded];
      if (expandedArr.some(a => userSet.has(a))) {
        reviewCount++;
        for (const a of expandedArr) {
          if (!userSet.has(a)) continue;
          if (snap.includes(a)) {
            directCovered.add(a);
          } else if (!directCovered.has(a) && !inferredSources[a]) {
            const source = snap.find(s => forwardMap.has(s) && forwardMap.get(s)!.includes(a));
            if (source) inferredSources[a] = source;
          }
        }
      }
    }
    // Le coperture dirette hanno priorita sulle dedotte
    for (const a of directCovered) delete inferredSources[a];
    const allCovered = new Set([...directCovered, ...Object.keys(inferredSources)]);
    const covered = userAll.filter(a => allCovered.has(a));
    const uncovered = userAll.filter(a => !allCovered.has(a));
    return { reviewCount, coveredCount: allCovered.size, totalFilters: userAll.length, covered, uncovered, inferredSources };
  }, [allReviews, dietaryNeeds, hasUserNeeds]);

  const canRemove = restaurant
    && user?.uid === restaurant.added_by
    && (restaurant.review_count ?? 0) === 0;

  const mapsUrl = restaurant?.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.google_place_id}`
    : restaurant?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
      : null;

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleRemoveRestaurant = () => {
    if (!restaurant || !user?.uid) return;
    Alert.alert(
      'Elimina ristorante',
      `Vuoi eliminare "${restaurant.name}"? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            const ok = await RestaurantService.removeOwnRestaurant(restaurant.id, user.uid);
            setIsRemoving(false);
            if (ok) {
              onDismiss();
            } else {
              Alert.alert('Errore', 'Non è stato possibile eliminare il ristorante.');
            }
          },
        },
      ],
    );
  };

  const handleReportReview = (reviewId: string) => {
    if (reportedReviewIds.has(reviewId)) {
      Alert.alert('Segnalazione inviata', 'Hai già segnalato questa recensione. La esamineremo al più presto.');
      return;
    }
    Alert.alert(
      'Segnala recensione',
      'Perché vuoi segnalare questa recensione?',
      [
        {
          text: 'Contenuto inappropriato',
          onPress: () => submitReviewReport(reviewId, 'inappropriate'),
        },
        {
          text: 'Spam o pubblicità',
          onPress: () => submitReviewReport(reviewId, 'spam'),
        },
        {
          text: 'Informazioni false',
          onPress: () => submitReviewReport(reviewId, 'false_info'),
        },
        { text: 'Annulla', style: 'cancel' },
      ],
    );
  };

  const submitReviewReport = async (reviewId: string, reason: string) => {
    if (!restaurant) return;
    const result = await RestaurantService.reportReview(restaurant.id, reviewId, reason);
    if (result) {
      setReportedReviewIds(prev => new Set(prev).add(reviewId));
      Alert.alert('Grazie', 'La tua segnalazione è stata inviata. La esamineremo al più presto.');
    } else {
      Alert.alert('Errore', 'Impossibile inviare la segnalazione. Riprova.');
    }
  };

  // Auto-cleanup: rimuovi favorito orfano se il ristorante non esiste più
  useEffect(() => {
    if (!isLoading && !restaurant && user?.uid && restaurantId) {
      RestaurantService.removeFavorite(user.uid, restaurantId);
    }
  }, [isLoading, restaurant, user?.uid, restaurantId]);

  // ─── Loading / Error states ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Ristorante non trovato.'}</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.errorBack}>
          <Text style={styles.errorBackText}>Chiudi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main content ───────────────────────────────────────────────────────
  return (
    <>
      <NativeViewGestureHandler ref={scrollHandlerRef}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: safeAreaBottom + 32 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onScroll={onScroll}
        scrollEventThrottle={onScroll ? 16 : 0}
      >
        {/* Rating + Maps row (only when parent shows name separately) */}
        {hideNameAndRating && (
          <View style={styles.bodyRatingSection}>
            {(restaurant.review_count ?? 0) > 0 ? (
              <TouchableOpacity
                style={styles.bodyRatingGroup}
                activeOpacity={0.7}
                onPress={() => scrollViewRef.current?.scrollTo({ y: reviewsOffsetY.current, animated: true })}
              >
                <StarRating rating={restaurant.average_rating ?? 0} size={16} showValue />
                <Text style={styles.bodyRatingCount}>({restaurant.review_count})</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.bodyNoRating}>Nessuna recensione</Text>
            )}
            {mapsUrl && (
              <TouchableOpacity
                style={styles.mapsChip}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(mapsUrl).catch(() => Alert.alert('Errore', 'Impossibile aprire Maps'))}
              >
                <MaterialCommunityIcons name="google-maps" size={15} color={theme.colors.brandGoogleMaps} />
                <Text style={styles.mapsChipText}>Indicazioni (Maps)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <RestaurantHeader
          restaurant={restaurant}
          lang={lang}
          cuisineVotes={cuisineVotes}
          matchInfo={matchInfo}
          hasUserNeeds={hasUserNeeds}
          isAuthenticated={isAuthenticated}
          onScrollToReviews={() => scrollViewRef.current?.scrollTo({ y: reviewsOffsetY.current, animated: true })}
          hideNameAndRating={hideNameAndRating}
        />

        {isAuthenticated ? (
          <View style={styles.photoAndMenuSection}>
            {reviewPhotos.length > 0 && (
              <FlatList
                data={reviewPhotos.slice(0, MAX_CAROUSEL_PHOTOS)}
                keyExtractor={(item, idx) => `${item.url}-${idx}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: THUMB_GAP }}
                getItemLayout={getThumbLayout}
                initialNumToRender={5}
                style={{ paddingTop: 4, paddingBottom: 4 }}
                renderItem={({ item, index }) => {
                  const isLast = index === MAX_CAROUSEL_PHOTOS - 1 && reviewPhotos.length > MAX_CAROUSEL_PHOTOS;
                  const moreCount = reviewPhotos.length - MAX_CAROUSEL_PHOTOS;
                  return (
                    <TouchableOpacity onPress={() => setGalleryIndex(index)} activeOpacity={0.85}>
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                      {userNeedsSet.size > 0 && (
                        <View style={styles.thumbMatchBadge}>
                          <MaterialCommunityIcons
                            name="shield-check"
                            size={10}
                            color={item.matchCount >= userNeedsSet.size ? theme.colors.success
                              : item.matchCount > 0 ? theme.colors.amberDark
                              : theme.colors.textSecondary}
                          />
                          <Text style={[styles.thumbMatchText, {
                            color: item.matchCount >= userNeedsSet.size ? theme.colors.success
                              : item.matchCount > 0 ? theme.colors.amberDark
                              : theme.colors.textSecondary,
                          }]}>{item.matchCount}/{userNeedsSet.size}</Text>
                        </View>
                      )}
                      {isLast && (
                        <View style={styles.thumbMoreOverlay}>
                          <Text style={styles.thumbMoreText}>+{moreCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <MenuPhotosSection
              menuPhotos={menuPhotos}
              currentUserId={user?.uid}
              isUploading={isUploadingMenu}
              canUpload={isAuthenticated}
              menuUrl={restaurant.menu_url}
              onAddPhoto={handleAddMenuPhoto}
              onDeletePhoto={handleDeleteMenuPhoto}
              onPhotoPress={setMenuGalleryIndex}
              onUpdateMenuUrl={handleUpdateMenuUrl}
              isUpdatingMenuUrl={isUpdatingMenuUrl}
              onManage={() => router.push(`/restaurants/menu-photos?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurant.name)}`)}
            />
          </View>
        ) : (
          <LoginGateCta
            title="Accedi per vedere le foto e il menu"
            subtitle="Foto della community e foto del menu"
          />
        )}

        {isAuthenticated && (
          <>
            <View style={styles.separator} />
            {userReview ? (
              <View style={styles.ctaSection}>
                <View style={styles.ctaTopRow}>
                  <Text style={styles.ctaTitle}>La tua recensione</Text>
                  <TouchableOpacity
                    onPress={() => navigateToContribute(undefined, userReview.id)}
                    hitSlop={8}
                    activeOpacity={0.6}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                {userReview.rating != null && userReview.rating > 0 && (
                  <StarRating rating={userReview.rating} size={24} />
                )}
                {userReview.comment && (
                  <Text style={styles.userContribText} numberOfLines={3}>{userReview.comment}</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigateToContribute()}>
                <View style={styles.ctaSection}>
                  <Text style={styles.ctaTitle}>Lascia la tua opinione</Text>
                  <StarRating rating={0} size={36} onRate={(r) => navigateToContribute(r)} />
                  <Text style={styles.ctaHint}>La tua recensione aiuta chi ha le tue stesse esigenze</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.separator} onLayout={(e) => { reviewsOffsetY.current = e.nativeEvent.layout.y; }} />

        {isAuthenticated ? (
          <ReviewsSection
            reviews={allReviews}
            totalCount={reviewsTotalCount}
            hasMore={hasMoreReviews}
            onLoadMore={loadMoreReviews}
            isLoadingMore={isLoadingMoreReviews}
            reviewPhotos={reviewPhotos}
            reviewSortOrder={reviewSortOrder}
            setReviewSortOrder={setReviewSortOrder}
            hasUserNeeds={hasUserNeeds}
            userNeeds={[...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])]}
            onToggleReviewLike={handleToggleReviewLike}
            onImagePress={(url) => {
              const i = reviewPhotos.findIndex(p => p.url === url);
              if (i >= 0) setGalleryIndex(i);
              else setFullscreenImage(url);
            }}
            onReportReview={handleReportReview}
            reportedReviewIds={reportedReviewIds}
            currentUserId={user?.uid}
          />
        ) : (
          <LoginGateCta
            title="Accedi per vedere le recensioni"
            subtitle="Leggi le esperienze della community e lascia la tua valutazione"
          />
        )}

        <ReportsSection reports={reports} />

        <View style={styles.separator} />

        <View style={styles.footerSection}>
          {restaurant.added_by && (
            <TouchableOpacity
              style={styles.footerRow}
              activeOpacity={0.6}
              onPress={() => router.push(`/restaurants/user/${restaurant.added_by}`)}
            >
              <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.footerRowText}>Aggiunto da un utente</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textDisabled} />
            </TouchableOpacity>
          )}

          {restaurant.added_by && <Divider />}

          <TouchableOpacity
            style={styles.footerRow}
            activeOpacity={0.6}
            onPress={() => {
              if (!isAuthenticated) { router.push('/auth/login'); return; }
              if (userReport) { Alert.alert('Già segnalato', 'Hai già segnalato questo ristorante.'); return; }
              router.push(`/restaurants/report?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurant?.name ?? '')}`);
            }}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={18}
              color={userReport ? theme.colors.textDisabled : theme.colors.warning}
            />
            <Text style={[styles.footerRowText, userReport && { color: theme.colors.textDisabled }]}>
              {userReport ? 'Hai già segnalato questo ristorante' : 'Segnala un problema'}
            </Text>
            {!userReport && (
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textDisabled} />
            )}
          </TouchableOpacity>

          {canRemove && (
            <>
              <Divider />
              <TouchableOpacity
                style={styles.footerRow}
                activeOpacity={0.6}
                disabled={isRemoving}
                onPress={handleRemoveRestaurant}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={theme.colors.error} />
                    <Text style={[styles.footerRowText, { color: theme.colors.error }]}>Elimina ristorante</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      </NativeViewGestureHandler>

      <ImageFullscreenModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      {menuGalleryIndex !== null && (
        <ImageFullscreenModal
          visible
          images={menuPhotos.map(p => p.image_url)}
          initialIndex={menuGalleryIndex}
          onClose={() => setMenuGalleryIndex(null)}
        />
      )}

      {galleryIndex !== null && (
        <PhotoGalleryModal
          photos={reviewPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          userNeeds={[...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])]}
          onReportReview={isAuthenticated ? handleReportReview : undefined}
          reportedReviewIds={reportedReviewIds}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBack: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  errorBackText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  bodyRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  bodyRatingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  bodyRatingCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bodyNoRating: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  mapsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  mapsChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  separator: {
    height: 8,
    backgroundColor: theme.colors.background,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  photoAndMenuSection: {
    backgroundColor: theme.colors.surface,
  },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  thumbMatchBadge: {
    position: 'absolute', bottom: 5, left: 5,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  thumbMatchText: {
    fontSize: 10, fontWeight: '700',
  },
  thumbMoreOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  thumbMoreText: {
    color: '#fff', fontSize: 18, fontWeight: '700',
  },
  ctaSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: 10,
  },
  ctaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ctaHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  userContribText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
  },
  footerSection: { backgroundColor: theme.colors.surface },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  footerRowText: { fontSize: 14, color: theme.colors.textSecondary, flex: 1 },
});
