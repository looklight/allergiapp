import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { shareProfile, buildProfileUrl } from '../services/shareProfile';
import { SupabaseAnalytics } from '../services/supabaseAnalytics';
import i18n from '../utils/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Utente corrente (per analytics e share nativo). */
  userId: string;
  username: string;
};

/**
 * Bottom sheet "il tuo link" sul profilo personale: mostra l'URL pubblico del
 * profilo con copia al tap e spiega che si può condividere o mettere in bio.
 * Lo share nativo resta raggiungibile dal bottone in fondo. Stesso stampo di
 * ListEditorSheet (Modal + progress reanimated), senza gestione tastiera.
 */
export default function ShareProfileSheet({ visible, onClose, userId, username }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Senza ?ref: il link copiato è pensato per le bio, deve restare pulito.
  const url = buildProfileUrl(username);
  const displayUrl = url.replace('https://', '');

  const progress = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const finishClose = useCallback(() => onCloseRef.current(), []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [400, 0]) }],
  }));

  useEffect(() => {
    if (!visible) return;
    setCopied(false);
    progress.value = 0;
    progress.value = withTiming(1, { duration: 280 });
  }, [visible, progress]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const close = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(finishClose)();
    });
  }, [progress, finishClose]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      SupabaseAnalytics.track('profile_link_copied', { profile_id: userId });
    } catch (err) {
      if (__DEV__) console.warn('[ShareProfileSheet] copy fallita', err);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View style={[styles.content, { paddingBottom: insets.bottom + theme.spacing.md }, contentStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('share.sheetTitle')}</Text>
            <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel={i18n.t('common.close')}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Tutta la riga copia: il link è il contenuto, l'icona conferma l'azione. */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={handleCopy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('share.sheetCopy')}
            >
              <Text style={styles.linkText} numberOfLines={1}>{displayUrl}</Text>
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={18}
                color={copied ? theme.colors.primary : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <Text style={[styles.copyFeedback, !copied && styles.copyFeedbackHidden]}>
              {i18n.t('share.sheetCopied')}
            </Text>

            <Text style={styles.hint}>{i18n.t('share.sheetHint')}</Text>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => shareProfile({ id: userId, username })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('share.shareProfile')}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={theme.colors.onPrimary} />
              <Text style={styles.shareButtonText}>{i18n.t('share.shareProfile')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  content: {
    backgroundColor: theme.colors.detailSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  // Altezza riservata anche da nascosto: niente salti di layout al "Copiato!".
  copyFeedback: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    minHeight: 16,
  },
  copyFeedbackHidden: {
    opacity: 0,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
