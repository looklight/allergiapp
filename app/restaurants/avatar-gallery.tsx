import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import { supabase } from '../../services/supabase';
import {
  AVATARS,
  getAvatarById,
  isAvatarUnlocked,
  getUnlockProgress,
  RARITY_COLORS,
  RARITY_LABELS,
  type AvatarOption,
} from '../../constants/avatars';
import { getProfileColor } from '../../constants/profileColors';
import HeaderBar from '../../components/HeaderBar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface UserStats {
  reviews: number;
  restaurants: number;
}

export default function AvatarGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();

  const [stats, setStats] = useState<UserStats>({ reviews: 0, restaurants: 0 });
  const [selectedId, setSelectedId] = useState(userProfile?.avatar_url ?? null);
  const [detailAvatar, setDetailAvatar] = useState<AvatarOption | null>(null);
  const [saving, setSaving] = useState(false);

  const profileColor = getProfileColor(userProfile?.profile_color ?? undefined);
  const currentAvatar = selectedId ? getAvatarById(selectedId) : undefined;
  const initial = (userProfile?.display_name?.charAt(0) || '?').toUpperCase();

  const unlockedCount = AVATARS.filter((a) => isAvatarUnlocked(a, stats)).length;

  // Carica conteggi utente
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const [reviewsRes, restaurantsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.uid),
        supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('added_by', user.uid),
      ]);
      setStats({
        reviews: reviewsRes.count ?? 0,
        restaurants: restaurantsRes.count ?? 0,
      });
    })().catch((err) => console.warn('[AvatarGallery] Errore stats:', err));
  }, [user?.uid]);

  const handleSelect = useCallback(
    async (avatar: AvatarOption) => {
      if (!user?.uid || saving) return;
      if (!isAvatarUnlocked(avatar, stats)) {
        setDetailAvatar(avatar);
        return;
      }
      // Se è già selezionato, non fare nulla
      if (selectedId === avatar.id) return;

      setSelectedId(avatar.id);
      setSaving(true);
      try {
        await AuthService.updateUserAvatar(user.uid, avatar.id);
        await refreshProfile();
      } catch {
        // rollback
        setSelectedId(userProfile?.avatar_url ?? null);
      } finally {
        setSaving(false);
      }
    },
    [user?.uid, saving, stats, selectedId, userProfile?.avatar_url, refreshProfile],
  );

  const renderProgressLabel = (avatar: AvatarOption) => {
    const { unlock } = avatar;
    if (unlock.type === 'free') return null;
    const current = unlock.type === 'reviews' ? stats.reviews : stats.restaurants;
    const label = unlock.type === 'reviews' ? 'recensioni' : 'ristoranti';
    return `${current}/${unlock.count} ${label}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title="I miei Avatar" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Avatar attuale */}
        <View style={styles.currentSection}>
          <View style={[styles.currentAvatarRing, { borderColor: profileColor.hex }]}>
            {currentAvatar?.source ? (
              <Image source={currentAvatar.source} style={styles.currentAvatarImage} />
            ) : (
              <View style={[styles.currentAvatarFallback, { backgroundColor: profileColor.hex }]}>
                <Text style={styles.currentAvatarText}>{initial}</Text>
              </View>
            )}
          </View>
          {currentAvatar && <Text style={styles.currentAvatarName}>{currentAvatar.name}</Text>}
          <Text style={styles.unlockedCounter}>
            {unlockedCount}/{AVATARS.length} sbloccati
          </Text>
        </View>

        {/* Griglia avatar */}
        <View style={styles.grid}>
          {AVATARS.map((avatar) => {
            const unlocked = isAvatarUnlocked(avatar, stats);
            const isSelected = selectedId === avatar.id;
            const rarityColor = RARITY_COLORS[avatar.rarity];

            return (
              <TouchableOpacity
                key={avatar.id}
                onPress={() => (unlocked ? handleSelect(avatar) : setDetailAvatar(avatar))}
                activeOpacity={0.7}
                style={[
                  styles.gridItem,
                  { borderColor: isSelected ? rarityColor : 'transparent' },
                  isSelected && { backgroundColor: `${rarityColor}15` },
                ]}
              >
                {/* Immagine o placeholder */}
                <View style={styles.gridImageWrap}>
                  {avatar.source ? (
                    <Image
                      source={avatar.source}
                      style={[styles.gridImage, !unlocked && styles.gridImageLocked]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.gridPlaceholder,
                        { backgroundColor: unlocked ? `${rarityColor}25` : theme.colors.background },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="help-circle-outline"
                        size={36}
                        color={unlocked ? rarityColor : theme.colors.textDisabled}
                      />
                    </View>
                  )}

                  {/* Lock overlay */}
                  {!unlocked && (
                    <View style={styles.lockOverlay}>
                      <MaterialCommunityIcons name="lock" size={24} color="#FFF" />
                    </View>
                  )}

                  {/* Check badge */}
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: rarityColor }]}>
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    </View>
                  )}
                </View>

                {/* Nome + rarità */}
                <Text
                  style={[styles.gridName, !unlocked && styles.gridNameLocked]}
                  numberOfLines={1}
                >
                  {avatar.name}
                </Text>
                <View style={[styles.rarityBadge, { backgroundColor: `${rarityColor}20` }]}>
                  <Text style={[styles.rarityText, { color: rarityColor }]}>
                    {RARITY_LABELS[avatar.rarity]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal dettaglio avatar bloccato */}
      <Modal
        visible={!!detailAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailAvatar(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetailAvatar(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {detailAvatar && (
              <DetailCard
                avatar={detailAvatar}
                stats={stats}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Card dettaglio dentro il modal */
function DetailCard({
  avatar,
  stats,
}: {
  avatar: AvatarOption;
  stats: UserStats;
}) {
  const unlocked = isAvatarUnlocked(avatar, stats);
  const progress = getUnlockProgress(avatar, stats);
  const rarityColor = RARITY_COLORS[avatar.rarity];

  const { unlock } = avatar;
  let progressLabel = '';
  if (unlock.type === 'reviews') {
    progressLabel = `${stats.reviews}/${unlock.count} recensioni`;
  } else if (unlock.type === 'restaurants') {
    progressLabel = `${stats.restaurants}/${unlock.count} ristoranti`;
  }

  return (
    <View style={styles.detailCard}>
      {/* Avatar */}
      <View style={styles.detailAvatarWrap}>
        {avatar.source ? (
          <Image
            source={avatar.source}
            style={[styles.detailAvatar, !unlocked && styles.gridImageLocked]}
          />
        ) : (
          <View style={[styles.detailPlaceholder, { backgroundColor: `${rarityColor}20` }]}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={56}
              color={unlocked ? rarityColor : theme.colors.textDisabled}
            />
          </View>
        )}
        {!unlocked && (
          <View style={styles.detailLockBadge}>
            <MaterialCommunityIcons name="lock" size={20} color="#FFF" />
          </View>
        )}
      </View>

      {/* Info */}
      <Text style={styles.detailName}>{avatar.name}</Text>
      <View style={[styles.detailRarityBadge, { backgroundColor: `${rarityColor}20` }]}>
        <Text style={[styles.detailRarityText, { color: rarityColor }]}>
          {RARITY_LABELS[avatar.rarity]}
        </Text>
      </View>
      <Text style={styles.detailDescription}>{avatar.description}</Text>

      {/* Barra progresso */}
      {!unlocked && progressLabel !== '' && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: rarityColor },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>
      )}

      {unlocked && (
        <View style={styles.unlockedBadgeRow}>
          <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.unlockedBadgeText}>Sbloccato!</Text>
        </View>
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
  scroll: {
    flex: 1,
  },

  // ── Current avatar ──────────────────────────────────
  currentSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: GRID_PADDING,
  },
  currentAvatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  currentAvatarImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  currentAvatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
  currentAvatarName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 10,
  },
  unlockedCounter: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // ── Grid ────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2.5,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  gridImageWrap: {
    width: ITEM_SIZE - 24,
    height: ITEM_SIZE - 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  gridImageLocked: {
    opacity: 0.35,
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  gridNameLocked: {
    color: theme.colors.textDisabled,
  },
  rarityBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Modal ───────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.overlay,
    padding: 32,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  detailAvatarWrap: {
    width: 100,
    height: 100,
    position: 'relative',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  detailPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  detailRarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  detailRarityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Progress
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 6,
  },

  unlockedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
