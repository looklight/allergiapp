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
  /** Set di ID dei ristoranti preferiti dall'utente */
  favoriteIds?: Set<string>;
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
const FavoritesContext = createContext<Set<string> | undefined>(undefined);

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
  if (total === 0 || covered === 0) return theme.colors.textDisabled;
  if (covered >= total) return '#2E7D32';
  return '#F9A825';
}

/**
 * Marker singolo. Legge lo stato di selezione da SelectionContext anziché
 * da prop, in modo da non invalidare il useMemo dei children di ClusteredMapView.
 *
 * tracksViewChanges: attivo solo per il marker selezionato (+ un ciclo extra
 * per il marker appena deselezionato, così il bitmap nativo cattura lo stile
 * corretto prima di congelarsi). Questo evita aggiornamenti nativi di massa
 * ed elimina la scomparsa dei pin durante selezioni rapide sequenziali.
 *
 * zIndex rimosso: su iOS cambiare zIndex rimuove e ri-aggiunge l'annotation,
 * causando scomparsa momentanea. Lo scale 1.25x e il colore sono sufficienti.
 */
const RestaurantMarker = memo(function RestaurantMarker({
  restaurant,
  showMatchInfo,
  onRestaurantPress,
}: MarkerProps) {
  const selectedId = useContext(SelectionContext);
  const favoriteIds = useContext(FavoritesContext);
  const isSelected = selectedId === restaurant.id;
  const isFavorite = favoriteIds?.has(restaurant.id) ?? false;

  // tracksViewChanges lifecycle — useState (non useRef) per garantire
  // il re-render che congela il bitmap nativo dopo il ciclo extra:
  //
  //  selezionato        → tracksViewChanges = true  (bitmap live)
  //  appena deselezionato → tracksViewChanges = true  (un frame extra per catturare lo stile normale)
  //  stabile            → tracksViewChanges = false (bitmap congelato, zero costo)
  //
  // Bug precedente: useRef non triggera re-render, quindi il flag restava
  // true all'infinito → il bitmap veniva ricreato ogni frame anche dopo
  // la deselezione, e su iOS poteva diventare vuoto (pin sparisce).
  const [prevSelected, setPrevSelected] = useState(false);
  const [prevFavorite, setPrevFavorite] = useState(isFavorite);
  const shouldTrack = isSelected || prevSelected || isFavorite !== prevFavorite;
  useEffect(() => { setPrevSelected(isSelected); }, [isSelected]);
  useEffect(() => { setPrevFavorite(isFavorite); }, [isFavorite]);

  // Stabile: evita che ogni re-render da context crei una nuova closure nativa
  const handlePress = useCallback(() => {
    onRestaurantPress?.(restaurant.id);
  }, [onRestaurantPress, restaurant.id]);

  const rating = restaurant.average_rating ?? 0;
  const hasRating = rating > 0;

  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);
  const markerColor = isSelected
    ? theme.colors.primary
    : showMatchInfo
      ? coverageColor(coveredTotal, filtersTotal)
      : theme.colors.primary;

  // Stile stabile: la struttura del view tree e le proprietà sono sempre le
  // stesse — cambiano solo i VALORI. Questo evita che MKAnnotationView su iOS
  // catturi un bitmap corrotto durante le transizioni (selezione, cuore).
  const bgColor = isSelected ? markerColor : '#FFFFFF';
  const fgColor = isSelected ? '#fff' : markerColor;

  return (
    <Marker
      coordinate={{
        latitude: restaurant.location!.latitude,
        longitude: restaurant.location!.longitude,
      }}
      tracksViewChanges={shouldTrack}
      onPress={handlePress}
    >
      <View style={[styles.markerWrap, { transform: [{ scale: isSelected ? 1.25 : 1 }] }]}>
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
            <View style={[styles.markerDot, { backgroundColor: fgColor }]} />
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
// RestaurantMap
// ---------------------------------------------------------------------------

const DEFAULT_REGION: Region = {
  latitude: 41.9,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const CLUSTER_EDGE_PADDING = { top: 120, right: 80, bottom: 80, left: 80 };
const FIT_EDGE_PADDING = { top: 80, right: 50, bottom: 50, left: 50 };

export default function RestaurantMap({
  restaurants,
  centerOn,
  hasUserLocation,
  onRegionChangeComplete,
  selectedId,
  onDeselect,
  showMatchInfo,
  onRestaurantPress,
  favoriteIds,
}: Props) {
  const mapRef = useRef<any>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const mapReady = useRef(false);
  const [hasAnimatedToUser, setHasAnimatedToUser] = useState(false);
  const currentRegion = useRef<Region | null>(null);

  // ---- Refs for prop callbacks (used by stable callbacks below) ----
  const onRegionChangeCompleteRef = useRef(onRegionChangeComplete);
  onRegionChangeCompleteRef.current = onRegionChangeComplete;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;
  const centerOnRef = useRef(centerOn);
  centerOnRef.current = centerOn;

  // ---- Stable ref for restaurants (used by fitToMarkers & markerElements) ----
  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;

  const fitToMarkers = useCallback(() => {
    const coords = restaurantsRef.current
      .filter(r => r.location)
      .map(r => ({ latitude: r.location!.latitude, longitude: r.location!.longitude }));
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: FIT_EDGE_PADDING,
      animated: true,
    });
  }, []);

  // Restaurant ID hash — only changes when restaurants are added/removed,
  // NOT on field-only updates (e.g. favorite_count from optimistic toggle).
  const restaurantKey = useMemo(
    () => restaurants.filter(r => r.location).map(r => r.id).join(','),
    [restaurants],
  );

  // Fit to all markers only when there is no user position to center on.
  // Uses restaurantKey so field-only updates don't trigger fitToMarkers.
  useEffect(() => {
    if (restaurantsRef.current.length === 0 || centerOnRef.current || !mapReady.current) return;
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantKey, fitToMarkers]);

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

  // ---- Stable callbacks for ClusteredMapView (prevent memo bypass) ----

  const handleMapReady = useCallback(() => {
    mapReady.current = true;
    if (!centerOnRef.current && restaurantsRef.current.length > 0) fitToMarkers();
  }, [fitToMarkers]);

  const handleRegionChange = useCallback((region: Region) => {
    currentRegion.current = region;
    onRegionChangeCompleteRef.current?.(region);
  }, []);

  const handleMapPress = useCallback(() => {
    onDeselectRef.current?.();
  }, []);

  const handleLayout = useCallback((e: any) => {
    setMapHeight(e.nativeEvent.layout.height);
  }, []);

  // Marker elements are stable: selectedId and favoriteIds are NOT dependencies.
  // Selection/favorites state flows through Context, keeping ClusteredMapView
  // children reference unchanged and preventing supercluster rebuilds.
  const markerElements = useMemo(() =>
    restaurantsRef.current.filter(r => r.location).map(restaurant => (
      <RestaurantMarker
        key={restaurant.id}
        restaurant={restaurant}
        showMatchInfo={showMatchInfo}
        onRestaurantPress={onRestaurantPress}
      />
    )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurantKey, showMatchInfo, onRestaurantPress],
  );

  // Show markers immediately on pin/card tap (no latDelta).
  // Hide only during the initial GPS fly-in animation (latDelta present)
  // to avoid rendering Italy's full marker set before the map reaches the user.
  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <SelectionContext.Provider value={selectedId}>
    <FavoritesContext.Provider value={favoriteIds}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={!!hasUserLocation}
        showsMyLocationButton={false}
        showsCompass
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChange}
        onPress={handleMapPress}
        onLayout={handleLayout}
        clusterColor={theme.colors.primary}
        clusterTextColor={theme.colors.onPrimary}
        clusterFontFamily="System"
        edgePadding={CLUSTER_EDGE_PADDING}
        radius={45}
        maxZoom={7}
        minPoints={3}
        extent={512}
        spiralEnabled={false}
        animationEnabled
      >
        {showMarkers ? markerElements : null}
      </ClusteredMapView>
    </FavoritesContext.Provider>
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
