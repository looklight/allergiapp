import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import CountText from './CountText';

type Props = {
  label: string;
  emoji?: string | null;
  count: number | null;
  /** Lista visibile sul profilo pubblico: mostra il piccolo globo (solo sul profilo proprio). */
  isPublic?: boolean;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

/**
 * Pill della barra liste del profilo (Recensioni/Preferiti/liste custom).
 * Condivisa tra profilo personale e profilo pubblico altrui.
 */
export default function ListPill({ label, emoji, count, isPublic, active, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const textStyle = [styles.text, active && styles.textActive];
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[styles.pill, active && styles.pillActive]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={textStyle} numberOfLines={1}>{label}</Text>
      <CountText value={count} style={textStyle} />
      {isPublic && (
        <MaterialCommunityIcons
          name="earth"
          size={13}
          color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  pill: {
    maxWidth: 170,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 13,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  textActive: {
    color: theme.colors.onPrimary,
  },
});
