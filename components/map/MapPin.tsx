/**
 * MapPin — Pure visual marker component.
 *
 * Rules:
 * - No context, no state (except tracksViewChanges one-frame flip).
 * - `isSelected` is a prop, NOT derived from context — only the
 *   SelectedMarkerOverlay renders the selected state, so regular pins
 *   never receive isSelected=true. This eliminates 1000+ re-renders
 *   on selection change.
 * - Dot vs pin is controlled by the `asDot` prop. The parent changes
 *   the React key on zoom threshold crossing → fresh mount → clean bitmap.
 * - When `restaurant` is null at close zoom, a placeholder pin (same 32px
 *   container) is rendered so iOS can recapture the bitmap when data arrives.
 */
import { memo, useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { theme } from '../../constants/theme';
import { isValidCoord, coverageColor } from './mapConstants';
import type { Restaurant } from '../../services/restaurantService';

export type MapPinProps = {
  id: string;
  latitude: number;
  longitude: number;
  restaurant?: Restaurant;
  asDot: boolean;
  isFavorite: boolean;
  isSelected?: boolean;
  showMatchInfo?: boolean;
  onPress?: (id: string) => void;
};

export default memo(function MapPin({
  id,
  latitude,
  longitude,
  restaurant,
  asDot,
  isFavorite,
  isSelected,
  showMatchInfo,
  onPress,
}: MapPinProps) {
  // --- tracksViewChanges: true for ONE frame after visual change, then false ---
  const hasRest = !!restaurant;
  const prevFavorite = useRef(isFavorite);
  const prevShowMatch = useRef(showMatchInfo);
  const prevHasRest = useRef(hasRest);
  const prevSelected = useRef(isSelected);
  const justChanged =
    isFavorite !== prevFavorite.current ||
    showMatchInfo !== prevShowMatch.current ||
    hasRest !== prevHasRest.current ||
    isSelected !== prevSelected.current;

  useEffect(() => {
    prevFavorite.current = isFavorite;
    prevShowMatch.current = showMatchInfo;
    prevHasRest.current = hasRest;
    prevSelected.current = isSelected;
  }, [isFavorite, showMatchInfo, hasRest, isSelected]);

  const handlePress = useCallback(() => onPress?.(id), [onPress, id]);

  if (!isValidCoord(latitude, longitude)) return null;

  // ---- Dot (far zoom) ----
  if (asDot) {
    const dotColor = (showMatchInfo && restaurant)
      ? coverageColor(
          (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0),
          (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0),
        )
      : theme.colors.primary;
    return (
      <Marker
        coordinate={{ latitude, longitude }}
        tracksViewChanges={justChanged}
        onPress={handlePress}
        {...(Platform.OS === 'android' && { zIndex: isFavorite ? 2 : 0 })}
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

  const markerColor = isSelected
    ? theme.colors.primary
    : showMatchInfo
      ? coverageColor(coveredTotal, filtersTotal)
      : theme.colors.primary;

  const bgColor = isSelected ? markerColor : '#FFFFFF';
  const fgColor = isSelected ? '#FFFFFF' : markerColor;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={justChanged}
      onPress={handlePress}
      {...(Platform.OS === 'android' && { zIndex: isSelected ? 9999 : isFavorite ? 2 : 1 })}
    >
      <View style={[styles.markerWrap, isSelected && { transform: [{ scale: 1.25 }] }]}>
        <View style={[
          styles.markerContainer,
          {
            borderColor: markerColor,
            backgroundColor: bgColor,
            shadowOpacity: isSelected ? 0.4 : 0.2,
            shadowRadius: isSelected ? 5 : 2,
            elevation: isSelected ? 8 : 3,
          },
        ]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: fgColor }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name="silverware-fork-knife" size={13} color={fgColor} />
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
