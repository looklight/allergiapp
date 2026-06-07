import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { Platform } from 'react-native';
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail';
import RestaurantDetailBody from '../../components/restaurants/RestaurantDetailBody';
import AppHeader from '../components/AppHeader';
import i18n from '../../utils/i18n';
import { shareRestaurant } from '../../services/shareRestaurant';
import { SupabaseAnalytics } from '../../services/supabaseAnalytics';

export default function RestaurantDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useRestaurantDetail(id);

  // Track una sola volta per ingresso schermata. Tracciamo l'id grezzo;
  // l'utente loggato e' gia' catturato da auth.uid() lato RPC.
  useEffect(() => {
    if (id) SupabaseAnalytics.track('restaurant_viewed', { restaurant_id: id });
  }, [id]);

  const handleDismiss = () => router.back();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <AppHeader
        title={detail.restaurant?.name ?? (detail.isLoading ? ' ' : i18n.t('restaurants.myReviews.restaurantFallback'))}
        onLeadingPress={handleDismiss}
        actions={detail.restaurant ? [
          {
            icon: detail.isSaved ? 'bookmark' : 'bookmark-outline',
            onPress: detail.openSaveSheet,
            accessibilityLabel: i18n.t('restaurants.collections.saveTo'),
          },
          {
            // Icona platform-specific: iOS = box+freccia (Apple HIG), Android = Material share (3 nodi).
            icon: Platform.OS === 'ios' ? 'export-variant' : 'share-variant',
            onPress: () => {
              const r = detail.restaurant!;
              shareRestaurant({ id: r.id, slug: r.slug, name: r.name, city: r.city });
            },
            accessibilityLabel: i18n.t('share.shareRestaurant'),
          },
        ] : undefined}
      />

      <RestaurantDetailBody
        restaurantId={id}
        detail={detail}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.detailSurface,
  },
});
