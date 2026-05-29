import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { getMyRestaurants, type MyRestaurantItem } from '../../services/myRestaurantsService';
import { useUserItemList } from '../../hooks/useUserItemList';
import { useLocationFilters } from '../../hooks/useLocationFilters';
import AppHeader from '../components/AppHeader';
import EmptyStateCard from '../../components/EmptyStateCard';
import CountryFilterChips from '../../components/CountryFilterChips';
import MyRestaurantCard from '../components/my-restaurants/MyRestaurantCard';
import MyRestaurantsMap from '../components/my-restaurants/MyRestaurantsMap';
import RestaurantDetailSheet from '../../components/restaurants/RestaurantDetailSheet';
import i18n from '../../utils/i18n';

type KindFilter = 'all' | 'favorites' | 'reviewed';
type ViewMode = 'list' | 'map';

const getLocation = (r: MyRestaurantItem) => ({
  city: r.city,
  country: r.country,
  countryCode: r.country_code,
});

export default function MyRestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, isLoading, reload } = useUserItemList<MyRestaurantItem>(getMyRestaurants);
  const [kind, setKind] = useState<KindFilter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [countryExpanded, setCountryExpanded] = useState(false);

  const { countryOptions, selectedCountry, setSelectedCountry, filteredItems } =
    useLocationFilters(items, getLocation);

  const counts = useMemo(() => ({
    all: items.length,
    favorites: items.filter(r => r.is_favorite).length,
    reviewed: items.filter(r => r.my_rating != null).length,
  }), [items]);

  const visible = useMemo(() => {
    if (kind === 'favorites') return filteredItems.filter(r => r.is_favorite);
    if (kind === 'reviewed') return filteredItems.filter(r => r.my_rating != null);
    return filteredItems;
  }, [filteredItems, kind]);

  const kindOptions: { key: KindFilter; label: string; count: number }[] = [
    { key: 'all', label: i18n.t('restaurants.myRestaurants.filterAll'), count: counts.all },
    { key: 'favorites', label: i18n.t('restaurants.myRestaurants.filterFavorites'), count: counts.favorites },
    { key: 'reviewed', label: i18n.t('restaurants.myRestaurants.filterReviewed'), count: counts.reviewed },
  ];

  const openDetail = (id: string) => setDetailId(id);

  // Alla chiusura ricarica: l'utente può aver tolto un preferito o aggiunto una
  // recensione dallo sheet. La guardia isLoading sotto evita il flash dello spinner.
  const handleCloseDetail = () => {
    setDetailId(null);
    reload();
  };

  const controls = (
    <View style={styles.controls}>
      <View style={styles.toggleRow}>
        <ViewToggleButton
          icon="format-list-bulleted"
          label={i18n.t('restaurants.myRestaurants.viewList')}
          active={view === 'list'}
          onPress={() => setView('list')}
        />
        <ViewToggleButton
          icon="map-outline"
          label={i18n.t('restaurants.myRestaurants.viewMap')}
          active={view === 'map'}
          onPress={() => setView('map')}
        />
      </View>

      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.kindScroll}
          contentContainerStyle={styles.kindRow}
        >
          {kindOptions.map(opt => {
            const active = kind === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setKind(opt.key)}
                activeOpacity={0.7}
                style={[styles.kindChip, active && styles.kindChipActive]}
              >
                <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                  {opt.label} {opt.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {countryOptions.length >= 2 && (
          <TouchableOpacity
            onPress={() => setCountryExpanded(v => !v)}
            activeOpacity={0.7}
            style={[styles.countryButton, selectedCountry !== null && styles.countryButtonActive]}
          >
            <MaterialCommunityIcons
              name="earth"
              size={15}
              color={selectedCountry !== null ? theme.colors.onPrimary : theme.colors.textSecondary}
            />
            <Text
              style={[styles.countryLabel, selectedCountry !== null && styles.countryLabelActive]}
              numberOfLines={1}
            >
              {countryOptions.find(o => o.key === selectedCountry)?.name ?? i18n.t('restaurants.myRestaurants.filterCountry')}
            </Text>
            <MaterialCommunityIcons
              name={countryExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={selectedCountry !== null ? theme.colors.onPrimary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {countryExpanded && (
        <CountryFilterChips
          options={countryOptions}
          selected={selectedCountry}
          onSelect={setSelectedCountry}
          edgeBleed={12}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={i18n.t('restaurants.myRestaurants.title')} />

      {isLoading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <EmptyStateCard
          icon="📒"
          title={i18n.t('restaurants.myRestaurants.emptyTitle')}
          subtitle={i18n.t('restaurants.myRestaurants.emptySubtitle')}
          buttonLabel={i18n.t('restaurants.myRestaurants.emptyButton')}
          onPress={() => router.back()}
        />
      ) : (
        <>
          {controls}
          {view === 'list' ? (
            <FlatList
              data={visible}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
              renderItem={({ item }) => (
                <MyRestaurantCard item={item} onPress={() => openDetail(item.id)} />
              )}
            />
          ) : (
            <MyRestaurantsMap items={visible} onSelect={openDetail} />
          )}
        </>
      )}

      {detailId && (
        <RestaurantDetailSheet
          restaurantId={detailId}
          onClose={handleCloseDetail}
        />
      )}
    </View>
  );
}

function ViewToggleButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
      />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  controls: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.onPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kindScroll: {
    flex: 1,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  countryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  countryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  countryLabelActive: {
    color: theme.colors.onPrimary,
  },
  kindRow: {
    gap: 6,
    alignItems: 'center',
  },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  kindChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}14`,
  },
  kindChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  kindChipTextActive: {
    color: theme.colors.primary,
  },
});
