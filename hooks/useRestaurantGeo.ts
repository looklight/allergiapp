import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { RestaurantService, QUERY_LIMITS, type Restaurant, type RestaurantPin } from '../services/restaurantService';
import { haversineKm } from '../utils/geo';
import { DEFAULT_REGION } from '../components/map/mapConstants';

export type LatLng = { latitude: number; longitude: number };
export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };
export type CenterOn = LatLng & { sheetFraction: number; latDelta?: number };

/** Esito di una richiesta "centra su di me". La decisione su come reagire è
 *  guidata dallo stato del permesso di sistema (persistente), non da flag di
 *  sessione, così è coerente su iOS/Android e sopravvive ai riavvii. */
export type LocateOutcome =
  | { kind: 'located'; coords: LatLng }
  /** Diniego terminale (il dialog nativo non riapparirà): guidare a Impostazioni. */
  | { kind: 'denied_settings' }
  /** Scelta appena fatta nel dialog nativo, o GPS non disponibile: nessun avviso. */
  | { kind: 'dismissed' };

type FilterParams = {
  forMyNeeds: boolean;
  filterAllergens: string[];
  filterDiets: string[];
  /** True = modalità alloggi (RPC filtrano offers_lodging invece di serves_food) */
  showLodging: boolean;
  /** Frazione corrente dello sheet (usata per calcolare l'offset camera) */
  getSheetFraction: () => number;
};

type FetchedArea = { center: LatLng; radiusKm: number };

const AUTO_FETCH_DEBOUNCE = 800;
const CACHE_MAX_SIZE = 1000;
const OVERLAP_MARGIN = 0.7; // 30% overlap: fetch solo se centro fuori dal 70% del raggio
const MAX_FETCHED_AREAS = 50; // Limita la crescita di fetchedAreas
/** Cap del fetch pin — allineato al default `limit` di getPinsInBounds (ponte
 *  dati MAP_SCALING.md §0). Serve al client per capire se una risposta era
 *  troncata: solo le risposte NON a cap autorizzano lo skip su zoom-in. */
const PIN_FETCH_CAP = 3000;

type PinBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

export function useRestaurantGeo(params: FilterParams) {
  const { forMyNeeds, filterAllergens, filterDiets, showLodging, getSheetFraction } = params;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [viewportPins, setViewportPins] = useState<RestaurantPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [centerOn, setCenterOnState] = useState<CenterOn | null>(null);
  // Una volta che un centraggio esplicito è stato richiesto (deep link, tap su un
  // ristorante, ricerca…), l'auto-centraggio sulla posizione utente al mount NON
  // deve sovrascriverlo: il GPS risolve in modo asincrono e arriverebbe dopo,
  // rubando la vista. Il ref viene alzato da ogni chiamata esplicita a setCenterOn.
  const centerRequestedRef = useRef(false);
  const setCenterOn = useCallback((next: CenterOn | null) => {
    centerRequestedRef.current = true;
    setCenterOnState(next);
  }, []);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeoMode, setIsGeoMode] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  /** True quando l'ultimo caricamento ristoranti è fallito per rete assente.
   *  Derivato dai fallimenti di fetch (non da NetInfo): copre anche i casi in cui
   *  il dispositivo è "online" ma Supabase è irraggiungibile (captive portal, VPN,
   *  server down). Il fetch dei pin è il heartbeat: gira sempre, anche senza GPS. */
  const [isOffline, setIsOffline] = useState(false);

  // ---- Cache accumulativa ----
  const restaurantCache = useRef<Map<string, Restaurant>>(new Map());
  const fetchedAreas = useRef<FetchedArea[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedGeo = useRef(false);
  /** Modalità (forMyNeeds) con cui la cache ristoranti è stata caricata l'ultima
   *  volta. null = nessun load ancora. Serve a rilevare quando il prop forMyNeeds
   *  cambia DOPO il primo fetch (es. preferenza ripristinata dopo un cold-start
   *  diretto su Ristoranti, quando il primo fetch era già partito in modalità
   *  nearby senza coverage → pin compatibili grigi). */
  const loadedForMyNeeds = useRef<boolean | null>(null);
  const isFetching = useRef(false);
  /** Area pendente: se un fetch era in corso durante la richiesta, esegui dopo */
  const pendingFetch = useRef<{ center: LatLng; radiusKm: number } | null>(null);
  /** Epoch per clearAndReload — toggle rapidi scartano risultati stale */
  const reloadEpoch = useRef(0);
  /** Cache pin viewport — accumula pin leggeri da viste diverse */
  const pinCache = useRef<Map<string, RestaurantPin>>(new Map());
  const pinDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Epoch per loadPinsForViewport — scarta risposte stale durante pan veloce */
  const pinFetchEpoch = useRef(0);
  /** Ultima region per cui abbiamo EFFETTIVAMENTE lanciato un fetch pin. Serve a
   *  deduplicare gli onRegionChangeComplete ripetuti di Android (che emette molti
   *  eventi per region quasi identiche → altrimenti una RPC per ognuno). */
  const lastPinFetchRef = useRef<MapRegion | null>(null);
  /** Bounds dell'ultimo fetch pin riuscito e NON a cap: dentro quest'area la
   *  pinCache è completa, quindi zoomare/pannare al suo interno non richiede
   *  RPC (skip). Invalidato quando la cache viene trimmata o il SET cambia
   *  (modalità alloggi). null = nessuna garanzia di completezza. */
  const completePinBoundsRef = useRef<PinBounds | null>(null);
  /** Centro mappa corrente — aggiornato ad ogni region change */
  const lastMapCenterRef = useRef<LatLng | null>(null);

  // Refs per accedere a valori correnti nei callback stabili
  const forMyNeedsRef = useRef(forMyNeeds);
  forMyNeedsRef.current = forMyNeeds;
  const filterAllergensRef = useRef(filterAllergens);
  filterAllergensRef.current = filterAllergens;
  const filterDietsRef = useRef(filterDiets);
  filterDietsRef.current = filterDiets;
  const showLodgingRef = useRef(showLodging);
  showLodgingRef.current = showLodging;
  /** Ultima region completa (con delta) — per ricaricare i pin del viewport
   *  esatto quando cambia la modalità alloggi. */
  const lastRegionRef = useRef<MapRegion | null>(null);

  /** Sincronizza lo state React con il contenuto della cache */
  const syncState = useCallback(() => {
    setRestaurants(Array.from(restaurantCache.current.values()));
  }, []);

  /** Merge risultati nella cache. Sovrascrive se il nuovo record ha distance_km (piu fresco). */
  const mergeIntoCache = useCallback((results: Restaurant[]) => {
    for (const r of results) {
      const existing = restaurantCache.current.get(r.id);
      if (!existing || r.distance_km != null) {
        restaurantCache.current.set(r.id, r);
      }
    }
  }, []);

  /** Evict ristoranti piu lontani dal centro corrente.
   *  I preferiti sono gestiti separatamente in favoriteRestaurants (useRestaurantFavorites),
   *  quindi possono essere tranquillamente evicti dalla cache geo senza perdita. */
  const evictDistant = useCallback((center: LatLng) => {
    if (restaurantCache.current.size <= CACHE_MAX_SIZE) return;

    const entries = Array.from(restaurantCache.current.entries())
      .map(([id, r]) => ({
        id,
        dist: r.location
          ? haversineKm(center.latitude, center.longitude, r.location.latitude, r.location.longitude)
          : Infinity,
      }))
      .sort((a, b) => b.dist - a.dist);

    const toRemove = restaurantCache.current.size - CACHE_MAX_SIZE;
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      restaurantCache.current.delete(entries[i].id);
    }
  }, []);

  /** Controlla se un centro e coperto da aree gia fetchate */
  const isCovered = useCallback((center: LatLng): boolean => {
    return fetchedAreas.current.some(area => {
      const dist = haversineKm(
        area.center.latitude, area.center.longitude,
        center.latitude, center.longitude,
      );
      return dist < area.radiusKm * OVERLAP_MARGIN;
    });
  }, []);

  /** Fetch generico: chiama la RPC appropriata, merge nella cache.
   *  Se un fetch e gia in corso, accoda la richiesta (eseguita al termine). */
  const fetchArea = useCallback(async (center: LatLng, radiusKm: number) => {
    if (isFetching.current) {
      pendingFetch.current = { center, radiusKm };
      return;
    }
    isFetching.current = true;
    // Cattura l'epoch prima dell'await: se clearAndReload scatta durante il fetch
    // (es. toggle forMyNeeds), i risultati stale vengono scartati e non
    // sovrascrivono i dati già ricaricati con il nuovo filtro.
    const epoch = reloadEpoch.current;
    // Registra la modalità del fetch PRIMA dell'await (sincrono): così l'effetto
    // di riallineamento sotto vede la modalità corretta e non scatena reload doppi.
    loadedForMyNeeds.current = forMyNeedsRef.current;
    try {
      const results = forMyNeedsRef.current
        ? await RestaurantService.getRestaurantsForMyNeeds(
            center.latitude, center.longitude,
            filterAllergensRef.current, filterDietsRef.current, radiusKm,
            QUERY_LIMITS.NEARBY_MAX, showLodgingRef.current,
          )
        : await RestaurantService.getNearbyRestaurants(
            center.latitude, center.longitude, radiusKm, QUERY_LIMITS.NEARBY_MAX, showLodgingRef.current,
          );

      if (reloadEpoch.current !== epoch) return;
      mergeIntoCache(results);
      if (fetchedAreas.current.length >= MAX_FETCHED_AREAS) {
        fetchedAreas.current = fetchedAreas.current.slice(-MAX_FETCHED_AREAS / 2);
      }
      fetchedAreas.current.push({ center, radiusKm });
      evictDistant(center);
      syncState();
    } finally {
      isFetching.current = false;
      const next = pendingFetch.current;
      if (next) {
        pendingFetch.current = null;
        fetchArea(next.center, next.radiusKm);
      }
    }
  }, [mergeIntoCache, evictDistant, syncState]);

  // ---- Caricamento iniziale ----

  const loadGeo = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const center = { latitude: lat, longitude: lng };
    await fetchArea(center, 50);
    setIsGeoMode(true);
    setIsLoading(false);
  }, [fetchArea]);

  /** Svuota cache e ricarica (usato quando si toggl forMyNeeds).
   *  Fetch diretto (bypassa la coda fetchArea) per evitare race condition
   *  con toggle rapidi. Epoch counter scarta risultati stale.
   *  forMyNeedsOverride: usa questo valore invece di forMyNeedsRef.current.
   *  Necessario perché setForMyNeeds è asincrono — la ref non è ancora
   *  aggiornata quando clearAndReload è chiamato nello stesso handler.
   *  needsOverride: stesso problema per le ESIGENZE del filtro — senza, il
   *  refetch parte con allergens/diets vecchi e la coverage server in cache
   *  resta calcolata sul filtro precedente (pin ambra/verdi sbagliati finché
   *  non si rifetcha l'area per altre vie). */
  const clearAndReload = useCallback(async (
    forMyNeedsOverride?: boolean,
    showLodgingOverride?: boolean,
    needsOverride?: { allergens: string[]; diets: string[] },
  ) => {
    const epoch = ++reloadEpoch.current;
    pendingFetch.current = null;
    fetchedAreas.current = [];
    // Sincronizza subito la ref lodging così eventuali fetch concorrenti (pin) usano
    // il valore nuovo prima che il re-render aggiorni la ref dal param.
    if (showLodgingOverride !== undefined) showLodgingRef.current = showLodgingOverride;
    // Idem per le esigenze: sincrono prima di qualunque await, così anche il
    // fetch qui sotto e gli eventuali fetchArea accodati usano il filtro nuovo.
    if (needsOverride !== undefined) {
      filterAllergensRef.current = needsOverride.allergens;
      filterDietsRef.current = needsOverride.diets;
    }
    // NON svuotare pinCache — i pin viewport sono dati geometrici,
    // non dipendono da forMyNeeds. Svuotandoli i pallini spariscono.
    // Usa il centro mappa corrente (se disponibile) invece della posizione GPS:
    // l'utente potrebbe star esplorando un'area diversa dalla propria posizione.
    const fetchCenter = lastMapCenterRef.current ?? userLocation;
    if (!fetchCenter) {
      restaurantCache.current.clear();
      setRestaurants([]);
      return;
    }
    setIsLoading(true);
    try {
      const useForMyNeeds = forMyNeedsOverride !== undefined ? forMyNeedsOverride : forMyNeedsRef.current;
      const useShowLodging = showLodgingOverride !== undefined ? showLodgingOverride : showLodgingRef.current;
      // Sincrono prima dell'await (v. nota in fetchArea).
      loadedForMyNeeds.current = useForMyNeeds;
      const results = useForMyNeeds
        ? await RestaurantService.getRestaurantsForMyNeeds(
            fetchCenter.latitude, fetchCenter.longitude,
            filterAllergensRef.current, filterDietsRef.current, 50,
            QUERY_LIMITS.NEARBY_MAX, useShowLodging,
          )
        : await RestaurantService.getNearbyRestaurants(
            fetchCenter.latitude, fetchCenter.longitude, 50, QUERY_LIMITS.NEARBY_MAX, useShowLodging,
          );
      if (reloadEpoch.current !== epoch) return;
      restaurantCache.current.clear();
      for (const r of results) restaurantCache.current.set(r.id, r);
      fetchedAreas.current = [{ center: fetchCenter, radiusKm: 50 }];
      syncState();
    } finally {
      if (reloadEpoch.current === epoch) {
        setIsGeoMode(true);
        setIsLoading(false);
      }
    }
  }, [userLocation, syncState]);

  // Riallineamento modalità: se forMyNeeds cambia DOPO che la cache è già stata
  // caricata con una modalità diversa, ricarica con quella corretta. Copre la
  // race del cold-start aprendo direttamente sulla tab Ristoranti: il primo
  // fetch può partire in modalità nearby (senza coverage) prima che la preferenza
  // forMyNeeds / le esigenze del profilo siano ripristinate → i pin compatibili
  // resterebbero grigi invece che verdi. I toggle espliciti (FilterModal, chip)
  // settano già loadedForMyNeeds prima del loro await, quindi qui NON rientrano
  // (nessun fetch ridondante): scatta solo per transizioni non gestite altrove.
  useEffect(() => {
    if (loadedForMyNeeds.current === null) return;          // nessun load ancora
    if (loadedForMyNeeds.current === forMyNeeds) return;    // già allineato
    clearAndReload(forMyNeeds);
  }, [forMyNeeds, clearAndReload]);

  // Al mount, centra la mappa sull'utente SOLO se il permesso è già concesso.
  // Non chiediamo qui il permesso a freddo: la richiesta avviene a fine onboarding
  // (schermata dedicata) o su intento esplicito (pulsante "centra su di me"). Così
  // evitiamo il prompt a sorpresa per chi aggiorna l'app e non bruciamo il colpo
  // unico del dialog nativo iOS.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          // 'denied' = già negato (mostra l'hint sul pulsante locate);
          // 'undetermined' = mai chiesto → resta neutro, niente prompt qui.
          if (status === 'denied') setLocationDenied(true);
          return;
        }
        // Android: cold-start del GPS puo richiedere 2-8s. Senza fast-path
        // la mappa parte su DEFAULT_REGION (Europa, Italia al centro) e poi salta sulla
        // posizione reale. Usiamo l'ultima posizione cachata dal sistema
        // (Fused Location Provider) per centrare subito. iOS non ne ha bisogno:
        // Core Location restituisce il fix in poche centinaia di ms.
        if (Platform.OS === 'android') {
          const last = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60_000,
            requiredAccuracy: 1000,
          });
          if (last && mounted) {
            const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
            setUserLocation(coords);
            // Non sovrascrivere un centraggio esplicito già richiesto (es. deep link).
            if (!centerRequestedRef.current) {
              setCenterOnState({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
            }
          }
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        if (!centerRequestedRef.current) {
          setCenterOnState({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
        }
      } catch {
        // GPS non disponibile
      }
    })();
    return () => { mounted = false; };
  }, []);

  /** Carica pin leggeri per il viewport corrente.
   *  Chiamato dal handleRegionChange (debounced separatamente). */
  const loadPinsForViewport = useCallback((region: MapRegion, force = false) => {
    // Dedup viewport: react-native-maps su Android emette onRegionChangeComplete
    // ripetutamente per region quasi identiche → senza guardia parte una RPC
    // (~500-1000ms) ad ogni evento, anche per la STESSA area, friggendo il thread.
    // Saltiamo se centro e zoom non sono cambiati in modo significativo dall'ultimo
    // fetch effettivo. `force` bypassa (es. cambio modalità alloggi, che cambia il SET).
    if (!force) {
      const prev = lastPinFetchRef.current;
      if (prev) {
        const moved = Math.max(
          Math.abs(region.latitude - prev.latitude) / Math.max(region.latitudeDelta, 1e-6),
          Math.abs(region.longitude - prev.longitude) / Math.max(region.longitudeDelta, 1e-6),
        );
        const zoomRatio = region.latitudeDelta / Math.max(prev.latitudeDelta, 1e-6);
        if (moved < 0.25 && zoomRatio > 0.8 && zoomRatio < 1.25) return;
      }
    }
    // Aggiornata anche quando lo skip sotto salta la RPC: è "dov'è la mappa ora",
    // e il reload del toggle alloggi deve ripartire dal viewport corrente.
    lastRegionRef.current = region;

    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    const margin = Math.min(latDelta * 0.3, 10);
    const minLat = Math.max(-90, region.latitude - latDelta / 2 - margin);
    const maxLat = Math.min(90, region.latitude + latDelta / 2 + margin);
    const minLng = Math.max(-180, region.longitude - lngDelta / 2 - margin);
    const maxLng = Math.min(180, region.longitude + lngDelta / 2 + margin);

    // Skip su zoom-in/pan interno: se i bounds richiesti sono contenuti in
    // un'area già fetchata per intero (risposta sotto il cap → nessun pin
    // troncato), la pinCache ha già tutto e la RPC sarebbe identica ma più
    // piccola. È il gesto più frequente sulla mappa: zoom dentro l'area appena
    // vista. NON aggiorniamo lastPinFetchRef: la dedup resta ancorata
    // all'ultimo fetch reale.
    if (!force) {
      const cb = completePinBoundsRef.current;
      if (cb && minLat >= cb.minLat && maxLat <= cb.maxLat && minLng >= cb.minLng && maxLng <= cb.maxLng) {
        return;
      }
    }
    lastPinFetchRef.current = region;

    // Epoch locale: se arriva una risposta più vecchia di un fetch successivo, viene scartata.
    // Fondamentale durante pan veloce dove più richieste sono in volo contemporaneamente.
    const epoch = ++pinFetchEpoch.current;

    RestaurantService.getPinsInBounds(minLat, minLng, maxLat, maxLng, PIN_FETCH_CAP, showLodgingRef.current)
      .then(pins => {
        if (pinFetchEpoch.current !== epoch) return; // risposta stale, ignora
        setIsOffline(false); // risposta ricevuta → rete ok
        // Risposta sotto il cap e non vuota → quest'area è in cache PER INTERO:
        // i prossimi viewport contenuti qui dentro possono saltare la RPC.
        // Il caso 0 pin è escluso: getPinsInBounds ritorna [] anche su errori
        // non di rete, e cacheare "vuoto" su un errore renderebbe l'area cieca.
        // Se NON qualifica, i bounds precedenti restano validi (la cache solo
        // cresce; a invalidarli sono il trim sotto e il cambio modalità alloggi).
        if (pins.length > 0 && pins.length < PIN_FETCH_CAP) {
          completePinBoundsRef.current = { minLat, minLng, maxLat, maxLng };
        }
        const sizeBefore = pinCache.current.size;
        for (const p of pins) pinCache.current.set(p.id, p);
        let trimmed = false;
        // Soglia sopra il limite fetch (3000): un singolo fetch pieno non deve
        // mai auto-decimarsi; il trim taglia solo pin di aree precedenti.
        if (pinCache.current.size > 4500) {
          const entries = Array.from(pinCache.current.entries());
          pinCache.current = new Map(entries.slice(-3000));
          trimmed = true;
          // Il trim può aver buttato pin dell'area "completa": la garanzia decade.
          completePinBoundsRef.current = null;
        }
        if (pinCache.current.size !== sizeBefore || trimmed) {
          setViewportPins(Array.from(pinCache.current.values()));
        }
      })
      .catch(() => {
        // Rete non disponibile — mantieni i pin precedenti e segnala offline.
        // Solo se è l'ultima richiesta: durante pan veloce un fetch vecchio fallito
        // non deve riaccendere il flag dopo che uno più recente è andato a buon fine.
        if (pinFetchEpoch.current === epoch) setIsOffline(true);
      });
  }, []);

  /** Carica pin per un'area ampia intorno alla posizione corrente.
   *  Usato al focus della schermata per avere subito i pallini visibili. */
  const refreshPinsAroundUser = useCallback(() => {
    if (!userLocation) return;
    // Il focus è l'àncora di freschezza dei pin: un ristorante aggiunto durante
    // la sessione (dall'utente stesso, tornando qui dalla schermata di
    // inserimento) deve comparire. Quindi la garanzia di completezza decade:
    // senza questo, lo skip su containment salterebbe il refetch e il locale
    // nuovo resterebbe invisibile fino a un pan fuori area. La dedup su
    // lastPinFetchRef resta attiva → stesso numero di RPC al focus di prima.
    completePinBoundsRef.current = null;
    // Area ampia (±0.5° ≈ 50km) per coprire la vista iniziale
    loadPinsForViewport({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 1.0,
      longitudeDelta: 1.0,
    });
  }, [userLocation, loadPinsForViewport]);

  /** Cambio modalità alloggi: i pin sono un SET diverso (offers_lodging vs
   *  serves_food), quindi svuota la cache pin e ricarica il viewport corrente con
   *  la nuova modalità. A differenza di forMyNeeds — dove i pin restano perché il
   *  set non cambia — qui vanno proprio ricaricati. */
  const reloadLodgingPins = useCallback((nextShowLodging: boolean) => {
    showLodgingRef.current = nextShowLodging;
    pinFetchEpoch.current++; // invalida risposte in volo della modalità precedente
    pinCache.current.clear();
    setViewportPins([]);
    lastPinFetchRef.current = null; // il SET di pin cambia → forza un nuovo fetch
    completePinBoundsRef.current = null; // la completezza valeva per il SET vecchio
    const region = lastRegionRef.current
      ?? (userLocation ? { ...userLocation, latitudeDelta: 1.0, longitudeDelta: 1.0 } : null)
      ?? { ...DEFAULT_REGION };
    loadPinsForViewport(region, true);
  }, [userLocation, loadPinsForViewport]);

  // Carica ristoranti + pin al primo GPS fix
  useEffect(() => {
    if (userLocation && !hasLoadedGeo.current) {
      hasLoadedGeo.current = true;
      loadGeo(userLocation.latitude, userLocation.longitude);
      // Pin immediati per la vista iniziale (nessun debounce)
      loadPinsForViewport({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 1.0,
        longitudeDelta: 1.0,
      });
    }
  }, [userLocation, loadGeo, loadPinsForViewport]);

  // Vista di default (Europa, Italia al centro): carica subito i pin del viewport
  // iniziale a prescindere dalla posizione. Garantisce una mappa popolata anche per
  // chi non condivide la geolocalizzazione, senza dipendere dal primo fire di
  // onRegionChangeComplete della libreria mappa. I pin si accumulano nella cache,
  // quindi non c'è conflitto con il caricamento attorno all'utente se poi arriva.
  useEffect(() => {
    loadPinsForViewport({
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
      latitudeDelta: DEFAULT_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_REGION.longitudeDelta,
    });
  }, [loadPinsForViewport]);

  // Fallback: se dopo 3s non c'e GPS, ferma il loading e mostra lista vuota
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoadedGeo.current) {
        hasLoadedGeo.current = true;
        setIsLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  /** Auto-fetch debounced on region change */
  const handleRegionChange = useCallback((region: MapRegion) => {
    lastMapCenterRef.current = { latitude: region.latitude, longitude: region.longitude };
    // 1. Fetch dati completi ristoranti (debounce lungo)
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const center = { latitude: region.latitude, longitude: region.longitude };
      if (isCovered(center)) return;
      const radiusKm = Math.max(3, Math.min(50, (region.latitudeDelta * 111) / 2));
      await fetchArea(center, radiusKm);
    }, AUTO_FETCH_DEBOUNCE);

    // 2. Fetch pin leggeri per viewport (300ms: bilancia reattività e numero di fetch
    //    concorrenti durante pan veloce; l'epoch in loadPinsForViewport scarta i stale)
    if (pinDebounceTimer.current) clearTimeout(pinDebounceTimer.current);
    pinDebounceTimer.current = setTimeout(() => {
      loadPinsForViewport(region);
    }, 300);
  }, [isCovered, fetchArea, loadPinsForViewport]);

  const handleLocateMe = useCallback(async (): Promise<LocateOutcome> => {
    setIsLocating(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        if (perm.canAskAgain) {
          // Il dialog nativo può ancora essere mostrato (iOS: mai chiesto; Android:
          // non "non chiedere più"). Qualunque sia la scelta dell'utente nel dialog,
          // NON mostriamo l'hint Impostazioni: ha appena deciso lui nel prompt OS.
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status !== 'granted') {
            setLocationDenied(true);
            setIsLocating(false);
            return { kind: 'dismissed' };
          }
        } else {
          // Diniego terminale: il prompt nativo non riapparirà → unica via Impostazioni.
          setLocationDenied(true);
          setIsLocating(false);
          return { kind: 'denied_settings' };
        }
      }
      setLocationDenied(false);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setCenterOn({ ...coords, sheetFraction: getSheetFraction(), latDelta: 0.02 });
      await loadGeo(coords.latitude, coords.longitude);
      setIsLocating(false);
      return { kind: 'located', coords };
    } catch {
      setIsLocating(false);
      return { kind: 'dismissed' };
    }
  }, [loadGeo, getSheetFraction]);

  /** Resetta la vista alla posizione utente */
  const resetToUserLocation = useCallback(() => {
    if (userLocation) {
      setCenterOn({ ...userLocation, sheetFraction: getSheetFraction(), latDelta: 0.02 });
    } else {
      setCenterOn(null);
    }
  }, [userLocation, getSheetFraction]);

  /** Aggiorna un singolo ristorante nello state e nella cache (per optimistic updates) */
  const updateRestaurant = useCallback((id: string, updater: (r: Restaurant) => Restaurant) => {
    const cached = restaurantCache.current.get(id);
    if (cached) restaurantCache.current.set(id, updater(cached));
    setRestaurants(prev => prev.map(r => r.id === id ? updater(r) : r));
  }, []);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (pinDebounceTimer.current) clearTimeout(pinDebounceTimer.current);
    };
  }, []);

  return {
    restaurants,
    /** Pin leggeri caricati per viewport (scalabile) */
    allPins: viewportPins,
    refreshAllPins: refreshPinsAroundUser,
    reloadLodgingPins,
    isLoading,
    userLocation,
    centerOn,
    setCenterOn,
    isLocating,
    isGeoMode,
    locationDenied,
    isOffline,
    loadGeo,
    loadPinsForViewport,
    clearAndReload,
    handleRegionChange,
    handleLocateMe,
    resetToUserLocation,
    updateRestaurant,
  };
}
