import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text as RNText } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../constants/theme';
import type { Restaurant, RestaurantPin } from '../services/restaurantService';

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
  /** Pin leggeri di tutti i ristoranti (id + coordinate), sempre visibili come pallini */
  allPins?: RestaurantPin[];
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
  /** Ristoranti preferiti completi (sempre visibili sulla mappa) */
  favoriteRestaurants?: Map<string, Restaurant>;
};

// ---------------------------------------------------------------------------
// Zoom thresholds
// ---------------------------------------------------------------------------

/** latitudeDelta sotto la quale i pallini diventano pin completi con rating */
const ZOOM_PIN_THRESHOLD = 0.08;

// ---------------------------------------------------------------------------
// Contexts — selection e favorites fluiscono via context per evitare
// che ogni cambio di selezione/preferito ricrei l'intero array di marker.
// ---------------------------------------------------------------------------

const SelectionContext = createContext<string | null | undefined>(null);
const FavoritesContext = createContext<Set<string> | undefined>(undefined);

// ---------------------------------------------------------------------------
// DotMarker — pallino piccolo per zoom city/regionale
// ---------------------------------------------------------------------------

type DotMarkerProps = {
  id: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  onRestaurantPress?: (id: string) => void;
};

const DotMarker = memo(function DotMarker({ id, latitude, longitude, isFavorite, onRestaurantPress }: DotMarkerProps) {
  const handlePress = useCallback(() => {
    onRestaurantPress?.(id);
  }, [onRestaurantPress, id]);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={false}
      onPress={handlePress}
    >
      <View style={styles.dotWrap}>
        <View style={[
          styles.dotMarker,
          isFavorite && styles.dotFavorite,
          { backgroundColor: theme.colors.primary },
        ]} />
        {isFavorite && (
          <View style={styles.dotHeartBadge}>
            <RNText style={styles.dotHeartText}>{'\u2665'}</RNText>
          </View>
        )}
      </View>
    </Marker>
  );
});

// ---------------------------------------------------------------------------
// PinMarker — marker completo con voto (ex RestaurantMarker)
// ---------------------------------------------------------------------------

type PinMarkerProps = {
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
 * Marker completo con voto. Legge lo stato di selezione e preferiti da Context.
 *
 * tracksViewChanges: attivo solo per il marker selezionato (+ un ciclo extra
 * per il marker appena deselezionato, così il bitmap nativo cattura lo stile
 * corretto prima di congelarsi). Questo evita aggiornamenti nativi di massa
 * ed elimina la scomparsa dei pin durante selezioni rapide sequenziali.
 *
 * zIndex rimosso: su iOS cambiare zIndex rimuove e ri-aggiunge l'annotation,
 * causando scomparsa momentanea. Lo scale 1.25x e il colore sono sufficienti.
 */
const PinMarker = memo(function PinMarker({
  restaurant,
  showMatchInfo,
  onRestaurantPress,
}: PinMarkerProps) {
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
  const [prevSelected, setPrevSelected] = useState(false);
  const [prevFavorite, setPrevFavorite] = useState(isFavorite);
  const shouldTrack = isSelected || prevSelected || isFavorite !== prevFavorite;
  useEffect(() => { setPrevSelected(isSelected); }, [isSelected]);
  useEffect(() => { setPrevFavorite(isFavorite); }, [isFavorite]);

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

const FIT_EDGE_PADDING = { top: 80, right: 50, bottom: 50, left: 50 };

export default function RestaurantMap({
  restaurants,
  allPins,
  centerOn,
  hasUserLocation,
  onRegionChangeComplete,
  selectedId,
  onDeselect,
  showMatchInfo,
  onRestaurantPress,
  favoriteIds,
  favoriteRestaurants,
}: Props) {
  const mapRef = useRef<any>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const mapReady = useRef(false);
  const [hasAnimatedToUser, setHasAnimatedToUser] = useState(false);
  const currentRegion = useRef<Region | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<Region>(DEFAULT_REGION);

  // ---- Refs for prop callbacks (used by stable callbacks below) ----
  const onRegionChangeCompleteRef = useRef(onRegionChangeComplete);
  onRegionChangeCompleteRef.current = onRegionChangeComplete;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;
  const centerOnRef = useRef(centerOn);
  centerOnRef.current = centerOn;

  // ---- Stable ref for restaurants (used by fitToMarkers) ----
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

  // Hash leggero: cambia solo quando i ristoranti vengono aggiunti/rimossi.
  const restaurantKey = useMemo(() => {
    const withLoc = restaurants.filter(r => r.location);
    return `${withLoc.length}_${withLoc[0]?.id ?? ''}_${withLoc[withLoc.length - 1]?.id ?? ''}`;
  }, [restaurants]);

  // Fit to all markers only when there is no user position to center on.
  useEffect(() => {
    if (restaurantsRef.current.length === 0 || centerOnRef.current || !mapReady.current) return;
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantKey, fitToMarkers]);

  useEffect(() => {
    if (!centerOn || mapHeight === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (centerOn.latDelta) {
      // Centra + zoom: posizione GPS iniziale, locate-me, ricerca luogo.
      const offset = centerOn.latDelta * (centerOn.sheetFraction / 2);
      mapRef.current?.animateToRegion({
        latitude: centerOn.latitude - offset,
        longitude: centerOn.longitude,
        latitudeDelta: centerOn.latDelta,
        longitudeDelta: centerOn.latDelta,
      }, 600);
    } else {
      // Solo centra, mantieni zoom corrente: tap pin o card.
      // Breve delay: lascia che iOS catturi il bitmap del marker selezionato
      // prima che l'animazione camera invalidi la view (→ pin sparisce).
      const latDelta = currentRegion.current?.latitudeDelta ?? 0.02;
      const offset = latDelta * (centerOn.sheetFraction / 2);
      timer = setTimeout(() => {
        mapRef.current?.animateCamera({
          center: {
            latitude: centerOn.latitude - offset,
            longitude: centerOn.longitude,
          },
        }, { duration: 400 });
      }, 50);
    }

    if (!hasAnimatedToUser) {
      setTimeout(() => setHasAnimatedToUser(true), 650);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [centerOn, mapHeight]);

  // ---- Stable callbacks for MapView ----

  const handleMapReady = useCallback(() => {
    mapReady.current = true;
    if (!centerOnRef.current && restaurantsRef.current.length > 0) fitToMarkers();
  }, [fitToMarkers]);

  const handleRegionChange = useCallback((region: Region) => {
    currentRegion.current = region;
    onRegionChangeCompleteRef.current?.(region);

    // Aggiorna lo state solo se il viewport è cambiato abbastanza da influenzare
    // quali marker sono visibili. Evita ricalcoli useMemo su pan piccoli.
    setVisibleRegion(prev => {
      const zoomChanged = Math.abs(prev.latitudeDelta - region.latitudeDelta) > 0.001;
      const panDist = Math.abs(prev.latitude - region.latitude) + Math.abs(prev.longitude - region.longitude);
      const pannedEnough = panDist > prev.latitudeDelta * 0.3;
      return (zoomChanged || pannedEnough) ? region : prev;
    });
  }, []);

  const handleMapPress = useCallback(() => {
    onDeselectRef.current?.();
  }, []);

  const handleLayout = useCallback((e: any) => {
    setMapHeight(e.nativeEvent.layout.height);
  }, []);

  // ---------------------------------------------------------------------------
  // Zoom-based marker computation
  // ---------------------------------------------------------------------------

  const markerElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const seen = new Set<string>();
    const pins = allPins ?? [];
    const zoomLevel = visibleRegion.latitudeDelta;

    const favMap = favoriteRestaurants ?? new Map<string, Restaurant>();
    const favIds = favoriteIds ?? new Set<string>();

    // Viewport bounds con 20% di margine per evitare pop-in ai bordi
    const margin = zoomLevel * 0.2;
    const minLat = visibleRegion.latitude - visibleRegion.latitudeDelta / 2 - margin;
    const maxLat = visibleRegion.latitude + visibleRegion.latitudeDelta / 2 + margin;
    const minLng = visibleRegion.longitude - visibleRegion.longitudeDelta / 2 - margin;
    const maxLng = visibleRegion.longitude + visibleRegion.longitudeDelta / 2 + margin;
    const inViewport = (lat: number, lng: number) =>
      lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;

    // 1. Preferiti sempre visibili (a qualsiasi zoom, nessun viewport culling)
    for (const [id, r] of favMap) {
      if (!r.location) continue;
      seen.add(id);
      if (zoomLevel <= ZOOM_PIN_THRESHOLD || id === selectedId) {
        elements.push(
          <PinMarker key={id} restaurant={r} showMatchInfo={showMatchInfo} onRestaurantPress={onRestaurantPress} />
        );
      } else {
        elements.push(
          <DotMarker key={id} id={id} latitude={r.location.latitude} longitude={r.location.longitude} isFavorite onRestaurantPress={onRestaurantPress} />
        );
      }
    }

    // Preferiti dalla lista restaurants (non ancora in favMap, ma con ID nel set)
    for (const r of restaurants) {
      if (!r.location || seen.has(r.id) || !favIds.has(r.id)) continue;
      seen.add(r.id);
      if (zoomLevel <= ZOOM_PIN_THRESHOLD || r.id === selectedId) {
        elements.push(
          <PinMarker key={r.id} restaurant={r} showMatchInfo={showMatchInfo} onRestaurantPress={onRestaurantPress} />
        );
      } else {
        elements.push(
          <DotMarker key={r.id} id={r.id} latitude={r.location.latitude} longitude={r.location.longitude} isFavorite onRestaurantPress={onRestaurantPress} />
        );
      }
    }

    // 2. Zoom lontano (> ZOOM_PIN_THRESHOLD): pallini con viewport culling.
    //    Il marker selezionato è escluso dai pallini — verrà aggiunto come PinMarker sotto.
    if (zoomLevel > ZOOM_PIN_THRESHOLD) {
      for (const p of pins) {
        if (seen.has(p.id) || p.id === selectedId || !inViewport(p.latitude, p.longitude)) continue;
        seen.add(p.id);
        elements.push(
          <DotMarker key={p.id} id={p.id} latitude={p.latitude} longitude={p.longitude} isFavorite={false} onRestaurantPress={onRestaurantPress} />
        );
      }
      for (const r of restaurants) {
        if (!r.location || seen.has(r.id) || r.id === selectedId || !inViewport(r.location.latitude, r.location.longitude)) continue;
        seen.add(r.id);
        elements.push(
          <DotMarker key={r.id} id={r.id} latitude={r.location.latitude} longitude={r.location.longitude} isFavorite={false} onRestaurantPress={onRestaurantPress} />
        );
      }
      // Marker selezionato come PinMarker (se non già tra i preferiti)
      if (selectedId && !seen.has(selectedId)) {
        const r = restaurants.find(r => r.id === selectedId);
        if (r?.location) {
          elements.push(
            <PinMarker key={selectedId} restaurant={r} showMatchInfo={showMatchInfo} onRestaurantPress={onRestaurantPress} />
          );
        }
      }
      return elements;
    }

    // 3. Zoom vicino (≤ ZOOM_PIN_THRESHOLD): pin completi con rating (max 60).
    //    Il marker selezionato resta nella sua posizione originale nell'array
    //    per evitare che il riordino faccia ri-aggiungere l'annotation iOS → pin sparisce.
    const maxPins = 60 - elements.length;
    const remaining = restaurants
      .filter(r => r.location && !seen.has(r.id))
      .slice(0, maxPins);
    for (const r of remaining) {
      seen.add(r.id);
      elements.push(
        <PinMarker key={r.id} restaurant={r} showMatchInfo={showMatchInfo} onRestaurantPress={onRestaurantPress} />
      );
    }
    // Fallback: marker selezionato sempre visibile (es. oltre il limite di 60 pin)
    if (selectedId && !seen.has(selectedId)) {
      const r = restaurants.find(r => r.id === selectedId);
      if (r?.location) {
        elements.push(
          <PinMarker key={selectedId} restaurant={r} showMatchInfo={showMatchInfo} onRestaurantPress={onRestaurantPress} />
        );
      }
    }
    return elements;
  }, [visibleRegion, restaurants, allPins, favoriteRestaurants, favoriteIds, selectedId, showMatchInfo, onRestaurantPress]);

  // Show markers immediately on pin/card tap (no latDelta).
  // Hide only during the initial GPS fly-in animation (latDelta present)
  // to avoid rendering Italy's full marker set before the map reaches the user.
  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <SelectionContext.Provider value={selectedId}>
    <FavoritesContext.Provider value={favoriteIds}>
      <MapView
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
      >
        {showMarkers ? markerElements : null}
      </MapView>
    </FavoritesContext.Provider>
    </SelectionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },

  // ---- Dot marker (zoom out) ----
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

  // ---- Pin marker (zoom in) ----
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
