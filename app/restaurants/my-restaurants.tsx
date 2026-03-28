import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RestaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../services/restaurantService';
import { useUserItemList } from '../../hooks/useUserItemList';
import HeaderBar from '../../components/HeaderBar';
import EmptyStateCard from '../../components/EmptyStateCard';

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
          {item.city} · {item.country}
        </Text>
      </Surface>
    </TouchableOpacity>
  );
}

const fetchRestaurants = (userId: string) => RestaurantService.getRestaurantsByUser(userId);

export default function MyRestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: restaurants, isLoading } = useUserItemList<Restaurant>(fetchRestaurants);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <HeaderBar title="I miei ristoranti" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : restaurants.length === 0 ? (
        <EmptyStateCard
          icon="🍽️"
          title="Non hai ancora aggiunto ristoranti"
          subtitle="Aggiungi il tuo primo ristorante e aiuta la community!"
          buttonLabel="Aggiungi ristorante"
          onPress={() => router.push('/restaurants/add')}
        />
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <MyRestaurantCard
              item={item}
              onPress={() => router.push(`/restaurants/${item.id}`)}
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
