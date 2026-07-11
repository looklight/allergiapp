import { useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useUserItemList } from '../../hooks/useUserItemList';
import { FollowService, type FollowedProfile } from '../../services/followService';
import FollowButton from '../../components/FollowButton';
import Avatar from '../../components/Avatar';
import AppHeader from '../components/AppHeader';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import i18n from '../../utils/i18n';

// Fetcher a livello modulo: riferimento stabile per useUserItemList.
const fetchFollowing = (): Promise<FollowedProfile[]> => FollowService.getFollowing();

/**
 * Gestione dei profili seguiti: lista con unfollow inline (la pill riusa
 * FollowButton in stato "Già segui"). I profili diventati anonimi restano
 * visibili mascherati così si possono comunque smettere di seguire, ma non
 * sono navigabili.
 */
export default function FollowingScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { user } = useAuth();
  const followingList = useUserItemList<FollowedProfile>(fetchFollowing);

  const renderItem = ({ item }: { item: FollowedProfile }) => {
    const name = item.is_anonymous ? getAnonymousLabel(item.id) : item.username;
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.identity}
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
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
        {user?.uid && (
          <FollowButton userId={user.uid} targetId={item.id} initialFollowing />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={i18n.t('follow.feedPill')} onLeadingPress={() => router.back()} />
      {followingList.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={followingList.items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{i18n.t('follow.manageEmpty')}</Text>
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
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
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
