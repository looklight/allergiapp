import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';

// Set curato (leggero, niente tastiera emoji intera): cibo + luoghi + generici.
export const LIST_EMOJIS = [
  '⭐', '❤️', '🍕', '🍣', '🍔', '🌮', '🥗', '🍜',
  '☕', '🍷', '🍰', '🥐', '🌍', '🏖️', '🏔️', '🗺️',
];

type Props = {
  value: string | null;
  onChange: (emoji: string) => void;
};

/** Griglia compatta di emoji selezionabili per una lista. */
export default function EmojiPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.grid}>
      {LIST_EMOJIS.map((e) => (
        <TouchableOpacity
          key={e}
          onPress={() => onChange(e)}
          style={[styles.cell, value === e && styles.cellSelected]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: value === e }}
        >
          <Text style={styles.emoji}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cell: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.detailMuted,
  },
  emoji: { fontSize: 20 },
});
