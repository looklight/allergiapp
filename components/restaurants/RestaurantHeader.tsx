import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from 'react-native-paper';
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
  isAuthenticated?: boolean;
  onScrollToReviews?: () => void;
  hideMapsButton?: boolean;
  /** When true, hides the restaurant name, rating row and Maps button (used in sheet context where they appear in the fixed header) */
  hideNameAndRating?: boolean;
}

export default function RestaurantHeader({ restaurant, lang, cuisineVotes, matchInfo, hasUserNeeds, isAuthenticated, onScrollToReviews, hideMapsButton, hideNameAndRating }: RestaurantHeaderProps) {
  const [compatExpanded, setCompatExpanded] = useState(false);
  const [showCuisineHint, setShowCuisineHint] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const isFull = matchInfo && matchInfo.coveredCount >= matchInfo.totalFilters;
  const router = useRouter();

  useEffect(() => {
    setCompatExpanded(false);
  }, [matchInfo]);

  return (
    <View style={[styles.section, hideNameAndRating && { paddingTop: 4 }]}>
      {!hideNameAndRating && (
        <>
          <View style={styles.sectionTopRow}>
            <Text style={[styles.restaurantName, { flex: 1 }]}>{restaurant.name}</Text>
            {!hideMapsButton && (restaurant.google_place_id || restaurant.address) && (
              <TouchableOpacity
                style={styles.mapsBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const url = restaurant.google_place_id
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.google_place_id}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address!)}`;
                  Linking.openURL(url).catch(() => Alert.alert('Errore', 'Impossibile aprire Maps'));
                }}
              >
                <MaterialCommunityIcons name="google-maps" size={26} color="#EA4335" />
                <Text style={styles.mapsBtnText}>Dettagli</Text>
              </TouchableOpacity>
            )}
          </View>

          {(restaurant.review_count ?? 0) > 0 ? (
            <TouchableOpacity style={styles.ratingRow} activeOpacity={0.7} onPress={onScrollToReviews} disabled={!onScrollToReviews}>
              <StarRating rating={restaurant.average_rating ?? 0} size={18} showValue />
              <Text style={styles.ratingCount}>({restaurant.review_count} recensioni)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingCount}>Ancora nessuna recensione</Text>
            </View>
          )}
        </>
      )}

      {restaurant.address && (
        <TouchableOpacity
          style={styles.infoRow}
          activeOpacity={1}
          onLongPress={async () => {
            await Clipboard.setStringAsync(restaurant.address!);
            setAddressCopied(true);
            setTimeout(() => setAddressCopied(false), 2000);
          }}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            {addressCopied ? 'Indirizzo copiato' : restaurant.address}
          </Text>
        </TouchableOpacity>
      )}

      {restaurant.price_range && (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="currency-eur" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{'€'.repeat(restaurant.price_range)}</Text>
        </View>
      )}

      {cuisineVotes.length > 0 && (
        <View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCuisineHint(prev => !prev)}
          >
            <View style={styles.tagsWrap}>
              {cuisineVotes.map(v => {
                const label = getCuisineLabel(v.cuisine_id, lang);
                if (!label) return null;
                return (
                  <View key={v.cuisine_id} style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{label}</Text>
                    <View style={styles.categoryBadgeCount}>
                      <Text style={styles.categoryBadgeCountText}>{v.vote_count}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
          {showCuisineHint && (
            <View style={styles.cuisineHint}>
              <MaterialCommunityIcons name="information-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.cuisineHintText}>
                Tag suggeriti dalla community. Il numero indica quanti utenti hanno confermato ogni tipo di cucina.
              </Text>
            </View>
          )}
        </View>
      )}

      {!isAuthenticated && (restaurant.review_count ?? 0) > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.7}
          style={[styles.compatContainer, styles.compatRow]}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.compatText, { color: theme.colors.textSecondary, fontWeight: '400' }]}>
            Accedi per vedere la compatibilità con le tue esigenze
          </Text>
          <MaterialCommunityIcons name="lock-outline" size={15} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {isAuthenticated && hasUserNeeds && matchInfo && matchInfo.reviewCount > 0 && (
        <View style={[
          styles.compatContainer,
          compatExpanded && {
            borderWidth: 1,
            borderColor: isFull ? theme.colors.primaryLight : theme.colors.amberLight,
            borderRadius: 8,
            paddingBottom: 8,
            backgroundColor: isFull ? '#E8F5E926' : '#FFF8E126',
          },
        ]}>
          <TouchableOpacity
            onPress={() => setCompatExpanded(prev => !prev)}
            activeOpacity={0.7}
            style={[styles.compatRow, { backgroundColor: isFull ? theme.colors.primaryLight : theme.colors.amberLight }]}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={16}
              color={isFull ? theme.colors.success : theme.colors.amberDark}
            />
            <Text style={[styles.compatText, { color: isFull ? theme.colors.success : theme.colors.amberDark }]}>
              {matchInfo.coveredCount}/{matchInfo.totalFilters} esigenze confermate da {matchInfo.reviewCount} {matchInfo.reviewCount === 1 ? 'utente' : 'utenti'}
            </Text>
            <MaterialCommunityIcons
              name={compatExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isFull ? theme.colors.success : theme.colors.amberDark}
            />
          </TouchableOpacity>

          {compatExpanded && (
            <View style={styles.compatExpandedBody}>
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
              {onScrollToReviews && (
                <TouchableOpacity onPress={onScrollToReviews} activeOpacity={0.7} style={styles.compatReadReviews}>
                  <Text style={styles.compatReadReviewsText}>Leggi le recensioni</Text>
                  <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    backgroundColor: theme.colors.surface,
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
  cuisineHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  cuisineHintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 17,
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
    marginTop: 12,
  },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    backgroundColor: theme.colors.primaryLight,
  },
  compatChipUncovered: {
    backgroundColor: theme.colors.background,
  },
  compatChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  compatExpandedBody: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  compatReadReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  compatReadReviewsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
