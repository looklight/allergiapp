/**
 * Popup globale che notifica all'utente lo sblocco di nuovi avatar.
 *
 * Si attiva automaticamente quando `UnlockedAvatarsContext` rileva nuovi sblocchi.
 * È sopposto durante i flussi di autenticazione/onboarding (path `/auth/*`,
 * `/legal`) per non interrompere il flusso di registrazione.
 *
 * Layout:
 *  - 1 avatar  → immagine grande + nome
 *  - 2-4       → riga di immagini medie affiancate
 *  - 5+        → prime 4 immagini + tile "+N"
 *
 * Dimensioni del popup costanti in tutti i casi (niente scroll, niente carousel).
 */

import { Modal, Pressable, View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { useUnlockedAvatars } from '../../contexts/UnlockedAvatarsContext';
import { getAvatarById } from '../../constants/avatars';

const VISIBLE_TILES = 4;

/** Path durante i quali il popup non deve apparire (registrazione/onboarding). */
function isSuppressedPath(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/legal');
}

export default function UnlockedAvatarsPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const { newlyUnlockedIds, newlyUnlockedCount, acknowledgeUnlocks } = useUnlockedAvatars();

  const visible = newlyUnlockedCount > 0 && !isSuppressedPath(pathname ?? '');
  const isPlural = newlyUnlockedCount > 1;

  const handleViewGallery = async () => {
    await acknowledgeUnlocks();
    router.push('/restaurants/avatar-gallery');
  };

  const handleDismiss = async () => {
    await acknowledgeUnlocks();
  };

  const avatars = newlyUnlockedIds
    .map((id) => getAvatarById(id))
    .filter((a): a is NonNullable<ReturnType<typeof getAvatarById>> => !!a);
  const singleAvatar = avatars.length === 1 ? avatars[0] : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          {singleAvatar ? (
            <View style={styles.singleWrap}>
              {singleAvatar.source ? (
                <Image source={singleAvatar.source} style={styles.singleImage} />
              ) : (
                <MaterialCommunityIcons
                  name="party-popper"
                  size={80}
                  color={theme.colors.primary}
                />
              )}
              <Text style={styles.singleName}>{singleAvatar.name}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              {avatars.slice(0, VISIBLE_TILES).map((avatar) => (
                <View key={avatar.id} style={styles.rowTile}>
                  {avatar.source ? (
                    <Image source={avatar.source} style={styles.rowImage} />
                  ) : (
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={36}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              ))}
              {avatars.length > VISIBLE_TILES && (
                <View style={[styles.rowTile, styles.overflowTile]}>
                  <Text style={styles.overflowText}>
                    +{avatars.length - VISIBLE_TILES}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.title}>
            {isPlural
              ? `Hai sbloccato ${newlyUnlockedCount} nuovi avatar!`
              : 'Hai sbloccato un nuovo avatar!'}
          </Text>
          <Text style={styles.subtitle}>
            {isPlural
              ? 'Vai alla galleria per vederli e impostarne uno come tuo avatar.'
              : 'Vai alla galleria per vederlo e impostarlo come tuo avatar.'}
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={handleViewGallery}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Vedi galleria</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={handleDismiss}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Più tardi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },

  // ── 1 avatar ────────────────────────────────
  singleWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  singleImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  singleName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },

  // ── 2+ avatar ───────────────────────────────
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  rowTile: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  overflowTile: {
    backgroundColor: theme.colors.background,
    borderRadius: 28,
  },
  overflowText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },

  // ── Testi e azioni ──────────────────────────
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
