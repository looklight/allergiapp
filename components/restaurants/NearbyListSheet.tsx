import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, BackHandler, Platform, TouchableOpacity, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import { theme } from '../../constants/theme';
import { getCuisineLabel } from '../../constants/restaurantCategories';
import i18n from '../../utils/i18n';
import { haversineKm } from '../../utils/geo';
import DraggableBottomSheet, { type DraggableBottomSheetRef } from '../DraggableBottomSheet';
import type { NearbyPlace } from '../../hooks/useMapSearch';
import type { Restaurant } from '../../services/restaurantService';

const SNAP_POINTS = [0, 0.55, 0.92];

type SortKey = 'distance' | 'rating' | 'popularity' | 'compatibility';
const SORT_OPTIONS: { key: SortKey; label: string; icon: string; requiresMatchInfo?: boolean }[] = [
  { key: 'compatibility', label: 'Compatibilità', icon: 'shield-check', requiresMatchInfo: true },
  { key: 'popularity', label: 'Popolarità', icon: 'comment-multiple' },
  { key: 'rating', label: 'Valutazione', icon: 'star' },
  { key: 'distance', label: 'Distanza da me', icon: 'map-marker-distance' },
];

type Props = {
  place: NearbyPlace;
  results: Restaurant[];
  isLoading: boolean;
  showMatchInfo: boolean;
  hasActiveFilters: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  onSelectRestaurant: (id: string) => void;
  onClose: () => void;
  onAddPress?: () => void;
};

/** Badge compatto per la compatibilità con le esigenze dell'utente. */
function MatchBadge({ restaurant }: { restaurant: Restaurant }) {
  const coveredTotal = (restaurant.covered_allergen_count ?? 0) + (restaurant.covered_dietary_count ?? 0);
  const inferredTotal = (restaurant.inferred_allergen_count ?? 0) + (restaurant.inferred_dietary_count ?? 0);
  const directTotal = coveredTotal - inferredTotal;
  const filtersTotal = (restaurant.total_allergen_filters ?? 0) + (restaurant.total_dietary_filters ?? 0);

  if (filtersTotal === 0) return null;

  const full = coveredTotal >= filtersTotal;
  const none = coveredTotal === 0;
  const color = full ? theme.colors.success : none ? theme.colors.textDisabled : theme.colors.amberDark;
  const bg = full ? theme.colors.primaryLight : none ? '#EEEEEE' : theme.colors.amberLight;

  return (
    <View style={[styles.matchBadge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name="shield-check" size={11} color={color} />
      <Text style={[styles.matchBadgeText, { color }]}>
        {inferredTotal > 0 ? (
          <>{directTotal > 0 ? directTotal : ''}<Text style={{ color: theme.colors.amberDark, fontWeight: '700' }}>+{inferredTotal}</Text> /{filtersTotal}</>
        ) : `${coveredTotal}/${filtersTotal}`}
      </Text>
    </View>
  );
}

export default function NearbyListSheet({
  place,
  results,
  isLoading,
  showMatchInfo,
  hasActiveFilters,
  userLocation,
  onSelectRestaurant,
  onClose,
  onAddPress,
}: Props) {
  const sheetRef = useRef<DraggableBottomSheetRef>(null);
  const [bodyScrollEnabled, setBodyScrollEnabled] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>(showMatchInfo ? 'compatibility' : userLocation ? 'distance' : 'rating');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const collapseScrollRef = useRef(null);
  const scrollPositionRef = useRef(0);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleSnapChange = useCallback((fraction: number) => {
    if (fraction < 0.1) {
      onClose();
      return;
    }
    setBodyScrollEnabled(fraction >= 0.9);
  }, [onClose]);

  const handleBodyScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollPositionRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  const sortedResults = useMemo(() => {
    const list = [...results];
    switch (sortBy) {
      case 'rating':
        return list.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
      case 'popularity':
        return list.sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0));
      case 'compatibility': {
        const score = (r: Restaurant) => {
          const total = (r.total_allergen_filters ?? 0) + (r.total_dietary_filters ?? 0);
          if (total === 0) return -1;
          const covered = (r.covered_allergen_count ?? 0) + (r.covered_dietary_count ?? 0);
          return covered / total;
        };
        return list.sort((a, b) => score(b) - score(a));
      }
      case 'distance':
      default:
        if (!userLocation) return list;
        const distOf = (r: Restaurant) =>
          r.location
            ? haversineKm(userLocation.latitude, userLocation.longitude, r.location.latitude, r.location.longitude)
            : Infinity;
        return list.sort((a, b) => distOf(a) - distOf(b));
    }
  }, [results, sortBy, userLocation]);

  const availableSortOptions = useMemo(
    () => SORT_OPTIONS.filter(o =>
      (o.key !== 'distance' || userLocation !== null) &&
      (!o.requiresMatchInfo || showMatchInfo),
    ),
    [userLocation, showMatchInfo],
  );

  // Android back chiude lo sheet
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => sub.remove();
  }, [handleDismiss]);

  const header = (
    <View style={styles.header}>
      <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Ristoranti a {place.name}
        </Text>
        {!isLoading && (
          <Text style={styles.headerSubtitle}>
            {results.length === 0
              ? hasActiveFilters ? 'Nessun risultato con i filtri attivi' : 'Nessun ristorante in zona'
              : `${results.length} ${results.length === 1 ? 'trovato' : 'trovati'}`}
          </Text>
        )}
      </View>
      {results.length > 1 && !isLoading && (
        <TouchableOpacity
          onPress={() => setShowSortMenu(v => !v)}
          hitSlop={8}
          style={styles.sortBtn}
        >
          <MaterialCommunityIcons name="sort-variant" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {onAddPress && !isLoading && (
        <TouchableOpacity onPress={onAddPress} hitSlop={8} style={styles.sortBtn}>
          <MaterialCommunityIcons name="plus" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
        <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <DraggableBottomSheet
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      initialIndex={1}
      enterFromBottom
      headerContent={header}
      onSnapChange={handleSnapChange}
      bodyPanEnabled={!bodyScrollEnabled}
      collapseScrollRef={collapseScrollRef}
      scrollPositionRef={scrollPositionRef}
      style={styles.sheet}
    >
      <View style={styles.bodyWrap}>
        {showSortMenu && (
          <>
            <Pressable
              style={styles.sortBackdrop}
              onPress={() => setShowSortMenu(false)}
            />
            <View style={styles.sortMenu}>
              {availableSortOptions.map((opt, i) => {
                const active = opt.key === sortBy;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortMenuItem,
                      active && styles.sortMenuItemActive,
                      i > 0 && styles.sortMenuItemDivider,
                    ]}
                    onPress={() => {
                      setSortBy(opt.key);
                      setShowSortMenu(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={16}
                      color={active ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[
                      styles.sortMenuItemText,
                      active && styles.sortMenuItemTextActive,
                    ]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <MaterialCommunityIcons name="check" size={16} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {hasActiveFilters
              ? `Nessun ristorante a ${place.name} corrisponde ai filtri selezionati. Prova a modificarli.`
              : `Nessun ristorante trovato nelle vicinanze di ${place.name}.`}
          </Text>
          {onAddPress && (
            <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.addBtnText}>Aggiungi un ristorante</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <NativeViewGestureHandler ref={collapseScrollRef}>
          <FlatList
            data={sortedResults}
            keyExtractor={r => r.id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            scrollEnabled={bodyScrollEnabled}
            onScroll={handleBodyScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={onAddPress ? (
              <TouchableOpacity style={styles.addFooter} onPress={onAddPress} activeOpacity={0.7}>
                <MaterialCommunityIcons name="plus-circle-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.addFooterText}>Manca un ristorante? Aggiungilo</Text>
              </TouchableOpacity>
            ) : null}
            renderItem={({ item }) => {
              const cuisineLabels = (item.cuisine_types ?? [])
                .slice(0, 3)
                .map(id => getCuisineLabel(id, i18n.locale));
              const reviewCount = item.review_count ?? 0;
              const rating = item.average_rating ?? 0;
              const hasReviews = reviewCount > 0 && rating > 0;
              const distanceKm = sortBy === 'distance' && userLocation && item.location
                ? haversineKm(userLocation.latitude, userLocation.longitude, item.location.latitude, item.location.longitude)
                : null;
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onSelectRestaurant(item.id)}
                  activeOpacity={0.6}
                >
                  <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={theme.colors.primary} style={styles.rowIcon} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.rowMeta}>
                      {hasReviews ? (
                        <View style={styles.ratingInline}>
                          <MaterialCommunityIcons name="star" size={13} color={theme.colors.starFilled} />
                          <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                          <Text style={styles.reviewCount}>({reviewCount})</Text>
                        </View>
                      ) : (
                        <Text style={styles.reviewCount}>Nessuna recensione</Text>
                      )}
                      {distanceKm !== null && (
                        <Text style={styles.distance}>
                          · {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                        </Text>
                      )}
                      {cuisineLabels.length > 0 ? (
                        cuisineLabels.map((label, i) => (
                          <View key={i} style={styles.cuisineBadge}>
                            <Text style={styles.cuisineBadgeText} numberOfLines={1}>{label}</Text>
                          </View>
                        ))
                      ) : (
                        // Placeholder invisibile quando non ci sono cucine → mantiene altezza row costante.
                        <View style={[styles.cuisineBadge, styles.cuisineBadgeEmpty]}>
                          <Text style={styles.cuisineBadgeText}> </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {showMatchInfo && <MatchBadge restaurant={item} />}
                </TouchableOpacity>
              );
            }}
          />
        </NativeViewGestureHandler>
      )}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  sortBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyWrap: {
    flex: 1,
  },
  sortBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  sortMenu: {
    position: 'absolute',
    top: 6,
    right: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 20,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sortMenuItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  sortMenuItemActive: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  sortMenuItemText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  sortMenuItemTextActive: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  centered: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 80,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginLeft: 46,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    maxWidth: '100%',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewCount: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  distance: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.info,
    marginLeft: -2,
  },
  cuisineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.primary}14`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 180,
  },
  cuisineBadgeEmpty: {
    backgroundColor: 'transparent',
  },
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  addFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  addFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
