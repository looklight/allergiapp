import { useState, useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { FollowService } from '../services/followService';
import i18n from '../utils/i18n';

interface FollowButtonProps {
  /** Utente corrente (follower). */
  userId: string;
  /** Profilo da seguire. */
  targetId: string;
  initialFollowing: boolean;
  /** Notifica il parent dopo un toggle riuscito (es. per invalidare il feed). */
  onChange?: (following: boolean) => void;
}

/**
 * Pill "Segui"/"Già segui" accanto al nome sul profilo pubblico.
 * UI ottimistica: lo stato flippa subito e torna indietro se la scrittura
 * fallisce (es. RLS che rifiuta il follow di un profilo diventato anonimo).
 */
export default function FollowButton({ userId, targetId, initialFollowing, onChange }: FollowButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) {
        await FollowService.follow(userId, targetId);
      } else {
        await FollowService.unfollow(userId, targetId);
      }
      onChange?.(next);
    } catch (err) {
      if (__DEV__) console.warn('[FollowButton] toggle fallito', err);
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? i18n.t('follow.following') : i18n.t('follow.follow')}
      style={[styles.pill, following ? styles.pillFollowing : styles.pillFollow]}
    >
      <Text style={[styles.label, following ? styles.labelFollowing : styles.labelFollow]}>
        {following ? i18n.t('follow.following') : i18n.t('follow.follow')}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillFollow: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillFollowing: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.divider,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelFollow: {
    color: theme.colors.onPrimary,
  },
  labelFollowing: {
    color: theme.colors.textPrimary,
  },
});
