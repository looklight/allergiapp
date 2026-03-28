import { useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import type { Favorite } from '../../services/restaurantService';
import { useUserItemList } from '../../hooks/useUserItemList';
import HeaderBar from '../../components/HeaderBar';
import EmptyStateCard from '../../components/EmptyStateCard';

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

const fetchFavorites = (userId: string) => RestaurantService.getFavorites(userId);

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: favorites, setItems: setFavorites, isLoading, user } = useUserItemList<Favorite>(fetchFavorites);

  const handleRemove = useCallback(async (item: Favorite) => {
    if (!user) return;
    setFavorites(prev => prev.filter(f => f.restaurant_id !== item.restaurant_id));
    await RestaurantService.removeFavorite(user.uid, item.restaurant_id);
  }, [user, setFavorites]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <HeaderBar title="I miei preferiti" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <EmptyStateCard
          icon="💚"
          title="Nessun preferito ancora"
          subtitle="Esplora i ristoranti e salva quelli che ti piacciono toccando il cuore."
          buttonLabel="Esplora ristoranti"
          onPress={() => router.back()}
        />
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
