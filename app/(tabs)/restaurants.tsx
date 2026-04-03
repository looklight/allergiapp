import { useState, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard, useWindowDimensions, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect, useNavigation } from 'expo-router';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { type SortBy, type Restaurant } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantCard from '../../components/restaurants/RestaurantCard';
import RestaurantMap from '../../components/map/RestaurantMap';
import DraggableBottomSheet, { type DraggableBottomSheetRef } from '../../components/DraggableBottomSheet';
import FilterModal from '../../components/restaurants/FilterModal';
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
      // tracksViewChanges farebbe il ciclo true→false mentre tab bar / list sheet
      // animano simultaneamente → iOS cattura un bitmap vuoto → pin sparisce.
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

export default function RestaurantsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
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
  const listRef = useRef<FlatList>(null);
  const listSheetRef = useRef<DraggableBottomSheetRef>(null);

  // Snap index del list sheet prima che il detail lo collassi — per ripristinarlo alla chiusura
  const listSheetIndexBeforeDetail = useRef(1);

  // Nasconde la tab bar quando il detail sheet è aperto.
  // Con position: absolute, display: 'none' non causa reflow di layout.
  // Collassa il list sheet al minimo così il detail sheet lo copre completamente,
  // e lo ripristina alla posizione precedente quando il detail si chiude.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selection.detailId ? { display: 'none' } : TAB_BAR_STYLE,
    });
    if (selection.detailId) {
      // Salva la posizione corrente e collassa
      const fraction = sheetFractionRef.current;
      const snaps = [0.18, 0.50, 0.85];
      const closest = snaps.reduce((best, sp, i) =>
        Math.abs(sp - fraction) < Math.abs(snaps[best] - fraction) ? i : best, 0);
      listSheetIndexBeforeDetail.current = closest;
      listSheetRef.current?.snapToIndex(0);
    } else {
      // Ripristina la posizione precedente
      listSheetRef.current?.snapToIndex(listSheetIndexBeforeDetail.current);
    }
  }, [selection.detailId, navigation]);

  // Regione corrente della mappa — usata per filtrare la lista coerentemente col viewport
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number;
  } | null>(null);

  // Scroll abilitato solo al massimo snap (85%) — altrimenti il body è draggabile
  const [listScrollEnabled, setListScrollEnabled] = useState(false);
  const collapseScrollRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // --- Bottom sheet fraction (UI concern, stays in screen) ---
  const sheetFractionRef = useRef(0.50);
  const getSheetFraction = useCallback(() => sheetFractionRef.current, []);
  const snapPoints = useMemo(() => [0.18, 0.50, 0.85], []);
  const handleSnapChange = useCallback((f: number) => {
    sheetFractionRef.current = f;
    setListScrollEnabled(f >= 0.8);
  }, []);

  // --- Hooks ---
  const geo = useRestaurantGeo({ forMyNeeds, filterAllergens, filterDiets, getSheetFraction });

  // Re-interroga quando il profilo cambia con forMyNeeds attivo.
  // filterAllergens/filterDiets nelle deps: l'effect 87-91 li aggiorna quando
  // dietaryNeeds cambia → questa effect si riattiva → profileJustChanged è true → reload.
  // Per cambi manuali nel modal, profileJustChanged è false → skip.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profileJustChanged.current) return;
    profileJustChanged.current = false;
    if (!forMyNeeds || !geo.userLocation) return;
    geo.clearAndReload();
  }, [filterAllergens, filterDiets, geo.clearAndReload]);

  const { mapRestaurants, distanceMap, filteredRestaurants } = useRestaurantList({
    restaurants: geo.restaurants,
    userLocation: geo.userLocation,
    activeFilters,
    searchQuery,
    sortBy,
    forMyNeeds,
    mapRegion: currentRegion,
  });


  const { favoriteIds, favoriteRestaurants, loadFavorites, toggleFavorite, syncFavoriteId } = useRestaurantFavorites(
    user?.uid,
  );

  useFocusEffect(useCallback(() => {
    loadFavorites();
    geo.refreshAllPins();
  }, [loadFavorites, geo.refreshAllPins]));

  const mapSearch = useMapSearch({ restaurants: geo.restaurants, userLocation: geo.userLocation });

  // Ref per lookup ristoranti senza destabilizzare il callback.
  // Usa geo.restaurants (cache completa) per trovare ristoranti anche fuori viewport.
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
    // Cerca nella cache completa, non solo in mapRestaurants (filtrata per viewport).
    const restaurant = allRestaurantsRef.current.find(r => r.id === id)
      ?? favoriteRestaurants.get(id);
    if (restaurant?.location) {
      geo.setCenterOn({
        latitude: restaurant.location.latitude,
        longitude: restaurant.location.longitude,
        sheetFraction: 0.55, // copertura attesa del detail sheet
      });
    }
  }, [geo.setCenterOn, favoriteRestaurants]);

  // Chiudi scheda dettaglio. I preferiti sono già sincronizzati in tempo reale
  // tramite syncFavoriteId nel callback onFavoriteToggled — non serve ricaricarli
  // dal DB (evita un re-render che congela il bitmap del pin prima che iOS lo catturi).
  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
  }, []);

  const handleListScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollPositionRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Scroll alla card selezionata dopo il re-render
  useEffect(() => {
    if (!selection.selectedId) return;
    const idx = filteredRestaurants.findIndex(r => r.id === selection.selectedId);
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  }, [selection.selectedId, filteredRestaurants]);

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
    // Evita che l'utente chiuda il modal pensando di aver salvato,
    // mentre badge e card resterebbero con i dati vecchi.
    const allergensMatch =
      filterAllergens.length === dietaryNeeds.allergens.length &&
      filterAllergens.every(a => dietaryNeeds.allergens.includes(a as any));
    const dietsMatch =
      filterDiets.length === (dietaryNeeds.diets ?? []).length &&
      filterDiets.every(d => (dietaryNeeds.diets ?? []).includes(d as any));

    if (!allergensMatch || !dietsMatch) {
      // Sync silenzioso → useDietarySync propaga a AppContext/Card/Home
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
    // La cache va svuotata perché i dati forMyNeeds hanno campi diversi (coverage metrics)
    await geo.clearAndReload();
  }, [isAuthenticated, filterHasNeeds, forMyNeeds, geo.clearAndReload, router]);

  const handleToggleFavorite = useCallback(async (restaurantId: string) => {
    if (!isAuthenticated || !user) { router.push('/auth/login'); return; }
    await toggleFavorite(restaurantId);
  }, [isAuthenticated, user, toggleFavorite, router]);

  const dismissAutocomplete = useCallback(() => {
    setSearchQuery('');
    mapSearch.clear();
    Keyboard.dismiss();
  }, [mapSearch.clear]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    mapSearch.search(text);
  }, [mapSearch.search]);

  const handleSelectRestaurant = useCallback((id: string, lat: number, lng: number) => {
    dismissAutocomplete();
    dispatch({ type: 'SELECT', id });
    geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: 0.55, latDelta: 0.01 });
  }, [dismissAutocomplete, geo.setCenterOn]);

  const handleSelectPlace = useCallback((lat: number, lng: number, placeType?: string) => {
    dismissAutocomplete();
    const latDelta =
      placeType === 'country' ? 12 :
      placeType === 'state' ? 3 :
      placeType === 'county' ? 0.5 :
      placeType === 'city' ? 0.08 :
      placeType === 'district' || placeType === 'locality' ? 0.03 :
      0.02;
    geo.setCenterOn({ latitude: lat, longitude: lng, sheetFraction: getSheetFraction(), latDelta });
  }, [dismissAutocomplete, geo.setCenterOn, getSheetFraction]);

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

  // --- Render ---
  const countLabel = geo.isLoading && geo.restaurants.length === 0
    ? null
    : filteredRestaurants.length === 0
      ? 'Nessun ristorante'
      : `${filteredRestaurants.length} ristorant${filteredRestaurants.length === 1 ? 'e' : 'i'}${
          geo.isGeoMode ? ' vicino a te' : ''
        }`;

  const sheetHeaderContent = (
    <View style={styles.sheetFilterRow}>
      <TouchableOpacity
        onPress={() => isAuthenticated ? handleOpenFilterModal() : router.push('/auth/login')}
        style={[styles.cuisineToggle, hasActiveSettings && styles.cuisineToggleActive]}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="tune-vertical"
          size={20}
          color={hasActiveSettings ? theme.colors.onPrimary : theme.colors.textSecondary}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleToggleMyNeeds}
        style={[styles.headerToggle, forMyNeeds && styles.headerToggleActive]}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="shield-check"
          size={18}
          color={forMyNeeds ? theme.colors.onPrimary : theme.colors.textSecondary}
        />
        <Text style={[styles.headerToggleText, forMyNeeds && styles.headerToggleTextActive]}>
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
        <MaterialCommunityIcons name="plus" size={16} color={theme.colors.onPrimary} />
        <Text style={styles.addButtonText}>Aggiungi</Text>
      </TouchableOpacity>
    </View>
  );

  const activeFiltersChips = activeFilters.length > 0 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll} style={styles.chipScrollContainer}>
      {activeFilters.map(id => (
        <TouchableOpacity key={id} style={styles.activeChip} onPress={() => toggleFilter(id)} activeOpacity={0.7}>
          <Text style={styles.activeChipText}>{getCuisineLabel(id, lang)}</Text>
          <MaterialCommunityIcons name="close-circle" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  ) : null;

  const renderBodyContent = () => {
    if (geo.isLoading && geo.restaurants.length === 0) {
      return (
        <View>
          {activeFiltersChips}
          <View style={[styles.centered, { paddingVertical: 40 }]}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        </View>
      );
    }

    if (filteredRestaurants.length === 0) {
      return (
        <View>
          {activeFiltersChips}
          <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.emptyTitle}>
            {searchQuery.length >= 2
              ? `Nessun risultato per "${searchQuery}"`
              : 'Nessun ristorante trovato'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.length >= 2
              ? 'Prova con un altro termine di ricerca'
              : geo.locationDenied
                ? 'Attiva la posizione nelle impostazioni per trovare ristoranti vicino a te, oppure cerca una città'
                : activeFilters.length > 0
                  ? 'Prova a rimuovere i filtri'
                  : 'Cerca una città per vedere i ristoranti vicini'}
          </Text>
          {searchQuery.length < 2 && (
            <Button mode="contained" onPress={handleAddPress} style={styles.emptyButton}>
              Aggiungi ristorante
            </Button>
          )}
          </View>
        </View>
      );
    }

    return (
      <NativeViewGestureHandler ref={collapseScrollRef}>
        <FlatList
          ref={listRef}
          data={filteredRestaurants}
          extraData={selection.selectedId}
          keyExtractor={r => r.id}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled={listScrollEnabled}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              {activeFiltersChips}
              {countLabel ? (
                <Text style={styles.listCountLabel}>{countLabel}</Text>
              ) : (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 8 }} />
              )}
            </View>
          }
          contentContainerStyle={[styles.list, { paddingBottom: screenHeight * 0.15 + 49 + insets.bottom }]}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }, 200);
          }}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              isFavorite={favoriteIds.has(item.id)}
              distance={distanceMap.get(item.id) ?? null}
              showMatchInfo={forMyNeeds}
              selected={selection.selectedId === item.id}
              onPress={handleOpenDetail}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        />
      </NativeViewGestureHandler>
    );
  };

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

      {/* Floating search bar + autocomplete — stesso parent per z-index affidabile */}
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

        {/* Autocomplete — dentro lo stesso parent della search bar, zIndex alto per coprire i pulsanti */}
        {searchQuery.length >= 2 && (mapSearch.results.length > 0 || mapSearch.isSearching) && (
          <View style={styles.autocompleteContainer}>
            <SearchAutocomplete
              results={mapSearch.results}
              isSearching={mapSearch.isSearching}
              onSelectRestaurant={handleSelectRestaurant}
              onSelectPlace={handleSelectPlace}
              onDismiss={dismissAutocomplete}
            />
          </View>
        )}
      </View>

      <DraggableBottomSheet
        ref={listSheetRef}
        snapPoints={snapPoints}
        initialIndex={1}
        headerContent={sheetHeaderContent}
        onSnapChange={handleSnapChange}
        bodyPanEnabled={!listScrollEnabled}
        collapseScrollRef={collapseScrollRef}
        scrollPositionRef={scrollPositionRef}
        pointerEvents={selection.detailId ? 'none' : undefined}
      >
        {renderBodyContent()}
      </DraggableBottomSheet>

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

  // --- Floating search bar ---
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

  // --- Autocomplete (dentro floatingSearchOverlay) ---
  autocompleteContainer: {
    marginTop: 4,
    marginHorizontal: 56,
    zIndex: 10,
    elevation: 10,
  },

  // --- Sheet header (filtri + chip + badge) ---
  sheetFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
  },
  cuisineToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuisineToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  headerToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  headerToggleTextActive: {
    color: theme.colors.onPrimary,
  },
  chipScrollContainer: {
    marginHorizontal: 12,
    marginBottom: 6,
  },
  chipScroll: {
    gap: 6,
    paddingRight: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}18`,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
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
    height: 38,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
  },
  addButtonImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  // --- List ---
  listCountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 10,
  },
});
