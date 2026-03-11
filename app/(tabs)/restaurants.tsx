import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Keyboard } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { type SortBy } from '../../services/restaurantService';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import RestaurantCard from '../../components/restaurants/RestaurantCard';
import RestaurantMap from '../../components/RestaurantMap';
import DraggableBottomSheet from '../../components/DraggableBottomSheet';
import FilterModal from '../../components/restaurants/FilterModal';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import i18n from '../../utils/i18n';
import { useRestaurantGeo } from '../../hooks/useRestaurantGeo';
import { useRestaurantList } from '../../hooks/useRestaurantList';
import { useRestaurantFavorites } from '../../hooks/useRestaurantFavorites';
import { storage } from '../../utils/storage';

export default function RestaurantsScreen() {
  const router = useRouter();
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

  useEffect(() => {
    if (!forMyNeeds) {
      setFilterAllergens([...dietaryNeeds.allergens]);
      setFilterDiets([...(dietaryNeeds.diets ?? [])]);
    }
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
  const hasActiveSettings = activeFilters.length > 0 || sortBy !== 'distance' || forMyNeeds;

  // --- Selection state (marker ↔ list sync) ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  // --- Bottom sheet fraction (UI concern, stays in screen) ---
  const sheetFractionRef = useRef(0.60);
  const getSheetFraction = useCallback(() => sheetFractionRef.current, []);
  const handleSnapChange = useCallback((f: number) => { sheetFractionRef.current = f; }, []);
  const snapPoints = useMemo(() => [0.18, 0.60, 0.85], []);

  // --- Hooks ---
  const geo = useRestaurantGeo({ forMyNeeds, filterAllergens, filterDiets, getSheetFraction });

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

  // Scroll alla card selezionata dopo il re-render
  useEffect(() => {
    if (!selectedId) return;
    const idx = filteredRestaurants.findIndex(r => r.id === selectedId);
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  }, [selectedId, filteredRestaurants]);

  // --- Handlers ---
  const toggleFilter = useCallback((id: RestaurantCategoryId) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleAddPress = () => {
    if (!isAuthenticated) router.push('/auth/login');
    else router.push('/restaurants/add');
  };

  const handleCloseFilterModal = useCallback(() => setShowFilterModal(false), []);

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

  const handleMarkerSelect = useCallback((id: string) => {
    Keyboard.dismiss();
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedId(null);
    Keyboard.dismiss();
  }, []);

  const handleRegionChange = useCallback((region: Parameters<typeof geo.handleRegionChange>[0]) => {
    setSelectedId(null);
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
          onPress={() => isAuthenticated ? setShowFilterModal(true) : router.push('/auth/login')}
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
              : activeFilters.length > 0
                ? 'Prova a rimuovere i filtri'
                : 'Sii il primo ad aggiungerne uno!'}
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
        extraData={selectedId}
        keyExtractor={r => r.id}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
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
            selected={selectedId === item.id}
            onPress={() => router.push(`/restaurants/${item.id}`)}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
          />
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Ristoranti</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/leaderboard')} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="trophy" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/restaurants/profile')} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons
              name={isAuthenticated ? 'account-circle' : 'account-circle-outline'}
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <RestaurantMap
          restaurants={mapRestaurants}
          centerOn={geo.centerOn}
          hasUserLocation={!!geo.userLocation}
          onRegionChangeComplete={handleRegionChange}
          selectedId={selectedId}
          onMarkerSelect={handleMarkerSelect}
          onDeselect={handleDeselect}
        />
        {geo.showSearchArea && (
          <TouchableOpacity
            style={styles.searchAreaButton}
            onPress={geo.handleSearchArea}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.searchAreaText}>{i18n.t('map.searchArea')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <DraggableBottomSheet
        snapPoints={snapPoints}
        initialIndex={1}
        headerContent={sheetHeaderContent}
        onSnapChange={handleSnapChange}
      >
        {renderBodyContent()}
      </DraggableBottomSheet>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={handleAddPress}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onPrimary} />
      </TouchableOpacity>

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
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  searchAreaText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
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
