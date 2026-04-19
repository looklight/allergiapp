/**
 * MapPin — Pure visual marker component.
 *
 * Rules:
 * - No context, no state (except tracksViewChanges one-frame flip).
 * - The selected state is rendered exclusively by SelectedMarkerOverlay;
 *   regular MapPins never render as "selected". This eliminates 1000+
 *   re-renders on selection change.
 * - Dot vs pin is controlled by the `asDot` prop. On threshold crossing,
 *   tracksViewChanges flips true for one frame so iOS recaptures a clean bitmap.
 * - When `restaurant` is null at close zoom, a placeholder pin (same 32px
 *   container) is rendered so iOS can recapture the bitmap when data arrives.
 * - At dot zoom without restaurant data, coverage is computed from
 *   supportedAllergens/supportedDiets + userAllergens/userDiets using
 *   getExpandedCoverage (implication-aware, same logic del server).
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { theme } from '../../constants/theme';
import { isValidCoord, coverageColor } from './mapConstants';
import { getExpandedCoverage } from '../../constants/restrictionImplications';
import type { Restaurant } from '../../services/restaurantService';

export type MapPinProps = {
  id: string;
  latitude: number;
  longitude: number;
  restaurant?: Restaurant;
  asDot: boolean;
  isFavorite: boolean;
  showMatchInfo?: boolean;
  onPress?: (id: string) => void;
  /** Allergens aggregated from all reviews of this restaurant */
  supportedAllergens?: string[];
  /** Dietary preferences aggregated from all reviews of this restaurant */
  supportedDiets?: string[];
  /** Active allergen filters of the current user */
  userAllergens?: string[];
  /** Active dietary filters of the current user */
  userDiets?: string[];
};

export default memo(function MapPin({
  id,
  latitude,
  longitude,
  restaurant,
  asDot,
  isFavorite,
  showMatchInfo,
  onPress,
  supportedAllergens,
  supportedDiets,
  userAllergens,
  userDiets,
}: MapPinProps) {
  // --- tracksViewChanges: true for ONE frame after visual change, then false ---
  // asDot è incluso qui (invece di usare key change nel parent) per evitare il
  // flash del pin rosso Apple Maps che si vede durante l'unmount/remount.
  const hasRest = !!restaurant;
  const prevAsDot = useRef(asDot);
  const prevFavorite = useRef(isFavorite);
  const prevShowMatch = useRef(showMatchInfo);
  const prevHasRest = useRef(hasRest);
  const prevSupportedAllergens = useRef(supportedAllergens);
  const prevSupportedDiets = useRef(supportedDiets);
  const justChanged =
    asDot !== prevAsDot.current ||
    isFavorite !== prevFavorite.current ||
    showMatchInfo !== prevShowMatch.current ||
    hasRest !== prevHasRest.current ||
    supportedAllergens !== prevSupportedAllergens.current ||
    supportedDiets !== prevSupportedDiets.current;

  useEffect(() => {
    prevAsDot.current = asDot;
    prevFavorite.current = isFavorite;
    prevShowMatch.current = showMatchInfo;
    prevHasRest.current = hasRest;
    prevSupportedAllergens.current = supportedAllergens;
    prevSupportedDiets.current = supportedDiets;
  }, [asDot, isFavorite, showMatchInfo, hasRest, supportedAllergens, supportedDiets]);

  const handlePress = useCallback(() => onPress?.(id), [onPress, id]);

  if (!isValidCoord(latitude, longitude)) return null;

  // ---- Dot (far zoom) ----
  if (asDot) {
    // Coverage: prefer server-computed data from Restaurant object (accurate),
    // fall back to client-computed from pin's aggregated review data.
    let dotCovered = 0;
    let dotTotal = 0;

    if (showMatchInfo) {
      if (restaurant) {
        dotCovered = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
        dotTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
      } else {
        dotTotal = (userAllergens?.length ?? 0) + (userDiets?.length ?? 0);
        if (dotTotal > 0 && (supportedAllergens?.length || supportedDiets?.length)) {
          const expanded = getExpandedCoverage([
            ...(supportedAllergens ?? []),
            ...(supportedDiets ?? []),
          ]);
          for (const a of (userAllergens ?? [])) if (expanded.has(a)) dotCovered++;
          for (const d of (userDiets ?? [])) if (expanded.has(d)) dotCovered++;
        }
      }
    }

    // Hide grey dots at far zoom to declutter the map: if filters are active
    // and this restaurant matches none of them, skip rendering.
    // Favorites stay visible regardless so the user never "loses" a saved place.
    if (showMatchInfo && dotTotal > 0 && dotCovered === 0 && !isFavorite) {
      return null;
    }

    const dotColor = showMatchInfo
      ? coverageColor(dotCovered, dotTotal)
      : theme.colors.primary;

    // Verde/giallo emergono sopra i pallini grigi/primary (non valutati).
    const dotZ = isFavorite ? 3
      : dotCovered > 0 && dotTotal > 0
        ? (dotCovered >= dotTotal ? 3 : 2)
        : 0;

    return (
      <Marker
        identifier={id}
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        {...(Platform.OS === 'android' && { zIndex: dotZ })}
      >
        <View style={styles.dotWrap}>
          <View style={[
            styles.dotMarker,
            isFavorite && styles.dotFavorite,
            { backgroundColor: dotColor },
          ]} />
          <View style={[styles.dotHeartBadge, { opacity: isFavorite ? 1 : 0 }]}>
            <RNText style={styles.dotHeartText}>{'\u2665'}</RNText>
          </View>
        </View>
      </Marker>
    );
  }

  // ---- Placeholder pin (close zoom, data loading) ----
  // Same 32px container as full pin so iOS bitmap recapture works
  // when data arrives (hasRest flips → tracksViewChanges=true for one frame).
  if (!restaurant) {
    return (
      <Marker
        identifier={id}
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        {...(Platform.OS === 'android' && { zIndex: isFavorite ? 2 : 1 })}
      >
        <View style={styles.markerWrap}>
          <View style={[styles.markerContainer, { borderColor: theme.colors.textDisabled }]}>
            <View style={[styles.markerDot, { backgroundColor: theme.colors.textDisabled }]} />
          </View>
          <View style={styles.markerArrow}>
            <View style={[styles.markerArrowInner, { borderTopColor: theme.colors.textDisabled }]} />
          </View>
          <View style={[styles.heartBadge, { opacity: isFavorite ? 1 : 0 }]} pointerEvents="none">
            <RNText style={styles.heartText}>{'\u2665'}</RNText>
          </View>
        </View>
      </Marker>
    );
  }

  // ---- Full pin ----
  const rating = restaurant.average_rating ?? 0;
  const hasRating = rating > 0;
  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);

  const markerColor = showMatchInfo
    ? coverageColor(coveredTotal, filtersTotal)
    : theme.colors.primary;

  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={justChanged}
      onPress={handlePress}
      {...(Platform.OS === 'android' && { zIndex: isFavorite ? 2 : 1 })}
    >
      <View style={styles.markerWrap}>
        <View style={[styles.markerContainer, { borderColor: markerColor }]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: markerColor }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name="silverware-fork-knife" size={13} color={markerColor} />
          )}
        </View>
        <View style={styles.markerArrow}>
          <View style={[styles.markerArrowInner, { borderTopColor: markerColor }]} />
        </View>
        <View style={[styles.heartBadge, { opacity: isFavorite ? 1 : 0 }]} pointerEvents="none">
          <RNText style={styles.heartText}>{'\u2665'}</RNText>
        </View>
      </View>
    </Marker>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  dotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  dotFavorite: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotHeartBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHeartText: {
    fontSize: 7,
    lineHeight: 9,
    color: theme.colors.favoriteRed,
  },

  markerWrap: {
    alignItems: 'center',
  },
  markerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerArrow: {
    alignItems: 'center',
    marginTop: -1,
  },
  markerArrowInner: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  heartBadge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  heartText: {
    fontSize: 9,
    lineHeight: 13,
    color: theme.colors.favoriteRed,
  },
});
