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
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
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
  const theme = useTheme();
  const styles = getStyles(theme);
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
    ? coverageColor(coveredTotal, filtersTotal, theme)
    : theme.colors.primary;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges
      // @ts-expect-error — prop custom di react-native-map-clustering (helpers.js:isMarker)
      // per escludere il marker selezionato dal clustering. Non tipizzata da react-native-maps.
      cluster={false}
      onPress={handlePress}
      zIndex={9999}
    >
      {/*
        Scale solo su iOS: react-native-maps su Android rasterizza il marker
        in un bitmap basato sul layout naturale della View (pre-transform),
        quindi lo scale 1.25 farebbe clippare il visual. Su Android il pin
        selezionato resta differenziato da bg colorata + shadow potenziata +
        zIndex 9999 + cluster=false.
      */}
      <View style={[
        styles.markerWrap,
        Platform.OS === 'ios' && { transform: [{ scale: 1.25 }] },
      ]}>
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
            <RNText style={[styles.markerText, { color: theme.colors.onPrimary }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <MaterialCommunityIcons name="silverware-fork-knife" size={13} color={theme.colors.onPrimary} />
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
    shadowColor: theme.colors.shadow,
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
    backgroundColor: theme.colors.onPrimary,
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
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

// Stili una volta per tema, condivisi tra i remount del pin selezionato.
const stylesByTheme = new WeakMap<AppTheme, ReturnType<typeof makeStyles>>();
function getStyles(theme: AppTheme) {
  let s = stylesByTheme.get(theme);
  if (!s) {
    s = makeStyles(theme);
    stylesByTheme.set(theme, s);
  }
  return s;
}
