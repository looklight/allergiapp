import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import i18n from '../utils/i18n';
import type { CountryOption } from '../hooks/useLocationFilters';

interface Props {
  options: CountryOption[];
  selected: string | null;
  onSelect: (country: string | null) => void;
  /** Margine orizzontale negativo per "rompere" il padding del parent (default 16) */
  edgeBleed?: number;
}

export default function CountryFilterChips({ options, selected, onSelect, edgeBleed = 16 }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (options.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -edgeBleed }}
      contentContainerStyle={[styles.row, { paddingHorizontal: edgeBleed }]}
    >
      <Chip
        label={i18n.t('restaurants.user.filterAll')}
        active={selected === null}
        onPress={() => onSelect(null)}
      />
      {options.map((c) => (
        <Chip
          key={c.key}
          label={`${c.name} · ${c.count}`}
          active={selected === c.key}
          onPress={() => onSelect(selected === c.key ? null : c.key)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  text: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  textActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});
