import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AppTheme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService } from '../../../services/restaurantService';
import type { UserReview } from '../../../services/restaurantService';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileMapList from '../../../components/ProfileMapList';
import UserReviewCard from '../../../components/UserReviewCard';
import FollowButton from '../../../components/FollowButton';
import { FollowService } from '../../../services/followService';
import i18n from '../../../utils/i18n';
import type { UserProfile } from '../../../services/auth';
import { getAnonymousLabel } from '../../../utils/anonymousLabel';
import { venueIconName } from '../../../constants/restaurantCategories';
import AppHeader from '../../components/AppHeader';

const getReviewLocation = (r: UserReview) => ({
  city: r.restaurant_city,
  country: r.restaurant_country,
  countryCode: r.restaurant_country_code,
});

export default function PublicProfileScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    (async () => {
      try {
        const [prof, contribs, totalReviews, totalLikes, isFollowing] = await Promise.all([
          AuthService.getUserProfile(uid),
          RestaurantService.getReviewsByUser(uid),
          RestaurantService.getReviewCountByUser(uid),
          RestaurantService.getLikesReceivedByUser(uid),
          FollowService.isFollowing(uid).catch(() => false),
        ]);
        setProfile(prof);
        setReviews(contribs);
        setReviewCount(totalReviews);
        setLikesReceived(totalLikes);
        setFollowing(isFollowing);
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

  // Pill "Segui": mai su anonimi (non followabili), su se stessi, o prima che
  // lo stato iniziale sia noto (evita il flash Segui → Già segui).
  const canFollow =
    !!user?.uid && user.uid !== uid && !!profile && !profile.is_anonymous && following !== null;

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
      <ProfileMapList<UserReview>
        profile={visibleProfile!}
        stats={{ reviews: reviewCount, likes: likesReceived }}
        onBack={() => router.back()}
        nameAccessory={
          canFollow ? (
            <FollowButton userId={user!.uid} targetId={uid} initialFollowing={following!} />
          ) : undefined
        }
        items={reviews}
        getLocation={getReviewLocation}
        getMapPin={(r) => ({
          id: r.restaurant_id,
          name: r.restaurant_name ?? '',
          location: r.restaurant_lat != null && r.restaurant_lng != null
            ? { latitude: r.restaurant_lat, longitude: r.restaurant_lng }
            : null,
          is_favorite: false,
          offers_lodging: r.restaurant_offers_lodging ?? false,
        })}
        getPinId={(r) => r.restaurant_id}
        getRowKey={(r) => r.id}
        renderRow={(r, onPress) => <UserReviewCard review={r} onPress={onPress} />}
        sectionTitle={i18n.t('restaurants.user.reviewsLabel')}
        typeFilter={{
          getKey: (r) => (r.restaurant_offers_lodging ? 'lodging' : 'restaurant'),
          types: [
            { key: 'restaurant', icon: venueIconName(false), label: i18n.t('restaurants.user.filterRestaurants') },
            { key: 'lodging', icon: venueIconName(true), label: i18n.t('restaurants.user.filterLodging') },
          ],
        }}
      />
    </>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
});
