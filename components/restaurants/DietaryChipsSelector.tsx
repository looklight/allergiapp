import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  FOOD_RESTRICTIONS,
  getRestrictionsByCategory,
  INTOLERANCE_RESTRICTION_IDS,
} from '../../constants/foodRestrictions';
import { OTHER_FOOD_CATEGORIES, type OtherFoodCategory } from '../../constants/otherFoods';
import ChipGrid from '../ChipGrid';
import i18n from '../../utils/i18n';
import { theme } from '../../constants/theme';

const DIETS_GROUP = getRestrictionsByCategory('diet');
const ALLERGENS_AND_INTOLERANCES = FOOD_RESTRICTIONS.filter(
  r => r.category === 'eu_allergen' || r.category === 'intolerance'
);
const OTHERS_GROUP = getRestrictionsByCategory('food_sensitivity');

const SUBCAT_ORDER: OtherFoodCategory[] = ['vegetables', 'fruits', 'legumes_other', 'proteins'];
const OTHERS_BY_SUBCAT = SUBCAT_ORDER
  .map(sub => ({ subcategory: sub, items: OTHERS_GROUP.filter(r => r.subcategory === sub) }))
  .filter(g => g.items.length > 0);

interface DietaryChipsSelectorProps {
  allergens: string[];
  diets: string[];
  onToggleAllergen: (id: string) => void;
  onToggleDiet: (id: string) => void;
  lang: string;
  /** Mostra il testo descrittivo sotto il titolo Diete */
  showHint?: boolean;
  /** Prefisso univoco per le React key dei chip (utile se due selettori coesistono) */
  keyPrefix?: string;
}

export default function DietaryChipsSelector({
  allergens,
  diets,
  onToggleAllergen,
  onToggleDiet,
  lang,
  showHint = false,
  keyPrefix = 'dietary',
}: DietaryChipsSelectorProps) {
  const handleAllergensToggle = (id: string) => {
    if (INTOLERANCE_RESTRICTION_IDS.has(id)) {
      onToggleDiet(id);
    } else {
      onToggleAllergen(id);
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>{i18n.t('profile.diets')}</Text>
      {showHint && (
        <Text style={styles.sectionHint}>{i18n.t('profile.dietaryHint')}</Text>
      )}
      <ChipGrid
        items={DIETS_GROUP}
        activeIds={diets}
        onToggle={onToggleDiet}
        lang={lang}
        keyPrefix={`${keyPrefix}-diet`}
        hideIcons
      />

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
        {i18n.t('profile.allergensIntolerances')}
      </Text>
      <ChipGrid
        items={ALLERGENS_AND_INTOLERANCES}
        activeIds={[...diets, ...allergens]}
        onToggle={handleAllergensToggle}
        lang={lang}
        keyPrefix={`${keyPrefix}-allergens`}
        hideIcons
      />

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
        {i18n.t('profile.others')}
      </Text>
      {OTHERS_BY_SUBCAT.map(({ subcategory, items }) => {
        const labels = OTHER_FOOD_CATEGORIES[subcategory] as Record<string, string>;
        return (
          <View key={subcategory} style={styles.subGroup}>
            <Text style={styles.subHeader}>{labels[lang] ?? labels.en}</Text>
            <ChipGrid
              items={items}
              activeIds={allergens}
              onToggle={onToggleAllergen}
              lang={lang}
              keyPrefix={`${keyPrefix}-other-${subcategory}`}
              hideIcons
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 20,
  },
  sectionHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  subGroup: {
    marginBottom: 12,
  },
  subHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
});
