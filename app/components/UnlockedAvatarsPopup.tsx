/**
 * Popup globale che notifica all'utente lo sblocco di nuovi avatar.
 *
 * Si attiva automaticamente quando `UnlockedAvatarsContext` rileva nuovi sblocchi.
 * È sopposto durante i flussi di autenticazione/onboarding (path `/auth/*`,
 * `/legal`) per non interrompere il flusso di registrazione.
 *
 * Mostra un solo messaggio aggregato ("X nuovi avatar") e rimanda alla galleria
 * dove l'utente vede quali sono e può sceglierne uno. Non distingue per-avatar
 * — la galleria fa già quel lavoro.
 */

import { Modal, Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { useUnlockedAvatars } from '../../contexts/UnlockedAvatarsContext';

/** Path durante i quali il popup non deve apparire (registrazione/onboarding). */
function isSuppressedPath(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/legal');
}

export default function UnlockedAvatarsPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const { newlyUnlockedCount, acknowledgeUnlocks } = useUnlockedAvatars();

  const visible = newlyUnlockedCount > 0 && !isSuppressedPath(pathname ?? '');
  const isPlural = newlyUnlockedCount > 1;

  const handleViewGallery = async () => {
    await acknowledgeUnlocks();
    router.push('/restaurants/avatar-gallery');
  };

  const handleDismiss = async () => {
    await acknowledgeUnlocks();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name="party-popper"
              size={48}
              color={theme.colors.primary}
            />
          </View>
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
  iconWrap: {
    marginBottom: 12,
  },
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
