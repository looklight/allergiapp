import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '../../constants/theme';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';
import RestaurantDetailBody from '../../components/restaurants/RestaurantDetailBody';
import HeaderBar from '../../components/HeaderBar';
import i18n from '../../utils/i18n';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useRestaurantDetail(id);

  const handleDismiss = () => router.back();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar
        title={detail.restaurant?.name ?? (detail.isLoading ? ' ' : i18n.t('restaurants.myReviews.restaurantFallback'))}
        onBack={handleDismiss}
        right={detail.restaurant ? (
          <TouchableOpacity onPress={detail.handleToggleFavorite} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons
              name={detail.isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>
        ) : undefined}
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
