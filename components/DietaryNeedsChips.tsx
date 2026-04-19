import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../constants/theme';
import { getRestrictionById } from '../constants/foodRestrictions';
import type { Language } from '../types';

interface Props {
  allergens: readonly string[];
  diets: readonly string[];
  lang: string;
}

export default function DietaryNeedsChips({ allergens, diets, lang }: Props) {
  const renderChip = (code: string, isDiet: boolean) => {
    const r = getRestrictionById(code);
    const name = r
      ? (r.translations[lang as Language] ?? r.translations.it ?? r.translations.en)
      : code;
    return (
      <View key={`${isDiet ? 'd' : 'a'}-${code}`} style={[styles.chip, isDiet && styles.chipDiet]}>
        <Text style={styles.chipText}>{name}</Text>
      </View>
    );
  };

  return (
    <View style={styles.chips}>
      {allergens.map(c => renderChip(c, false))}
      {diets.map(c => renderChip(c, true))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.primaryContainer,
  },
  chipDiet: {
    borderColor: theme.colors.secondaryContainer,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
});
