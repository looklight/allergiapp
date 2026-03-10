import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
import DishesSection from '../../components/restaurants/DishesSection';
import ReviewCard from '../../components/restaurants/ReviewCard';
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
    restaurant, allReviews, aggregatedDishes, menuPhotos,
    reports, userReview, userReport, isFavorite,
    isLoading, isUploadingMenu,
    handleToggleFavorite, navigateToContribute,
    handleAddMenuPhoto, handleDeleteMenuPhoto,
    toggleLike, isDishLiked, getLikers,
  } = useRestaurantDetail(id);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenDish, setFullscreenDish] = useState<{ photo_url?: string | null; name: string; description?: string } | null>(null);
  const [tappedBadge, setTappedBadge] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
          tappedBadge={tappedBadge}
          onTapBadge={setTappedBadge}
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
            {(userReview.dishes?.length ?? 0) > 0 && (
              <Text style={styles.ctaHint}>
                {userReview.dishes!.length} piatt{userReview.dishes!.length === 1 ? 'o' : 'i'} segnalat{userReview.dishes!.length === 1 ? 'o' : 'i'}
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

        {/* Piatti della community */}
        <DishesSection
          aggregatedDishes={aggregatedDishes}
          userId={user?.uid}
          onDishPress={setFullscreenDish}
          onToggleLike={toggleLike}
        />

        {/* Esperienze della community */}
        {allReviews.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionTitle}>Esperienze ({allReviews.length})</Text>
            {allReviews.map((item, idx) => (
              <View key={item.key}>
                {idx > 0 && <Divider style={styles.divider} />}
                <ReviewCard
                  review={item}
                  getLikers={getLikers}
                  isDishLiked={isDishLiked}
                  toggleLike={toggleLike}
                  onDishPress={setFullscreenDish}
                  onImagePress={setFullscreenImage}
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
                          {new Date(report.created_at).toLocaleDateString('it-IT', {
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

      {/* Modal immagine fullscreen */}
      <ImageFullscreenModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      {/* Modal piatto fullscreen */}
      <ImageFullscreenModal
        visible={!!fullscreenDish}
        imageUrl={fullscreenDish?.photo_url ?? undefined}
        onClose={() => setFullscreenDish(null)}
        placeholder={
          <View style={styles.dishFullscreenPlaceholder}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={80} color={theme.colors.primary} />
          </View>
        }
      >
        <View style={styles.dishFullscreenInfo}>
          <Text style={styles.dishFullscreenName}>{fullscreenDish?.name}</Text>
          {fullscreenDish?.description && (
            <Text style={styles.dishFullscreenDescription}>{fullscreenDish.description}</Text>
          )}
        </View>
      </ImageFullscreenModal>
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
  // Fullscreen dish
  dishFullscreenPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishFullscreenInfo: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  dishFullscreenName: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: theme.colors.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  dishFullscreenDescription: {
    color: theme.colors.overlayLight,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    textShadowColor: theme.colors.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
