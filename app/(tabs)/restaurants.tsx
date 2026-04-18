import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { type SortBy, type Restaurant } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantMap from '../../components/map/RestaurantMap';
import FilterModal from '../../components/restaurants/FilterModal';
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
import { storage } from '../../utils/storage';

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
  const { isAuthenticated, user, dietaryNeeds, refreshProfile } = useAuth();
  const lang = i18n.locale as AppLanguage;

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RestaurantCategoryId[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [forMyNeeds, setForMyNeeds] = useState(false);
  const [filterAllergens, setFilterAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [filterDiets, setFilterDiets] = useState<string[]>([...(dietaryNeeds.diets ?? [])]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Segnala che il prossimo cambio di filterAllergens/filterDiets viene dal profilo
  const profileJustChanged = useRef(false);
  // Segnala che i filtri sono stati modificati dentro il FilterModal
  const filterChangedInModal = useRef(false);

  // Sincronizza sempre (con o senza forMyNeeds) — necessario per aggiornamenti da Settings
  useEffect(() => {
    profileJustChanged.current = true;
    setFilterAllergens([...dietaryNeeds.allergens]);
    setFilterDiets([...(dietaryNeeds.diets ?? [])]);
  }, [dietaryNeeds.allergens, dietaryNeeds.diets]);

  // Traccia modifiche ai filtri durante la sessione modale
  useEffect(() => {
    if (showFilterModal) filterChangedInModal.current = true;
  }, [filterAllergens, filterDiets]);

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
  const hasActiveSettings = activeFilters.length > 0 || sortBy !== 'distance' || forMyNeeds;

  // --- Selection state (reducer — niente ref, niente timing issue) ---
  const [selection, dispatch] = useReducer(selectionReducer, INITIAL_SELECTION);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Nearby panel: quando c'è un luogo selezionato, mostriamo prima una banner
  // collassata in basso; il tap la espande nell'autocomplete nearby.
  const [nearbyExpanded, setNearbyExpanded] = useState(false);

  // Nasconde la tab bar quando un bottom sheet (detail o nearby) è aperto.
  useEffect(() => {
    const hide = Boolean(selection.detailId) || nearbyExpanded;
    navigation.setOptions({
      tabBarStyle: hide ? { display: 'none' } : TAB_BAR_STYLE,
    });
  }, [selection.detailId, nearbyExpanded, navigation]);

  // Regione corrente della mappa — usata per filtrare la lista coerentemente col viewport
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number;
  } | null>(null);

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
    userLocation: geo.userLocation,
    activeFilters,
    searchQuery: mapFilterQuery,
    sortBy,
    forMyNeeds,
    mapRegion: currentRegion,
  });

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
    filterChangedInModal.current = false;
    setShowFilterModal(true);
  }, []);

  const handleSyncProfile = useCallback(async (a: string[], d: string[]) => {
    if (!user) return;
    await AuthService.updateDietaryNeeds(user.uid, { allergens: a, diets: d });
    await refreshProfile();
  }, [user, refreshProfile]);

  const handleCloseFilterModal = useCallback(async () => {
    setShowFilterModal(false);
    const filtersChanged = filterChangedInModal.current;
    filterChangedInModal.current = false;

    if (!forMyNeeds || !filtersChanged) return;

    // Auto-sync profilo se le esigenze differiscono da quelle salvate.
    const allergensMatch =
      filterAllergens.length === dietaryNeeds.allergens.length &&
      filterAllergens.every(a => dietaryNeeds.allergens.includes(a as any));
    const dietsMatch =
      filterDiets.length === (dietaryNeeds.diets ?? []).length &&
      filterDiets.every(d => (dietaryNeeds.diets ?? []).includes(d as any));

    if (!allergensMatch || !dietsMatch) {
      handleSyncProfile(filterAllergens, filterDiets).catch(() => {});
    }

    geo.clearAndReload();
  }, [forMyNeeds, geo.clearAndReload, filterAllergens, filterDiets, dietaryNeeds, handleSyncProfile]);

  const handleToggleMyNeeds = useCallback(async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (!filterHasNeeds) {
      Alert.alert(
        'Nessuna esigenza selezionata',
        'Seleziona almeno un\'allergia o dieta per usare questo filtro.',
      );
      return;
    }
    const newValue = !forMyNeeds;
    setForMyNeeds(newValue);
    storage.setForMyNeeds(newValue);
    await geo.clearAndReload();
  }, [isAuthenticated, filterHasNeeds, forMyNeeds, geo.clearAndReload, router]);

  const dismissAutocomplete = useCallback(() => {
    setSearchQuery('');
    setNearbyExpanded(false);
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

  const handleSelectPlace = useCallback((lat: number, lng: number, placeType?: string, name?: string) => {
    Keyboard.dismiss();
    const latDelta =
      placeType === 'country' ? 12 :
      placeType === 'state' ? 3 :
      placeType === 'county' ? 0.5 :
      placeType === 'city' ? 0.08 :
      placeType === 'district' || placeType === 'locality' ? 0.03 :
      0.02;
    geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: 0, latDelta });
    if (name) {
      // Sostituisci il testo della search con il nome del luogo (UX Google Maps-like),
      // senza far ripartire la ricerca testuale.
      setSearchQuery(name);
      mapSearch.clear();
      mapSearch.selectPlace({ name, latitude: lat, longitude: lng, placeType });
      // Default: banner collassata; l'utente espande con tap.
      setNearbyExpanded(false);
    }
  }, [geo.setCenterOn, mapSearch.clear, mapSearch.selectPlace]);

  const handleDeselect = useCallback(() => {
    dispatch({ type: 'DESELECT' });
    Keyboard.dismiss();
  }, []);

  const handleRegionChange = useCallback((region: Parameters<typeof geo.handleRegionChange>[0]) => {
    dispatch({ type: 'DESELECT' });
    setCurrentRegion(region);
    geo.handleRegionChange(region);
  }, [geo.handleRegionChange]);

  const handleResetFilters = useCallback(async () => {
    setActiveFilters([]);
    setSortBy('distance');
    if (forMyNeeds) {
      setForMyNeeds(false);
      storage.setForMyNeeds(false);
      await geo.clearAndReload();
    }
    setShowFilterModal(false);
  }, [forMyNeeds, geo.clearAndReload]);

  const autocompleteVisible =
    mapSearch.nearbyPlace === null &&
    searchQuery.length >= 2 &&
    (mapSearch.results.length > 0 || mapSearch.isSearching);

  // Conta i ristoranti da mostrare nella banner collassata.
  // Con "Per me" attivo, conta solo quelli con almeno una corrispondenza (coveredTotal > 0).
  const nearbyCount = forMyNeeds
    ? mapSearch.nearbyResults.filter(r => {
        const covered = (r.covered_allergen_count ?? 0) + (r.covered_dietary_count ?? 0);
        return covered > 0;
      }).length
    : mapSearch.nearbyResults.length;

  const showNearbyBanner =
    mapSearch.nearbyPlace !== null && !nearbyExpanded && !selection.detailId;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mapContainer}>
        <RestaurantMap
          restaurants={mapRestaurants}
          allPins={geo.allPins}
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
        />
      </View>

      {/* Overlay flottante: search bar + riga filtri + chip attivi + autocomplete */}
      <View
        style={[styles.floatingSearchOverlay, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.floatingSearchRow}>
          <TouchableOpacity style={styles.mapOverlayButton} onPress={() => router.push('/restaurants/profile')} activeOpacity={0.85}>
            <MaterialCommunityIcons
              name={isAuthenticated ? 'account-circle' : 'account-circle-outline'}
              size={22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <View style={styles.floatingSearchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca ristorante o luogo..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={dismissAutocomplete} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={geo.handleLocateMe} hitSlop={8} disabled={geo.isLocating}>
                {geo.isLocating ? (
                  <ActivityIndicator size={16} color={theme.colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.mapOverlayButton} onPress={() => router.push('/leaderboard')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="trophy-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Riga filtri: tune + Per me + Aggiungi */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => isAuthenticated ? handleOpenFilterModal() : router.push('/auth/login')}
            style={[styles.filterPill, hasActiveSettings && styles.filterPillActive]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="tune-vertical"
              size={18}
              color={hasActiveSettings ? theme.colors.onPrimary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleMyNeeds}
            style={[styles.filterPillWide, forMyNeeds && styles.filterPillActive]}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={16}
              color={forMyNeeds ? theme.colors.onPrimary : theme.colors.textSecondary}
            />
            <Text style={[styles.filterPillText, forMyNeeds && styles.filterPillTextActive]}>
              Per me
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleAddPress}
            style={styles.addButton}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/happy_plate_forks.png')}
              style={styles.addButtonImage}
            />
            <MaterialCommunityIcons name="plus" size={14} color={theme.colors.onPrimary} />
            <Text style={styles.addButtonText}>Aggiungi</Text>
          </TouchableOpacity>
        </View>

        {activeFilters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
            style={styles.chipScrollContainer}
          >
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
                  : `${nearbyCount} ${nearbyCount === 1 ? 'ristorante' : 'ristoranti'}${forMyNeeds ? (nearbyCount === 1 ? ' compatibile' : ' compatibili') : ''} a ${mapSearch.nearbyPlace!.name}`}
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
          results={mapSearch.nearbyResults}
          isLoading={mapSearch.isLoadingNearby}
          showMatchInfo={forMyNeeds}
          userLocation={geo.userLocation}
          onSelectRestaurant={handleSelectFromNearbySheet}
          onClose={handleCloseNearbySheet}
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
        onClose={handleCloseFilterModal}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        forMyNeeds={forMyNeeds}
        onToggleMyNeeds={handleToggleMyNeeds}
        filterAllergens={filterAllergens}
        filterDiets={filterDiets}
        onAllergensChange={setFilterAllergens}
        onDietsChange={setFilterDiets}
        profileAllergens={dietaryNeeds.allergens as string[]}
        profileDiets={dietaryNeeds.diets as string[]}
        onSyncProfile={handleSyncProfile}
        hasActiveSettings={hasActiveSettings}
        onReset={handleResetFilters}
        lang={lang}
      />
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
  floatingSearchOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
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
    paddingHorizontal: 14,
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },

  // --- Filter row (under search bar) ---
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  filterPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterPillWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.onPrimary,
  },

  // --- Active filter chips ---
  chipScrollContainer: {
    marginTop: 6,
  },
  chipScroll: {
    gap: 6,
    paddingRight: 4,
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

  // --- Add button ---
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  addButtonImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
