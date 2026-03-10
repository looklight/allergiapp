import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import type { Favorite } from '../../services/restaurantService';

function FavoriteCard({
  item,
  onPress,
  onRemove,
}: {
  item: Favorite;
  onPress: () => void;
  onRemove: () => void;
}) {

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={theme.colors.primary} />
            <Text style={styles.cardName} numberOfLines={1}>{item.restaurant?.name ?? ''}</Text>
          </View>
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <MaterialCommunityIcons name="heart" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardCity} numberOfLines={1}>
          {item.restaurant?.city ?? ''} · {item.restaurant?.country ?? ''}
        </Text>

      </Surface>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await RestaurantService.getFavorites(user.uid);
    setFavorites(result);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (item: Favorite) => {
    if (!user) return;
    // Aggiorna UI subito (ottimistic update), poi chiama il servizio
    setFavorites(prev => prev.filter(f => f.restaurant_id !== item.restaurant_id));
    await RestaurantService.removeFavorite(user.uid, item.restaurant_id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>I miei preferiti</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>💚</Text>
          <Text style={styles.emptyTitle}>Nessun preferito ancora</Text>
          <Text style={styles.emptySubtitle}>
            Esplora i ristoranti e salva quelli che ti piacciono toccando il cuore.
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
          data={favorites}
          keyExtractor={item => item.restaurant_id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <FavoriteCard
              item={item}
              onPress={() => router.push(`/restaurants/${item.restaurant_id}`)}
              onRemove={() => handleRemove(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  cardCity: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
});
