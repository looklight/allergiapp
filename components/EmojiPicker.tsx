import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import i18n from '../utils/i18n';

// Set curato (leggero, niente tastiera emoji intera): cibo + luoghi + generici.
export const LIST_EMOJIS = [
  '⭐', '❤️', '🍕', '🍣', '🍔', '🌮', '🥗', '🍜',
  '☕', '🍷', '🍰', '🥐', '🌍', '🏖️', '🏔️', '🗺️',
];

// Abilita LayoutAnimation su Android (no-op su iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  // null = bookmark (simbolo neutro/default della lista).
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** True quando il form contenitore e' la vista attiva. Al passaggio a
   *  inattivo la griglia si richiude, cosi' una nuova sessione di modifica
   *  riparte sempre col chip chiuso. */
  active?: boolean;
  /** Campo nome (o altro) reso in riga a destra del chip simbolo. */
  children?: ReactNode;
};

/**
 * Selettore di simbolo per una lista. Di default mostra solo un chip col simbolo
 * scelto, inline a sinistra del campo nome (stile Google Maps): la griglia curata
 * si apre sotto SOLO al tap sul chip e si richiude appena si sceglie un simbolo.
 * Il valore `null` corrisponde al bookmark standard (neutro/default).
 */
export default function EmojiPicker({ value, onChange, active, children }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  // Quando il form diventa inattivo, richiudi: alla riapertura (es. modifica di
  // un'altra lista) si riparte sempre col chip chiuso, focus sul nome.
  useEffect(() => { if (!active) setOpen(false); }, [active]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  const select = (e: string | null) => {
    onChange(e);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={toggle}
          style={[styles.trigger, open && styles.triggerOpen]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={i18n.t('restaurants.collections.chooseSymbol')}
        >
          {value == null ? (
            <MaterialCommunityIcons name="bookmark" size={22} color={theme.colors.primary} />
          ) : (
            <Text style={styles.triggerEmoji}>{value}</Text>
          )}
          <View style={styles.caret}>
            <MaterialCommunityIcons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
        {children}
      </View>

      {open && (
        <View style={styles.grid}>
          <TouchableOpacity
            onPress={() => select(null)}
            style={[styles.cell, value == null && styles.cellSelected]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: value == null }}
          >
            <MaterialCommunityIcons name="bookmark" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          {LIST_EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => select(e)}
              style={[styles.cell, value === e && styles.cellSelected]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: value === e }}
            >
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  trigger: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  triggerOpen: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.detailMuted,
  },
  triggerEmoji: { fontSize: 22 },
  caret: {
    position: 'absolute',
    bottom: 1,
    right: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
