import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  useWindowDimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { REPORT_REASON_MAP } from '../../constants/reportReasons';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../StarRating';
import ImageFullscreenModal from '../ImageFullscreenModal';
import RestaurantHeader from './RestaurantHeader';
import MenuPhotosSection from './MenuPhotosSection';
import ReviewCard from './ReviewCard';
import PhotoGalleryModal from './PhotoGalleryModal';
import LoginGateCta from './LoginGateCta';
import DraggableBottomSheet, { type DraggableBottomSheetRef } from '../DraggableBottomSheet';
import { useRestaurantDetail, type ReviewSortOrder } from '../../hooks/useRestaurantDetail';
import { RestaurantService } from '../../services/restaurantService';
import type { AppLanguage } from '../../types';
import i18n from '../../utils/i18n';

// ─── snap points ─────────────────────────────────────────────────────────────
// index 0 = off-screen (dismiss), index 1 = half open, index 2 = full open
const SNAP_POINTS = [0, 0.55, 0.92];
const INITIAL_INDEX = 1;

// ─── Photo helpers (local to this file) ──────────────────────────────────────
const PHOTO_GAP = 3;
const MAX_VISIBLE_PHOTOS = 6;

function AllergenCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={photoGridStyles.allergenBadge}>
      <MaterialCommunityIcons name="alert-circle" size={10} color={theme.colors.warning} />
      <Text style={photoGridStyles.allergenBadgeText}>{count}</Text>
    </View>
  );
}

function PhotoGrid({
  photos,
  containerWidth,
  onPress,
}: {
  photos: { url: string; thumbnailUrl: string; allergenCount?: number }[];
  containerWidth: number;
  onPress: (idx: number) => void;
}) {
  if (photos.length === 0) return null;

  const hasMore = photos.length > MAX_VISIBLE_PHOTOS;
  const moreCount = photos.length - MAX_VISIBLE_PHOTOS;
  const visible = photos.slice(0, MAX_VISIBLE_PHOTOS);
  const placeholder = { backgroundColor: theme.colors.background };

  if (photos.length === 1) {
    return (
      <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.85}>
        <Image
          source={{ uri: photos[0].url }}
          style={{ width: containerWidth, height: 220, borderRadius: 10, ...placeholder }}
          resizeMode="cover"
        />
        <AllergenCountBadge count={photos[0].allergenCount ?? 0} />
      </TouchableOpacity>
    );
  }

  if (photos.length === 2) {
    const w = (containerWidth - PHOTO_GAP) / 2;
    return (
      <View style={{ flexDirection: 'row', gap: PHOTO_GAP }}>
        {photos.map((photo, idx) => (
          <TouchableOpacity key={photo.url} onPress={() => onPress(idx)} activeOpacity={0.85}>
            <Image
              source={{ uri: photo.url }}
              style={{ width: w, height: 190, borderRadius: 10, ...placeholder }}
              resizeMode="cover"
            />
            <AllergenCountBadge count={photo.allergenCount ?? 0} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const heroW = Math.floor(containerWidth * 0.62);
  const smallW = containerWidth - heroW - PHOTO_GAP;
  const heroH = 200;
  const smallH = Math.floor((heroH - PHOTO_GAP) / 2);
  const secondRow = visible.slice(3);
  const colCount = secondRow.length;
  const colW = colCount > 0
    ? Math.floor((containerWidth - PHOTO_GAP * (colCount - 1)) / colCount)
    : 0;

  return (
    <View style={{ gap: PHOTO_GAP }}>
      <View style={{ flexDirection: 'row', gap: PHOTO_GAP }}>
        <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.85}>
          <Image
            source={{ uri: photos[0].url }}
            style={{ width: heroW, height: heroH, borderRadius: 10, ...placeholder }}
            resizeMode="cover"
          />
          <AllergenCountBadge count={photos[0].allergenCount ?? 0} />
        </TouchableOpacity>
        <View style={{ gap: PHOTO_GAP }}>
          {visible.slice(1, 3).map((photo, i) => (
            <TouchableOpacity key={photo.url} onPress={() => onPress(i + 1)} activeOpacity={0.85}>
              <Image
                source={{ uri: photo.thumbnailUrl }}
                style={{ width: smallW, height: smallH, borderRadius: 10, ...placeholder }}
                resizeMode="cover"
              />
              <AllergenCountBadge count={photo.allergenCount ?? 0} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {secondRow.length > 0 && (
        <View style={{ flexDirection: 'row', gap: PHOTO_GAP }}>
          {secondRow.map((photo, i) => {
            const idx = i + 3;
            const isLast = i === secondRow.length - 1 && hasMore;
            return (
              <TouchableOpacity key={photo.url} onPress={() => onPress(idx)} activeOpacity={0.85}>
                <Image
                  source={{ uri: photo.thumbnailUrl }}
                  style={{ width: colW, height: 104, borderRadius: 10, ...placeholder }}
                  resizeMode="cover"
                />
                <AllergenCountBadge count={photo.allergenCount ?? 0} />
                {isLast && (
                  <View style={photoGridStyles.moreOverlay}>
                    <Text style={photoGridStyles.moreCount}>+{moreCount}</Text>
                    <Text style={photoGridStyles.moreLabel}>foto</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const photoGridStyles = StyleSheet.create({
  moreOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  moreCount: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 30 },
  moreLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' },
  allergenBadge: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  allergenBadgeText: { color: theme.colors.warning, fontSize: 11, fontWeight: '700' },
});

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  restaurantId: string;
  onClose: () => void;
};

export default function RestaurantDetailSheet({ restaurantId, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, dietaryNeeds } = useAuth();
  const lang = i18n.locale as AppLanguage;
  const { width: screenWidth } = useWindowDimensions();

  const sheetRef = useRef<DraggableBottomSheetRef>(null);

  const {
    restaurant, allReviews, menuPhotos,
    reports, cuisineVotes, userReview, userReport, isFavorite,
    isLoading, error, isUploadingMenu, userHasReviews, isUpdatingMenuUrl,
    reviewSortOrder, setReviewSortOrder, hasUserNeeds,
    handleToggleFavorite, handleToggleReviewLike, navigateToContribute,
    handleAddMenuPhoto, handleDeleteMenuPhoto, handleUpdateMenuUrl,
  } = useRestaurantDetail(restaurantId);

  const scrollViewRef = useRef<ScrollView>(null);
  const reviewsOffsetY = useRef(0);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Dismiss animation → triggers onClose via onSnapChange(0)
  const handleDismiss = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleSnapChange = useCallback((fraction: number) => {
    if (fraction < 0.1) {
      onClose();
    }
  }, [onClose]);

  // Android back button closes the sheet
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [handleDismiss]);

  const reviewPhotos = useMemo(
    () => allReviews.flatMap(r => {
      const allergenCount = (r.allergensSnapshot?.length ?? 0) + (r.dietarySnapshot?.length ?? 0);
      return r.photos.map(p => ({
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        displayName: r.displayName ?? '',
        avatarUrl: r.avatarUrl,
        profileColor: r.profileColor,
        rating: r.rating,
        text: r.text,
        allergensSnapshot: r.allergensSnapshot,
        dietarySnapshot: r.dietarySnapshot,
        allergenCount,
      }));
    }),
    [allReviews],
  );

  const matchInfo = useMemo(() => {
    if (!hasUserNeeds) return { reviewCount: 0, coveredCount: 0, totalFilters: 0, covered: [] as string[], uncovered: [] as string[] };
    const userAll: string[] = [...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])];
    const userSet = new Set(userAll);
    const coveredSet = new Set<string>();
    let reviewCount = 0;
    for (const r of allReviews) {
      const snap = [...(r.allergensSnapshot ?? []), ...(r.dietarySnapshot ?? [])];
      if (snap.some(a => userSet.has(a))) {
        reviewCount++;
        snap.forEach(a => { if (userSet.has(a)) coveredSet.add(a); });
      }
    }
    const covered = userAll.filter(a => coveredSet.has(a));
    const uncovered = userAll.filter(a => !coveredSet.has(a));
    return { reviewCount, coveredCount: coveredSet.size, totalFilters: userAll.length, covered, uncovered };
  }, [allReviews, dietaryNeeds, hasUserNeeds]);

  const canRemove = restaurant
    && user?.uid === restaurant.added_by
    && (restaurant.review_count ?? 0) === 0;

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
              handleDismiss();
            } else {
              Alert.alert('Errore', 'Non è stato possibile eliminare il ristorante.');
            }
          },
        },
      ],
    );
  };

  // Auto-cleanup: rimuovi favorito orfano se il ristorante non esiste più
  useEffect(() => {
    if (!isLoading && !restaurant && user?.uid && restaurantId) {
      RestaurantService.removeFavorite(user.uid, restaurantId);
    }
  }, [isLoading, restaurant, user?.uid, restaurantId]);

  // ─── Sheet header (azioni + pulsante Maps) ────────────────────────────────
  const mapsUrl = restaurant?.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.google_place_id}`
    : restaurant?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
      : null;

  const sheetHeader = (
    <View style={styles.sheetHeader}>
      {/* Row 1: name (multiline, flex-1) + heart + close — all top-aligned */}
      <View style={styles.sheetNameRow}>
        <Text style={styles.sheetName}>{restaurant?.name ?? ''}</Text>
        <TouchableOpacity onPress={handleToggleFavorite} hitSlop={10} activeOpacity={0.6} style={styles.sheetActionBtn}>
          <MaterialCommunityIcons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? theme.colors.error : theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} hitSlop={10} activeOpacity={0.6} style={styles.sheetActionBtn}>
          <MaterialCommunityIcons name="close" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {/* Row 2: rating + Maps chip — only when data available */}
      {restaurant && (
        <View style={styles.sheetRatingRow}>
          {(restaurant.review_count ?? 0) > 0 ? (
            <View style={styles.sheetRatingGroup}>
              <StarRating rating={restaurant.average_rating ?? 0} size={15} showValue />
              <Text style={styles.sheetRatingCount}>({restaurant.review_count})</Text>
            </View>
          ) : (
            <Text style={styles.sheetNoRating}>Nessuna recensione</Text>
          )}
          {mapsUrl && (
            <TouchableOpacity
              style={styles.mapsChip}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(mapsUrl).catch(() => Alert.alert('Errore', 'Impossibile aprire Maps'))}
            >
              <MaterialCommunityIcons name="google-maps" size={15} color="#EA4335" />
              <Text style={styles.mapsChipText}>Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ─── Body content ──────────────────────────────────────────────────────────
  const bodyContent = () => {
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
          <TouchableOpacity onPress={handleDismiss} style={styles.errorBack}>
            <Text style={styles.errorBackText}>Chiudi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <RestaurantHeader
          restaurant={restaurant}
          lang={lang}
          cuisineVotes={cuisineVotes}
          matchInfo={matchInfo}
          hasUserNeeds={hasUserNeeds}
          isAuthenticated={isAuthenticated}
          onScrollToReviews={() => scrollViewRef.current?.scrollTo({ y: reviewsOffsetY.current, animated: true })}
          hideNameAndRating
        />

        <View style={styles.separator} />

        {isAuthenticated ? (
          <MenuPhotosSection
            menuPhotos={menuPhotos}
            currentUserId={user?.uid}
            isUploading={isUploadingMenu}
            canUpload={userHasReviews}
            menuUrl={restaurant.menu_url}
            onAddPhoto={handleAddMenuPhoto}
            onDeletePhoto={handleDeleteMenuPhoto}
            onPhotoPress={setFullscreenImage}
            onUpdateMenuUrl={handleUpdateMenuUrl}
            isUpdatingMenuUrl={isUpdatingMenuUrl}
          />
        ) : (
          <LoginGateCta
            title="Accedi per vedere il menu"
            subtitle="Foto del menu aggiunte dalla community"
          />
        )}

        {isAuthenticated && reviewPhotos.length > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.section}>
              <View style={styles.photosSectionHeader}>
                <Text style={styles.sectionTitle}>Foto ({reviewPhotos.length})</Text>
                {reviewPhotos.length > 1 && (
                  <TouchableOpacity onPress={() => setGalleryIndex(0)} hitSlop={8} activeOpacity={0.7}>
                    <Text style={styles.viewAllText}>Vedi tutte</Text>
                  </TouchableOpacity>
                )}
              </View>
              <PhotoGrid
                photos={reviewPhotos}
                containerWidth={screenWidth - 32}
                onPress={setGalleryIndex}
              />
            </View>
          </>
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
                  <Text style={styles.ctaTitle}>Sei stato qui?</Text>
                  <StarRating rating={0} size={36} onRate={(r) => navigateToContribute(r)} />
                  <Text style={styles.ctaHint}>Tocca per valutare e lasciare una recensione</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.separator} onLayout={(e) => { reviewsOffsetY.current = e.nativeEvent.layout.y; }} />

        {isAuthenticated ? (
          allReviews.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.reviewsHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recensioni ({allReviews.length})</Text>
                {allReviews.length > 1 && (
                  <View style={styles.reviewSortRow}>
                    {([
                      { key: 'recent' as ReviewSortOrder, label: 'Recenti', icon: 'clock-outline' },
                      { key: 'rating' as ReviewSortOrder, label: 'Stelle', icon: 'star-outline' },
                      { key: 'likes' as ReviewSortOrder, label: 'Più utili', icon: 'thumb-up-outline' },
                      ...(hasUserNeeds
                        ? [{ key: 'relevance' as ReviewSortOrder, label: 'Per me', icon: 'shield-check' }]
                        : []),
                    ] as const).map(opt => {
                      const isRating = opt.key === 'rating';
                      const active = isRating
                        ? reviewSortOrder === 'rating' || reviewSortOrder === 'rating-asc'
                        : reviewSortOrder === opt.key;
                      const onPress = () => {
                        if (isRating) {
                          setReviewSortOrder(reviewSortOrder === 'rating' ? 'rating-asc' : 'rating');
                        } else {
                          setReviewSortOrder(opt.key);
                        }
                      };
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={onPress}
                          style={[styles.reviewSortChip, active && styles.reviewSortChipActive]}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={opt.icon as any}
                            size={14}
                            color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
                          />
                          {active && (
                            <Text style={[styles.reviewSortChipText, styles.reviewSortChipTextActive]}>
                              {opt.label}
                            </Text>
                          )}
                          {active && isRating && (
                            <MaterialCommunityIcons
                              name={reviewSortOrder === 'rating-asc' ? 'chevron-up' : 'chevron-down'}
                              size={12}
                              color={theme.colors.onPrimary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
              {allReviews.map((item, idx) => (
                <View key={item.key}>
                  {idx > 0 && <Divider style={styles.divider} />}
                  <ReviewCard
                    review={item}
                    userNeeds={[...(dietaryNeeds.allergens ?? []), ...(dietaryNeeds.diets ?? [])]}
                    onImagePress={(url) => {
                      const i = reviewPhotos.findIndex(p => p.url === url);
                      if (i >= 0) setGalleryIndex(i);
                      else setFullscreenImage(url);
                    }}
                    onLike={() => handleToggleReviewLike(item.reviewId)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <MaterialCommunityIcons name="comment-text-outline" size={36} color={theme.colors.textDisabled} />
              <Text style={styles.emptySectionTitle}>Ancora nessuna recensione</Text>
              <Text style={styles.emptySectionText}>Sii il primo a condividere la tua esperienza</Text>
            </View>
          )
        ) : (
          <LoginGateCta
            title="Accedi per vedere le recensioni"
            subtitle="Leggi le esperienze della community e lascia la tua valutazione"
          />
        )}

        {reports.length > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.section}>
              <View style={styles.reportSectionHeader}>
                <MaterialCommunityIcons name="flag-outline" size={18} color={theme.colors.amberDark} />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Segnalazioni ({reports.length})</Text>
              </View>
              {reports.map((report, idx) => {
                const reasonInfo = REPORT_REASON_MAP[report.reason as keyof typeof REPORT_REASON_MAP] ?? REPORT_REASON_MAP.other;
                return (
                  <View key={report.id}>
                    {idx > 0 && <Divider style={styles.divider} />}
                    <View style={styles.reportRow}>
                      <View style={styles.reportTop}>
                        <View style={styles.reportAvatar}>
                          <MaterialCommunityIcons name="account-outline" size={16} color={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.contributionMeta}>
                          <Text style={styles.contributionAuthor}>Utente</Text>
                          <Text style={styles.contributionDate}>
                            {new Date(report.created_at).toLocaleDateString(i18n.locale, {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <View style={styles.reportReasonBadge}>
                          <Text style={styles.reportReasonBadgeText}>{reasonInfo.icon} {reasonInfo.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.contributionText}>{report.details}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

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
    );
  };

  return (
    <>
      <DraggableBottomSheet
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        initialIndex={INITIAL_INDEX}
        enterFromBottom
        headerContent={sheetHeader}
        onSnapChange={handleSnapChange}
        style={styles.detailSheetElevation}
      >
        {bodyContent()}
      </DraggableBottomSheet>

      <ImageFullscreenModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      {galleryIndex !== null && (
        <PhotoGalleryModal
          photos={reviewPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  detailSheetElevation: {
    elevation: 16,
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  sheetName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  sheetActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  sheetRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  sheetRatingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  sheetRatingCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sheetNoRating: {
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
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
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
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewSortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewSortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  reviewSortChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reviewSortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  reviewSortChipTextActive: {
    color: theme.colors.onPrimary,
  },
  emptySection: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: 8,
  },
  emptySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySectionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 14,
  },
  reportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  reportRow: { gap: 6 },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  contributionMeta: { flex: 1 },
  contributionAuthor: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  contributionDate: { fontSize: 12, color: theme.colors.textSecondary },
  contributionText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },
  reportReasonBadge: {
    backgroundColor: theme.colors.amberLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reportReasonBadgeText: { fontSize: 11, fontWeight: '500', color: theme.colors.amberText },
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
