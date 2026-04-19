/**
 * SelectedMarkerOverlay — Sole consumer of selectedId.
 *
 * Renders ONE highlighted marker on top of the selected pin.
 * This component re-renders when selectedId changes; the hundreds of
 * regular MapPins do NOT — they never know which pin is selected.
 *
 * The overlay marker uses zIndex to sit on top of the regular one.
 * tracksViewChanges is always true (it's a single pin — negligible cost)
 * so iOS always has a fresh bitmap after any visual change.
 */
import { memo, useCallback } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import { theme } from '../../constants/theme';
import { isValidCoord, coverageColor } from './mapConstants';
import type { Restaurant } from '../../services/restaurantService';

type Props = {
  selectedId: string | null | undefined;
  restaurantById: Map<string, Restaurant>;
  favoriteIds: Set<string>;
  showMatchInfo?: boolean;
  onPress?: (id: string) => void;
};

export default memo(function SelectedMarkerOverlay({
  selectedId,
  restaurantById,
  favoriteIds,
  showMatchInfo,
  onPress,
}: Props) {
  if (!selectedId) return null;

  const restaurant = restaurantById.get(selectedId);
  if (!restaurant?.location) return null;

  const { latitude, longitude } = restaurant.location;
  if (!isValidCoord(latitude, longitude)) return null;

  return (
    <SelectedPin
      id={selectedId}
      latitude={latitude}
      longitude={longitude}
      restaurant={restaurant}
      isFavorite={favoriteIds.has(selectedId)}
      showMatchInfo={showMatchInfo}
      onPress={onPress}
    />
  );
});

// Inner component — unmounts/remounts when selectedId changes (via key in parent)
type SelectedPinProps = {
  id: string;
  latitude: number;
  longitude: number;
  restaurant: Restaurant;
  isFavorite: boolean;
  showMatchInfo?: boolean;
  onPress?: (id: string) => void;
};

const SelectedPin = memo(function SelectedPin({
  id,
  latitude,
  longitude,
  restaurant,
  isFavorite,
  showMatchInfo,
  onPress,
}: SelectedPinProps) {
  // tracksViewChanges sempre true: è un SINGOLO pin, il costo è irrisorio.
  // Il pattern one-frame (come MapPin) non funziona qui perché iOS non fa
  // in tempo a ricatturare il bitmap prima che tracksViewChanges torni false,
  // rendendo il pin invisibile dopo un cambio di isFavorite.
  const handlePress = useCallback(() => onPress?.(id), [onPress, id]);

  const rating = restaurant.average_rating ?? 0;
  const hasRating = rating > 0;
  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);

  const markerColor = showMatchInfo
    ? coverageColor(coveredTotal, filtersTotal)
    : theme.colors.primary;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges
      cluster={false}
      onPress={handlePress}
      {...(Platform.OS === 'android' && { zIndex: 9999 })}
    >
      <View style={[styles.markerWrap, { transform: [{ scale: 1.25 }] }]}>
        <View style={[
          styles.markerContainer,
          {
            borderColor: markerColor,
            backgroundColor: markerColor,
            shadowOpacity: 0.4,
            shadowRadius: 5,
            elevation: 8,
          },
        ]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: '#FFFFFF' }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name="silverware-fork-knife" size={13} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  markerWrap: {
    alignItems: 'center',
  },
  markerContainer: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
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
