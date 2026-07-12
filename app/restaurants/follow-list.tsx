import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { FollowService, type FollowedProfile } from '../../services/followService';
import Avatar from '../../components/Avatar';
import AppHeader from '../components/AppHeader';
import { getAuthorLabel } from '../../utils/getDisplayName';
import i18n from '../../utils/i18n';

type Mode = 'followers' | 'following';

/**
 * Lista follower/seguiti di un profilo qualunque (Fase B grafo pubblico):
 * sola lettura, righe navigabili verso il profilo pubblico. Diversa dalla
 * gestione seguiti (/restaurants/following), che resta la schermata del
 * profilo proprio con l'unfollow. Gli anonimi arrivano gia' mascherati
 * dalla RPC (mig 080): non navigabili e senza attivita'.
 */
export default function FollowListScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { uid, mode: modeParam } = useLocalSearchParams<{ uid: string; mode: string }>();
  const mode: Mode = modeParam === 'followers' ? 'followers' : 'following';
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState<FollowedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    (async () => {
      try {
        const list = mode === 'followers'
          ? await FollowService.getFollowers(uid)
          : await FollowService.getFollowing(uid);
        setItems(list);
      } catch (err) {
        console.warn('[FollowList] caricamento fallito:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, mode, isAuthenticated, router]);

  const renderItem = ({ item }: { item: FollowedProfile }) => {
    const name = getAuthorLabel({ userId: item.id, username: item.username, isAnonymous: item.is_anonymous });
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/restaurants/user/${item.id}`)}
        disabled={item.is_anonymous}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={name ?? undefined}
      >
        <Avatar
          avatarId={item.avatar_url}
          isAnonymous={item.is_anonymous}
          initial={name ?? undefined}
          size={40}
        />
        <View style={styles.rowInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {!item.is_anonymous && (
            <View style={styles.subline}>
              <MaterialCommunityIcons name="star" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.subText}>{item.review_count}</Text>
              {item.country_count > 0 && (
                <>
                  <MaterialCommunityIcons name="earth" size={12} color={theme.colors.textSecondary} style={styles.sublineSpacer} />
                  <Text style={styles.subText}>{item.country_count}</Text>
                </>
              )}
            </View>
          )}
        </View>
        {!item.is_anonymous && (
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDisabled} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader
        title={mode === 'followers' ? i18n.t('follow.followers') : i18n.t('follow.feedPill')}
        onLeadingPress={() => router.back()}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.headerBlock}>
                <Text style={styles.headerCount}>
                  {mode === 'followers'
                    ? i18n.t('follow.followersBadge', { count: items[0].total_count })
                    : i18n.t('follow.listFollowingHeader', { count: items[0].total_count })}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {mode === 'followers'
                ? i18n.t('follow.listFollowersEmpty')
                : i18n.t('follow.listFollowingEmpty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  rowInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  // Riga attività sotto il nome: stessi valori delle righe Community.
  subline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  subText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sublineSpacer: {
    marginLeft: 8,
  },
  headerBlock: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
