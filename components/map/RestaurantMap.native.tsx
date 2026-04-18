/**
 * RestaurantMap (native) — Orchestrator.
 *
 * Responsibilities:
 * - ClusteredMapView setup, camera control, region tracking
 * - Building markerElements from allPins + restaurants + favoriteRestaurants
 * - Delegating rendering to MapPin (pure, no context) and SelectedMarkerOverlay
 *
 * Key architecture decisions:
 * 1. No SelectionContext — SelectedMarkerOverlay is the sole consumer of
 *    selectedId. Regular MapPins never re-render on selection change.
 * 2. Dot↔pin transition via key suffix ('-d'). React unmounts/remounts →
 *    fresh bitmap capture on iOS.
 * 3. showMatchInfo does NOT change keys (would cause mass remount → crash).
 *    Colors update via tracksViewChanges for one frame.
 * 4. restaurantById is a stable Map ref used by both markerElements and
 *    SelectedMarkerOverlay.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text as RNText } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { theme } from '../../constants/theme';
import MapPin from './MapPin';
import SelectedMarkerOverlay from './SelectedMarkerOverlay';
import {
  isValidCoord,
  ZOOM_PIN_THRESHOLD,
  DEFAULT_REGION,
  FIT_EDGE_PADDING,
  type Region,
  type RestaurantMapProps,
} from './mapConstants';
import type { Restaurant } from '../../services/restaurantService';

// ---------------------------------------------------------------------------
// Cluster renderer (static — never changes)
// ---------------------------------------------------------------------------

function renderCluster(cluster: any) {
  const { id, geometry, onPress, properties } = cluster;
  const count = properties.point_count;
  return (
    <Marker
      key={`cluster-${id}`}
      coordinate={{ latitude: geometry.coordinates[1], longitude: geometry.coordinates[0] }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.clusterContainer}>
        <RNText style={styles.clusterText}>{count}</RNText>
      </View>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// RestaurantMap
// ---------------------------------------------------------------------------

export default function RestaurantMap({
  restaurants,
  allPins,
  centerOn,
  hasUserLocation,
  onRegionChangeComplete,
  selectedId,
  selectedRestaurant,
  onDeselect,
  showMatchInfo,
  onRestaurantPress,
  favoriteIds,
  favoriteRestaurants,
  compassOffset,
  fitBounds,
}: RestaurantMapProps) {
  const mapRef = useRef<any>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const mapReady = useRef(false);
  const [hasAnimatedToUser, setHasAnimatedToUser] = useState(false);
  const currentRegion = useRef<Region | null>(null);
  const [isDotZoom, setIsDotZoom] = useState(false);

  // ---- Stable refs for prop callbacks ----
  const onRegionChangeCompleteRef = useRef(onRegionChangeComplete);
  onRegionChangeCompleteRef.current = onRegionChangeComplete;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;
  const centerOnRef = useRef(centerOn);
  centerOnRef.current = centerOn;
  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;

  // ---- restaurantById — stable lookup for markerElements and overlay ----
  // Includes selectedRestaurant so the overlay can render even if the
  // selected pin is outside the current viewport/filter set.
  const restaurantById = useMemo(() => {
    const map = new Map<string, Restaurant>();
    for (const r of restaurants) {
      if (r.location && isValidCoord(r.location.latitude, r.location.longitude)) {
        map.set(r.id, r);
      }
    }
    const favMap = favoriteRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of favMap) {
      if (r.location && isValidCoord(r.location.latitude, r.location.longitude)) {
        map.set(id, r);
      }
    }
    if (selectedRestaurant?.location && isValidCoord(selectedRestaurant.location.latitude, selectedRestaurant.location.longitude)) {
      map.set(selectedRestaurant.id, selectedRestaurant);
    }
    return map;
  }, [restaurants, favoriteRestaurants, selectedRestaurant]);

  // ---- Camera: fit to markers on first load ----
  const fitToMarkers = useCallback(() => {
    const coords = restaurantsRef.current
      .filter(r => r.location && isValidCoord(r.location.latitude, r.location.longitude))
      .map(r => ({ latitude: r.location!.latitude, longitude: r.location!.longitude }));
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: FIT_EDGE_PADDING,
      animated: true,
    });
  }, []);

  // Trigger fitToMarkers when restaurant set changes substantially
  const restaurantKey = useMemo(() => {
    const withLoc = restaurants.filter(r => r.location);
    return `${withLoc.length}_${withLoc[0]?.id ?? ''}_${withLoc[withLoc.length - 1]?.id ?? ''}`;
  }, [restaurants]);

  useEffect(() => {
    if (restaurantsRef.current.length === 0 || centerOnRef.current || !mapReady.current) return;
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantKey, fitToMarkers]);

  // ---- Camera: fitBounds (filtro attivo → adatta mappa ai risultati) ----
  useEffect(() => {
    if (!fitBounds || !mapReady.current) return;
    const coords = restaurantsRef.current
      .filter(r => r.location && isValidCoord(r.location.latitude, r.location.longitude))
      .map(r => ({ latitude: r.location!.latitude, longitude: r.location!.longitude }));
    if (coords.length === 0) return;
    const lats = coords.map(c => c.latitude);
    const lngs = coords.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const MIN_DELTA = 0.05;
    if (maxLat - minLat < MIN_DELTA && maxLng - minLng < MIN_DELTA) {
      mapRef.current?.animateToRegion(
        { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: MIN_DELTA, longitudeDelta: MIN_DELTA },
        600,
      );
    } else {
      mapRef.current?.fitToCoordinates(coords, { edgePadding: FIT_EDGE_PADDING, animated: true });
    }
  }, [fitBounds]);

  // ---- Camera: centerOn (pin selection, search, locate me) ----
  useEffect(() => {
    if (!centerOn || mapHeight === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (centerOn.latDelta) {
      const offset = centerOn.latDelta * (centerOn.sheetFraction / 2);
      mapRef.current?.animateToRegion({
        latitude: centerOn.latitude - offset,
        longitude: centerOn.longitude,
        latitudeDelta: centerOn.latDelta,
        longitudeDelta: centerOn.latDelta,
      }, 600);
    } else {
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

    let animTimer: ReturnType<typeof setTimeout> | undefined;
    if (!hasAnimatedToUser) {
      animTimer = setTimeout(() => setHasAnimatedToUser(true), 650);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (animTimer) clearTimeout(animTimer);
    };
  }, [centerOn, mapHeight]);

  // ---- Stable event handlers ----

  const handleMapReady = useCallback(() => {
    mapReady.current = true;
    if (!centerOnRef.current && restaurantsRef.current.length > 0) fitToMarkers();
  }, [fitToMarkers]);

  const handleRegionChange = useCallback((region: Region) => {
    currentRegion.current = region;
    onRegionChangeCompleteRef.current?.(region);
    const nowDot = region.latitudeDelta > ZOOM_PIN_THRESHOLD;
    setIsDotZoom(prev => prev !== nowDot ? nowDot : prev);
  }, []);

  const handleMapPress = useCallback(() => {
    onDeselectRef.current?.();
  }, []);

  const handleLayout = useCallback((e: any) => {
    setMapHeight(e.nativeEvent.layout.height);
  }, []);

  // ---- Marker elements ----
  // isDotZoom changes the key suffix → React remounts all markers → fresh bitmap.
  // showMatchInfo does NOT change keys → colors update via tracksViewChanges.
  const favIds = favoriteIds ?? new Set<string>();

  const markerElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const seen = new Set<string>();
    const pins = allPins ?? [];
    const keySuffix = isDotZoom ? '-d' : '';
    // Il pin selezionato è gestito esclusivamente da SelectedMarkerOverlay.
    // Renderizzarlo anche qui crea due Marker alla stessa coordinata e su iOS
    // lo z-ordering è imprevedibile → il pin normale "emerge" sopra l'overlay.
    const skip = selectedId ?? '';

    // allPins first (lightweight, covers the whole viewport)
    for (const p of pins) {
      if (p.id === skip || seen.has(p.id) || !isValidCoord(p.latitude, p.longitude)) continue;
      seen.add(p.id);
      elements.push(
        <MapPin
          key={p.id + keySuffix}
          id={p.id}
          latitude={p.latitude}
          longitude={p.longitude}
          restaurant={restaurantById.get(p.id)}
          asDot={isDotZoom}
          isFavorite={favIds.has(p.id)}
          showMatchInfo={showMatchInfo}
          onPress={onRestaurantPress}
        />,
      );
    }

    // Full restaurants not in allPins
    for (const r of restaurants) {
      if (r.id === skip || !r.location || seen.has(r.id) || !isValidCoord(r.location.latitude, r.location.longitude)) continue;
      seen.add(r.id);
      elements.push(
        <MapPin
          key={r.id + keySuffix}
          id={r.id}
          latitude={r.location.latitude}
          longitude={r.location.longitude}
          restaurant={r}
          asDot={isDotZoom}
          isFavorite={favIds.has(r.id)}
          showMatchInfo={showMatchInfo}
          onPress={onRestaurantPress}
        />,
      );
    }

    // Favorite restaurants not yet seen
    const favMap = favoriteRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of favMap) {
      if (id === skip || !r.location || seen.has(id) || !isValidCoord(r.location.latitude, r.location.longitude)) continue;
      seen.add(id);
      elements.push(
        <MapPin
          key={id + keySuffix}
          id={id}
          latitude={r.location.latitude}
          longitude={r.location.longitude}
          restaurant={r}
          asDot={isDotZoom}
          isFavorite
          showMatchInfo={showMatchInfo}
          onPress={onRestaurantPress}
        />,
      );
    }

    return elements;
  }, [restaurants, allPins, favoriteRestaurants, favIds, isDotZoom, showMatchInfo, onRestaurantPress, restaurantById, selectedId]);

  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <ClusteredMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={!!hasUserLocation}
      showsMyLocationButton={false}
      showsCompass
      compassOffset={compassOffset}
      onMapReady={handleMapReady}
      onRegionChangeComplete={handleRegionChange}
      onPress={handleMapPress}
      onLayout={handleLayout}
      clusterColor={theme.colors.primary}
      clusterTextColor="#FFFFFF"
      clusterFontFamily={Platform.OS === 'ios' ? 'System' : 'sans-serif-medium'}
      renderCluster={renderCluster}
      radius={40}
      minPoints={4}
      maxZoom={11}
      extent={256}
      animationEnabled={false}
    >
      {showMarkers ? markerElements : null}
      {showMarkers && !isDotZoom && (
        <SelectedMarkerOverlay
          selectedId={selectedId}
          restaurantById={restaurantById}
          favoriteIds={favIds}
          showMatchInfo={showMatchInfo}
          onPress={onRestaurantPress}
        />
      )}
    </ClusteredMapView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },

  clusterContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
