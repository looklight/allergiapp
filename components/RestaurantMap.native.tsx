import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text as RNText } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Callout } from 'react-native-maps';
import { theme } from '../constants/theme';
import { getCuisineLabel } from '../constants/restaurantCategories';
import i18n from '../utils/i18n';
import type { Restaurant } from '../services/restaurantService';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: Region = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

type Props = {
  restaurants: Restaurant[];
  /** When set, the map animates to this location. sheetFraction = copertura sheet al momento del centering */
  centerOn?: { latitude: number; longitude: number; sheetFraction: number } | null;
  /** Whether the user's GPS position is available (shows blue dot independently of centerOn) */
  hasUserLocation?: boolean;
  /** Fired when the user stops panning/zooming the map */
  onRegionChangeComplete?: (region: Region) => void;
  /** Currently selected restaurant id (highlighted on map) */
  selectedId?: string | null;
  /** Called when a marker is tapped */
  onMarkerSelect?: (id: string) => void;
  /** Called when the user taps an empty area of the map */
  onDeselect?: () => void;
  /** Mostra badge coverage nel callout e colora i marker per compatibilità */
  showMatchInfo?: boolean;
};

/** Colore marker in base alla copertura esigenze (usato solo con showMatchInfo) */
function coverageColor(covered: number, total: number): string {
  if (total === 0 || covered === 0) return theme.colors.textSecondary; // grigio = nessuna info
  if (covered >= total) return '#2E7D32';                              // verde = tutto coperto
  return '#F9A825';                                                    // ambra = parziale
}

export default function RestaurantMap({ restaurants, centerOn, hasUserLocation, onRegionChangeComplete, selectedId, onMarkerSelect, onDeselect, showMatchInfo }: Props) {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const mapReady = useRef(false);

  const fitToMarkers = useCallback(() => {
    const coords = restaurants.filter(r => r.location).map(r => ({
      latitude: r.location!.latitude,
      longitude: r.location!.longitude,
    }));
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [restaurants]);

  // Fit to all markers only when there's no user position to center on
  useEffect(() => {
    if (restaurants.length === 0 || centerOn || !mapReady.current) return;
    fitToMarkers();
  }, [restaurants, centerOn, fitToMarkers]);

  useEffect(() => {
    if (!centerOn || mapHeight === 0) return;
    const latDelta = 0.02;
    const sheetCoverage = centerOn.sheetFraction;
    const offset = latDelta * (sheetCoverage / 2);
    mapRef.current?.animateToRegion({
      latitude: centerOn.latitude - offset,
      longitude: centerOn.longitude,
      latitudeDelta: latDelta,
      longitudeDelta: 0.02,
    }, 600);
  }, [centerOn, mapHeight]);

  // Memoize marker elements so that ClusteredMapView's internal `propsChildren`
  // only changes when restaurant data or selection actually change — not on every
  // parent re-render triggered by unrelated state (mapRegion, showSearchArea, …).
  // Without this, the library rebuilds supercluster on each re-render using a
  // potentially stale `currentRegion`, causing nearby markers to disappear after
  // a cluster press.
  const markerElements = useMemo(() =>
    restaurants.filter(r => r.location).map(restaurant => {
      const rating = restaurant.average_rating ?? 0;
      const hasRating = rating > 0;
      const isSelected = selectedId === restaurant.id;

      const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
      const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
      const markerColor = isSelected
        ? theme.colors.primary
        : showMatchInfo
          ? coverageColor(coveredTotal, filtersTotal)
          : theme.colors.primary;

      return (
        <Marker
          key={restaurant.id}
          coordinate={{
            latitude: restaurant.location!.latitude,
            longitude: restaurant.location!.longitude,
          }}
          tracksViewChanges={isSelected}
          zIndex={isSelected ? 999 : undefined}
          onPress={() => onMarkerSelect?.(restaurant.id)}
        >
          <View style={[
            styles.markerContainer,
            { borderColor: markerColor },
            isSelected && styles.markerSelected,
          ]}>
            {hasRating ? (
              <RNText style={[styles.markerText, { color: markerColor }]}>
                {rating.toFixed(1)}
              </RNText>
            ) : (
              <View style={[styles.markerDot, { backgroundColor: markerColor }]} />
            )}
          </View>
          <View style={styles.markerArrow}>
            <View style={[styles.markerArrowInner, { borderTopColor: markerColor }]} />
          </View>

          <Callout tooltip onPress={() => router.push(`/restaurants/${restaurant.id}`)}>
            <Surface style={styles.callout} elevation={3}>
              <Text style={styles.calloutName} numberOfLines={2}>{restaurant.name}</Text>
              <Text style={styles.calloutCity} numberOfLines={1}>{restaurant.city}</Text>
              {((showMatchInfo && filtersTotal > 0) || restaurant.cuisine_types?.length > 0) && (
                <View style={styles.calloutInfoRow}>
                  {showMatchInfo && filtersTotal > 0 && (() => {
                    const badgeColor = coveredTotal >= filtersTotal ? '#2E7D32' : coveredTotal > 0 ? '#F9A825' : theme.colors.textSecondary;
                    const badgeStyle = coveredTotal >= filtersTotal ? styles.calloutMatchFull : coveredTotal > 0 ? styles.calloutMatchPartial : styles.calloutMatchNone;
                    return (
                      <View style={[styles.calloutMatchBadge, badgeStyle]}>
                        <MaterialCommunityIcons name="shield-check" size={11} color={badgeColor} />
                        <RNText style={[styles.calloutMatchText, { color: badgeColor }]}>
                          {coveredTotal}/{filtersTotal}
                        </RNText>
                      </View>
                    );
                  })()}
                  {restaurant.cuisine_types?.length > 0 && (
                    <>
                      <View style={styles.calloutBadge}>
                        <Text style={styles.calloutBadgeText}>{getCuisineLabel(restaurant.cuisine_types[0], i18n.locale)}</Text>
                      </View>
                      {restaurant.cuisine_types.length > 1 && (
                        <Text style={styles.calloutBadgeMore}>+{restaurant.cuisine_types.length - 1}</Text>
                      )}
                    </>
                  )}
                </View>
              )}
              <Text style={styles.calloutCta}>{i18n.t('map.tapToOpen')}</Text>
            </Surface>
          </Callout>
        </Marker>
      );
    }),
    [restaurants, selectedId, onMarkerSelect, router, showMatchInfo]
  );

  return (
    <ClusteredMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={!!hasUserLocation}
      showsMyLocationButton={false}
      onMapReady={() => {
        mapReady.current = true;
        if (!centerOn && restaurants.length > 0) fitToMarkers();
      }}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={() => onDeselect?.()}
      onLayout={(e: any) => setMapHeight(e.nativeEvent.layout.height)}
      clusterColor={theme.colors.primary}
      clusterTextColor={theme.colors.onPrimary}
      clusterFontFamily="System"
      edgePadding={{ top: 120, right: 80, bottom: 80, left: 80 }}
      radius={25}
      maxZoom={10}
      extent={512}
      animationEnabled
    >
      {markerElements}
    </ClusteredMapView>
  );
}

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },

  // Custom marker
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
  markerSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
    shadowOpacity: 0.35,
    shadowRadius: 4,
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

  // Callout
  callout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    minWidth: 160,
    maxWidth: 220,
  },
  calloutName: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 },
  calloutCity: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  calloutInfoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  calloutBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calloutBadgeText: { fontSize: 10, fontWeight: '500', color: theme.colors.primary },
  calloutBadgeMore: { fontSize: 10, fontWeight: '500', color: theme.colors.textSecondary },
  calloutCta: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  calloutMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  calloutMatchFull: { backgroundColor: '#E8F5E9' },
  calloutMatchPartial: { backgroundColor: '#FFF8E1' },
  calloutMatchNone: { backgroundColor: '#F5F5F5' },
  calloutMatchText: { fontSize: 11, fontWeight: '700' },
});
