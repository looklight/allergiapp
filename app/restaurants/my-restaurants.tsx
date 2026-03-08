import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import type { Restaurant } from '../../types/restaurants';

function MyRestaurantCard({
  item,
  onPress,
}: {
  item: Restaurant;
  onPress: () => void;
}) {

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={theme.colors.primary} />
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        </View>

        <Text style={styles.cardCity} numberOfLines={1}>
          {item.city} · {item.countryCode}
        </Text>

      </Surface>
    </TouchableOpacity>
  );
}

export default function MyRestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await RestaurantService.getRestaurantsByUser(user.uid);
    setRestaurants(result);
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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>I miei ristoranti</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : restaurants.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>Non hai ancora aggiunto ristoranti</Text>
          <Text style={styles.emptySubtitle}>
            Aggiungi il tuo primo ristorante e aiuta la community!
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/restaurants/add')}
            style={styles.emptyButton}
          >
            Aggiungi ristorante
          </Button>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={item => item.googlePlaceId}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <MyRestaurantCard
              item={item}
              onPress={() => router.push(`/restaurants/${item.googlePlaceId}`)}
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
    color: '#FFFFFF',
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
