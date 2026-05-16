import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService } from '../../../services/restaurantService';
import type { UserReview } from '../../../services/restaurantService';
import { useAuth } from '../../../contexts/AuthContext';
import ProfileCard from '../../../components/ProfileCard';
import UserReviewCard from '../../../components/UserReviewCard';
import LocationStatsHeader from '../../../components/LocationStatsHeader';
import CountryFilterChips from '../../../components/CountryFilterChips';
import { useLocationFilters } from '../../../hooks/useLocationFilters';
import i18n from '../../../utils/i18n';
import type { UserProfile } from '../../../services/auth';
import { getAnonymousLabel } from '../../../utils/anonymousLabel';

const getReviewLocation = (r: UserReview) => ({
  city: r.restaurant_city,
  country: r.restaurant_country,
});

export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { stats, countryOptions, selectedCountry, setSelectedCountry, filteredItems: filteredReviews } =
    useLocationFilters(reviews, getReviewLocation);

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    (async () => {
      try {
        const [prof, contribs] = await Promise.all([
          AuthService.getUserProfile(uid),
          RestaurantService.getReviewsByUser(uid),
        ]);
        setProfile(prof);
        setReviews(contribs);
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
        <View style={[styles.simpleHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t('restaurants.profile.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
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
        onBack={() => router.back()}
      >
        {reviews.length > 0 && (
          <>
            <LocationStatsHeader stats={stats} itemsLabelKey="restaurants.user.stats.reviews" />
            <CountryFilterChips
              options={countryOptions}
              selected={selectedCountry}
              onSelect={setSelectedCountry}
            />
            <Text style={styles.sectionTitle}>{i18n.t('restaurants.user.reviewsLabel')}</Text>
            {filteredReviews.map((c) => (
              <UserReviewCard
                key={c.id}
                review={c}
                onPress={() => router.push(`/restaurants/${c.restaurant_id}`)}
              />
            ))}
          </>
        )}
      </ProfileCard>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  simpleHeader: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
