import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import Avatar from '../components/Avatar';
import i18n from '../utils/i18n';
import { getDisplayName } from '../utils/getDisplayName';
import { RestaurantService, type LeaderboardEntry } from '../services/restaurantService';
import { searchUsers, type UserSearchResult } from '../services/userSearchService';
import AppHeader from './components/AppHeader';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

type Tab = 'reviews' | 'likes';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

function RankBadge({ rank }: { rank: number }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (rank <= 3) {
    return (
      <View style={[styles.medalBadge, { backgroundColor: MEDAL_COLORS[rank - 1] }]}>
        <Text style={styles.medalText}>{rank}</Text>
      </View>
    );
  }
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

function LeaderboardRow({ entry, rank, onPress }: { entry: LeaderboardEntry; rank: number; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const name = getDisplayName(entry);
  const displayName = name || i18n.t('leaderboard.anonymous');
  return (
    <TouchableOpacity
      style={[styles.row, rank <= 3 && styles.topRow]}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={displayName ?? undefined}
    >
      <RankBadge rank={rank} />
      <View style={styles.avatarSlot}>
        <Avatar
          avatarId={entry.avatar_url}
          initial={name ?? undefined}
          size="md"
          backgroundColor={theme.colors.primaryContainer}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
      </View>
      <Text style={styles.rowCount}>{entry.count}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textDisabled}
        style={styles.rowChevron}
      />
    </TouchableOpacity>
  );
}

/** Pagina Community: ricerca utenti in alto + classifiche sotto (ex Classifiche). */
export default function CommunityScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('reviews');
  const [topReviewers, setTopReviewers] = useState<LeaderboardEntry[]>([]);
  const [topLiked, setTopLiked] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Ricerca utenti ────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Epoch anti-race: una risposta lenta di una query vecchia non deve
  // sovrascrivere i risultati della query corrente.
  const searchEpoch = useRef(0);
  const trimmedQuery = query.trim();
  const isSearchMode = trimmedQuery.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const epoch = ++searchEpoch.current;
    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const found = await searchUsers(trimmedQuery);
        if (epoch !== searchEpoch.current) return;
        setResults(found);
      } catch (err) {
        console.warn('[Community] ricerca fallita:', err);
        if (epoch === searchEpoch.current) setResults([]);
      } finally {
        if (epoch === searchEpoch.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [trimmedQuery]);

  const loadData = useCallback(async () => {
    const data = await RestaurantService.getLeaderboard();
    setTopReviewers(data.topReviewers);
    setTopLiked(data.topLiked);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const currentData = activeTab === 'reviews' ? topReviewers : topLiked;
  const sectionSubtitle = activeTab === 'reviews'
    ? i18n.t('leaderboard.reviewsSubtitle')
    : i18n.t('leaderboard.likesSubtitle');

  return (
    <View style={styles.container}>
      <AppHeader
        title={i18n.t('community.title')}
        actions={[{
          icon: 'information-outline',
          onPress: () => Alert.alert(i18n.t('leaderboard.infoTitle'), i18n.t('leaderboard.infoBody')),
          accessibilityLabel: i18n.t('leaderboard.infoTitle'),
        }]}
      />

      {/* Ricerca utenti */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('community.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={i18n.t('community.searchPlaceholder')}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('community.clearSearch')}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isSearchMode ? (
        /* Risultati ricerca al posto delle classifiche finché la query è attiva */
        searching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : results.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="account-search-outline" size={64} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>{i18n.t('community.noResults')}</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/restaurants/user/${item.id}`)}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={item.username}
              >
                <View style={styles.avatarSlot}>
                  <Avatar
                    avatarId={item.avatar_url}
                    initial={item.username}
                    size="md"
                    backgroundColor={theme.colors.primaryContainer}
                  />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.username}</Text>
                  {/* Attività del profilo: recensioni scritte, stessa icona
                      della classifica Recensioni. */}
                  <View style={styles.rowSubline}>
                    <MaterialCommunityIcons name="star" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.rowSubText}>{item.review_count}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.textDisabled}
                  style={styles.rowChevron}
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
          />
        )
      ) : (
      <>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
          onPress={() => setActiveTab('reviews')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="star"
            size={18}
            color={activeTab === 'reviews' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            {i18n.t('leaderboard.reviews')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
          onPress={() => setActiveTab('likes')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="heart"
            size={18}
            color={activeTab === 'likes' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
            {i18n.t('leaderboard.likes')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : currentData.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="trophy-outline" size={64} color={theme.colors.textDisabled} />
          <Text style={styles.emptyText}>{i18n.t('leaderboard.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.user_id}
          ListHeaderComponent={
            <Text style={styles.sectionSubtitle}>{sectionSubtitle}</Text>
          }
          renderItem={({ item, index }) => (
            <LeaderboardRow
              entry={item}
              rank={index + 1}
              onPress={() => router.push(`/restaurants/user/${item.user_id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        />
      )}
      </>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingVertical: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  topRow: {
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
    backgroundColor: theme.colors.amberLight,
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medalText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  rankText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  avatarSlot: {
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  rowSubline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  rowSubText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rowCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 12,
  },
  rowChevron: {
    marginLeft: 4,
    marginRight: -4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
