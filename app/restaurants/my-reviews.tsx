import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import type { UserReview } from '../../services/restaurantService';
import { useUserItemList } from '../../hooks/useUserItemList';
import { useLocationFilters } from '../../hooks/useLocationFilters';
import AppHeader from '../components/AppHeader';
import EmptyStateCard from '../../components/EmptyStateCard';
import UserReviewCard from '../../components/UserReviewCard';
import LocationStatsHeader from '../../components/LocationStatsHeader';
import CountryFilterChips from '../../components/CountryFilterChips';
import i18n from '../../utils/i18n';

const fetchReviews = (userId: string) => RestaurantService.getReviewsByUser(userId);
const getReviewLocation = (r: UserReview) => ({
  city: r.restaurant_city,
  country: r.restaurant_country,
  countryCode: r.restaurant_country_code,
});

export default function MyReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: reviews, isLoading } = useUserItemList<UserReview>(fetchReviews);
  const { stats, countryOptions, selectedCountry, setSelectedCountry, filteredItems: filteredReviews } =
    useLocationFilters(reviews, getReviewLocation);

  const listHeader = reviews.length > 0 ? (
    <View style={styles.headerBlock}>
      <LocationStatsHeader stats={stats} itemsLabelKey="restaurants.user.stats.reviews" />
      <CountryFilterChips
        options={countryOptions}
        selected={selectedCountry}
        onSelect={setSelectedCountry}
        edgeBleed={12}
      />
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={i18n.t('restaurants.myReviews.title')} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyStateCard
          icon="⭐"
          title={i18n.t('restaurants.myReviews.emptyTitle')}
          subtitle={i18n.t('restaurants.myReviews.emptySubtitle')}
          buttonLabel={i18n.t('restaurants.favorites.emptyButton')}
          onPress={() => router.back()}
        />
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={item => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <UserReviewCard
              review={item}
              onPress={() => router.push(`/restaurants/${item.restaurant_id}`)}
            />
          )}
        />
      )}
    </View>
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
    padding: 32,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  headerBlock: {
    gap: 10,
    marginBottom: 4,
  },
});
