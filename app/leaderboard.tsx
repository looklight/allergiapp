import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { getAvatarById } from '../constants/avatars';
import i18n from '../utils/i18n';
import { RestaurantService, type LeaderboardEntry } from '../services/restaurantService';

type Tab = 'restaurants' | 'reviews';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

function RankBadge({ rank }: { rank: number }) {
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

function AvatarCircle({ name, avatarId, profileColor }: { name: string | null; avatarId: string | null; profileColor: string | null }) {
  const avatar = avatarId ? getAvatarById(avatarId) : undefined;
  const bgColor = profileColor || theme.colors.primaryContainer;

  if (avatar?.source) {
    return (
      <View style={styles.avatarContainer}>
        <Image source={avatar.source} style={styles.avatarImage} />
      </View>
    );
  }

  const initials = (name ?? '?').slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatarFallback, { backgroundColor: bgColor }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}


function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const displayName = entry.display_name || i18n.t('leaderboard.anonymous');
  return (
    <View style={[styles.row, rank <= 3 && styles.topRow]}>
      <RankBadge rank={rank} />
      <AvatarCircle name={entry.display_name} avatarId={entry.avatar_url} profileColor={entry.profile_color} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
      </View>
      <Text style={styles.rowCount}>{entry.count}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('restaurants');
  const [topRestaurants, setTopRestaurants] = useState<LeaderboardEntry[]>([]);
  const [topReviewers, setTopReviewers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await RestaurantService.getLeaderboard();
    setTopRestaurants(data.topRestaurants);
    setTopReviewers(data.topReviewers);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const currentData = activeTab === 'restaurants' ? topRestaurants : topReviewers;
  const sectionSubtitle = activeTab === 'restaurants'
    ? i18n.t('leaderboard.restaurantsSubtitle')
    : i18n.t('leaderboard.reviewsSubtitle');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('leaderboard.title')}</Text>
        <TouchableOpacity
          onPress={() => Alert.alert(i18n.t('leaderboard.infoTitle'), i18n.t('leaderboard.infoBody'))}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'restaurants' && styles.tabActive]}
          onPress={() => setActiveTab('restaurants')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={18}
            color={activeTab === 'restaurants' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'restaurants' && styles.tabTextActive]}>
            {i18n.t('leaderboard.restaurants')}
          </Text>
        </TouchableOpacity>
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
            <LeaderboardRow entry={item} rank={index + 1} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        />
      )}
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
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
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
    color: '#FFFFFF',
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
    backgroundColor: theme.colors.background,
  },
  rankText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  rowCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 12,
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
