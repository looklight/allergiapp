import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import StarRating from '../StarRating';
import type { Restaurant } from '../../types/restaurants';

/** Genera un colore consistente dal nome del ristorante per il placeholder. */
export function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  /** Distanza in km dall'utente (opzionale) */
  distance?: number | null;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export default function RestaurantCard({
  restaurant,
  isFavorite,
  distance,
  onPress,
  onToggleFavorite,
}: RestaurantCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardRow}>
          {restaurant.thumbnailUrl ? (
            <Image source={{ uri: restaurant.thumbnailUrl }} style={styles.cardThumb} />
          ) : (
            <View style={[styles.cardThumb, styles.cardThumbPlaceholder, { backgroundColor: hashColor(restaurant.name) }]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#FFFFFF" />
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
              <TouchableOpacity onPress={onToggleFavorite} hitSlop={10} activeOpacity={0.6} style={styles.favRow}>
                <MaterialCommunityIcons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorite ? theme.colors.error ?? '#D32F2F' : theme.colors.textSecondary}
                />
                <Text style={[styles.favCount, isFavorite && { color: theme.colors.error ?? '#D32F2F' }]}>
                  {restaurant.favoriteCount}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardCity} numberOfLines={1}>
              {restaurant.city}, {restaurant.country}
            </Text>
            <View style={styles.cardBottom}>
              {(restaurant.ratingCount ?? 0) > 0 ? (
                <View style={styles.cardRating}>
                  <StarRating rating={restaurant.averageRating ?? 0} size={14} />
                  <Text style={styles.cardRatingText}>
                    {(restaurant.averageRating ?? 0).toFixed(1)} ({restaurant.ratingCount})
                  </Text>
                </View>
              ) : (
                <Text style={styles.cardNoReviews}>Ancora nessuna recensione</Text>
              )}
              {distance != null && (
                <Text style={styles.cardDistance}>
                  {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cardThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  favCount: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  cardCity: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRatingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardNoReviews: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
});
