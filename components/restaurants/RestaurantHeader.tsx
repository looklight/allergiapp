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
import i18n from '../../utils/i18n';
import type { Restaurant, CuisineVote } from '../../services/restaurantService';
import type { AppLanguage } from '../../types';

interface MatchInfo {
  reviewCount: number;
  coveredCount: number;
  totalFilters: number;
  covered: string[];
  uncovered: string[];
  /** Coperture dedotte per implicazione: need -> source (es. { eggs: 'vegan' }) */
  inferredSources?: Record<string, string>;
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
  const isNoReviews = !matchInfo || matchInfo.reviewCount === 0;
  const inferredCount = matchInfo ? Object.keys(matchInfo.inferredSources ?? {}).length : 0;
  const directCount = matchInfo ? matchInfo.coveredCount - inferredCount : 0;
  const isFull = !isNoReviews && matchInfo && matchInfo.coveredCount >= matchInfo.totalFilters;
  const badgeBg = isNoReviews ? theme.colors.background : (isFull ? theme.colors.primaryLight : theme.colors.amberLight);
  const badgeColor = isNoReviews ? theme.colors.textSecondary : (isFull ? theme.colors.success : theme.colors.amberDark);
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
                  Linking.openURL(url).catch(() => Alert.alert(i18n.t('common.error'), i18n.t('restaurants.detail.mapsError')));
                }}
              >
                <MaterialCommunityIcons name="google-maps" size={26} color={theme.colors.brandGoogleMaps} />
                <Text style={styles.mapsBtnText}>{i18n.t('restaurants.header.mapsDetails')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {(restaurant.review_count ?? 0) > 0 ? (
            <TouchableOpacity style={styles.ratingRow} activeOpacity={0.7} onPress={onScrollToReviews} disabled={!onScrollToReviews}>
              <StarRating rating={restaurant.average_rating ?? 0} size={18} showValue />
              <Text style={styles.ratingCount}>{i18n.t('restaurants.header.reviewsCount', { count: restaurant.review_count ?? 0 })}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingCount}>{i18n.t('restaurants.header.noReviewsYet')}</Text>
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
            {addressCopied ? i18n.t('restaurants.header.addressCopied') : restaurant.address}
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
                {i18n.t('restaurants.header.cuisineHint')}
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
            {i18n.t('restaurants.header.compatLogin')}
          </Text>
          <MaterialCommunityIcons name="lock-outline" size={15} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {isAuthenticated && hasUserNeeds && matchInfo && (
        <View style={[
          styles.compatContainer,
          {
            borderWidth: 1,
            borderColor: compatExpanded ? badgeBg : 'transparent',
            borderRadius: 8,
            paddingBottom: compatExpanded ? 8 : 0,
            backgroundColor: compatExpanded && !isNoReviews
              ? (isFull ? '#E8F5E926' : '#FFF8E126')
              : 'transparent',
          },
        ]}>
          <TouchableOpacity
            onPress={() => setCompatExpanded(prev => !prev)}
            activeOpacity={0.7}
            style={[styles.compatRow, { backgroundColor: badgeBg }]}
          >
            <MaterialCommunityIcons
              name={isNoReviews ? 'shield-check-outline' : 'shield-check'}
              size={16}
              color={badgeColor}
            />
            <Text style={[styles.compatText, { color: badgeColor }]}>
              {isNoReviews
                ? i18n.t('restaurants.header.compatNoInfo')
                : inferredCount > 0
                  ? <>{directCount > 0 ? directCount : ''}<Text style={{ color: theme.colors.amberDark, fontWeight: '700' }}>+{inferredCount}</Text> /{matchInfo!.totalFilters} {i18n.t('restaurants.header.compatBased', { count: matchInfo!.reviewCount })}</>
                  : `${matchInfo!.coveredCount}/${matchInfo!.totalFilters} ${i18n.t('restaurants.header.compatBased', { count: matchInfo!.reviewCount })}`}
            </Text>
            <MaterialCommunityIcons
              name={compatExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={badgeColor}
            />
          </TouchableOpacity>

          {compatExpanded && (() => {
            const getChipLabel = (code: string) => {
              const r = getRestrictionById(code);
              if (!r) return code;
              const base = r.translations[lang as keyof typeof r.translations] ?? r.translations.en;
              if (r.category === 'intolerance') {
                if (lang === 'it') return `Bass${base.endsWith('a') ? 'a' : 'o'} ${base.toLowerCase()}`;
                return `Low ${base.toLowerCase()}`;
              }
              return base;
            };

            const renderChips = (codes: string[], style: typeof styles.compatChipCovered) => (
              <View style={styles.compatDetail}>
                {codes.map(code => {
                  const label = getChipLabel(code);
                  const inferSource = matchInfo.inferredSources?.[code];
                  const sourceRestriction = inferSource ? getRestrictionById(inferSource) : null;
                  const sourceLabel = sourceRestriction
                    ? getChipLabel(inferSource!)
                    : null;
                  const isCovered = style === styles.compatChipCovered;
                  return (
                    <View key={code} style={[styles.compatChip, inferSource ? styles.compatChipInferred : style]}>
                      <MaterialCommunityIcons
                        name={!isCovered ? 'minus' : 'check'}
                        size={12}
                        color={!isCovered ? theme.colors.textDisabled : (inferSource ? theme.colors.textSecondary : theme.colors.success)}
                      />
                      <Text style={[styles.compatChipText, { color: !isCovered ? theme.colors.textDisabled : (inferSource ? theme.colors.textSecondary : theme.colors.success) }]}>
                        {label}
                        {isCovered && sourceLabel ? i18n.t('restaurants.header.fromSource', { source: sourceLabel }) : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );

            const isAllergenOrSensitivity = (code: string) => { const r = getRestrictionById(code); return !r || r.category === 'eu_allergen' || r.category === 'food_sensitivity'; };
            const coveredAllergens = matchInfo.covered.filter(isAllergenOrSensitivity);
            const coveredDietsIntol = matchInfo.covered.filter(c => !isAllergenOrSensitivity(c));
            const uncoveredAllergens = matchInfo.uncovered.filter(isAllergenOrSensitivity);
            const uncoveredDietsIntol = matchInfo.uncovered.filter(c => !isAllergenOrSensitivity(c));

            return (
            <View style={styles.compatExpandedBody}>
              {coveredAllergens.length > 0 && (
                <>
                  <Text style={styles.compatSourceNote}>{i18n.t('restaurants.header.confirmOptionsWithout')}</Text>
                  {renderChips(coveredAllergens, styles.compatChipCovered)}
                </>
              )}
              {coveredDietsIntol.length > 0 && (
                <>
                  <Text style={styles.compatSourceNote}>{coveredAllergens.length > 0 ? i18n.t('restaurants.header.andOptionsFor') : i18n.t('restaurants.header.confirmOptionsFor')}</Text>
                  {renderChips(coveredDietsIntol, styles.compatChipCovered)}
                </>
              )}
              {(uncoveredAllergens.length > 0 || uncoveredDietsIntol.length > 0) && (
                <>
                  <Text style={styles.compatSourceNote}>{i18n.t('restaurants.header.noReviewsMention')}</Text>
                  {renderChips([...uncoveredAllergens, ...uncoveredDietsIntol], styles.compatChipUncovered)}
                </>
              )}
              <Text style={styles.compatDisclaimer}>
                {i18n.t('restaurants.header.disclaimer')}
              </Text>
              {onScrollToReviews && !isNoReviews && (
                <TouchableOpacity onPress={onScrollToReviews} activeOpacity={0.7} style={styles.compatReadReviews}>
                  <Text style={styles.compatReadReviewsText}>{i18n.t('restaurants.header.readReviews')}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            );
          })()}
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
  compatChipInferred: {
    backgroundColor: theme.colors.inferredBg,
    borderWidth: 1,
    borderColor: theme.colors.inferredBorder,
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
    gap: 8,
  },
  compatSourceNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  compatDisclaimer: {
    fontSize: 11,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  compatReadReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  compatReadReviewsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
