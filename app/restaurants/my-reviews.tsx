import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import type { Review } from '../../services/restaurantService';
import { useUserItemList } from '../../hooks/useUserItemList';
import HeaderBar from '../../components/HeaderBar';
import EmptyStateCard from '../../components/EmptyStateCard';
import StarRating from '../../components/StarRating';
import i18n from '../../utils/i18n';

function ReviewCard({
  item,
  onPress,
}: {
  item: Review & { restaurant_name?: string };
  onPress: () => void;
}) {
  const date = new Date(item.created_at).toLocaleDateString(i18n.locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="store" size={16} color={theme.colors.primary} />
          <Text style={styles.cardName} numberOfLines={1}>
            {item.restaurant_name ?? 'Ristorante'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </View>

        {item.rating != null && item.rating > 0 && (
          <View style={styles.rating}>
            <StarRating rating={item.rating} size={14} />
          </View>
        )}

        {item.comment ? (
          <Text style={styles.comment} numberOfLines={3}>{item.comment}</Text>
        ) : null}

        <View style={styles.footer}>
          {(item.photos?.length ?? 0) > 0 && (
            <Text style={styles.footerText}>
              {item.photos.length} foto
            </Text>
          )}
          <Text style={styles.date}>{date}</Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

const fetchReviews = (userId: string) => RestaurantService.getReviewsByUser(userId);

export default function MyReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: reviews, isLoading } = useUserItemList<Review & { restaurant_name?: string }>(fetchReviews);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <HeaderBar title="Le mie recensioni" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyStateCard
          icon="⭐"
          title="Nessuna recensione ancora"
          subtitle="Visita un ristorante e condividi la tua esperienza con gli altri utenti."
          buttonLabel="Esplora ristoranti"
          onPress={() => router.back()}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <ReviewCard
              item={item}
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
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  rating: {
    marginTop: 8,
  },
  comment: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
