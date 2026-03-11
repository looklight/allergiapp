import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { getCuisineLabel } from '../../constants/restaurantCategories';
import { getRestrictionById } from '../../constants/foodRestrictions';
import StarRating from '../StarRating';
import type { Restaurant, CuisineVote } from '../../services/restaurantService';
import type { AppLanguage } from '../../types';

interface MatchInfo {
  reviewCount: number;
  coveredCount: number;
  totalFilters: number;
  covered: string[];
  uncovered: string[];
}

interface RestaurantHeaderProps {
  restaurant: Restaurant;
  lang: AppLanguage;
  cuisineVotes: CuisineVote[];
  matchInfo?: MatchInfo;
  hasUserNeeds?: boolean;
}

export default function RestaurantHeader({ restaurant, lang, cuisineVotes, matchInfo, hasUserNeeds }: RestaurantHeaderProps) {
  const [compatExpanded, setCompatExpanded] = useState(false);
  const isFull = matchInfo && matchInfo.coveredCount >= matchInfo.totalFilters;
  const router = useRouter();

  return (
    <Surface style={styles.section} elevation={1}>
      <View style={styles.sectionTopRow}>
        <Text style={[styles.restaurantName, { flex: 1 }]}>{restaurant.name}</Text>
        {(restaurant.google_place_id || restaurant.address) && (
          <TouchableOpacity
            style={styles.mapsBtn}
            activeOpacity={0.7}
            onPress={() => {
              const url = restaurant.google_place_id
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.google_place_id}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address!)}`;
              Linking.openURL(url);
            }}
          >
            <MaterialCommunityIcons name="google-maps" size={26} color="#EA4335" />
            <Text style={styles.mapsBtnText}>Dettagli</Text>
          </TouchableOpacity>
        )}
      </View>

      {(restaurant.review_count ?? 0) > 0 ? (
        <View style={styles.ratingRow}>
          <StarRating rating={restaurant.average_rating ?? 0} size={18} showValue />
          <Text style={styles.ratingCount}>({restaurant.review_count} recensioni)</Text>
        </View>
      ) : (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingCount}>Ancora nessuna recensione</Text>
        </View>
      )}

      {restaurant.address && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{restaurant.address}</Text>
        </View>
      )}

      {restaurant.price_range && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="currency-eur" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{'€'.repeat(restaurant.price_range)}</Text>
        </View>
      )}

      {cuisineVotes.length > 0 && (
        <View style={styles.tagsWrap}>
          {cuisineVotes.map(v => (
            <View key={v.cuisine_id} style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{getCuisineLabel(v.cuisine_id, lang, { emoji: false })}</Text>
              <View style={styles.categoryBadgeCount}>
                <Text style={styles.categoryBadgeCountText}>{v.vote_count}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {hasUserNeeds && matchInfo && matchInfo.reviewCount > 0 && (
        <View style={styles.compatContainer}>
          <TouchableOpacity
            onPress={() => setCompatExpanded(prev => !prev)}
            activeOpacity={0.7}
            style={styles.compatRow}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={15}
              color={isFull ? theme.colors.success : theme.colors.amberDark}
            />
            <Text style={[styles.compatText, { color: isFull ? theme.colors.success : theme.colors.amberDark }]}>
              {matchInfo.coveredCount}/{matchInfo.totalFilters} esigenze confermate da {matchInfo.reviewCount} {matchInfo.reviewCount === 1 ? 'utente' : 'utenti'}
            </Text>
            <MaterialCommunityIcons
              name={compatExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {compatExpanded && (
            <View style={styles.compatDetail}>
              {matchInfo.covered.map(code => {
                const r = getRestrictionById(code);
                const label = r ? (r.translations[lang as keyof typeof r.translations] ?? r.translations.en) : code;
                return (
                  <View key={code} style={[styles.compatChip, styles.compatChipCovered]}>
                    <MaterialCommunityIcons name="check" size={12} color={theme.colors.success} />
                    <Text style={[styles.compatChipText, { color: theme.colors.success }]}>{label}</Text>
                  </View>
                );
              })}
              {matchInfo.uncovered.map(code => {
                const r = getRestrictionById(code);
                const label = r ? (r.translations[lang as keyof typeof r.translations] ?? r.translations.en) : code;
                return (
                  <View key={code} style={[styles.compatChip, styles.compatChipUncovered]}>
                    <MaterialCommunityIcons name="minus" size={12} color={theme.colors.textDisabled} />
                    <Text style={[styles.compatChipText, { color: theme.colors.textDisabled }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
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
    paddingLeft: 10,
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
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  mapsBtnText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  compatContainer: {
    marginTop: 8,
  },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compatText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  compatDetail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  compatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compatChipCovered: {
    backgroundColor: '#E8F5E9',
  },
  compatChipUncovered: {
    backgroundColor: theme.colors.background,
  },
  compatChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
