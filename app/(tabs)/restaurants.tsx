import { useState, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, Image, Pressable, Platform, Linking } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import Avatar from '../../components/Avatar';
import { RestaurantService, QUERY_LIMITS, type Restaurant } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { SupabaseAnalytics } from '../../services/supabaseAnalytics';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantMap from '../../components/map/RestaurantMap';
import FilterModal, { type FilterApplyResult } from '../../components/restaurants/FilterModal';
import NearbyListSheet, { NEARBY_LIST_DISPLAY_MAX } from '../../components/restaurants/NearbyListSheet';
import RestaurantDetailSheet from '../../components/restaurants/RestaurantDetailSheet';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import { getCuisineLabel } from '../../constants/restaurantCategories';
import i18n from '../../utils/i18n';
import { getDisplayName } from '../../utils/getDisplayName';
import { useRestaurantGeo } from '../../hooks/useRestaurantGeo';
import { useRestaurantList } from '../../hooks/useRestaurantList';
import { useRestaurantFavorites } from '../../hooks/useRestaurantFavorites';
import { useSavedCollectionsMap } from '../../hooks/useSavedCollectionsMap';
import { useMapSearch, MIN_PLACE_QUERY_LENGTH } from '../../hooks/useMapSearch';
import SearchAutocomplete from '../../components/SearchAutocomplete';
import RecentSearches from '../../components/RecentSearches';
import { storage, type RecentPlace } from '../../utils/storage';
import { pendingRestaurantFocus } from '../../utils/pendingRestaurantFocus';
import { useTabBarVisibility } from '../../components/TabBarVisibility';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNotificationDot } from '../../hooks/useNotificationDot';

// ─── Selection reducer ─────────────────────────────────────────────────────
type SelectionState = { selectedId: string | null; detailId: string | null };
type SelectionAction =
  | { type: 'SELECT'; id: string }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'DESELECT' };

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'SELECT':
      return { selectedId: action.id, detailId: action.id };
    case 'CLOSE_DETAIL':
      // Mantieni selectedId invariato: il pin resta visibile (selezionato) finché
      // l'utente non tocca/pan la mappa (DESELECT). Se azzerassimo selectedId qui,
      // tracksViewChanges farebbe il ciclo true→false mentre la tab bar anima
      // simultaneamente → iOS cattura un bitmap vuoto → pin sparisce.
      return { ...state, detailId: null };
    case 'DESELECT':
      if (state.detailId || state.selectedId === null) return state;
      return { ...state, selectedId: null };
    default:
      return state;
  }
}

const INITIAL_SELECTION: SelectionState = { selectedId: null, detailId: null };

// Frazione stimata di copertura della detail sheet: usata per offsettare la camera
// in modo che il marker selezionato resti visibile sopra lo sheet.
const DETAIL_SHEET_COVERAGE = 0.55;

// Curva del FAB allineata a quella della tab bar (TabBarVisibility.tsx) per
// dare la sensazione che escano di scena insieme.
const FAB_ANIM_CONFIG = { duration: 280, easing: Easing.out(Easing.cubic) };

export default function RestaurantsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarVisibility();
  // Su Android: usa l'altezza reale del tab bar (configurato con paddingBottom + height
  // override in (tabs)/_layout.tsx). iOS resta sulla formula originale "49 + insets.bottom"
  // che funziona bene con il tab bar nativo non override-ato.
  const tabBarHeight = useBottomTabBarHeight();
  const overlayBaseBottom = Platform.OS === 'android' ? tabBarHeight : 49 + insets.bottom;
  const { isAuthenticated, user, userProfile, dietaryNeeds, refreshProfile } = useAuth();
  const lang = i18n.locale as AppLanguage;
  const hasNotification = useNotificationDot();

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RestaurantCategoryId[]>([]);
  const [forMyNeeds, setForMyNeeds] = useState(false);
  const [filterAllergens, setFilterAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [filterDiets, setFilterDiets] = useState<string[]>([...(dietaryNeeds.diets ?? [])]);
  const [minRating, setMinRating] = useState<number | null>(null);
  // Modalità alloggi (filtro "Mostra hotel"): server-side, di default OFF (app = ristoranti).
  const [showLodging, setShowLodging] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Segnala che il prossimo cambio di filterAllergens/filterDiets viene dal profilo
  const profileJustChanged = useRef(false);

  // Sincronizza sempre (con o senza forMyNeeds) — necessario per aggiornamenti da Settings
  useEffect(() => {
    profileJustChanged.current = true;
    setFilterAllergens([...dietaryNeeds.allergens]);
    setFilterDiets([...(dietaryNeeds.diets ?? [])]);
  }, [dietaryNeeds.allergens, dietaryNeeds.diets]);

  // Default: ON al primo avvio se l'utente ha esigenze nel profilo (saved === null).
  const forMyNeedsRestored = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || forMyNeedsRestored.current) return;
    const hasNeeds = dietaryNeeds.allergens.length > 0 || (dietaryNeeds.diets ?? []).length > 0;
    if (!hasNeeds) return;
    forMyNeedsRestored.current = true;
    storage.getForMyNeeds().then(saved => {
      const shouldEnable = saved ?? true;
      if (saved === null) storage.setForMyNeeds(true);
      if (shouldEnable) setForMyNeeds(true);
    });
  }, [isAuthenticated, dietaryNeeds.allergens, dietaryNeeds.diets]);

  // Scheda dettaglio aperta dalla mappa: compatibilità coerente con i pin (esigenze
  // del filtro, non del profilo). Memoizzato: l'hook detail lo usa come dipendenza.
  const detailNeedsOverride = useMemo(
    () => ({ allergens: filterAllergens, diets: filterDiets }),
    [filterAllergens, filterDiets],
  );

  // Esigenze del filtro divergenti dal profilo (ricerca per qualcun altro):
  // la chip attiva dice "Esigenze personalizzate" invece di "Per me".
  const filterNeedsDiffer = useMemo(() => {
    const pa = new Set<string>(dietaryNeeds.allergens ?? []);
    const pd = new Set<string>(dietaryNeeds.diets ?? []);
    return filterAllergens.length !== pa.size
      || filterDiets.length !== pd.size
      || filterAllergens.some(a => !pa.has(a))
      || filterDiets.some(d => !pd.has(d));
  }, [filterAllergens, filterDiets, dietaryNeeds]);

  const filterHasNeeds = filterAllergens.length > 0 || filterDiets.length > 0;
  const hasActiveSettings = activeFilters.length > 0 || forMyNeeds || minRating !== null;

  // --- Selection state (reducer — niente ref, niente timing issue) ---
  const [selection, dispatch] = useReducer(selectionReducer, INITIAL_SELECTION);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Nearby panel: quando c'è un luogo selezionato, mostriamo prima una banner
  // collassata in basso; il tap la espande nell'autocomplete nearby.
  const [nearbyExpanded, setNearbyExpanded] = useState(false);

  // Cronologia delle ultime ricerche di luoghi (tap su un place nell'autocomplete o "locate me").
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    storage.getRecentPlaces().then(setRecentPlaces);
  }, []);

  // Cleanup show() garantisce che le altre tab trovino la tab bar visibile
  // se l'utente cambia tab con un sheet ancora aperto.
  useFocusEffect(
    useCallback(() => {
      const shouldHide = Boolean(selection.detailId) || nearbyExpanded;
      if (shouldHide) tabBar.hide();
      else tabBar.show();
      return () => tabBar.show();
    }, [selection.detailId, nearbyExpanded, tabBar]),
  );

  // FAB animation: scivola via insieme alla tab bar quando un bottom sheet (o il
  // banner nearby compatto) è visibile. Curva allineata a quella della tab bar.
  const fabProgress = useSharedValue(0);
  const [fabHidden, setFabHidden] = useState(false);

  // Banner nearby: stesso pattern asimmetrico del FAB — sparizione istantanea
  // all'apertura di uno sheet, comparsa animata al rientro in home.
  const bannerProgress = useSharedValue(1);
  const [bannerHidden, setBannerHidden] = useState(true);

  // Nessuna bottom sheet: il geo hook non ha più bisogno di un'offset dinamica.
  const getSheetFraction = useCallback(() => 0, []);

  // --- Hooks ---
  const geo = useRestaurantGeo({ forMyNeeds, filterAllergens, filterDiets, showLodging, getSheetFraction });

  // Re-interroga quando il profilo cambia con forMyNeeds attivo.
  useEffect(() => {
    if (!profileJustChanged.current) return;
    profileJustChanged.current = false;
    if (!forMyNeeds || !geo.userLocation) return;
    geo.clearAndReload();
  }, [filterAllergens, filterDiets, geo.clearAndReload]);

  const mapSearch = useMapSearch({
    restaurants: geo.restaurants,
    userLocation: geo.userLocation,
    forMyNeeds,
    filterAllergens,
    filterDiets,
    showLodging,
  });

  const { mapRestaurants } = useRestaurantList({
    restaurants: geo.restaurants,
    activeFilters,
    minRating,
  });

  // allPins accumula pin da tutti i viewport visitati (max 3000, gestito in useRestaurantGeo).
  // SuperCluster gestisce internamente la viewport culling: riceve tutti i pin ma renderizza
  // solo i cluster visibili. Il limite di 3000 pin nella cache è il guardrail sufficiente.
  // — forMyNeeds NON restringe allPins: i pin non compatibili compaiono grigi (non coperti).
  // — Il filtro cucina (activeFilters) usa cuisine_types direttamente dal pin (campo restituito
  //   da get_pins_in_bounds), evitando la dipendenza da geo.restaurants che contiene al max 50
  //   record e causerebbe la scomparsa di tutti i pin extra-viewport.
  const filteredAllPins = useMemo(() => {
    const pins = geo.allPins ?? [];
    if (activeFilters.length === 0) return pins;
    return pins.filter(p =>
      p.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
    );
  }, [geo.allPins, activeFilters]);

  const { favoriteIds, favoriteRestaurants, loadFavorites, syncFavoriteId } = useRestaurantFavorites(
    user?.uid,
  );
  // Badge mappa delle liste custom (emoji/bookmark), separato dal cuore/preferiti.
  const { savedSymbols, savedRestaurants, loadSaved } = useSavedCollectionsMap(user?.uid);

  useFocusEffect(useCallback(() => {
    loadFavorites();
    loadSaved();
    geo.refreshAllPins();
  }, [loadFavorites, loadSaved, geo.refreshAllPins]));

  // Ref per lookup ristoranti senza destabilizzare il callback.
  const allRestaurantsRef = useRef(geo.restaurants);
  allRestaurantsRef.current = geo.restaurants;

  // Cache il ristorante selezionato: se l'utente toglie il preferito e il ristorante
  // era solo in favoriteRestaurants (non nel geo cache), senza questo ref
  // selectedRestaurant diventerebbe null → il pin sulla mappa sparisce.
  const selectedRestaurantRef = useRef<Restaurant | null>(null);
  const selectedRestaurant = selection.selectedId
    ? geo.restaurants.find(r => r.id === selection.selectedId)
      ?? favoriteRestaurants.get(selection.selectedId!)
      ?? selectedRestaurantRef.current
      ?? null
    : null;
  selectedRestaurantRef.current = selectedRestaurant;

  const handleOpenDetail = useCallback((id: string) => {
    // Se il detail è già aperto per questo ristorante, non fare nulla (come Google Maps).
    if (selectionRef.current.detailId === id) return;
    dispatch({ type: 'SELECT', id });
    Keyboard.dismiss();
    // Centra la mappa sul ristorante selezionato (mantiene zoom corrente).
    const restaurant = allRestaurantsRef.current.find(r => r.id === id)
      ?? favoriteRestaurants.get(id);
    if (restaurant?.location) {
      geo.setCenterOn({
        latitude: restaurant.location.latitude,
        longitude: restaurant.location.longitude,
        sheetFraction: DETAIL_SHEET_COVERAGE,
      });
    }
  }, [geo.setCenterOn, favoriteRestaurants]);

  // Chiudi scheda dettaglio. I preferiti sono già sincronizzati in tempo reale
  // tramite syncFavoriteId nel callback onFavoriteToggled.
  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
    // Riallinea i badge delle liste custom dopo eventuali salvataggi nello sheet
    // "Salva in…" (il cuore/preferiti è già live via syncFavoriteId).
    loadSaved();
  }, [loadSaved]);

  // --- Handlers ---
  const toggleFilter = useCallback((id: RestaurantCategoryId) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleAddPress = () => {
    if (!isAuthenticated) router.push('/auth/login');
    else router.push('/restaurants/add');
  };

  const handleOpenFilterModal = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  const handleSyncProfile = useCallback(async (a: string[], d: string[]) => {
    if (!user) return;
    await AuthService.updateDietaryNeeds(user.uid, { allergens: a, diets: d });
    await refreshProfile();
  }, [user, refreshProfile]);

  const handleApplyFilters = useCallback(async ({ filters, forMyNeeds: newFmn, allergens, diets, minRating: newMinRating, showLodging: newShowLodging }: FilterApplyResult) => {
    setActiveFilters(filters);
    setFilterAllergens(allergens);
    setFilterDiets(diets);
    setMinRating(newMinRating);

    const fmnChanged = newFmn !== forMyNeeds;
    const lodgingChanged = newShowLodging !== showLodging;
    const allergensChanged = allergens.length !== filterAllergens.length || allergens.some(a => !filterAllergens.includes(a));
    const dietsChanged = diets.length !== filterDiets.length || diets.some(d => !filterDiets.includes(d));

    setForMyNeeds(newFmn);
    storage.setForMyNeeds(newFmn);
    setShowLodging(newShowLodging);

    // Ricarica la lista geo se cambia un asse server-side (alloggi, forMyNeeds, esigenze).
    if (lodgingChanged || (newFmn && (fmnChanged || allergensChanged || dietsChanged)) || (!newFmn && fmnChanged)) {
      await geo.clearAndReload(newFmn, newShowLodging);
    }
    // I pin alloggi sono un SET diverso: svuota e ricarica solo al cambio modalità.
    if (lodgingChanged) {
      geo.reloadLodgingPins(newShowLodging);
    }
    // Nota: il re-fetch della lista "Ristoranti nell'area" è gestito dentro useMapSearch
    // via useEffect reattivo su forMyNeeds/filterAllergens/filterDiets.
    // Le esigenze del filtro restano locali alla ricerca: il profilo si aggiorna
    // solo tramite il bottone "Salva" esplicito del DietaryNeedsPicker (onSyncProfile).
  }, [forMyNeeds, showLodging, filterAllergens, filterDiets, geo.clearAndReload, geo.reloadLodgingPins]);

  /** Query in attesa di auto-selezione da invio tastiera (v. handleSearchSubmit sotto). */
  const pendingEnterQueryRef = useRef<string | null>(null);
  const pendingEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingEnter = useCallback(() => {
    pendingEnterQueryRef.current = null;
    if (pendingEnterTimerRef.current) {
      clearTimeout(pendingEnterTimerRef.current);
      pendingEnterTimerRef.current = null;
    }
  }, []);

  const dismissAutocomplete = useCallback(() => {
    setSearchQuery('');
    setNearbyExpanded(false);
    setIsSearchFocused(false);
    mapSearch.clear();
    clearPendingEnter();
    Keyboard.dismiss();
  }, [mapSearch.clear, clearPendingEnter]);

  // Chiude la vista "Ristoranti nell'area" e riporta la search a stato vuoto.
  const handleClearNearbyPlace = useCallback(() => {
    setSearchQuery('');
    setNearbyExpanded(false);
    mapSearch.clearNearbyPlace();
  }, [mapSearch.clearNearbyPlace]);

  // Chiusura dello sheet nearby: torna alla banner mantenendo il luogo corrente.
  const handleCloseNearbySheet = useCallback(() => {
    setNearbyExpanded(false);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Se l'utente ricomincia a digitare dopo aver selezionato un luogo, esci dalla modalità nearby.
    if (mapSearch.nearbyPlace) mapSearch.clearNearbyPlace();
    mapSearch.search(text);
  }, [mapSearch.search, mapSearch.clearNearbyPlace, mapSearch.nearbyPlace]);

  /** Apre il detail sheet centrando la mappa sul ristorante. */
  const openRestaurantDetail = useCallback((id: string, lat: number, lng: number) => {
    dispatch({ type: 'SELECT', id });
    geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: DETAIL_SHEET_COVERAGE, latDelta: 0.01 });
    // Carica subito i pin attorno alla destinazione: quando saltiamo qui da un
    // salto programmatico (deep link, ricerca su un ristorante lontano) la mappa
    // non emette onRegionChangeComplete in modo affidabile (rn-maps su New Arch),
    // quindi senza questo i pin comparirebbero solo dopo un pan manuale.
    geo.loadPinsForViewport({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  }, [geo.setCenterOn, geo.loadPinsForViewport]);

  /** Apre il ristorante indicato dal focus, con eventuale centraggio. */
  const applyFocus = useCallback((id: string, lat?: number, lng?: number) => {
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      openRestaurantDetail(id, lat, lng);
    } else {
      // Senza coordinate apri comunque la scheda (la mappa non si ricentra).
      dispatch({ type: 'SELECT', id });
    }
  }, [openRestaurantDetail]);

  // Consuma il focus in attesa SOLO a mappa pronta, così l'apertura avviene su una
  // mappa viva e idle — le stesse condizioni della selezione da ricerca (che
  // funziona) e non durante il mount (dove il centraggio programmatico e il
  // caricamento pin fallivano). Sorgenti: "Aggiungi ristorante" (id+coord già
  // risolti) e deep link /r/{slug} (solo slug → risolto qui dietro la mappa
  // già visibile). One-shot: consume() azzera.
  const consumePendingFocus = useCallback(() => {
    const focus = pendingRestaurantFocus.consume();
    if (!focus) return;
    if (focus.id) {
      applyFocus(focus.id, focus.lat, focus.lng);
      return;
    }
    if (focus.slug) {
      RestaurantService.getRestaurantFocusBySlug(focus.slug)
        .then(res => {
          if (res) applyFocus(res.id, res.lat, res.lng);
          else Alert.alert(i18n.t('common.error'), i18n.t('restaurants.detail.notFound'));
        })
        .catch(() => { /* rete assente: silenzioso, l'utente resta sulla mappa */ });
    }
  }, [applyFocus]);

  const isMapReadyRef = useRef(false);
  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    // Cold-start deep link: il focus è già in attesa quando la mappa diventa
    // pronta → consuma ora. (Warm-start: già consumato dal useFocusEffect sotto.)
    consumePendingFocus();
  }, [consumePendingFocus]);

  // Warm-start: mappa già montata e pronta quando arriva il deep link (il tab si
  // rifocalizza dopo il router.replace) → consuma al focus. A mappa non ancora
  // pronta non fa nulla: ci penserà handleMapReady.
  useFocusEffect(useCallback(() => {
    if (isMapReadyRef.current) consumePendingFocus();
  }, [consumePendingFocus]));

  /** Tap su un ristorante dall'autocomplete di ricerca: pulisce la search. */
  const handleSelectFromAutocomplete = useCallback((id: string, lat: number, lng: number) => {
    if (searchQuery.trim().length > 0) {
      SupabaseAnalytics.track('restaurant_search', {
        query: searchQuery.trim().slice(0, 60),
        source: 'map',
        selected_kind: 'restaurant',
        result_count: mapSearch.results.length,
      });
    }
    dismissAutocomplete();
    openRestaurantDetail(id, lat, lng);
  }, [dismissAutocomplete, openRestaurantDetail, searchQuery, mapSearch.results.length]);

  /** Tap su un ristorante dal NearbyListSheet: collassa lo sheet mantenendo la banner sul luogo. */
  const handleSelectFromNearbySheet = useCallback((id: string) => {
    const r = allRestaurantsRef.current.find(x => x.id === id)
      ?? mapSearch.nearbyResults.find(x => x.id === id);
    if (!r?.location) return;
    setNearbyExpanded(false);
    Keyboard.dismiss();
    openRestaurantDetail(id, r.location.latitude, r.location.longitude);
  }, [openRestaurantDetail, mapSearch.nearbyResults]);

  /** Zoom adatto al tipo di luogo (country → molto ampio, locality → stretto). */
  const zoomForPlaceType = (placeType?: string): number =>
    placeType === 'country' ? 12 :
    placeType === 'state' ? 3 :
    placeType === 'county' ? 0.5 :
    placeType === 'city' ? 0.08 :
    placeType === 'district' || placeType === 'locality' ? 0.03 :
    0.02;

  /** Attiva la modalità "Ristoranti nell'area": centra mappa, autocompila search, popola banner. */
  const activateNearbyPlace = useCallback((name: string, lat: number, lng: number, placeType?: string) => {
    geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: 0, latDelta: zoomForPlaceType(placeType) });
    setSearchQuery(name);
    mapSearch.clear();
    mapSearch.selectPlace({ name, latitude: lat, longitude: lng, placeType });
    setNearbyExpanded(false);
    setIsSearchFocused(false);
    storage.addRecentPlace({ name, latitude: lat, longitude: lng, placeType }).then(setRecentPlaces);
  }, [geo.setCenterOn, mapSearch.clear, mapSearch.selectPlace]);

  const handleSelectRecentPlace = useCallback((place: RecentPlace) => {
    Keyboard.dismiss();
    activateNearbyPlace(place.name, place.latitude, place.longitude, place.placeType);
  }, [activateNearbyPlace]);

  const handleClearRecentPlaces = useCallback(() => {
    setRecentPlaces([]);
    storage.clearRecentPlaces();
  }, []);

  /** GPS → reverse-geocode → autocompila la search bar e mostra banner con i ristoranti della città rilevata. */
  const handleLocateMeAndShowCity = useCallback(async () => {
    const outcome = await geo.handleLocateMe();
    if (outcome.kind === 'denied_settings') {
      // Solo diniego terminale: il dialog nativo non riapparirà, guidiamo alle
      // Impostazioni (come Google Maps & co.). Sul primo "no" nel dialog l'esito è
      // 'dismissed' → nessun avviso, l'utente ha appena scelto.
      Alert.alert(
        i18n.t('restaurants.locationDenied.title'),
        i18n.t('restaurants.locationDenied.message'),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { text: i18n.t('restaurants.locationDenied.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (outcome.kind !== 'located') return;
    const { coords } = outcome;
    try {
      const places = await Location.reverseGeocodeAsync(coords);
      const place = places[0];
      const cityName = place?.city ?? place?.subregion ?? place?.region;
      if (!cityName) return;
      activateNearbyPlace(cityName, coords.latitude, coords.longitude, 'city');
    } catch {
      // Reverse geocode non disponibile — centra solo la mappa (già fatto da handleLocateMe).
    }
  }, [geo.handleLocateMe, activateNearbyPlace]);

  const handleSelectPlace = useCallback((lat: number, lng: number, placeType?: string, name?: string) => {
    Keyboard.dismiss();
    if (searchQuery.trim().length > 0) {
      SupabaseAnalytics.track('restaurant_search', {
        query: searchQuery.trim().slice(0, 60),
        source: 'map',
        selected_kind: 'place',
        result_count: mapSearch.results.length,
      });
    }
    if (name) {
      activateNearbyPlace(name, lat, lng, placeType);
    } else {
      geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: 0, latDelta: zoomForPlaceType(placeType) });
    }
  }, [geo.setCenterOn, activateNearbyPlace, searchQuery, mapSearch.results.length]);

  /** Seleziona il primo risultato di tipo 'place' se presente. Ritorna true se ha selezionato. */
  const selectFirstPlaceIfAny = useCallback((): boolean => {
    const p = mapSearch.results.find((r) => r.type === 'place');
    if (!p || p.type !== 'place') return false;
    handleSelectPlace(p.latitude, p.longitude, p.placeType, p.name);
    return true;
  }, [mapSearch.results, handleSelectPlace]);

  /** Invio sulla tastiera: pattern "Google-like" → seleziona automaticamente il primo
   *  risultato della sezione Luoghi. Se i risultati non sono ancora arrivati (debounce
   *  o fetch in volo), forziamo la ricerca immediata e memorizziamo la query in attesa:
   *  quando i place results si popolano per quella stessa query, l'effetto sotto
   *  completa la selezione. Il match su searchQuery invalida l'attesa se l'utente
   *  ricomincia a digitare dopo aver premuto invio. */
  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery;
    if (q.length < MIN_PLACE_QUERY_LENGTH) return;

    if (selectFirstPlaceIfAny()) {
      clearPendingEnter();
      return;
    }

    clearPendingEnter();
    pendingEnterQueryRef.current = q;
    mapSearch.search(q, { immediate: true });

    // Safety net: se dopo 6s i risultati non sono arrivati (Nominatim + Photon falliti
    // o rete assente), abbandoniamo l'attesa per non intrappolare il prossimo invio.
    pendingEnterTimerRef.current = setTimeout(() => {
      if (pendingEnterQueryRef.current === q) clearPendingEnter();
    }, 6000);
  }, [searchQuery, selectFirstPlaceIfAny, clearPendingEnter, mapSearch.search]);

  useEffect(() => {
    const pending = pendingEnterQueryRef.current;
    if (!pending || pending !== searchQuery) return;
    if (selectFirstPlaceIfAny()) clearPendingEnter();
  }, [mapSearch.results, searchQuery, selectFirstPlaceIfAny, clearPendingEnter]);

  const handleDeselect = useCallback(() => {
    dispatch({ type: 'DESELECT' });
    Keyboard.dismiss();
  }, []);

  const handleRegionChange = useCallback((region: Parameters<typeof geo.handleRegionChange>[0]) => {
    dispatch({ type: 'DESELECT' });
    geo.handleRegionChange(region);
  }, [geo.handleRegionChange]);

  const handleResetFilters = useCallback(async () => {
    setActiveFilters([]);
    setMinRating(null);
    const fmnWasOn = forMyNeeds;
    const lodgingWasOn = showLodging;
    if (fmnWasOn) {
      setForMyNeeds(false);
      storage.setForMyNeeds(false);
    }
    if (lodgingWasOn) setShowLodging(false);
    if (fmnWasOn || lodgingWasOn) {
      await geo.clearAndReload(false, false);
    }
    if (lodgingWasOn) geo.reloadLodgingPins(false);
  }, [forMyNeeds, showLodging, geo.clearAndReload, geo.reloadLodgingPins]);

  const handleRemoveNeedsChip = useCallback(async () => {
    setForMyNeeds(false);
    storage.setForMyNeeds(false);
    await geo.clearAndReload(false);
  }, [geo.clearAndReload]);

  const handleRemoveRatingChip = useCallback(() => {
    setMinRating(null);
  }, []);

  const handleRemoveLodgingChip = useCallback(async () => {
    setShowLodging(false);
    await geo.clearAndReload(undefined, false);
    geo.reloadLodgingPins(false);
  }, [geo.clearAndReload, geo.reloadLodgingPins]);

  const autocompleteVisible =
    mapSearch.nearbyPlace === null &&
    isSearchFocused &&
    searchQuery.length >= 2 &&
    (mapSearch.results.length > 0 || mapSearch.isSearching);

  const recentsVisible =
    mapSearch.nearbyPlace === null &&
    searchQuery.length === 0 &&
    isSearchFocused &&
    recentPlaces.length > 0;

  const dismissDropdowns = useCallback(() => {
    setIsSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  // Applica il filtro cucina ai risultati nearby prima di passarli alla banner/sheet.
  // forMyNeeds non filtra ulteriormente: la RPC restituisce già tutti i ristoranti nel
  // raggio ordinati per copertura. Filtrare covered > 0 nasconderebbe ristoranti esistenti
  // non ancora recensiti per gli allergeni dell'utente (incoerente con la mappa che mostra
  // tutti i pin, anche quelli grigi = non coperti).
  const filteredNearbyResults = useMemo(() => {
    let out = mapSearch.nearbyResults;
    if (activeFilters.length > 0) {
      out = out.filter(r =>
        r.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
      );
    }
    if (minRating !== null) {
      out = out.filter(r => (r.average_rating ?? 0) >= minRating);
    }
    return out;
  }, [mapSearch.nearbyResults, activeFilters, minRating]);

  const nearbyCount = filteredNearbyResults.length;

  // Fetch saturo al tetto RPC: il totale reale nel raggio è ignoto, quindi qualsiasi
  // conteggio (anche post-filtri client) è un limite inferiore → "+" sempre.
  const nearbyCountTruncated = mapSearch.nearbyResults.length >= QUERY_LIMITS.NEARBY_MAX;
  // Il banner non promette mai più righe di quante lo sheet ne mostri (top 50 per sort).
  const nearbyShowsPlus = nearbyCountTruncated || nearbyCount > NEARBY_LIST_DISPLAY_MAX;
  const nearbyBannerCount = Math.min(nearbyCount, NEARBY_LIST_DISPLAY_MAX);

  const showNearbyBanner =
    mapSearch.nearbyPlace !== null && !nearbyExpanded && !selection.detailId;

  // Asimmetrico: sparizione istantanea (snap a 1) come comportamento originale,
  // ricomparsa animata in sincronia con il sheet/banner che si chiude.
  useEffect(() => {
    const shouldHide = Boolean(selection.detailId) || nearbyExpanded || showNearbyBanner;
    setFabHidden(shouldHide);
    if (shouldHide) fabProgress.value = 1;
    else fabProgress.value = withTiming(0, FAB_ANIM_CONFIG);
  }, [selection.detailId, nearbyExpanded, showNearbyBanner, fabProgress]);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - fabProgress.value,
    transform: [{ translateY: fabProgress.value * 80 }],
  }));

  useEffect(() => {
    if (showNearbyBanner) {
      setBannerHidden(false);
      bannerProgress.value = withTiming(0, FAB_ANIM_CONFIG);
    } else {
      setBannerHidden(true);
      bannerProgress.value = 1;
    }
  }, [showNearbyBanner, bannerProgress]);

  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - bannerProgress.value,
    transform: [{ translateY: bannerProgress.value * 80 }],
  }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mapContainer}>
        <RestaurantMap
          restaurants={mapRestaurants}
          allPins={filteredAllPins}
          centerOn={geo.centerOn}
          hasUserLocation={!!geo.userLocation}
          onRegionChangeComplete={handleRegionChange}
          onReady={handleMapReady}
          selectedId={selection.selectedId}
          selectedRestaurant={selectedRestaurant}
          onDeselect={handleDeselect}
          showMatchInfo={forMyNeeds}
          onRestaurantPress={handleOpenDetail}
          favoriteIds={favoriteIds}
          favoriteRestaurants={favoriteRestaurants}
          customSymbols={savedSymbols}
          savedRestaurants={savedRestaurants}
          compassOffset={{ x: -12, y: insets.top + 8 }}
          fullScreenChrome
          userAllergens={filterAllergens}
          userDiets={filterDiets}
        />
      </View>

      {(autocompleteVisible || recentsVisible) && (
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={dismissDropdowns}
        />
      )}

      {/* Overlay flottante: search bar + riga filtri + chip attivi + autocomplete */}
      <View
        style={[styles.floatingSearchOverlay, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.floatingSearchRow}>
          <View style={styles.floatingSearchContainer}>
            <TouchableOpacity onPress={() => router.push('/restaurants/profile')} activeOpacity={0.85} style={styles.avatarButton}>
              <Avatar
                avatarId={userProfile?.avatar_url}
                isAnonymous={userProfile?.is_anonymous}
                initial={isAuthenticated && userProfile ? getDisplayName(userProfile) ?? undefined : undefined}
                size={44}
              />
              {hasNotification && <View style={styles.notificationBadge} pointerEvents="none" />}
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('restaurants.tabs.searchPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={dismissAutocomplete} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLocateMeAndShowCity} hitSlop={8} disabled={geo.isLocating}>
                {geo.isLocating ? (
                  <ActivityIndicator size={16} color={theme.colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => isAuthenticated ? handleOpenFilterModal() : router.push('/auth/login')}
            style={styles.mapOverlayButton}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="tune-vertical"
              size={22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {geo.isOffline && (
          <View style={styles.offlineBanner} pointerEvents="none">
            <MaterialCommunityIcons name="cloud-off-outline" size={15} color={theme.colors.textSecondary} />
            <Text style={styles.offlineBannerText} numberOfLines={2}>
              {i18n.t('restaurants.tabs.offlineBanner')}
            </Text>
          </View>
        )}

        {(activeFilters.length > 0 || minRating !== null || showLodging || (forMyNeeds && (filterAllergens.length > 0 || filterDiets.length > 0))) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
            style={styles.chipScrollContainer}
          >
            {showLodging && (
              <TouchableOpacity key="lodging" style={styles.activeChip} onPress={handleRemoveLodgingChip} activeOpacity={0.7}>
                <MaterialCommunityIcons name="bed" size={13} color={theme.colors.primary} />
                <Text style={styles.activeChipText}>{i18n.t('restaurants.tabs.activeChipLodging')}</Text>
                <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {forMyNeeds && (
              <TouchableOpacity key="needs" style={styles.activeChip} onPress={handleRemoveNeedsChip} activeOpacity={0.7}>
                <MaterialCommunityIcons name="shield-check" size={13} color={theme.colors.primary} />
                <Text style={styles.activeChipText}>{i18n.t(filterNeedsDiffer ? 'restaurants.tabs.activeChipCustomNeeds' : 'restaurants.tabs.activeChipForMe')}</Text>
                <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {minRating !== null && (
              <TouchableOpacity key="rating" style={styles.activeChip} onPress={handleRemoveRatingChip} activeOpacity={0.7}>
                <Text style={styles.activeChipText}>{i18n.t('restaurants.tabs.activeChipRating4Plus')}</Text>
                <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {activeFilters.map(id => (
              <TouchableOpacity key={id} style={styles.activeChip} onPress={() => toggleFilter(id)} activeOpacity={0.7}>
                <Text style={styles.activeChipText}>{getCuisineLabel(id, lang)}</Text>
                <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {autocompleteVisible && (
          <View style={styles.autocompleteContainer}>
            <SearchAutocomplete
              results={mapSearch.results}
              isSearching={mapSearch.isSearching}
              onSelectRestaurant={handleSelectFromAutocomplete}
              onSelectPlace={handleSelectPlace}
            />
          </View>
        )}

        {recentsVisible && (
          <View style={styles.autocompleteContainer}>
            <RecentSearches
              places={recentPlaces}
              onSelect={handleSelectRecentPlace}
              onClear={handleClearRecentPlaces}
            />
          </View>
        )}
      </View>

      {mapSearch.nearbyPlace && (
        <Animated.View
          pointerEvents={bannerHidden ? 'none' : 'auto'}
          style={[styles.nearbyBanner, { bottom: overlayBaseBottom + 12 }, bannerAnimatedStyle]}
        >
          <TouchableOpacity
            onPress={() => setNearbyExpanded(true)}
            activeOpacity={0.85}
            style={styles.nearbyBannerExpand}
          >
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
            <Text style={styles.nearbyBannerTitle} numberOfLines={1}>
              {mapSearch.isLoadingNearby
                ? i18n.t('restaurants.tabs.loadingNearby', { place: mapSearch.nearbyPlace.name })
                : nearbyCount === 0
                  ? i18n.t('restaurants.tabs.bannerNoneAt', { place: mapSearch.nearbyPlace.name })
                  : nearbyShowsPlus
                    ? i18n.t('restaurants.tabs.bannerCountAtPlus', { count: nearbyBannerCount, place: mapSearch.nearbyPlace.name })
                    : i18n.t('restaurants.tabs.bannerCountAt', { count: nearbyCount, place: mapSearch.nearbyPlace.name })}
            </Text>
            {!mapSearch.isLoadingNearby && nearbyCount > 0 && (
              <MaterialCommunityIcons name="chevron-up" size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearNearbyPlace}
            hitSlop={10}
            style={styles.nearbyBannerClose}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {mapSearch.nearbyPlace && nearbyExpanded && !selection.detailId && (
        <NearbyListSheet
          place={mapSearch.nearbyPlace}
          results={filteredNearbyResults}
          isLoading={mapSearch.isLoadingNearby}
          countTruncated={nearbyCountTruncated}
          showMatchInfo={forMyNeeds}
          hasActiveFilters={hasActiveSettings}
          userLocation={geo.userLocation}
          onSelectRestaurant={handleSelectFromNearbySheet}
          onClose={handleCloseNearbySheet}
          onCloseStart={tabBar.show}
          onAddPress={handleAddPress}
        />
      )}

      {selection.detailId && (
        <RestaurantDetailSheet
          restaurantId={selection.detailId}
          onClose={handleCloseDetail}
          onCloseStart={tabBar.show}
          onFavoriteToggled={(id, delta) => syncFavoriteId(id, delta > 0)}
          needsOverride={detailNeedsOverride}
        />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        activeFilters={activeFilters}
        forMyNeeds={forMyNeeds}
        filterAllergens={filterAllergens}
        filterDiets={filterDiets}
        minRating={minRating}
        showLodging={showLodging}
        profileAllergens={dietaryNeeds.allergens as string[]}
        profileDiets={dietaryNeeds.diets as string[]}
        onSyncProfile={handleSyncProfile}
        isAuthenticated={isAuthenticated}
        onRequestLogin={() => router.push('/auth/login')}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        lang={lang}
      />

      <Animated.View
        pointerEvents={fabHidden ? 'none' : 'auto'}
        style={[styles.fabWrapper, { bottom: overlayBaseBottom + 16 }, fabAnimatedStyle]}
      >
        <TouchableOpacity
          onPress={handleAddPress}
          style={styles.fab}
          activeOpacity={0.85}
        >
          <Image
            source={require('../../assets/happy_plate_forks.png')}
            style={styles.fabImage}
          />
          <MaterialCommunityIcons name="plus" size={14} color={theme.colors.onPrimary} />
          <Text style={styles.fabText}>{i18n.t('common.add')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    overflow: 'visible',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  // --- Floating overlay ---
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  floatingSearchOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
    overflow: 'visible',
  },
  floatingSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingLeft: 8,
    paddingRight: 14,
    height: 48,
    borderRadius: 24,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mapOverlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },

  // --- Active filter chips ---
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  offlineBannerText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  chipScrollContainer: {
    marginTop: 6,
    marginHorizontal: -12,
  },
  chipScroll: {
    gap: 6,
    paddingHorizontal: 12,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}40`,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // --- FAB Aggiungi ---
  fabWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    elevation: 6,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },

  // --- Autocomplete ---
  autocompleteContainer: {
    marginTop: 8,
    zIndex: 10,
    elevation: 10,
  },

  // --- Nearby banner (collassata, in basso) ---
  nearbyBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 6,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  nearbyBannerExpand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nearbyBannerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  nearbyBannerClose: {
    padding: 8,
    marginLeft: 4,
  },
});
