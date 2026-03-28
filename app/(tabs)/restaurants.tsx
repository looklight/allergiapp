import { useState, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { type SortBy, type Restaurant } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantCard from '../../components/restaurants/RestaurantCard';
import RestaurantMap from '../../components/RestaurantMap';
import DraggableBottomSheet, { type DraggableBottomSheetRef } from '../../components/DraggableBottomSheet';
import FilterModal from '../../components/restaurants/FilterModal';
import RestaurantDetailSheet from '../../components/restaurants/RestaurantDetailSheet';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import i18n from '../../utils/i18n';
import { useRestaurantGeo } from '../../hooks/useRestaurantGeo';
import { useRestaurantList } from '../../hooks/useRestaurantList';
import { useRestaurantFavorites } from '../../hooks/useRestaurantFavorites';
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
      return { selectedId: null, detailId: null };
    case 'DESELECT':
      if (state.detailId) return state; // bilateralità: non deselezionare se detail aperto
      return { ...state, selectedId: null };
    default:
      return state;
  }
}

const INITIAL_SELECTION: SelectionState = { selectedId: null, detailId: null };

const TAB_BAR_STYLE = {
  backgroundColor: theme.colors.surface,
  borderTopColor: theme.colors.divider,
  borderTopWidth: 1,
} as const;

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
  const listRef = useRef<FlatList>(null);
  const listSheetRef = useRef<DraggableBottomSheetRef>(null);

  // Hide tab bar when detail sheet is open so the sheet can cover the full bottom area.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selection.detailId ? { display: 'none' } : TAB_BAR_STYLE,
    });
  }, [selection.detailId, navigation]);

  // Snap list sheet down when detail opens, restore when detail closes
  useEffect(() => {
    if (selection.detailId) {
      listSheetRef.current?.snapToIndex(0);
    } else {
      listSheetRef.current?.snapToIndex(1);
    }
  }, [selection.detailId]);

  // --- Bottom sheet fraction (UI concern, stays in screen) ---
  const sheetFractionRef = useRef(0.50);
  const getSheetFraction = useCallback(() => sheetFractionRef.current, []);
  const handleSnapChange = useCallback((f: number) => { sheetFractionRef.current = f; }, []);
  const snapPoints = useMemo(() => [0.18, 0.50, 0.85], []);

  // --- Hooks ---
  const geo = useRestaurantGeo({ forMyNeeds, filterAllergens, filterDiets, getSheetFraction });

  // Re-interroga quando il profilo cambia con forMyNeeds attivo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profileJustChanged.current) return;
    profileJustChanged.current = false;
    if (!forMyNeeds || !geo.userLocation) return;
    geo.loadForMyNeeds(geo.userLocation.latitude, geo.userLocation.longitude);
  }, [geo.loadForMyNeeds]);

  const { mapRestaurants, distanceMap, filteredRestaurants } = useRestaurantList({
    restaurants: geo.restaurants,
    userLocation: geo.userLocation,
    activeFilters,
    searchQuery,
    sortBy,
    isAreaSearch: geo.isAreaSearch,
    forMyNeeds,
  });

  const { favoriteIds, loadFavorites, toggleFavorite } = useRestaurantFavorites(
    user?.uid,
    geo.updateRestaurant,
  );

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  // Ref per lookup ristoranti senza destabilizzare il callback
  const mapRestaurantsRef = useRef(mapRestaurants);
  mapRestaurantsRef.current = mapRestaurants;

  const handleOpenDetail = useCallback((id: string) => {
    dispatch({ type: 'SELECT', id });
    Keyboard.dismiss();
    // Centra la mappa sul ristorante selezionato (mantiene zoom corrente)
    const restaurant = mapRestaurantsRef.current.find(r => r.id === id);
    if (restaurant?.location) {
      geo.setCenterOn({
        latitude: restaurant.location.latitude,
        longitude: restaurant.location.longitude,
        sheetFraction: 0.55, // copertura attesa del detail sheet
      });
    }
  }, [geo.setCenterOn]);

  // Sincronizza cuore nella lista quando la detail sheet si chiude
  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
    loadFavorites();
  }, [loadFavorites]);

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

  const handleCloseFilterModal = useCallback(() => {
    setShowFilterModal(false);
    if (filterChangedInModal.current && forMyNeeds && geo.userLocation) {
      filterChangedInModal.current = false;
      geo.loadForMyNeeds(geo.userLocation.latitude, geo.userLocation.longitude);
    }
  }, [forMyNeeds, geo.userLocation, geo.loadForMyNeeds]);

  const handleSyncProfile = useCallback(async (a: string[], d: string[]) => {
    if (!user) return;
    await AuthService.updateDietaryNeeds(user.uid, { allergens: a, diets: d });
    await refreshProfile();
  }, [user, refreshProfile]);

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
    if (newValue) {
      if (geo.userLocation) await geo.loadForMyNeeds(geo.userLocation.latitude, geo.userLocation.longitude);
    } else {
      if (geo.userLocation) await geo.loadGeo(geo.userLocation.latitude, geo.userLocation.longitude);
      else await geo.loadAll();
    }
  }, [isAuthenticated, filterHasNeeds, forMyNeeds, geo.userLocation, geo.loadForMyNeeds, geo.loadGeo, geo.loadAll, router]);

  const handleToggleFavorite = useCallback(async (restaurantId: string) => {
    if (!isAuthenticated || !user) { router.push('/auth/login'); return; }
    await toggleFavorite(restaurantId);
  }, [isAuthenticated, user, toggleFavorite, router]);

  const handleSearchSubmit = useCallback(async () => {
    const found = await geo.searchByCity(searchQuery);
    if (found) {
      setSearchQuery('');
    } else if (searchQuery.length >= 2) {
      Alert.alert(i18n.t('app.errorTitle'), i18n.t('map.noGeocodingResults'));
    }
  }, [searchQuery, geo.searchByCity]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    geo.resetToUserLocation();
  }, [geo.resetToUserLocation]);

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
    setSortBy('distance');
    if (forMyNeeds) {
      setForMyNeeds(false);
      storage.setForMyNeeds(false);
      if (geo.userLocation) await geo.loadGeo(geo.userLocation.latitude, geo.userLocation.longitude);
      else await geo.loadAll();
    }
    setShowFilterModal(false);
  }, [forMyNeeds, geo.userLocation, geo.loadGeo, geo.loadAll]);

  // --- Render ---
  const sheetHeaderContent = (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca ristorante o città..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={8}>
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
      </View>

      <View style={styles.badgeRow}>
        {geo.isLoading && geo.restaurants.length === 0 ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.badgeText}>
            {filteredRestaurants.length === 0
              ? 'Nessun ristorante'
              : `${filteredRestaurants.length} ristorant${filteredRestaurants.length === 1 ? 'e' : 'i'}${
                  geo.isAreaSearch ? ' in quest\'area' : geo.isGeoMode ? ' vicino a te' : ''
                }`}
          </Text>
        )}
      </View>
    </View>
  );

  const renderBodyContent = () => {
    if (geo.isLoading && geo.restaurants.length === 0) {
      return (
        <View style={[styles.centered, { paddingVertical: 40 }]}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      );
    }

    if (filteredRestaurants.length === 0) {
      return (
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
      );
    }

    return (
      <FlatList
        ref={listRef}
        data={filteredRestaurants}
        extraData={selection.selectedId}
        keyExtractor={r => r.id}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
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
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mapContainer}>
        <RestaurantMap
          restaurants={mapRestaurants}
          centerOn={geo.centerOn}
          hasUserLocation={!!geo.userLocation}
          onRegionChangeComplete={handleRegionChange}
          selectedId={selection.selectedId}
          onDeselect={handleDeselect}
          showMatchInfo={forMyNeeds}
          onRestaurantPress={handleOpenDetail}
        />
        {geo.showSearchArea && (
          <TouchableOpacity
            style={[styles.searchAreaButton, { top: insets.top + 6 }]}
            onPress={geo.handleSearchArea}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.searchAreaText}>{i18n.t('map.searchArea')}</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.mapOverlayActions, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.mapOverlayButton} onPress={() => router.push('/restaurants/profile')} activeOpacity={0.85}>
            <MaterialCommunityIcons
              name={isAuthenticated ? 'account-circle' : 'account-circle-outline'}
              size={22}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapOverlayButton} onPress={() => router.push('/leaderboard')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="trophy" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <DraggableBottomSheet
        ref={listSheetRef}
        snapPoints={snapPoints}
        initialIndex={1}
        headerContent={sheetHeaderContent}
        onSnapChange={handleSnapChange}
      >
        {renderBodyContent()}
      </DraggableBottomSheet>

      {selection.detailId && (
        <RestaurantDetailSheet
          restaurantId={selection.detailId}
          onClose={handleCloseDetail}
          onFavoriteToggled={(id, delta) => geo.updateRestaurant(id, r => ({
            ...r,
            favorite_count: (r.favorite_count ?? 0) + delta,
          }))}
        />
      )}

      {!selection.detailId && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          onPress={handleAddPress}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
        </TouchableOpacity>
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
  },
  mapContainer: {
    flex: 1,
  },
  mapOverlayActions: {
    position: 'absolute',
    right: 12,
    flexDirection: 'column',
    gap: 10,
  },
  mapOverlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
    gap: 10,
  },
  badgeText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  cuisineToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  list: {
    padding: 12,
    gap: 10,
  },
  searchAreaButton: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    opacity: 0.95,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 10,
  },
  searchAreaText: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20,
  },
});
