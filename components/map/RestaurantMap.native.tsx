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
 * 2. Dot↔pin transition via tracksViewChanges (NOT key change). MapPin tracks
 *    asDot in justChanged → iOS recaptures the bitmap for one frame.
 *    Key changes caused a flash of the default Apple Maps red pin on iOS.
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
// Cluster color helper (pure)
// ---------------------------------------------------------------------------

/** Punteggio di copertura: 3=verde, 2=giallo, 1=grigio, 0=sconosciuto */
function leafScore(r: import('../../services/restaurantService').Restaurant): number {
  const covered = (r.covered_allergen_count ?? 0) + (r.covered_dietary_count ?? 0);
  const total = (r.total_allergen_filters ?? 0) + (r.total_dietary_filters ?? 0);
  if (total === 0 || covered === 0) return 1;
  return covered >= total ? 3 : 2;
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
  userAllergens,
  userDiets,
}: RestaurantMapProps) {
  const mapRef = useRef<any>(null);
  // Gate "pronto ad animare" per l'effect centerOn. Flippa una sola volta al
  // primo layout: i resize successivi (tastiera) non ri-triggerano l'effect.
  const [isLaidOut, setIsLaidOut] = useState(false);
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
  const onRestaurantPressRef = useRef(onRestaurantPress);
  onRestaurantPressRef.current = onRestaurantPress;
  const showMatchInfoRef = useRef(showMatchInfo);
  showMatchInfoRef.current = showMatchInfo;
  // Esposto alla libreria per getLeaves nei cluster
  const superClusterRef = useRef<any>({});

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

  const restaurantByIdRef = useRef(restaurantById);
  restaurantByIdRef.current = restaurantById;

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

  const restaurantKey = useMemo(() => {
    const withLoc = restaurants.filter(r => r.location);
    return `${withLoc.length}_${withLoc[0]?.id ?? ''}_${withLoc[withLoc.length - 1]?.id ?? ''}`;
  }, [restaurants]);

  useEffect(() => {
    if (restaurantsRef.current.length === 0 || centerOnRef.current || !mapReady.current) return;
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantKey, fitToMarkers]);

  // ---- Camera: centerOn (pin selection, search, locate me) ----
  useEffect(() => {
    if (!centerOn || !isLaidOut) return;

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
  }, [centerOn, isLaidOut]);

  // ---- Stable event handlers ----

  const handleMapReady = useCallback(() => {
    mapReady.current = true;
    if (!centerOnRef.current && restaurantsRef.current.length > 0) fitToMarkers();
  }, [fitToMarkers]);

  const handleRegionChange = useCallback((region: Region) => {
    currentRegion.current = region;
    onRegionChangeCompleteRef.current?.(region);
    // Isteresi ±0.05 attorno a ZOOM_PIN_THRESHOLD: evita oscillazione rapida quando
    // lo zoom si trova vicino alla soglia (es. durante pinch-zoom lento), che causerebbe
    // mass-update di tutti i marker in loop con tracksViewChanges=true.
    setIsDotZoom(prev => {
      if (!prev && region.latitudeDelta > ZOOM_PIN_THRESHOLD + 0.05) return true;
      if (prev && region.latitudeDelta < ZOOM_PIN_THRESHOLD - 0.05) return false;
      return prev;
    });
  }, []);

  const handleMapPress = useCallback(() => {
    onDeselectRef.current?.();
  }, []);

  // Callback stabile per i marker: non incluso nelle dipendenze di markerElements,
  // così il cambio di onRestaurantPress nel parent non causa mass-remount di tutti i pin.
  const handleMarkerPress = useCallback((id: string) => {
    onRestaurantPressRef.current?.(id);
  }, []);

  // Cluster colorato: verde se almeno un ristorante è completamente coperto,
  // giallo se parzialmente, grigio se nessuno coperto, primary se nessun dato.
  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const count = properties.point_count;

    let clusterColor = theme.colors.primary;
    if (showMatchInfoRef.current) {
      // Limite 50: sufficiente per determinare il colore del cluster (break su score=3),
      // evita loop O(n) su cluster grandi durante pan veloce con showMatchInfo attivo.
      const leaves: any[] = superClusterRef.current?.getLeaves?.(properties.cluster_id, 50) ?? [];
      let best = 0;
      for (const leaf of leaves) {
        const rid = leaf.properties?.identifier;
        const r = rid ? restaurantByIdRef.current.get(rid) : undefined;
        if (!r) continue;
        const score = leafScore(r);
        if (score > best) best = score;
        if (best === 3) break; // verde → non può migliorare
      }
      if (best === 3) clusterColor = theme.colors.success;
      else if (best === 2) clusterColor = '#F9A825';
      else if (best === 1) clusterColor = theme.colors.textDisabled;
    }

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ latitude: geometry.coordinates[1], longitude: geometry.coordinates[0] }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={[styles.clusterContainer, { backgroundColor: clusterColor }]}>
          <RNText style={styles.clusterText}>{count}</RNText>
        </View>
      </Marker>
    );
  }, []);

  const handleLayout = useCallback(() => {
    setIsLaidOut(true);
  }, []);

  // ---- Marker elements ----
  // isDotZoom changes the key suffix → React remounts all markers → fresh bitmap.
  // showMatchInfo does NOT change keys → colors update via tracksViewChanges.
  const favIds = useMemo(() => favoriteIds ?? new Set<string>(), [favoriteIds]);

  const markerElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const seen = new Set<string>();
    const pins = allPins ?? [];
    // Il pin selezionato è gestito esclusivamente da SelectedMarkerOverlay,
    // ma SOLO se l'overlay può effettivamente renderizzarlo (restaurantById
    // contiene l'id). Se i dati del ristorante non sono ancora caricati
    // (pin presente solo in allPins, non in restaurants/favorites), lasciamo
    // il pin normale visibile per evitare che sparisca durante il tap.
    const skip = (selectedId && restaurantById.has(selectedId)) ? selectedId : '';

    // allPins first (lightweight, covers the whole viewport)
    for (const p of pins) {
      if (p.id === skip || seen.has(p.id) || !isValidCoord(p.latitude, p.longitude)) continue;
      const restaurant = restaurantById.get(p.id);
      seen.add(p.id);
      elements.push(
        <MapPin
          key={p.id}
          id={p.id}
          latitude={p.latitude}
          longitude={p.longitude}
          restaurant={restaurant}
          asDot={isDotZoom}
          isFavorite={favIds.has(p.id)}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
          supportedAllergens={p.supported_allergens}
          supportedDiets={p.supported_diets}
          userAllergens={userAllergens}
          userDiets={userDiets}
        />,
      );
    }

    // Full restaurants not in allPins
    for (const r of restaurants) {
      if (r.id === skip || !r.location || seen.has(r.id) || !isValidCoord(r.location.latitude, r.location.longitude)) continue;
      seen.add(r.id);
      elements.push(
        <MapPin
          key={r.id}
          id={r.id}
          latitude={r.location.latitude}
          longitude={r.location.longitude}
          restaurant={r}
          asDot={isDotZoom}
          isFavorite={favIds.has(r.id)}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
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
          key={id}
          id={id}
          latitude={r.location.latitude}
          longitude={r.location.longitude}
          restaurant={r}
          asDot={isDotZoom}
          isFavorite
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
        />,
      );
    }

    return elements;
  }, [restaurants, allPins, favoriteRestaurants, favIds, isDotZoom, showMatchInfo, handleMarkerPress, restaurantById, selectedId, userAllergens, userDiets]);

  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <ClusteredMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={!!hasUserLocation}
      showsMyLocationButton={false}
      customMapStyle={Platform.OS === 'android' ? ANDROID_MAP_STYLE : undefined}
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
      superClusterRef={superClusterRef}
      radius={40}
      minPoints={4}
      maxZoom={11}
      extent={256}
      animationEnabled={false}
    >
      {showMarkers ? markerElements : null}
      {showMarkers && (
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
// Styles & map config
// ---------------------------------------------------------------------------

const ANDROID_MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

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
