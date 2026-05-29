import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Animated, Easing, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService } from '../../../services/restaurantService';
import type { UserReview } from '../../../services/restaurantService';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileCard from '../../../components/ProfileCard';
import Avatar from '../../../components/Avatar';
import UserReviewCard from '../../../components/UserReviewCard';
import CountryFilterChips from '../../../components/CountryFilterChips';
import MyRestaurantsMap from '../../components/my-restaurants/MyRestaurantsMap';
import RestaurantDetailSheet from '../../../components/restaurants/RestaurantDetailSheet';
import { useLocationFilters } from '../../../hooks/useLocationFilters';
import i18n from '../../../utils/i18n';
import type { UserProfile } from '../../../services/auth';
import { getAnonymousLabel } from '../../../utils/anonymousLabel';
import AppHeader from '../../components/AppHeader';

const getReviewLocation = (r: UserReview) => ({
  city: r.restaurant_city,
  country: r.restaurant_country,
  countryCode: r.restaurant_country_code,
});

export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const cardYRef = useRef<Record<string, number>>({});
  const stickyHeightRef = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { countryOptions, selectedCountry, setSelectedCountry, filteredItems: filteredReviews } =
    useLocationFilters(reviews, getReviewLocation);

  // Tap su un pin: scrolla alla recensione corrispondente (sotto l'header sticky)
  // e la evidenzia con un breve flash.
  const handlePinPress = useCallback((restaurantId: string) => {
    const y = cardYRef.current[restaurantId];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - stickyHeightRef.current - 12), animated: true });
    }
    setHighlightedId(restaurantId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 1400);
  }, []);

  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    (async () => {
      try {
        const [prof, contribs, totalReviews, totalLikes] = await Promise.all([
          AuthService.getUserProfile(uid),
          RestaurantService.getReviewsByUser(uid),
          RestaurantService.getReviewCountByUser(uid),
          RestaurantService.getLikesReceivedByUser(uid),
        ]);
        setProfile(prof);
        setReviews(contribs);
        setReviewCount(totalReviews);
        setLikesReceived(totalLikes);
      } catch (err) {
        console.warn('[PublicProfile] Errore caricamento:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, isAuthenticated]);

  // Mask username for anonymous users when viewed by others.
  // ProfileCard usa getDisplayName che oggi ritorna username; sovrascrivere
  // username con il label anonimo basta.
  const visibleProfile = profile?.is_anonymous
    ? { ...profile, username: getAnonymousLabel(uid) }
    : profile;

  if (isLoading || !profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader title={i18n.t('restaurants.profile.title')} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="large" />
          ) : (
            <Text style={styles.errorText}>{i18n.t('restaurants.user.notFound')}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileCard
        profile={visibleProfile!}
        stats={{ reviews: reviewCount, likes: likesReceived }}
        onBack={() => router.back()}
        scrollRef={scrollRef}
        stickyHeader={reviews.length > 0 ? (pinned, isPinned) => (
          <View
            style={styles.stickyHeader}
            onLayout={(e) => { stickyHeightRef.current = e.nativeEvent.layout.height; }}
          >
            <CountryFilterChips
              options={countryOptions}
              selected={selectedCountry}
              onSelect={setSelectedCountry}
            />
            {filteredReviews.length > 0 && (
              <View>
                <MyRestaurantsMap
                  items={filteredReviews.map((r) => ({
                    id: r.restaurant_id,
                    name: r.restaurant_name ?? '',
                    location: null,
                    is_favorite: false,
                  }))}
                  onSelect={handlePinPress}
                  height={260}
                />
                {/* Mini-avatar che compare in alto a sinistra sulla mappa quando
                    l'header si aggancia in cima (l'avatar grande è scrollato via).
                    Tap → torna in cima al profilo. Il touch è abilitato solo quando
                    è agganciato, così da invisibile non intercetta i tap sulla mappa. */}
                <Animated.View
                  pointerEvents={isPinned ? 'auto' : 'none'}
                  style={[styles.mapAvatar, { opacity: pinned }]}
                >
                  <TouchableOpacity
                    onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                    activeOpacity={0.7}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={i18n.t('restaurants.user.backToTop')}
                  >
                    <Avatar
                      avatarId={visibleProfile!.avatar_url}
                      isAnonymous={visibleProfile!.is_anonymous}
                      initial={visibleProfile!.username ?? undefined}
                      size={36}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </View>
        ) : undefined}
      >
        {reviews.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{i18n.t('restaurants.user.reviewsLabel')}</Text>
            {filteredReviews.map((c) => (
              <ReviewListItem
                key={c.id}
                review={c}
                highlighted={highlightedId === c.restaurant_id}
                onMeasure={(id, y) => { cardYRef.current[id] = y; }}
                onPress={() => setDetailId(c.restaurant_id)}
              />
            ))}
          </>
        )}
      </ProfileCard>

      {detailId && (
        <RestaurantDetailSheet
          restaurantId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}

/** Card recensione con misura della propria posizione (per lo scroll dai pin)
 *  e flash di evidenziazione quando viene selezionata dalla mappa. */
function ReviewListItem({
  review,
  highlighted,
  onMeasure,
  onPress,
}: {
  review: UserReview;
  highlighted: boolean;
  onMeasure: (restaurantId: string, y: number) => void;
  onPress: () => void;
}) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 1300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [highlighted, flash]);

  return (
    <View onLayout={(e) => onMeasure(review.restaurant_id, e.nativeEvent.layout.y)}>
      <UserReviewCard review={review} onPress={onPress} />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.flash,
          { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flash: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  mapAvatar: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 2,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  stickyHeader: {
    backgroundColor: theme.colors.background,
    // Sfondo a tutta larghezza (bleed oltre il padding 16 di ProfileCard) così,
    // quando le card scorrono dietro, le loro ombre non spuntano ai lati.
    // Il padding interno riporta i contenuti (chip/mappa) alla stessa posizione.
    marginHorizontal: -16,
    paddingHorizontal: 16,
    gap: 6,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
