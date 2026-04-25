import { useState, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, Image, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { theme } from '../../constants/theme';
import { getAvatarById } from '../../constants/avatars';
import { getProfileColor } from '../../constants/profileColors';
import { type Restaurant } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantMap from '../../components/map/RestaurantMap';
import FilterModal, { type FilterApplyResult } from '../../components/restaurants/FilterModal';
import NearbyListSheet from '../../components/restaurants/NearbyListSheet';
import RestaurantDetailSheet from '../../components/restaurants/RestaurantDetailSheet';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import { getCuisineLabel } from '../../constants/restaurantCategories';
import i18n from '../../utils/i18n';
import { useRestaurantGeo } from '../../hooks/useRestaurantGeo';
import { useRestaurantList } from '../../hooks/useRestaurantList';
import { useRestaurantFavorites } from '../../hooks/useRestaurantFavorites';
import { useMapSearch } from '../../hooks/useMapSearch';
import SearchAutocomplete from '../../components/SearchAutocomplete';
import RecentSearches from '../../components/RecentSearches';
import { storage, type RecentPlace } from '../../utils/storage';

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

const TAB_BAR_STYLE = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: theme.colors.surface,
  borderTopColor: theme.colors.divider,
  borderTopWidth: 1,
};

// Frazione stimata di copertura della detail sheet: usata per offsettare la camera
// in modo che il marker selezionato resti visibile sopra lo sheet.
const DETAIL_SHEET_COVERAGE = 0.55;

export default function RestaurantsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, userProfile, dietaryNeeds, refreshProfile } = useAuth();
  const lang = i18n.locale as AppLanguage;

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RestaurantCategoryId[]>([]);
  const [forMyNeeds, setForMyNeeds] = useState(false);
  const [filterAllergens, setFilterAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [filterDiets, setFilterDiets] = useState<string[]>([...(dietaryNeeds.diets ?? [])]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Segnala che il prossimo cambio di filterAllergens/filterDiets viene dal profilo
  const profileJustChanged = useRef(false);

  // Sincronizza sempre (con o senza forMyNeeds) — necessario per aggiornamenti da Settings
  useEffect(() => {
    profileJustChanged.current = true;
    setFilterAllergens([...dietaryNeeds.allergens]);
    setFilterDiets([...(dietaryNeeds.diets ?? [])]);
  }, [dietaryNeeds.allergens, dietaryNeeds.diets]);

  // Ripristina preferenza "Per me" da storage per utenti loggati
  const forMyNeedsRestored = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || forMyNeedsRestored.current) return;
    forMyNeedsRestored.current = true;
    const hasNeeds = dietaryNeeds.allergens.length > 0 || (dietaryNeeds.diets ?? []).length > 0;
    if (!hasNeeds) return;
    storage.getForMyNeeds().then(saved => {
      if (saved) setForMyNeeds(true);
    });
  }, [isAuthenticated, dietaryNeeds.allergens, dietaryNeeds.diets]);

  const filterHasNeeds = filterAllergens.length > 0 || filterDiets.length > 0;
  const hasActiveSettings = activeFilters.length > 0 || forMyNeeds;

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

  // Nasconde la tab bar quando un bottom sheet (detail o nearby) è aperto.
  useEffect(() => {
    const hide = Boolean(selection.detailId) || nearbyExpanded;
    navigation.setOptions({
      tabBarStyle: hide ? { display: 'none' } : TAB_BAR_STYLE,
    });
  }, [selection.detailId, nearbyExpanded, navigation]);

  // Nessuna bottom sheet: il geo hook non ha più bisogno di un'offset dinamica.
  const getSheetFraction = useCallback(() => 0, []);

  // --- Hooks ---
  const geo = useRestaurantGeo({ forMyNeeds, filterAllergens, filterDiets, getSheetFraction });

  // Re-interroga quando il profilo cambia con forMyNeeds attivo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  });

  // Quando c'è un luogo selezionato, la query testuale non deve filtrare i pin sulla mappa:
  // l'utente sta esplorando un'area, non cercando per nome.
  const mapFilterQuery = mapSearch.nearbyPlace ? '' : searchQuery;

  const { mapRestaurants } = useRestaurantList({
    restaurants: geo.restaurants,
    activeFilters,
    searchQuery: mapFilterQuery,
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

  useFocusEffect(useCallback(() => {
    loadFavorites();
    geo.refreshAllPins();
  }, [loadFavorites, geo.refreshAllPins]));

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
  }, []);

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

  const handleApplyFilters = useCallback(async ({ filters, forMyNeeds: newFmn, allergens, diets }: FilterApplyResult) => {
    setActiveFilters(filters);
    setFilterAllergens(allergens);
    setFilterDiets(diets);

    const fmnChanged = newFmn !== forMyNeeds;
    const allergensChanged = allergens.length !== filterAllergens.length || allergens.some(a => !filterAllergens.includes(a));
    const dietsChanged = diets.length !== filterDiets.length || diets.some(d => !filterDiets.includes(d));

    setForMyNeeds(newFmn);
    storage.setForMyNeeds(newFmn);

    if (newFmn && (fmnChanged || allergensChanged || dietsChanged)) {
      await geo.clearAndReload(newFmn);
    } else if (!newFmn && fmnChanged) {
      await geo.clearAndReload(false);
    }
    // Nota: il re-fetch della lista "Ristoranti nell'area" è gestito dentro useMapSearch
    // via useEffect reattivo su forMyNeeds/filterAllergens/filterDiets.

    // Auto-sync profilo se le esigenze differiscono da quelle salvate
    if (newFmn && (allergensChanged || dietsChanged)) {
      const profileAllergensMatch =
        allergens.length === (dietaryNeeds.allergens as string[]).length &&
        allergens.every(a => (dietaryNeeds.allergens as string[]).includes(a));
      const profileDietsMatch =
        diets.length === (dietaryNeeds.diets ?? []).length &&
        diets.every(d => (dietaryNeeds.diets as string[] ?? []).includes(d));
      if (!profileAllergensMatch || !profileDietsMatch) {
        handleSyncProfile(allergens, diets).catch(() => {});
      }
    }
  }, [forMyNeeds, filterAllergens, filterDiets, dietaryNeeds, geo.clearAndReload, handleSyncProfile]);

  const dismissAutocomplete = useCallback(() => {
    setSearchQuery('');
    setNearbyExpanded(false);
    setIsSearchFocused(false);
    mapSearch.clear();
    Keyboard.dismiss();
  }, [mapSearch.clear]);

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
  }, [geo.setCenterOn]);

  /** Tap su un ristorante dall'autocomplete di ricerca: pulisce la search. */
  const handleSelectFromAutocomplete = useCallback((id: string, lat: number, lng: number) => {
    dismissAutocomplete();
    openRestaurantDetail(id, lat, lng);
  }, [dismissAutocomplete, openRestaurantDetail]);

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
    const coords = await geo.handleLocateMe();
    if (!coords) return;
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
    if (name) {
      activateNearbyPlace(name, lat, lng, placeType);
    } else {
      geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: 0, latDelta: zoomForPlaceType(placeType) });
    }
  }, [geo.setCenterOn, activateNearbyPlace]);

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
    if (forMyNeeds) {
      setForMyNeeds(false);
      storage.setForMyNeeds(false);
      await geo.clearAndReload(false);
    }
  }, [forMyNeeds, geo.clearAndReload]);

  const handleRemoveNeedsChip = useCallback(async () => {
    setForMyNeeds(false);
    storage.setForMyNeeds(false);
    await geo.clearAndReload(false);
  }, [geo.clearAndReload]);

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
    if (activeFilters.length === 0) return mapSearch.nearbyResults;
    return mapSearch.nearbyResults.filter(r =>
      r.cuisine_types?.some(ct => activeFilters.includes(ct as RestaurantCategoryId))
    );
  }, [mapSearch.nearbyResults, activeFilters]);

  const nearbyCount = filteredNearbyResults.length;

  const showNearbyBanner =
    mapSearch.nearbyPlace !== null && !nearbyExpanded && !selection.detailId;

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
          selectedId={selection.selectedId}
          selectedRestaurant={selectedRestaurant}
          onDeselect={handleDeselect}
          showMatchInfo={forMyNeeds}
          onRestaurantPress={handleOpenDetail}
          favoriteIds={favoriteIds}
          favoriteRestaurants={favoriteRestaurants}
          compassOffset={{ x: -12, y: insets.top + 8 }}
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
              {(() => {
                const avatarObj = userProfile?.avatar_url ? getAvatarById(userProfile.avatar_url) : undefined;
                const profileColor = getProfileColor(userProfile?.profile_color ?? undefined);
                const initial = (userProfile?.display_name?.charAt(0) || '?').toUpperCase();
                if (avatarObj?.source) {
                  return <Image source={avatarObj.source} style={styles.avatarImage} />;
                }
                if (isAuthenticated) {
                  return (
                    <View style={[styles.avatarFallback, { backgroundColor: profileColor.hex }]}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                  );
                }
                return (
                  <MaterialCommunityIcons name="account-circle-outline" size={32} color={theme.colors.primary} />
                );
              })()}
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca ristorante o luogo..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
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

        {(activeFilters.length > 0 || (forMyNeeds && (filterAllergens.length > 0 || filterDiets.length > 0))) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
            style={styles.chipScrollContainer}
          >
            {forMyNeeds && (
              <TouchableOpacity key="needs" style={styles.activeChip} onPress={handleRemoveNeedsChip} activeOpacity={0.7}>
                <MaterialCommunityIcons name="shield-check" size={13} color={theme.colors.primary} />
                <Text style={styles.activeChipText}>Per me</Text>
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

      {showNearbyBanner && (
        <View style={[styles.nearbyBanner, { bottom: 49 + insets.bottom + 12 }]}>
          <TouchableOpacity
            onPress={() => setNearbyExpanded(true)}
            activeOpacity={0.85}
            style={styles.nearbyBannerExpand}
          >
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
            <Text style={styles.nearbyBannerTitle} numberOfLines={1}>
              {mapSearch.isLoadingNearby
                ? `Cerco ristoranti a ${mapSearch.nearbyPlace!.name}...`
                : nearbyCount === 0
                  ? `Nessun ristorante a ${mapSearch.nearbyPlace!.name}`
                  : `${nearbyCount} ${nearbyCount === 1 ? 'ristorante' : 'ristoranti'} a ${mapSearch.nearbyPlace!.name}`}
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
        </View>
      )}

      {mapSearch.nearbyPlace && nearbyExpanded && !selection.detailId && (
        <NearbyListSheet
          place={mapSearch.nearbyPlace}
          results={filteredNearbyResults}
          isLoading={mapSearch.isLoadingNearby}
          showMatchInfo={forMyNeeds}
          hasActiveFilters={hasActiveSettings}
          userLocation={geo.userLocation}
          onSelectRestaurant={handleSelectFromNearbySheet}
          onClose={handleCloseNearbySheet}
          onAddPress={handleAddPress}
        />
      )}

      {selection.detailId && (
        <RestaurantDetailSheet
          restaurantId={selection.detailId}
          onClose={handleCloseDetail}
          onFavoriteToggled={(id, delta) => syncFavoriteId(id, delta > 0)}
        />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        activeFilters={activeFilters}
        forMyNeeds={forMyNeeds}
        filterAllergens={filterAllergens}
        filterDiets={filterDiets}
        profileAllergens={dietaryNeeds.allergens as string[]}
        profileDiets={dietaryNeeds.diets as string[]}
        onSyncProfile={handleSyncProfile}
        isAuthenticated={isAuthenticated}
        onRequestLogin={() => router.push('/auth/login')}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        lang={lang}
      />

      {!selection.detailId && !nearbyExpanded && !showNearbyBanner && (
        <TouchableOpacity
          onPress={handleAddPress}
          style={[styles.fab, { bottom: 49 + insets.bottom + 16 }]}
          activeOpacity={0.85}
        >
          <Image
            source={require('../../assets/happy_plate_forks.png')}
            style={styles.fabImage}
          />
          <MaterialCommunityIcons name="plus" size={14} color={theme.colors.onPrimary} />
          <Text style={styles.fabText}>Aggiungi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: 'visible',
  },
  mapContainer: {
    flex: 1,
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
    shadowColor: '#000',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },

  // --- Active filter chips ---
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
    shadowColor: '#000',
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
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 20,
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
    shadowColor: '#000',
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
