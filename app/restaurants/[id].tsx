import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '../../constants/theme';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';
import RestaurantDetailBody from '../../components/restaurants/RestaurantDetailBody';
import AppHeader from '../components/AppHeader';
import i18n from '../../utils/i18n';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useRestaurantDetail(id);

  const handleDismiss = () => router.back();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <AppHeader
        title={detail.restaurant?.name ?? (detail.isLoading ? ' ' : i18n.t('restaurants.myReviews.restaurantFallback'))}
        onLeadingPress={handleDismiss}
        actions={detail.restaurant ? [{
          icon: detail.isFavorite ? 'heart' : 'heart-outline',
          onPress: detail.handleToggleFavorite,
          accessibilityLabel: i18n.t(detail.isFavorite ? 'restaurants.detail.removeFavorite' : 'restaurants.detail.addFavorite'),
        }] : undefined}
      />

      <RestaurantDetailBody
        restaurantId={id}
        detail={detail}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
});
