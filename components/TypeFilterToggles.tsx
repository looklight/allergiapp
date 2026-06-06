import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';

export interface TypeToggleItem {
  key: string;
  icon: string;
  /** Etichetta (a11y); le chip restano sole-icona per leggerezza. */
  label: string;
}

interface Props {
  toggles: TypeToggleItem[];
  /** Tipi attualmente nascosti (toggle "spento"). */
  hidden: Set<string>;
  onToggle: (key: string) => void;
}

/**
 * Due toggle icona-sola (Ristoranti / Hotel) allineati a destra, stile dei chip
 * di ordinamento delle recensioni. Resi nel corpo scrollabile sotto la mappa.
 * Attivo (tipo mostrato) = pill piena primary; spento (tipo nascosto) = icona
 * leggera su sfondo muted. Si nascondono con meno di 2 tipi.
 */
export default function TypeFilterToggles({ toggles, hidden, onToggle }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (toggles.length < 2) return null;

  return (
    <View style={styles.row}>
      {toggles.map((t) => {
        const active = !hidden.has(t.key);
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => onToggle(t.key)}
            style={[styles.toggle, active && styles.toggleActive]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
          >
            <MaterialCommunityIcons
              name={t.icon as any}
              size={14}
              color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  // L'allineamento orizzontale è gestito dal parent (header riga con il titolo);
  // qui basta disporre i due toggle in fila. Dimensioni identiche ai sortChip
  // delle recensioni (pH 8, pV 6, icona 14).
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  toggle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});
