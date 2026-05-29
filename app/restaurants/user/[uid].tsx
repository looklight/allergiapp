import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService } from '../../../services/restaurantService';
import type { UserReview } from '../../../services/restaurantService';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileMapList from '../../../components/ProfileMapList';
import UserReviewCard from '../../../components/UserReviewCard';
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
      <ProfileMapList<UserReview>
        profile={visibleProfile!}
        stats={{ reviews: reviewCount, likes: likesReceived }}
        onBack={() => router.back()}
        items={reviews}
        getLocation={getReviewLocation}
        getMapPin={(r) => ({
          id: r.restaurant_id,
          name: r.restaurant_name ?? '',
          location: r.restaurant_lat != null && r.restaurant_lng != null
            ? { latitude: r.restaurant_lat, longitude: r.restaurant_lng }
            : null,
          is_favorite: false,
        })}
        getPinId={(r) => r.restaurant_id}
        getRowKey={(r) => r.id}
        renderRow={(r, onPress) => <UserReviewCard review={r} onPress={onPress} />}
        sectionTitle={i18n.t('restaurants.user.reviewsLabel')}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
  },
});
