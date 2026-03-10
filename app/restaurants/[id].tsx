import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, useWindowDimensions } from 'react-native';
import { Text, Surface, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { REPORT_REASON_MAP } from '../../constants/reportReasons';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from '../../components/StarRating';
import ImageFullscreenModal from '../../components/ImageFullscreenModal';
import RestaurantHeader from '../../components/restaurants/RestaurantHeader';
import MenuPhotosSection from '../../components/restaurants/MenuPhotosSection';
import ReviewCard from '../../components/restaurants/ReviewCard';
import PhotoGalleryModal from '../../components/restaurants/PhotoGalleryModal';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';
import { RestaurantService } from '../../services/restaurantService';
import type { AppLanguage } from '../../types';
import i18n from '../../utils/i18n';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const lang = i18n.locale as AppLanguage;

  const {
    restaurant, allReviews, menuPhotos,
    reports, cuisineVotes, userReview, userReport, isFavorite,
    isLoading, isUploadingMenu,
    handleToggleFavorite, navigateToContribute,
    handleAddMenuPhoto, handleDeleteMenuPhoto,
  } = useRestaurantDetail(id);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Raccogli tutte le foto dalle recensioni con metadata autore
  const reviewPhotos = useMemo(
    () => allReviews.flatMap(r =>
      r.photos.map(p => ({
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        displayName: r.displayName,
        rating: r.rating,
        text: r.text,
      }))
    ),
    [allReviews],
  );
  const userPhotoSize = 88;

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
              router.back();
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
    if (!isLoading && !restaurant && user?.uid && id) {
      RestaurantService.removeFavorite(user.uid, id);
    }
  }, [isLoading, restaurant, user?.uid, id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}> </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.customHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ristorante</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Ristorante non trovato.</Text>
          <Button onPress={() => router.back()}>Torna indietro</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleFavorite} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>

        {/* Info principali */}
        <RestaurantHeader
          restaurant={restaurant}
          lang={lang}
          cuisineVotes={cuisineVotes}
        />

        {/* Foto Menu */}
        <MenuPhotosSection
          menuPhotos={menuPhotos}
          currentUserId={user?.uid}
          isUploading={isUploadingMenu}
          onAddPhoto={handleAddMenuPhoto}
          onDeletePhoto={handleDeleteMenuPhoto}
          onPhotoPress={setFullscreenImage}
        />

        {/* Foto degli utenti — carosello orizzontale */}
        {reviewPhotos.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionTitle}>Foto degli utenti ({reviewPhotos.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.userPhotosScroll}
            >
              {reviewPhotos.map((photo, idx) => (
                <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => setGalleryIndex(idx)}>
                  <Image
                    source={{ uri: photo.thumbnailUrl }}
                    style={[styles.userPhoto, { width: userPhotoSize, height: userPhotoSize }]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Surface>
        )}

        {/* CTA — Contributo utente o valuta con stelle */}
        {userReview ? (
          <Surface style={styles.ctaCard} elevation={1}>
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
            {(userReview.photos?.length ?? 0) > 0 && (
              <Text style={styles.ctaHint}>
                {userReview.photos.length} foto
              </Text>
            )}
          </Surface>
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigateToContribute()}>
            <Surface style={styles.ctaCard} elevation={1}>
              <Text style={styles.ctaTitle}>Sei stato qui?</Text>
              <StarRating rating={0} size={36} onRate={(r) => navigateToContribute(r)} />
              <Text style={styles.ctaHint}>Tocca per valutare e lasciare una recensione</Text>
            </Surface>
          </TouchableOpacity>
        )}

        {/* Esperienze della community */}
        {allReviews.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionTitle}>Recensioni ({allReviews.length})</Text>
            {allReviews.map((item, idx) => (
              <View key={item.key}>
                {idx > 0 && <Divider style={styles.divider} />}
                <ReviewCard
                  review={item}
                  onImagePress={(url) => {
                    const idx = reviewPhotos.findIndex(p => p.url === url);
                    if (idx >= 0) setGalleryIndex(idx);
                    else setFullscreenImage(url);
                  }}
                />
              </View>
            ))}
          </Surface>
        )}

        {/* Segnalazioni della community */}
        {reports.length > 0 && (
          <Surface style={styles.section} elevation={1}>
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
          </Surface>
        )}

        {/* Elimina ristorante (solo owner, senza contributi) */}
        {canRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            activeOpacity={0.6}
            disabled={isRemoving}
            onPress={handleRemoveRestaurant}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <>
                <MaterialCommunityIcons name="delete-outline" size={16} color={theme.colors.error} />
                <Text style={styles.removeButtonText}>Elimina ristorante</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Segnala un problema */}
        <TouchableOpacity
          style={styles.reportButton}
          activeOpacity={0.6}
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/auth/login');
              return;
            }
            if (userReport) {
              Alert.alert('Già segnalato', 'Hai già segnalato questo ristorante.');
              return;
            }
            router.push(`/restaurants/report?restaurantId=${id}&restaurantName=${encodeURIComponent(restaurant?.name ?? '')}`);
          }}
        >
          <MaterialCommunityIcons name="flag-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.reportButtonText}>
            {userReport ? 'Hai già segnalato questo ristorante' : 'Segnala un problema'}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal immagine singola (menu, review inline) */}
      <ImageFullscreenModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      {/* Gallery fullscreen — foto utenti con swipe */}
      {galleryIndex !== null && (
        <PhotoGalleryModal
          photos={reviewPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  content: {
    padding: 12,
    gap: 12,
  },
  section: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  // CTA stelle
  ctaCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    gap: 10,
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
  ctaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  reportRow: {
    gap: 6,
  },
  reportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributionMeta: {
    flex: 1,
  },
  contributionAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contributionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  contributionText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  reportReasonBadge: {
    backgroundColor: theme.colors.amberLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reportReasonBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.amberText,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  removeButtonText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '500',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  reportButtonText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  userPhotosScroll: {
    gap: 8,
  },
  userPhoto: {
    borderRadius: 10,
  },
});
