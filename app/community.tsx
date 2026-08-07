import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import i18n from '../utils/i18n';
import { getDisplayName } from '../utils/getDisplayName';
import { RestaurantService, type LeaderboardEntry } from '../services/restaurantService';
import { FollowService, getFollowGraphVersion } from '../services/followService';
import { searchUsers, type UserSearchResult } from '../services/userSearchService';
import AppHeader from './components/AppHeader';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

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

function LeaderboardRow({ entry, rank, currentUserId, isFollowed, onPress, onFollowChange }: {
  entry: LeaderboardEntry;
  rank: number;
  /** null se non loggato. */
  currentUserId: string | null;
  /** null finché lo stato follow non è caricato (pill nascosta). */
  isFollowed: boolean | null;
  onPress: () => void;
  onFollowChange: (following: boolean) => void;
}) {
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
      {/* Pill follow inline: mai sulla propria riga né sugli anonimi (la
          policy INSERT li rifiuta); il conteggio resta ancorato a destra. */}
      {currentUserId && isFollowed !== null && entry.user_id !== currentUserId && name && (
        <FollowButton
          userId={currentUserId}
          targetId={entry.user_id}
          initialFollowing={isFollowed}
          compact
          onChange={onFollowChange}
        />
      )}
      <Text style={styles.rowCount}>{entry.count}</Text>
    </TouchableOpacity>
  );
}

/** Pagina Community: ricerca utenti in alto + classifiche sotto (ex Classifiche). */
export default function CommunityScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { user } = useAuth();
  const [topReviewers, setTopReviewers] = useState<LeaderboardEntry[]>([]);
  // null = stato follow non (ancora) noto: pill nascoste, niente flash
  // "Segui" su profili già seguiti.
  const [followedIds, setFollowedIds] = useState<Set<string> | null>(null);
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
        // Riordino di presentazione: la RPC mette i match di prefisso in
        // testa (rilevanza) e qui, dentro ciascun gruppo, vince chi ha più
        // recensioni. Client-side: review_count arriva già dalla RPC.
        const lower = trimmedQuery.toLowerCase();
        setResults([...found].sort((a, b) => {
          const aPrefix = a.username.toLowerCase().startsWith(lower) ? 0 : 1;
          const bPrefix = b.username.toLowerCase().startsWith(lower) ? 0 : 1;
          return aPrefix - bPrefix || b.review_count - a.review_count;
        }));
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

  const loadFollowedIds = useCallback(async (entries: LeaderboardEntry[]) => {
    if (!user?.uid) {
      setFollowedIds(null);
      return;
    }
    try {
      const ids = entries.map((e) => e.user_id).filter((id) => id !== user.uid);
      setFollowedIds(await FollowService.getFollowedIdsAmong(ids));
    } catch (err) {
      console.warn('[Community] stato follow fallito:', err);
      setFollowedIds(null);
    }
  }, [user?.uid]);

  const loadData = useCallback(async () => {
    const data = await RestaurantService.getLeaderboard();
    setTopReviewers(data.topReviewers);
    await loadFollowedIds(data.topReviewers);
  }, [loadFollowedIds]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Come su profile.tsx: se il grafo follow è cambiato altrove (follow da un
  // profilo, unfollow dalla lista Seguiti), al focus si riallineano le pill.
  const followVersionRef = useRef(getFollowGraphVersion());
  useFocusEffect(
    useCallback(() => {
      const v = getFollowGraphVersion();
      if (v !== followVersionRef.current) {
        followVersionRef.current = v;
        loadFollowedIds(topReviewers);
      }
    }, [loadFollowedIds, topReviewers]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
        {/* Spinner inline: la ricerca in corso si segnala qui, senza smontare
            i risultati precedenti (niente flicker a ogni tasto). */}
        {searching && <ActivityIndicator size="small" color={theme.colors.textSecondary} />}
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
        /* Risultati ricerca al posto della classifica finché la query è attiva.
           I risultati della query precedente restano montati mentre se ne
           digita una nuova (pattern type-ahead): lo spinner grande compare
           solo alla primissima ricerca, quando non c'è ancora nulla. */
        results.length === 0 ? (
          searching ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.searchEmpty}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={styles.emptyText}>{i18n.t('community.noResults')}</Text>
            </View>
          )
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
                  {/* Attività del profilo: recensioni scritte (stessa icona
                      della classifica Recensioni) + paesi visitati. Il gruppo
                      paesi compare solo sopra zero: a 0 recensioni sarebbe
                      rumore ridondante. */}
                  <View style={styles.rowSubline}>
                    <MaterialCommunityIcons name="star" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.rowSubText}>{item.review_count}</Text>
                    {item.country_count > 0 && (
                      <>
                        <MaterialCommunityIcons name="earth" size={12} color={theme.colors.textSecondary} style={styles.rowSublineSpacer} />
                        <Text style={styles.rowSubText}>{item.country_count}</Text>
                      </>
                    )}
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
      {/* Classifica: solo Recensioni. Il tab "Like ricevuti" è nascosto
          (like poco usati, classifica quasi vuota); service e chiavi i18n
          restano al loro posto per un'eventuale riattivazione. */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : topReviewers.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="trophy-outline" size={64} color={theme.colors.textDisabled} />
          <Text style={styles.emptyText}>{i18n.t('leaderboard.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={topReviewers}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item, index }) => (
            <LeaderboardRow
              entry={item}
              rank={index + 1}
              currentUserId={user?.uid ?? null}
              isFollowed={followedIds ? followedIds.has(item.user_id) : null}
              onPress={() => router.push(`/restaurants/user/${item.user_id}`)}
              onFollowChange={(nowFollowing) => {
                // Set locale allineato al toggle: il bump di versione appena
                // fatto dal service è "nostro", non deve rifetchare al focus.
                followVersionRef.current = getFollowGraphVersion();
                setFollowedIds((prev) => {
                  if (!prev) return prev;
                  const next = new Set(prev);
                  if (nowFollowing) next.add(item.user_id);
                  else next.delete(item.user_id);
                  return next;
                });
              }}
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
    marginBottom: 8,
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
  // Gap barra→lista 16 totali (8 qui + 8 di marginBottom della barra),
  // come i margini laterali: un ritmo solo su tutta la pagina.
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  // paddingHorizontal 12 come l'interno della barra di ricerca: badge,
  // avatar e conteggi allineati in colonna col contenuto della barra.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  topRow: {
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
    backgroundColor: theme.colors.amberLight,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medalText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  rankText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  avatarSlot: {
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    // 15 come le righe della lista Seguiti: i nomi lunghi convivono meglio
    // con la pill follow prima di troncare.
    fontSize: 15,
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
  rowSublineSpacer: {
    marginLeft: 8,
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
  // "Nessun risultato" in alto anziché centrato a tutta pagina: resta
  // visibile anche con la tastiera aperta e pesa meno.
  searchEmpty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
