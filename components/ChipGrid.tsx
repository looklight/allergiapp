import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../constants/theme';

interface ChipGridItem {
  id: string;
  icon?: string;
  translations: Record<string, string>;
}

interface ChipGridProps {
  items: readonly ChipGridItem[];
  activeIds: string[];
  onToggle: (id: string) => void;
  lang: string;
  keyPrefix?: string;
  hideIcons?: boolean;
}

export default function ChipGrid({ items, activeIds, onToggle, lang, keyPrefix, hideIcons }: ChipGridProps) {
  return (
    <View style={styles.grid}>
      {items.map(item => {
        const isActive = activeIds.includes(item.id);
        return (
          <TouchableOpacity
            key={keyPrefix ? `${keyPrefix}-${item.id}` : item.id}
            onPress={() => onToggle(item.id)}
            style={[styles.chip, isActive && styles.chipActive]}
            activeOpacity={0.7}
          >
            {!hideIcons && !!item.icon && <Text style={styles.chipIcon}>{item.icon}</Text>}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {item.translations[lang] ?? item.translations.en}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
