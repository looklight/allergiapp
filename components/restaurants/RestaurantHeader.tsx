import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { ALL_RESTAURANT_CATEGORIES } from '../../constants/restaurantCategories';
import StarRating from '../StarRating';
import type { Restaurant } from '../../types/restaurants';
import type { AppLanguage } from '../../types';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
  lang: AppLanguage;
  tappedBadge: string | null;
  onTapBadge: (catId: string | null) => void;
}

export default function RestaurantHeader({ restaurant, lang, tappedBadge, onTapBadge }: RestaurantHeaderProps) {
  const router = useRouter();
  const categoryVotes = restaurant.categoryVotes ?? {};
  const votedCatIds = Object.keys(categoryVotes)
    .filter(k => categoryVotes[k] > 0)
    .sort((a, b) => categoryVotes[b] - categoryVotes[a]);

  return (
    <Surface style={styles.section} elevation={1}>
      <View style={styles.sectionTopRow}>
        <Text style={[styles.restaurantName, { flex: 1 }]}>{restaurant.name}</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${restaurant.googlePlaceId}`)}
          hitSlop={8}
          activeOpacity={0.6}
          style={styles.mapsIconBtn}
        >
          <MaterialCommunityIcons name="google-maps" size={30} color="#EA4335" />
        </TouchableOpacity>
      </View>

      {(restaurant.ratingCount ?? 0) > 0 ? (
        <View style={styles.ratingRow}>
          <StarRating rating={restaurant.averageRating ?? 0} size={18} showValue />
          <Text style={styles.ratingCount}>({restaurant.ratingCount} recensioni)</Text>
        </View>
      ) : (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingCount}>Ancora nessuna recensione</Text>
        </View>
      )}

      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.infoText}>{restaurant.address}</Text>
      </View>

      {restaurant.priceLevel && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="currency-eur" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{'€'.repeat(restaurant.priceLevel)}</Text>
        </View>
      )}

      {votedCatIds.length > 0 && (
        <>
          <View style={styles.tagsWrap}>
            {votedCatIds.map(catId => {
              const cat = ALL_RESTAURANT_CATEGORIES.find(x => x.id === catId);
              if (!cat) return null;
              const votes = categoryVotes[catId];
              return (
                <TouchableOpacity
                  key={catId}
                  style={styles.categoryBadge}
                  activeOpacity={0.7}
                  onPress={() => onTapBadge(tappedBadge === catId ? null : catId)}
                >
                  <Text style={styles.categoryBadgeText}>
                    {cat.icon} {cat.translations[lang] ?? cat.translations.en}
                  </Text>
                  <View style={styles.categoryBadgeCount}>
                    <Text style={styles.categoryBadgeCountText}>{votes}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {tappedBadge && categoryVotes[tappedBadge] > 0 && (
            <Text style={styles.badgeHint}>
              {categoryVotes[tappedBadge] === 1
                ? '1 utente ha segnalato questa informazione'
                : `${categoryVotes[tappedBadge]} utenti hanno segnalato questa informazione`}
            </Text>
          )}
        </>
      )}

      {restaurant.addedByName && (
        <TouchableOpacity
          style={styles.addedByRow}
          activeOpacity={0.6}
          onPress={() => router.push(`/restaurants/user/${restaurant.addedBy}`)}
        >
          <MaterialCommunityIcons name="account-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.addedByText}>
            Aggiunto da <Text style={styles.addedByName}>{restaurant.addedByName}</Text>
          </Text>
        </TouchableOpacity>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  mapsIconBtn: {
    padding: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  categoryBadgeCount: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  categoryBadgeCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  badgeHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  addedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  addedByText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  addedByName: {
    fontWeight: '600',
  },
});
