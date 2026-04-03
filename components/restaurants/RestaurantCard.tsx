import { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { getCuisineLabel } from '../../constants/restaurantCategories';
import StarRating from '../StarRating';
import i18n from '../../utils/i18n';
import type { Restaurant } from '../../services/restaurantService';

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
  /** Mostra badge di compatibilità allergeni */
  showMatchInfo?: boolean;
  /** Evidenzia la card (selezionata dalla mappa) */
  selected?: boolean;
  onPress: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default memo(function RestaurantCard({
  restaurant,
  isFavorite,
  distance,
  showMatchInfo,
  selected,
  onPress,
  onToggleFavorite,
}: RestaurantCardProps) {
  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const inferredTotal = (restaurant.inferred_allergen_count ?? 0) + (restaurant.inferred_dietary_count ?? 0);
  const directTotal = coveredTotal - inferredTotal;
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
  const hasMatch = showMatchInfo && filtersTotal > 0;

  const handlePress = useCallback(() => onPress(restaurant.id), [onPress, restaurant.id]);
  const handleToggleFav = useCallback(() => onToggleFavorite(restaurant.id), [onToggleFavorite, restaurant.id]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Surface style={[styles.card, selected && styles.cardSelected]} elevation={selected ? 2 : 1}>
        <View style={styles.cardRow}>
          {restaurant.photo_urls?.[0] ? (
            <Image source={{ uri: restaurant.photo_urls[0] }} style={styles.cardThumb} />
          ) : (
            <View style={[styles.cardThumb, styles.cardThumbPlaceholder, { backgroundColor: hashColor(restaurant.name) }]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.colors.onPrimary} />
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
              <TouchableOpacity onPress={handleToggleFav} hitSlop={10} activeOpacity={0.6} style={styles.favRow}>
                <MaterialCommunityIcons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorite ? theme.colors.error : theme.colors.textSecondary}
                />
                <Text style={[styles.favCount, isFavorite && { color: theme.colors.error }]}>
                  {restaurant.favorite_count}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardCity} numberOfLines={1}>
              {restaurant.city}, {restaurant.country}
              {distance != null && (
                <Text style={styles.cardDistance}>
                  {' · '}
                  {distance < 0.05 ? 'Qui vicino' : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                </Text>
              )}
            </Text>
            {restaurant.cuisine_types?.length > 0 && (
              <View style={styles.cuisineRow}>
                {restaurant.cuisine_types.slice(0, 2).map(ct => {
                  const label = getCuisineLabel(ct, i18n.locale);
                  if (!label) return null;
                  return (
                    <View key={ct} style={styles.cuisineBadge}>
                      <Text style={styles.cuisineBadgeText}>{label}</Text>
                    </View>
                  );
                })}
                {restaurant.cuisine_types.length > 2 && (
                  <Text style={styles.cuisineMore}>+{restaurant.cuisine_types.length - 2}</Text>
                )}
              </View>
            )}
            <View style={styles.cardBottom}>
              {(restaurant.review_count ?? 0) > 0 ? (
                <View style={styles.cardRating}>
                  <StarRating rating={restaurant.average_rating ?? 0} size={14} />
                  <Text style={styles.cardRatingText}>
                    {(restaurant.average_rating ?? 0).toFixed(1)} ({restaurant.review_count})
                  </Text>
                </View>
              ) : (
                <Text style={styles.cardNoReviews}>Ancora nessuna recensione</Text>
              )}
              <View style={styles.cardBottomRight}>
                {hasMatch && (
                  <View style={[
                    styles.matchBadge,
                    coveredTotal >= filtersTotal ? styles.matchBadgeFull : styles.matchBadgePartial,
                  ]}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={11}
                      color={coveredTotal >= filtersTotal ? theme.colors.success : theme.colors.amberDark}
                    />
                    <Text style={[
                      styles.matchBadgeText,
                      { color: coveredTotal >= filtersTotal ? theme.colors.success : theme.colors.amberDark },
                    ]}>
                      {inferredTotal > 0 ? `${directTotal > 0 ? directTotal : ''}(+${inferredTotal})` : coveredTotal}/{filtersTotal}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    padding: 10, // compensa il borderWidth per mantenere le dimensioni
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
  cardBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  cuisineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cuisineBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  cuisineMore: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  cardNoReviews: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchBadgeFull: {
    backgroundColor: theme.colors.primaryLight,
  },
  matchBadgePartial: {
    backgroundColor: theme.colors.amberLight,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
