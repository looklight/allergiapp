/**
 * RestaurantMap (native) — Orchestrator.
 *
 * Responsibilities:
 * - MapView setup, camera control, region tracking
 * - Clustering client-side via supercluster (useMapClusters) nel regime "dot"
 *   (zoom largo); pin individuali col rating nel regime "pin" (zoom stretto)
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
 * 4. restaurantById is a stable memoized Map used by markerElements,
 *    clusteredElements and (as prop) SelectedMarkerOverlay.
 * 5. Clustering = Strada B: supercluster alimentato dai pin generici (allPins
 *    meno salvati/preferiti, che restano sempre individuali e sopra le bolle).
 *    Solo nel regime dot (isDotZoom); a zoom stretto il path è invariato.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Text as RNText, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemePreference } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import MapPin from './MapPin';
import SelectedMarkerOverlay from './SelectedMarkerOverlay';
import { useMapClusters, type MapCluster } from './useMapClusters';
import {
  isValidCoord,
  ZOOM_PIN_THRESHOLD,
  DEFAULT_REGION,
  FIT_EDGE_PADDING,
  MIN_FIT_DELTA,
  type Region,
  type RestaurantMapProps,
} from './mapConstants';
import type { Restaurant, RestaurantPin } from '../../services/restaurantService';

// ---------------------------------------------------------------------------
// Cluster bubble (pure)
// ---------------------------------------------------------------------------

/** Colore della bolla dal punteggio miglior-match (0..3), coerente con i
 *  pallini/pin (cfr. coverageColor in mapConstants). 0 = nessun filtro → primary. */
function clusterColor(score: number, theme: AppTheme): string {
  if (score >= 3) return theme.colors.success;
  if (score === 2) return theme.colors.coverageMedium;
  if (score === 1) return theme.colors.textDisabled;
  return theme.colors.primary;
}

/** Diametro bolla: cresce a scatti col numero di pin (best practice — la
 *  dimensione segnala la densità senza diventare invadente). */
function clusterSize(count: number): number {
  if (count >= 100) return 48;
  if (count >= 25) return 42;
  if (count >= 10) return 38;
  return 34;
}

// Clustering SOLO su Android (storicamente): iOS crasha sul churn dei marker e
// non ne ha bisogno (regge centinaia di marker fluido); Android era lento con
// tanti marker.
//
// DISABILITATO (interim, giu 2026): il clustering client su Android rendeva male
// — bolle "a spicchio" (cattura bitmap del marker custom inaffidabile su
// react-native-maps 1.20.1 / New Arch) + churn/flicker dei marker a ogni
// ricalcolo (pin/pallini che spariscono). Spento per dare una UX CORRETTA ora:
// pin individuali come su iOS. La scalabilità >1000 NON va risolta col clustering
// client (vedi tetto LIMIT 1000 in get_pins_in_bounds) ma con aggregazione
// server-side, lavoro pianificato a parte. Riattivare = `Platform.OS === 'android'`.
const CLUSTERING_ENABLED = false;

type MapStyles = ReturnType<typeof makeStyles>;

/** Bolla-cluster: cerchio col conteggio. tracksViewChanges=false (statica),
 *  anchor centrato. Memo: una sola bolla cambia se cambiano i suoi dati. */
const ClusterBubble = memo(function ClusterBubble({
  cluster,
  theme,
  styles,
  onPress,
}: {
  cluster: MapCluster;
  theme: AppTheme;
  styles: MapStyles;
  onPress: (cluster: MapCluster) => void;
}) {
  const size = clusterSize(cluster.count);
  // Android: il marker custom va ridisegnato (tracksViewChanges=true) per ~150ms
  // dopo mount/cambio dati, altrimenti la bitmap non viene catturata e la bolla
  // resta INVISIBILE (stessa ragione dell'androidSettling di MapPin). iOS cattura
  // il CALayer in un frame → false va bene e resta statico.
  const [settling, setSettling] = useState(Platform.OS === 'android');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setSettling(true);
    const t = setTimeout(() => setSettling(false), 150);
    return () => clearTimeout(t);
  }, [cluster.count, cluster.score, size]);
  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={settling}
      {...(Platform.OS === 'android' && { zIndex: 1 })}
    >
      <View style={styles.clusterWrap}>
        <View
          style={[
            styles.clusterContainer,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: clusterColor(cluster.score, theme) },
          ]}
        >
          <RNText style={styles.clusterText}>{cluster.count}</RNText>
        </View>
      </View>
    </Marker>
  );
});

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
  customSymbols,
  savedRestaurants,
  compassOffset,
  fullScreenChrome,
  userAllergens,
  userDiets,
}: RestaurantMapProps) {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mapRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // mapPadding Android-only. Due scopi, entrambi sfruttano lo stesso prop:
  //
  // 1. TOP — sposta la bussola nativa Google Maps SDK fuori dalla zona search
  //    bar/filtri. Valore 120 = search bar (48dp) + filter chips (~30dp) +
  //    margine. iOS gestisce la bussola con compassOffset, non tocchiamo qui.
  //
  // 2. BOTTOM — shifta il "centro logico" della camera sopra l'area coperta
  //    dal detail sheet (~55% schermo). Google Maps Android SDK centra di
  //    default la camera sul marker al tap e usa mapPadding per calcolare il
  //    centro: con bottom = sheetHeight, il pin tappato finisce nella metà
  //    superiore visibile invece che sotto il sheet. iOS non ne ha bisogno
  //    perché Apple Maps SDK non auto-centra sul marker tap.
  //
  // Setting statico always-on (non toggle su detail open) per evitare race
  // condition: il listener nativo del marker tap usa la mapPadding CORRENTE,
  // se aggiornassimo a sheet aperto rischiamo che il primo tap usi ancora
  // bottom: 0. Trade-off: a sheet chiuso fitToMarkers/locate-me lavorano con
  // viewport compressa → marker visivamente "alti". Accettabile.
  // Solo per la mappa a tutto schermo della home (fullScreenChrome). Sulle mappe
  // embedded ad altezza fissa (mini-mappa profilo) questo padding supererebbe
  // l'altezza della mappa e scentrerebbe i pin su Android — lì resta undefined.
  const mapPadding = useMemo(
    () =>
      Platform.OS === 'android' && fullScreenChrome
        ? {
            top: insets.top + 120,
            right: 12,
            // 0.55 deve restare allineato a DETAIL_SHEET_COVERAGE in restaurants.tsx
            bottom: Math.round(windowHeight * 0.55),
            left: 0,
          }
        : undefined,
    [insets.top, windowHeight, fullScreenChrome],
  );
  // Gate "pronto ad animare" per l'effect centerOn. Flippa una sola volta al
  // primo layout: i resize successivi (tastiera) non ri-triggerano l'effect.
  const [isLaidOut, setIsLaidOut] = useState(false);
  const mapReady = useRef(false);
  const [hasAnimatedToUser, setHasAnimatedToUser] = useState(false);
  const currentRegion = useRef<Region | null>(null);
  // Debounce del ricalcolo cluster: durante lo zoom NON ricalcoliamo a ogni evento
  // (causa churn dei marker → ricattura bitmap → ANR su Android), ma solo quando
  // il gesto si ferma. I marker restano stabili durante il movimento.
  const clusterRegionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stato iniziale derivato dallo zoom della regione di partenza (non un `false`
  // arbitrario): il primo frame e' sempre DEFAULT_REGION (vista Europa, delta 22),
  // dove la rappresentazione corretta sono i pallini. Senza questa derivazione i
  // marker nascevano come pin (grigi, finche' i dettagli non caricano) e passavano
  // a pallini solo al primo onRegionChangeComplete (che con initialRegion non scatta
  // al mount, ma solo al primo gesto utente). La logica reattiva sotto resta intatta.
  const [isDotZoom, setIsDotZoom] = useState(
    DEFAULT_REGION.latitudeDelta > ZOOM_PIN_THRESHOLD,
  );
  // Region in stato (non solo ref) per ricalcolare i cluster al region-change.
  // Aggiornata in handleRegionChange (= onRegionChangeComplete, fine gesto):
  // niente storm di re-render durante il pan, un solo update a gesto concluso.
  const [clusterRegion, setClusterRegion] = useState<Region>(DEFAULT_REGION);

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
    const savedMap = savedRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of savedMap) {
      if (r.location && isValidCoord(r.location.latitude, r.location.longitude)) {
        map.set(id, r);
      }
    }
    if (selectedRestaurant?.location && isValidCoord(selectedRestaurant.location.latitude, selectedRestaurant.location.longitude)) {
      map.set(selectedRestaurant.id, selectedRestaurant);
    }
    return map;
  }, [restaurants, favoriteRestaurants, savedRestaurants, selectedRestaurant]);


  // ---- Camera: fit to markers on first load ----
  const fitToMarkers = useCallback(() => {
    const coords = restaurantsRef.current
      .filter(r => r.location && isValidCoord(r.location.latitude, r.location.longitude))
      .map(r => ({ latitude: r.location!.latitude, longitude: r.location!.longitude }));
    if (coords.length === 0) return;

    // Punto singolo o cluster molto stretto: fitToCoordinates zoomerebbe al
    // massimo e si perderebbe il contesto. Sotto MIN_FIT_DELTA di span,
    // inquadriamo una regione con quel delta centrata sui punti.
    const lats = coords.map(c => c.latitude);
    const lngs = coords.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    if (Math.max(maxLat - minLat, maxLng - minLng) < MIN_FIT_DELTA) {
      mapRef.current?.animateToRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: MIN_FIT_DELTA,
        longitudeDelta: MIN_FIT_DELTA,
      }, 600);
      return;
    }

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
      const targetRegion: Region = {
        latitude: centerOn.latitude - offset,
        longitude: centerOn.longitude,
        latitudeDelta: centerOn.latDelta,
        longitudeDelta: centerOn.latDelta,
      };
      mapRef.current?.animateToRegion(targetRegion, 600);
      // Su New Architecture animateToRegion NON emette onRegionChangeComplete in
      // modo affidabile: senza questo, dopo un centraggio programmatico (deep link,
      // ricerca, locate-me) lo stato derivato dalla regione resta stale → i pin del
      // nuovo viewport non vengono caricati e il regime dot/pin non si aggiorna,
      // finché l'utente non tocca la mappa. Sincronizziamo noi a fine animazione:
      // il cambio di isDotZoom forza anche il re-render dei marker (bitmap fresco).
      timer = setTimeout(() => {
        currentRegion.current = targetRegion;
        setIsDotZoom(prev => {
          if (!prev && targetRegion.latitudeDelta > ZOOM_PIN_THRESHOLD + 0.05) return true;
          if (prev && targetRegion.latitudeDelta < ZOOM_PIN_THRESHOLD - 0.05) return false;
          return prev;
        });
        if (CLUSTERING_ENABLED) setClusterRegion(targetRegion);
        onRegionChangeCompleteRef.current?.(targetRegion);
      }, 650);
    } else if (Platform.OS !== 'android') {
      // Branch iOS-only. Su Android il centraggio del pin al tap è gestito
      // dal Google Maps SDK nativo (OnMarkerClickListener), guidato dal nostro
      // mapPadding.bottom per finire sopra il bottom sheet. Vedi commento
      // mapPadding più sopra. Sovrapporre un nostro animateCamera qui
      // causava il "sale e scende" da doppia animazione.
      const latDelta = currentRegion.current?.latitudeDelta ?? 0.02;
      const offset = latDelta * (centerOn.sheetFraction / 2);
      timer = setTimeout(() => {
        // heading: 0 + pitch: 0 → resetta rotazione/inclinazione al tap pin.
        // Senza, se la mappa è ruotata l'offset in latitudine non corrisponde
        // più a "su" sullo schermo e il pin atterra fuori centro.
        mapRef.current?.animateCamera({
          center: {
            latitude: centerOn.latitude - offset,
            longitude: centerOn.longitude,
          },
          heading: 0,
          pitch: 0,
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
    // Solo Android usa il clustering, e con debounce: ricalcoliamo i cluster solo
    // quando lo zoom si ferma (250ms), non durante il gesto → niente churn marker.
    if (CLUSTERING_ENABLED) {
      if (clusterRegionTimer.current) clearTimeout(clusterRegionTimer.current);
      clusterRegionTimer.current = setTimeout(() => setClusterRegion(region), 250);
    }
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

  // Cleanup del timer di debounce cluster all'unmount.
  useEffect(() => () => {
    if (clusterRegionTimer.current) clearTimeout(clusterRegionTimer.current);
  }, []);

  const handleMapPress = useCallback(() => {
    onDeselectRef.current?.();
  }, []);

  // Callback stabile per i marker: non incluso nelle dipendenze di markerElements,
  // così il cambio di onRestaurantPress nel parent non causa mass-remount di tutti i pin.
  const handleMarkerPress = useCallback((id: string) => {
    onRestaurantPressRef.current?.(id);
  }, []);

  // Tap su una bolla → zoom-in verso il cluster, che si apre nei suoi componenti.
  // Mezza delta corrente (clampata a MIN_FIT_DELTA) è l'approccio standard, senza
  // dover mappare il clusterId all'expansion zoom.
  const handleClusterPress = useCallback((cluster: MapCluster) => {
    const cur = currentRegion.current;
    const delta = cur ? Math.max(cur.latitudeDelta / 2.5, MIN_FIT_DELTA) : 1;
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      350,
    );
  }, []);

  const handleLayout = useCallback(() => {
    setIsLaidOut(true);
  }, []);

  // ---- Marker elements ----
  // isDotZoom changes the key suffix → React remounts all markers → fresh bitmap.
  // showMatchInfo does NOT change keys → colors update via tracksViewChanges.
  const favIds = useMemo(() => favoriteIds ?? new Set<string>(), [favoriteIds]);

  // Il clustering (solo Android) ha senso unicamente quando c'è un set `allPins`
  // da diradare — è il regime della mappa home. Le mini-mappe dei profili passano
  // i pin via `restaurants` (niente `allPins`): lì non c'è nulla da clusterizzare,
  // e il percorso cluster NON disegna `restaurants` → mappa profilo vuota su Android.
  // Con questa guardia, senza allPins si usa sempre `markerElements` (che disegna
  // `restaurants`), coerente con iOS dove il clustering è già spento.
  const clusteringActive = CLUSTERING_ENABLED && (allPins?.length ?? 0) > 0;

  const markerElements = useMemo(() => {
    // A zoom largo (regime dot) renderizziamo i cluster (clusteredElements), non i
    // pin individuali: short-circuit per non costruire centinaia di elementi inutili.
    if (clusteringActive && isDotZoom) return [] as React.ReactElement[];
    const elements: React.ReactElement[] = [];
    const seen = new Set<string>();
    const pins = allPins ?? [];
    // Gestione del pin selezionato — split per piattaforma (deliberato):
    // • iOS: lo lasciamo SEMPRE nel layer (skip=''), l'overlay evidenziato si
    //   sovrappone sopra. Così il layer non cambia mai alla selezione → niente
    //   togli/rimetti di marker, che sotto l'interop Fabric causava crash
    //   (SIGABRT in AIRMap insertReactSubview) o pin spariti (con la patch).
    // • Android: NON ha quel churn-crash; in più non rispetta lo zIndex tra due
    //   marker sulla stessa coordinata (il pin normale coprirebbe quello colorato
    //   e mangerebbe il vertice). Quindi lo rimuoviamo dal layer e lo disegna
    //   solo SelectedMarkerOverlay, come prima.
    const skip = Platform.OS === 'ios'
      ? ''
      : (selectedId && restaurantById.has(selectedId)) ? selectedId : '';

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
          customSymbol={customSymbols?.get(p.id)}
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
          customSymbol={customSymbols?.get(r.id)}
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
          customSymbol={customSymbols?.get(id)}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
        />,
      );
    }

    // Saved restaurants (liste custom) non ancora visti: sempre visibili come i
    // preferiti, col badge della lista (emoji/bookmark).
    const savedMap = savedRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of savedMap) {
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
          isFavorite={favIds.has(id)}
          customSymbol={customSymbols?.get(id)}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
        />,
      );
    }

    return elements;
    // selectedId serve solo al ramo Android dello skip (su iOS skip è costante '').
  }, [restaurants, allPins, favoriteRestaurants, savedRestaurants, customSymbols, favIds, isDotZoom, clusteringActive, showMatchInfo, handleMarkerPress, restaurantById, selectedId, userAllergens, userDiets]);

  // --- Cluster elements (regime dot / zoom largo) -----------------------------
  // Salvati/preferiti SEMPRE individuali e sopra le bolle (esclusi dal cluster):
  // sono pochi, nessun costo perf, e così resta il comportamento "sempre visibili".
  const alwaysIndividualIds = useMemo(() => {
    const s = new Set<string>(favIds);
    if (customSymbols) for (const id of customSymbols.keys()) s.add(id);
    return s;
  }, [favIds, customSymbols]);

  // Pin GENERICI dati al clustering (allPins meno salvati/preferiti). Il
  // selezionato NON è escluso qui (indice stabile sulla selezione) ma viene
  // saltato a render: lo disegna SelectedMarkerOverlay.
  const genericPins = useMemo(
    () => (allPins ?? []).filter(p => !alwaysIndividualIds.has(p.id)),
    [allPins, alwaysIndividualIds],
  );

  // Lookup pin→dati grezzi per passare supported_* ai MapPin singoli.
  const pinById = useMemo(() => {
    const m = new Map<string, RestaurantPin>();
    for (const p of (allPins ?? [])) m.set(p.id, p);
    return m;
  }, [allPins]);

  const clusterResults = useMapClusters(
    genericPins,
    userAllergens ?? [],
    userDiets ?? [],
    !!showMatchInfo,
    clusterRegion,
    clusteringActive && isDotZoom,
  );

  const clusteredElements = useMemo(() => {
    if (!clusteringActive) return [] as React.ReactElement[];
    const els: React.ReactElement[] = [];
    // Bolle + pin generici singoli
    for (const r of clusterResults) {
      if (r.kind === 'cluster') {
        els.push(
          <ClusterBubble key={r.data.key} cluster={r.data} theme={theme} styles={styles} onPress={handleClusterPress} />,
        );
        continue;
      }
      // NB: come lo `skip` in markerElements, ma qui si rimuove SEMPRE (anche iOS).
      // Ora è inerte (clustering OFF iOS / disabilitato Android). Se un domani il
      // clustering viene riattivato su iOS, rispecchiare lo split per piattaforma
      // per non reintrodurre il churn-crash dei marker (vedi nota sullo skip sopra).
      if (r.pinId === selectedId) continue; // gestito da SelectedMarkerOverlay
      const pin = pinById.get(r.pinId);
      els.push(
        <MapPin
          key={r.pinId}
          id={r.pinId}
          latitude={r.latitude}
          longitude={r.longitude}
          restaurant={restaurantById.get(r.pinId)}
          asDot
          isFavorite={false}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
          supportedAllergens={pin?.supported_allergens}
          supportedDiets={pin?.supported_diets}
          userAllergens={userAllergens}
          userDiets={userDiets}
        />,
      );
    }
    // Salvati/preferiti sempre individuali (mai clusterizzati), sopra le bolle.
    const seen = new Set<string>();
    const pushSaved = (
      id: string, lat: number, lng: number,
      restaurant?: Restaurant, supA?: string[], supD?: string[],
    ) => {
      if (id === selectedId || seen.has(id) || !isValidCoord(lat, lng)) return;
      seen.add(id);
      els.push(
        <MapPin
          key={id}
          id={id}
          latitude={lat}
          longitude={lng}
          restaurant={restaurant}
          asDot
          isFavorite={favIds.has(id)}
          customSymbol={customSymbols?.get(id)}
          showMatchInfo={showMatchInfo}
          onPress={handleMarkerPress}
          supportedAllergens={supA}
          supportedDiets={supD}
          userAllergens={userAllergens}
          userDiets={userDiets}
        />,
      );
    };
    for (const p of (allPins ?? [])) {
      if (!alwaysIndividualIds.has(p.id)) continue;
      pushSaved(p.id, p.latitude, p.longitude, restaurantById.get(p.id), p.supported_allergens, p.supported_diets);
    }
    const favMap = favoriteRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of favMap) {
      if (r.location) pushSaved(id, r.location.latitude, r.location.longitude, r);
    }
    const savedMap = savedRestaurants ?? new Map<string, Restaurant>();
    for (const [id, r] of savedMap) {
      if (r.location) pushSaved(id, r.location.latitude, r.location.longitude, r);
    }
    return els;
  }, [clusterResults, theme, styles, handleClusterPress, selectedId, pinById, restaurantById, showMatchInfo, handleMarkerPress, userAllergens, userDiets, favIds, customSymbols, allPins, clusteringActive, alwaysIndividualIds, favoriteRestaurants, savedRestaurants]);

  const showMarkers = hasAnimatedToUser || !centerOn || !centerOn.latDelta;

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={!!hasUserLocation}
      showsMyLocationButton={false}
      customMapStyle={Platform.OS === 'android' ? (isDark ? ANDROID_MAP_STYLE_DARK : ANDROID_MAP_STYLE) : undefined}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      showsCompass
      compassOffset={compassOffset}
      mapPadding={mapPadding}
      onMapReady={handleMapReady}
      onRegionChangeComplete={handleRegionChange}
      onPress={handleMapPress}
      onLayout={handleLayout}
    >
      {/* Zoom largo (regime dot): bolle-cluster + salvati individuali.
          Zoom stretto: pin individuali col rating (path invariato). */}
      {showMarkers ? (clusteringActive && isDotZoom ? clusteredElements : markerElements) : null}
      {showMarkers && (
        <SelectedMarkerOverlay
          selectedId={selectedId}
          restaurantById={restaurantById}
          favoriteIds={favIds}
          customSymbols={customSymbols}
          showMatchInfo={showMatchInfo}
          onPress={onRestaurantPress}
        />
      )}
    </MapView>
  );
}

// ---------------------------------------------------------------------------
// Styles & map config
// ---------------------------------------------------------------------------

const ANDROID_MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
];

// Stile scuro Google Maps (Android) coerente con la palette app: charcoal,
// grigi Google, acqua più scura. iOS usa userInterfaceStyle (Apple Maps nativo).
const ANDROID_MAP_STYLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#212327' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212327' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#26322a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3c4043' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1c1f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#bdc1c6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4a4d52' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17191c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
];

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  map: { ...StyleSheet.absoluteFillObject },

  // Android: padding simmetrico così la bitmap del marker include ombra+bordo
  // senza ritagliarli (cerchio "monco"); simmetrico = la bolla resta centrata.
  clusterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ android: { padding: 6 } }),
  },
  clusterContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterText: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
