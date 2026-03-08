import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { RESTAURANT_CATEGORIES, CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import { RestaurantService, type SortBy } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';
import type { Restaurant } from '../../types/restaurants';
import RestaurantCard from '../../components/restaurants/RestaurantCard';
import RestaurantMap from '../../components/RestaurantMap';
import DraggableBottomSheet from '../../components/DraggableBottomSheet';
import ChipGrid from '../../components/ChipGrid';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import i18n from '../../utils/i18n';
import * as Location from 'expo-location';

/** Distanza in km tra due coordinate (formula haversine) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const lang = i18n.locale as AppLanguage;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RestaurantCategoryId[]>([]);
  const [sortBy, setSortBy] = useState<SortBy | 'distance'>('distance');
  const [showCuisineMenu, setShowCuisineMenu] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [centerOn, setCenterOn] = useState<{ latitude: number; longitude: number; sheetFraction: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  /** Regione corrente della mappa (aggiornata da onRegionChangeComplete) */
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  /** Centro dell'ultima query geo (per mostrare/nascondere "Cerca in quest'area") */
  const lastQueryCenter = useRef<{ latitude: number; longitude: number } | null>(null);
  /** true = l'ultimo caricamento era una geo-query, false = fallback globale */
  const [isGeoMode, setIsGeoMode] = useState(false);
  /** true dopo che l'utente sposta la mappa significativamente */
  const [showSearchArea, setShowSearchArea] = useState(false);
  /** true dopo tap "Cerca in quest'area" */
  const [isAreaSearch, setIsAreaSearch] = useState(false);

  // Snap minimo 0.18: mostra handle + search bar + contatore anche da chiuso
  const snapPoints = useMemo(() => [0.18, 0.60, 0.85], []);
  /** Frazione corrente dello sheet (ref per non triggerare re-render) */
  const sheetFractionRef = useRef(0.60);
  const handleSnapChange = useCallback((f: number) => { sheetFractionRef.current = f; }, []);

  // Al mount, centra la mappa sulla posizione dell'utente
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        setCenterOn({ ...coords, sheetFraction: sheetFractionRef.current });
      } catch {
        // GPS non disponibile — la mappa resta sulla vista default (Italia)
      }
    })();
  }, []);

  const toggleFilter = (id: RestaurantCategoryId) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const cuisineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cuisineAnim, {
      toValue: showCuisineMenu ? 1 : 0,
      duration: showCuisineMenu ? 250 : 150,
      useNativeDriver: false,
    }).start();
  }, [showCuisineMenu]);

  const SORT_OPTIONS: { key: SortBy | 'distance'; label: string }[] = [
    { key: 'distance', label: 'Distanza' },
    { key: 'recent', label: 'Recenti' },
    { key: 'rating', label: 'Stelle' },
    { key: 'popularity', label: 'Popolarità' },
  ];

  const hasActiveSettings = activeFilters.length > 0 || sortBy !== 'distance';

  /** Raggio usato nell'ultima query geo (per decidere quando mostrare "Cerca in quest'area") */
  const lastQueryRadius = useRef(50);

  /** Carica ristoranti: query singola a 50km, fallback globale se vuoto */
  const loadGeo = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    const RADIUS = 50;
    let results = await RestaurantService.getNearbyRestaurants(lat, lng, RADIUS);
    let geoMode = results.length > 0;
    if (results.length === 0) {
      // Fallback globale — raro con centinaia di ristoranti
      results = await RestaurantService.getAllActiveRestaurants();
      geoMode = false; // fallback globale, non "vicino a te"
    }
    setRestaurants(results);
    lastQueryCenter.current = { latitude: lat, longitude: lng };
    lastQueryRadius.current = RADIUS;
    setIsGeoMode(geoMode);
    setIsLoading(false);
  }, []);

  /** Fallback: carica tutti i ristoranti attivi (senza GPS) */
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    const results = await RestaurantService.getAllActiveRestaurants();
    setRestaurants(results);
    setIsGeoMode(false);
    setIsLoading(false);
  }, []);

  /** Tutti i ristoranti caricati (per i pin sulla mappa — nessun cap) */
  const mapRestaurants = useMemo(() => {
    // Filtri categorie e ricerca si applicano anche ai pin
    let list = restaurants;
    if (activeFilters.length > 0) {
      list = list.filter(r =>
        (r.categories ?? []).some(c => activeFilters.includes(c as RestaurantCategoryId)) ||
        (r.cuisineTypes ?? []).some(c => activeFilters.includes(c as RestaurantCategoryId))
      );
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [restaurants, searchQuery, activeFilters]);

  /** Lista con cap progressivo per distanza (per il bottom sheet) */
  const filteredRestaurants = useMemo(() => {
    let list = mapRestaurants;

    // Ordinamento
    if (sortBy === 'distance' && userLocation) {
      list = [...list].sort((a, b) =>
        haversineKm(userLocation.latitude, userLocation.longitude, a.location.latitude, a.location.longitude) -
        haversineKm(userLocation.latitude, userLocation.longitude, b.location.latitude, b.location.longitude)
      );
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    } else if (sortBy === 'popularity') {
      list = [...list].sort((a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0));
    }

    // Cap progressivo per distanza reale (solo caricamento iniziale, non "Cerca in quest'area")
    // Applica il cap sempre in base alla distanza, indipendentemente dall'ordinamento scelto
    if (!isAreaSearch && userLocation && list.length > 0) {
      const withDist = list.map(r => ({
        r,
        d: haversineKm(userLocation.latitude, userLocation.longitude, r.location.latitude, r.location.longitude),
      }));
      // Ordina per distanza per applicare il cap correttamente
      withDist.sort((a, b) => a.d - b.d);
      const capped: Restaurant[] = [];
      for (const { r, d } of withDist) {
        if (d <= 10) { capped.push(r); continue; }                        // ≤10km: tutti
        if (d <= 30 && capped.length < 50) { capped.push(r); continue; }  // 10-30km: max 50 totali
        if (d <= 50 && capped.length < 15) { capped.push(r); continue; }  // 30-50km: max 15 totali
        if (capped.length < 5) { capped.push(r); continue; }              // >50km: max 5 totali
      }
      // Riapplica l'ordinamento scelto dall'utente sui risultati cappati
      if (sortBy === 'distance') {
        list = capped; // già ordinati per distanza
      } else if (sortBy === 'rating') {
        list = capped.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
      } else if (sortBy === 'popularity') {
        list = capped.sort((a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0));
      } else {
        list = capped;
      }
    }

    return list;
  }, [mapRestaurants, sortBy, userLocation, isAreaSearch]);

  /** Mostra "Cerca in quest'area" quando il centro mappa esce dall'area già caricata */
  const handleRegionChange = useCallback((region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
    setMapRegion(region);
    if (lastQueryCenter.current) {
      const dist = haversineKm(
        lastQueryCenter.current.latitude, lastQueryCenter.current.longitude,
        region.latitude, region.longitude,
      );
      // Mostra il bottone quando il centro mappa esce dal raggio caricato
      setShowSearchArea(dist > lastQueryRadius.current * 0.7);
    }
  }, []);

  /** "Cerca in quest'area" — query diretta per la regione visibile, senza cap */
  const handleSearchArea = useCallback(async () => {
    if (!mapRegion) return;
    const radiusKm = Math.max(1, Math.min(100, (mapRegion.latitudeDelta * 111) / 2));
    setIsLoading(true);
    setShowSearchArea(false);
    setIsAreaSearch(true);
    const results = await RestaurantService.getNearbyRestaurants(
      mapRegion.latitude, mapRegion.longitude, radiusKm,
    );
    setRestaurants(results);
    lastQueryCenter.current = { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
    lastQueryRadius.current = radiusKm;
    setIsGeoMode(true);
    setIsLoading(false);
  }, [mapRegion]);

  // Carica i preferiti dell'utente
  const loadFavorites = useCallback(async () => {
    if (!user) { setFavoriteIds(new Set()); return; }
    const favs = await RestaurantService.getFavorites(user.uid);
    setFavoriteIds(new Set(favs.map(f => f.restaurantId)));
  }, [user]);

  // Carica ristoranti al primo GPS fix
  const hasLoadedGeo = useRef(false);
  useEffect(() => {
    if (userLocation && !hasLoadedGeo.current) {
      hasLoadedGeo.current = true;
      loadGeo(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation, loadGeo]);

  // Fallback: se dopo 3s non c'è GPS, carica tutti
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasLoadedGeo.current) {
        hasLoadedGeo.current = true;
        loadAll();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loadAll]);

  // Ricarica preferiti quando lo schermo torna in focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const handleAddPress = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      router.push('/restaurants/add');
    }
  };

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setIsLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setCenterOn({ ...coords, sheetFraction: sheetFractionRef.current });
      setIsAreaSearch(false);
      setShowSearchArea(false);
      await loadGeo(coords.latitude, coords.longitude);
    } catch {
      // GPS non disponibile
    }
    setIsLocating(false);
  }, [loadGeo]);

  const handleToggleFavorite = useCallback(async (restaurant: Restaurant) => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }
    const willBeFav = !favoriteIds.has(restaurant.googlePlaceId);
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (willBeFav) next.add(restaurant.googlePlaceId);
      else next.delete(restaurant.googlePlaceId);
      return next;
    });
    setRestaurants(prev => prev.map(r =>
      r.googlePlaceId === restaurant.googlePlaceId
        ? { ...r, favoriteCount: r.favoriteCount + (willBeFav ? 1 : -1) }
        : r
    ));
    const actual = await RestaurantService.toggleFavorite(user.uid, restaurant);
    // Rollback se il server non concorda
    if (actual !== willBeFav) {
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (actual) next.add(restaurant.googlePlaceId);
        else next.delete(restaurant.googlePlaceId);
        return next;
      });
      setRestaurants(prev => prev.map(r =>
        r.googlePlaceId === restaurant.googlePlaceId
          ? { ...r, favoriteCount: r.favoriteCount + (actual ? 1 : -1) }
          : r
      ));
    }
  }, [isAuthenticated, user, favoriteIds, router]);

  /** Ricerca per città: geocode → query geo centrata sulla città (senza fallback globale) */
  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.length < 2) return;
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length === 0) return; // geocoding fallito, resta il filtro locale
      const { latitude, longitude } = results[0];
      setCenterOn({ latitude, longitude, sheetFraction: sheetFractionRef.current });
      setIsAreaSearch(true);
      setShowSearchArea(false);
      // Query diretta — no fallback globale, l'utente ha scelto questa zona
      setIsLoading(true);
      const nearby = await RestaurantService.getNearbyRestaurants(latitude, longitude, 50);
      setRestaurants(nearby);
      lastQueryCenter.current = { latitude, longitude };
      lastQueryRadius.current = 50;
      setIsGeoMode(true);
      setIsLoading(false);
      // Svuota la query: il geocoding l'ha consumata, non serve filtrare ulteriormente
      setSearchQuery('');
    } catch {
      // Geocoding fallito — resta il filtro locale
    }
  }, [searchQuery]);

  const sheetHeaderContent = (
    <View>
      {/* Barra di ricerca + filtro */}
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
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setIsAreaSearch(false);
              if (userLocation) {
                setCenterOn({ ...userLocation, sheetFraction: sheetFractionRef.current });
                loadGeo(userLocation.latitude, userLocation.longitude);
              } else {
                setCenterOn(null);
              }
            }} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleLocateMe} hitSlop={8} disabled={isLocating}>
              {isLocating ? (
                <ActivityIndicator size={16} color={theme.colors.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowCuisineMenu(prev => !prev)}
          style={[styles.cuisineToggle, (showCuisineMenu || hasActiveSettings) && styles.cuisineToggleActive]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="tune-vertical"
            size={20}
            color={(showCuisineMenu || hasActiveSettings) ? '#FFFFFF' : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Contatore ristoranti */}
      <View style={styles.badgeRow}>
        {isLoading && restaurants.length === 0 ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.badgeText}>
            {filteredRestaurants.length === 0
              ? 'Nessun ristorante'
              : `${filteredRestaurants.length} ristorant${filteredRestaurants.length === 1 ? 'e' : 'i'}${
                  isAreaSearch ? ' in quest\'area' : isGeoMode ? ' vicino a te' : ''
                }`}
          </Text>
        )}
      </View>

      {/* Pannello filtri espandibile */}
      <Animated.View
        style={{
          maxHeight: cuisineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }),
          opacity: cuisineAnim,
          overflow: 'hidden',
        }}
        pointerEvents={showCuisineMenu ? 'auto' : 'none'}
      >
        <View style={styles.cuisinePanel}>
          <Text style={styles.cuisinePanelLabel}>Categorie</Text>
          <ChipGrid
            items={RESTAURANT_CATEGORIES}
            activeIds={activeFilters}
            onToggle={(id) => toggleFilter(id as RestaurantCategoryId)}
            lang={lang}
          />
          <Text style={styles.cuisinePanelLabel}>Tipo di cucina</Text>
          <ChipGrid
            items={CUISINE_CATEGORIES}
            activeIds={activeFilters}
            onToggle={(id) => toggleFilter(id as RestaurantCategoryId)}
            lang={lang}
          />
          <Text style={styles.cuisinePanelLabel}>Ordina per</Text>
          {SORT_OPTIONS.map(opt => {
            const isActive = sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(opt.key as SortBy | 'distance')}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {hasActiveSettings && (
            <TouchableOpacity
              onPress={() => {
                setActiveFilters([]);
                setSortBy('distance');
                setShowCuisineMenu(false);
              }}
              style={styles.resetButton}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Resetta filtri</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );

  const renderBodyContent = () => {
    if (isLoading && restaurants.length === 0) {
      return (
        <View style={[styles.centered, { paddingVertical: 40 }]}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      );
    }

    if (filteredRestaurants.length === 0) {
      return (
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.emptyIcon}>🍽️</Text>
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
        data={filteredRestaurants}
        keyExtractor={r => r.googlePlaceId}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            isFavorite={favoriteIds.has(item.googlePlaceId)}
            distance={userLocation ? haversineKm(
              userLocation.latitude, userLocation.longitude,
              item.location.latitude, item.location.longitude,
            ) : null}
            onPress={() => router.push(`/restaurants/${item.googlePlaceId}`)}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        )}
        ListFooterComponent={null}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header personalizzato */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Ristoranti</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => isAuthenticated ? router.push('/restaurants/favorites') : router.push('/auth/login')}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/restaurants/profile')}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons
              name={isAuthenticated ? 'account-circle' : 'account-circle-outline'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mappa full-screen dietro il bottom sheet */}
      <View style={styles.mapContainer}>
        <RestaurantMap
          restaurants={mapRestaurants}
          centerOn={centerOn}
          onRegionChangeComplete={handleRegionChange}
        />
        {/* Bottone "Cerca in quest'area" */}
        {showSearchArea && (
          <TouchableOpacity
            style={styles.searchAreaButton}
            onPress={handleSearchArea}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="magnify" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.searchAreaText}>Cerca in quest'area</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Sheet draggabile custom */}
      <DraggableBottomSheet
        snapPoints={snapPoints}
        initialIndex={1}
        headerContent={sheetHeaderContent}
        onSnapChange={handleSnapChange}
      >
        {renderBodyContent()}
      </DraggableBottomSheet>

      {/* FAB aggiungi */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={handleAddPress}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
    color: '#FFFFFF',
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
  },
  badgeText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
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
  cuisinePanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  cuisinePanelLabel: {
    width: '100%',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resetButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.error ?? '#D32F2F',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
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
