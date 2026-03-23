import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import type { Review } from '../../services/restaurantService';
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

export default function MyReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<(Review & { restaurant_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await RestaurantService.getReviewsByUser(user.uid);
    setReviews(result);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Le mie recensioni</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>Nessuna recensione ancora</Text>
          <Text style={styles.emptySubtitle}>
            Visita un ristorante e condividi la tua esperienza con gli altri utenti.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.emptyButton}
          >
            Esplora ristoranti
          </Button>
        </View>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 10,
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
