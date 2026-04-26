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
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import {
  AVATARS,
  isAvatarUnlocked,
  getUnlockProgress,
  type AvatarOption,
  type UnlockStats,
} from '../../constants/avatars';
import { fetchUnlockStats } from '../../services/unlockedAvatarsService';
import HeaderBar from '../../components/HeaderBar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 10;
// Colonne adattive: target ~120px per item, minimo 3 (phone), libero di salire su tablet.
const TARGET_ITEM_SIZE = 120;
const NUM_COLUMNS = Math.max(
  3,
  Math.floor((SCREEN_WIDTH - GRID_PADDING * 2) / TARGET_ITEM_SIZE),
);
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

/**
 * Etichetta "noun per persone con questa restrizione" (es. "vegan" → "vegani",
 * "gluten" → "gluten free"). Da estendere quando si aggiunge un avatar che
 * usa una restrizione non ancora mappata. Fallback: ritorna l'id grezzo.
 */
const RESTRICTION_PEOPLE_LABEL: Record<string, string> = {
  vegan: 'vegani',
  vegetarian: 'vegetariani',
  gluten: 'gluten free',
  lactose: 'intolleranti al lattosio',
  histamine: 'intolleranti all\'istamina',
  nickel: 'intolleranti al nichel',
  diabetes: 'diabetici',
};

function restrictionPeopleLabel(restrictionId: string): string {
  return RESTRICTION_PEOPLE_LABEL[restrictionId] ?? restrictionId;
}

/** Etichetta progresso per una condizione (es. "3/5 like ricevuti"). */
function formatProgressLabel(avatar: AvatarOption, stats: UnlockStats): string {
  switch (avatar.unlock.type) {
    case 'free':
      return '';
    case 'reviews':
      return `${stats.reviews}/${avatar.unlock.count} recensioni`;
    case 'restaurants':
      return `${stats.restaurants}/${avatar.unlock.count} ristoranti`;
    case 'likes_received':
      return `${stats.likes}/${avatar.unlock.count} like ricevuti`;
    case 'unique_likers_received':
      return `${stats.uniqueLikersReceived}/${avatar.unlock.count} utenti diversi`;
    case 'countries_reviewed':
      return `${stats.countriesReviewed}/${avatar.unlock.count} paesi recensiti`;
    case 'likes_to_restriction_reviews': {
      const current = stats.likesToRestrictionReviews[avatar.unlock.restriction] ?? 0;
      return `${current}/${avatar.unlock.count} like a recensioni di ${restrictionPeopleLabel(avatar.unlock.restriction)}`;
    }
  }
}

/**
 * Hint motivazionale opzionale, mostrato sotto la condizione nel DetailCard.
 * Solo per le quest dove un suggerimento "come fare" è utile (es. like ricevuti).
 * Ritorna null per condizioni autoesplicative (free, dietary likes given).
 */
function getQuestHint(avatar: AvatarOption): string | null {
  switch (avatar.unlock.type) {
    case 'likes_received':
    case 'unique_likers_received':
      return 'Aggiungi foto, descrivi i piatti e racconta come è stata la tua esperienza. Le recensioni complete vengono apprezzate di più dalla community.';
    default:
      return null;
  }
}

/** Etichetta della condizione (es. "Scrivi 5 recensioni"). */
function formatConditionLabel(avatar: AvatarOption): string {
  switch (avatar.unlock.type) {
    case 'free':
      return 'Avatar gratuito';
    case 'reviews':
      return `Scrivi ${avatar.unlock.count} recensioni`;
    case 'restaurants':
      return `Aggiungi ${avatar.unlock.count} ristoranti`;
    case 'likes_received':
      return `Le tue recensioni devono ricevere ${avatar.unlock.count} like dagli utenti`;
    case 'unique_likers_received':
      return `Ricevi like da ${avatar.unlock.count} utenti diversi sulle tue recensioni`;
    case 'countries_reviewed':
      return `Recensisci ristoranti in ${avatar.unlock.count} paesi diversi`;
    case 'likes_to_restriction_reviews':
      return `Metti like a ${avatar.unlock.count} recensioni di utenti ${restrictionPeopleLabel(avatar.unlock.restriction)}`;
  }
}

export default function AvatarGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userProfile, refreshProfile } = useAuth();

  const [stats, setStats] = useState<UnlockStats>({
    reviews: 0,
    restaurants: 0,
    likes: 0,
    uniqueLikersReceived: 0,
    countriesReviewed: 0,
    likesToRestrictionReviews: {},
  });
  const [selectedId, setSelectedId] = useState(userProfile?.avatar_url ?? null);
  const [detailAvatar, setDetailAvatar] = useState<AvatarOption | null>(null);
  const [saving, setSaving] = useState(false);

  // Carica conteggi utente per valutare le condizioni di sblocco.
  useEffect(() => {
    if (!user?.uid) return;
    fetchUnlockStats(user.uid).then(setStats);
  }, [user?.uid]);

  const handleSelect = useCallback(
    async (avatar: AvatarOption) => {
      if (!user?.uid || saving) return;
      if (!isAvatarUnlocked(avatar, stats)) {
        setDetailAvatar(avatar);
        return;
      }
      if (userProfile?.is_anonymous) {
        Alert.alert(
          'Modalità anonima attiva',
          'Per scegliere un avatar disattiva la modalità anonima nel tuo profilo.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Vai al profilo', onPress: () => router.push('/restaurants/edit-profile') },
          ],
        );
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
    [user?.uid, saving, stats, selectedId, userProfile?.avatar_url, userProfile?.is_anonymous, refreshProfile, router],
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

      {userProfile?.is_anonymous && (
        <View style={styles.anonymousBanner}>
          <MaterialCommunityIcons name="incognito" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.anonymousBannerText}>
            In modalità anonima il tuo avatar non è visibile agli altri.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/restaurants/edit-profile')}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <Text style={styles.anonymousBannerCta}>Modifica</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 24 }}
      >
        {/* Griglia avatar */}
        <View style={styles.grid}>
          {AVATARS.map((avatar) => {
            const unlocked = isAvatarUnlocked(avatar, stats);
            const isSelected = selectedId === avatar.id;

            return (
              <TouchableOpacity
                key={avatar.id}
                onPress={() => (unlocked ? handleSelect(avatar) : setDetailAvatar(avatar))}
                activeOpacity={0.7}
                style={[
                  styles.gridItem,
                  { borderColor: isSelected ? theme.colors.primary : 'transparent' },
                  isSelected && { backgroundColor: theme.colors.primaryLight },
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
                    <View style={styles.gridPlaceholder}>
                      <MaterialCommunityIcons
                        name="help-circle-outline"
                        size={36}
                        color={unlocked ? theme.colors.primary : theme.colors.textDisabled}
                      />
                    </View>
                  )}

                  {/* Check badge */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.gridName, !unlocked && styles.gridNameLocked]}
                  numberOfLines={1}
                >
                  {avatar.name}
                </Text>

                {/* Velo grigio + badge a livello gridItem: copre l'intera card
                    (image + name) con la stessa estensione del border di selezione. */}
                {!unlocked && <View style={styles.lockedVeil} />}
                {!unlocked && (
                  <View style={styles.lockBadge}>
                    <MaterialCommunityIcons name="lock" size={12} color="#FFF" />
                  </View>
                )}
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
  stats: UnlockStats;
}) {
  const unlocked = isAvatarUnlocked(avatar, stats);
  const progress = getUnlockProgress(avatar, stats);
  const progressLabel = formatProgressLabel(avatar, stats);
  const hint = getQuestHint(avatar);
  const [hintExpanded, setHintExpanded] = useState(false);

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
          <View style={styles.detailPlaceholder}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={56}
              color={unlocked ? theme.colors.primary : theme.colors.textDisabled}
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
      <Text style={styles.detailDescription}>{formatConditionLabel(avatar)}</Text>
      {hint && (
        <TouchableOpacity
          onPress={() => setHintExpanded((v) => !v)}
          activeOpacity={0.7}
          style={styles.hintWrap}
          accessibilityRole="button"
          accessibilityLabel={hintExpanded ? 'Nascondi suggerimento' : 'Mostra suggerimento'}
        >
          <View style={styles.hintHeader}>
            <Text style={styles.hintLabel}>Suggerimento</Text>
            <MaterialCommunityIcons
              name={hintExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.textDisabled}
            />
          </View>
          {hintExpanded && <Text style={styles.hintBody}>{hint}</Text>}
        </TouchableOpacity>
      )}

      {/* Barra progresso */}
      {!unlocked && progressLabel !== '' && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.colors.primary },
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
  scroll: {
    flex: 1,
  },

  // ── Anonymous banner ────────────────────────────────
  anonymousBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.amberLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.amberBorder,
  },
  anonymousBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.amberText,
    lineHeight: 18,
  },
  anonymousBannerCta: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
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
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  gridImageWrap: {
    width: ITEM_SIZE - 9,
    height: ITEM_SIZE - 9,
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
    opacity: 0.2,
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    backgroundColor: theme.colors.primary,
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
  detailDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  hintWrap: {
    marginBottom: 16,
    alignItems: 'center',
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  hintLabel: {
    fontSize: 12,
    color: theme.colors.textDisabled,
  },
  hintBody: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: 4,
    paddingHorizontal: 8,
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
