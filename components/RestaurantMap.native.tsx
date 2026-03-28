import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text as RNText } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { theme } from '../constants/theme';
import type { Restaurant } from '../services/restaurantService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  restaurants: Restaurant[];
  /** When set, the map animates to this location. sheetFraction = copertura sheet al momento del centering.
   *  latDelta: se presente, cambia anche lo zoom; altrimenti mantiene lo zoom corrente. */
  centerOn?: { latitude: number; longitude: number; sheetFraction: number; latDelta?: number } | null;
  /** Whether the user's GPS position is available (shows blue dot independently of centerOn) */
  hasUserLocation?: boolean;
  /** Fired when the user stops panning/zooming the map */
  onRegionChangeComplete?: (region: Region) => void;
  /** Currently selected restaurant id (highlighted on map) */
  selectedId?: string | null;
  /** Called when the user taps an empty area of the map */
  onDeselect?: () => void;
  /** Colora i marker in base alla copertura allergie dell'utente */
  showMatchInfo?: boolean;
  /** Called when a marker is tapped (opens restaurant detail) */
  onRestaurantPress?: (id: string) => void;
};

// ---------------------------------------------------------------------------
// SelectionContext
//
// Separare selectedId dai children di ClusteredMapView è fondamentale.
// Se selectedId fosse nelle dipendenze di useMemo, ogni selezione genererebbe
// un nuovo array di React element → ClusteredMapView riceverebbe nuovi children
// → ricostruirebbe supercluster → sparizione momentanea dei pin.
//
// Con il Context, markerElements rimane stabile (deps: restaurants, showMatchInfo,
// onRestaurantPress). La selezione cambia solo il valore del Provider: ogni
// RestaurantMarker si ri-renderizza autonomamente senza disturbare ClusteredMapView.
// ---------------------------------------------------------------------------

const SelectionContext = createContext<string | null | undefined>(null);

// ---------------------------------------------------------------------------
// RestaurantMarker
// ---------------------------------------------------------------------------

type MarkerProps = {
  restaurant: Restaurant;
  showMatchInfo?: boolean;
  onRestaurantPress?: (id: string) => void;
};

/** Colore marker in base alla copertura esigenze (usato solo con showMatchInfo) */
function coverageColor(covered: number, total: number): string {
  if (total === 0 || covered === 0) return theme.colors.textSecondary;
  if (covered >= total) return '#2E7D32';
  return '#F9A825';
}

/**
 * Marker singolo. Legge lo stato di selezione da SelectionContext anziché
 * da prop, in modo da non invalidare il useMemo dei children di ClusteredMapView.
 *
 * tracksViewChanges è sempre true: react-native-maps mostra la view React Native
 * live senza snapshot intermedi, eliminando qualsiasi flash/sparizione.
 * Con il clustering il numero di marker visibili è limitato (~20-30),
 * quindi il costo del tracking continuo è trascurabile.
 */
const RestaurantMarker = memo(function RestaurantMarker({
  restaurant,
  showMatchInfo,
  onRestaurantPress,
}: MarkerProps) {
  const selectedId = useContext(SelectionContext);
  const isSelected = selectedId === restaurant.id;

  const rating = restaurant.average_rating ?? 0;
  const hasRating = rating > 0;

  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
  const markerColor = isSelected
    ? theme.colors.primary
    : showMatchInfo
      ? coverageColor(coveredTotal, filtersTotal)
      : theme.colors.primary;

  return (
    <Marker
      coordinate={{
        latitude: restaurant.location!.latitude,
        longitude: restaurant.location!.longitude,
      }}
      tracksViewChanges
      zIndex={isSelected ? 999 : 1}
      onPress={() => onRestaurantPress?.(restaurant.id)}
    >
      <View style={[styles.markerWrap, isSelected && styles.markerWrapSelected]}>
        <View style={[
          styles.markerContainer,
          { borderColor: markerColor },
          isSelected && { backgroundColor: markerColor, shadowOpacity: 0.4, shadowRadius: 5, elevation: 8 },
        ]}>
          {hasRating ? (
            <RNText style={[styles.markerText, { color: isSelected ? '#fff' : markerColor }]}>
              {rating.toFixed(1)}
            </RNText>
          ) : (
            <View style={[styles.markerDot, { backgroundColor: isSelected ? '#fff' : markerColor }]} />
          )}
        </View>
        <View style={styles.markerArrow}>
          <View style={[styles.markerArrowInner, { borderTopColor: markerColor }]} />
        </View>
      </View>
    </Marker>
  );
});

// ---------------------------------------------------------------------------
// RestaurantMap
// ---------------------------------------------------------------------------

const DEFAULT_REGION: Region = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

export default function RestaurantMap({
  restaurants,
  centerOn,
  hasUserLocation,
  onRegionChangeComplete,
  selectedId,
  onDeselect,
  showMatchInfo,
  onRestaurantPress,
}: Props) {
  const mapRef = useRef<any>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const mapReady = useRef(false);
  const [hasAnimatedToUser, setHasAnimatedToUser] = useState(false);
  const currentRegion = useRef<Region | null>(null);

  const fitToMarkers = useCallback(() => {
    const coords = restaurants
      .filter(r => r.location)
      .map(r => ({ latitude: r.location!.latitude, longitude: r.location!.longitude }));
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [restaurants]);

  // Fit to all markers only when there is no user position to center on.
  useEffect(() => {
    if (restaurants.length === 0 || centerOn || !mapReady.current) return;
    fitToMarkers();
  }, [restaurants, centerOn, fitToMarkers]);

  useEffect(() => {
    if (!centerOn || mapHeight === 0) return;

    if (centerOn.latDelta) {
      // Centra + zoom: posizione GPS iniziale, locate-me, ricerca città.
      const offset = centerOn.latDelta * (centerOn.sheetFraction / 2);
      mapRef.current?.animateToRegion({
        latitude: centerOn.latitude - offset,
        longitude: centerOn.longitude,
        latitudeDelta: centerOn.latDelta,
        longitudeDelta: centerOn.latDelta,
      }, 600);
    } else {
      // Solo centra, mantieni zoom corrente: tap pin o card.
      const latDelta = currentRegion.current?.latitudeDelta ?? 0.02;
      const offset = latDelta * (centerOn.sheetFraction / 2);
      mapRef.current?.animateCamera({
        center: {
          latitude: centerOn.latitude - offset,
          longitude: centerOn.longitude,
        },
      }, { duration: 400 });
    }

    if (!hasAnimatedToUser) {
      setTimeout(() => setHasAnimatedToUser(true), 650);
    }
  }, [centerOn, mapHeight]);

  // Marker elements are stable: selectedId is NOT a dependency.
  // Selection state flows through SelectionContext, keeping ClusteredMapView
  // children reference unchanged and preventing supercluster rebuilds.
  const markerElements = useMemo(() =>
    restaurants.filter(r => r.location).map(restaurant => (
      <RestaurantMarker
        key={restaurant.id}
        restaurant={restaurant}
        showMatchInfo={showMatchInfo}
        onRestaurantPress={onRestaurantPress}
      />
    )),
    [restaurants, showMatchInfo, onRestaurantPress],
  );

  // Show markers immediately on pin/card tap (no latDelta).
  // Hide only during the initial GPS fly-in animation (latDelta present)
  // to avoid rendering Italy's full marker set before the map reaches the user.
  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <SelectionContext.Provider value={selectedId}>
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
        onRegionChangeComplete={(region: Region) => {
          currentRegion.current = region;
          onRegionChangeComplete?.(region);
        }}
        onPress={() => onDeselect?.()}
        onLayout={(e: any) => setMapHeight(e.nativeEvent.layout.height)}
        clusterColor={theme.colors.primary}
        clusterTextColor={theme.colors.onPrimary}
        clusterFontFamily="System"
        edgePadding={{ top: 120, right: 80, bottom: 80, left: 80 }}
        radius={45}
        maxZoom={7}
        minPoints={3}
        extent={512}
        spiralEnabled={false}
        animationEnabled
      >
        {showMarkers ? markerElements : null}
      </ClusteredMapView>
    </SelectionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },

  markerWrap: {
    alignItems: 'center',
  },
  markerWrapSelected: {
    transform: [{ scale: 1.25 }],
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
});
