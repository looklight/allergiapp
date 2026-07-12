import { useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useUserItemList } from '../../hooks/useUserItemList';
import { FollowService, type FollowedProfile } from '../../services/followService';
import FollowButton from '../../components/FollowButton';
import Avatar from '../../components/Avatar';
import AppHeader from '../components/AppHeader';
import { getAuthorLabel } from '../../utils/getDisplayName';
import i18n from '../../utils/i18n';

// Fetcher a livello modulo: riferimento stabile per useUserItemList.
const fetchFollowing = (userId: string): Promise<FollowedProfile[]> => FollowService.getFollowing(userId);

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
    const name = getAuthorLabel({ userId: item.id, username: item.username, isAnonymous: item.is_anonymous });
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
          <View style={styles.identityInfo}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {/* Attività come nelle righe della ricerca Community: recensioni
                + paesi visitati (il gruppo paesi solo sopra zero). Mai sugli
                anonimi: la RPC li serve mascherati con attività a 0. */}
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
        </TouchableOpacity>
        {user?.uid && (
          <FollowButton
            userId={user.uid}
            targetId={item.id}
            initialFollowing
            // Unfollow "morbido": la riga resta col bottone tornato su
            // "Segui", così un tocco sbagliato si annulla ripremendo; le
            // righe unfollowate spariscono alla prossima apertura. Eccezione
            // anonimi: non ri-followabili (RLS), l'undo è impossibile →
            // spariscono subito come prima.
            onChange={(nowFollowing) => {
              if (!nowFollowing && item.is_anonymous) followingList.reload();
            }}
          />
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
          // Intestazione: respiro e contesto prima dell'elenco. total_count
          // dalla RPC (esatto anche oltre il cap della lista), congelato
          // all'apertura: non segue gli unfollow morbidi (come le righe).
          ListHeaderComponent={
            followingList.items.length > 0 ? (
              <View style={styles.headerBlock}>
                <Text style={styles.headerCount}>
                  {i18n.t('follow.manageHeader', { count: followingList.items[0].total_count })}
                </Text>
              </View>
            ) : null
          }
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
  identityInfo: {
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
