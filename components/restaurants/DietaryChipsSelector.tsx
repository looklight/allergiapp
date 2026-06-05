import { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager, type ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  FOOD_RESTRICTIONS,
  getRestrictionsByCategory,
  INTOLERANCE_RESTRICTION_IDS,
} from '../../constants/foodRestrictions';
import { OTHER_FOOD_CATEGORIES, type OtherFoodCategory } from '../../constants/otherFoods';
import ChipGrid from '../ChipGrid';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DIETS_GROUP = getRestrictionsByCategory('diet');
const ALLERGENS_AND_INTOLERANCES = FOOD_RESTRICTIONS.filter(
  r => r.category === 'eu_allergen' || r.category === 'intolerance'
);
const OTHERS_GROUP = getRestrictionsByCategory('food_sensitivity');
const OTHERS_IDS = new Set(OTHERS_GROUP.map(r => r.id));

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
  /** ScrollView esterno: usato per scrollare leggermente in basso quando si espande "Altre" */
  scrollViewRef?: React.RefObject<ScrollView | null>;
  /** Ref alla posizione corrente di scroll (aggiornata via onScroll nel parent) */
  scrollPosRef?: React.RefObject<number>;
  /** Slot opzionale renderizzato in fondo alla sezione "Altre" quando espansa */
  othersFooterSlot?: React.ReactNode;
}

const OTHERS_SCROLL_DELTA = 180;

export default function DietaryChipsSelector({
  allergens,
  diets,
  onToggleAllergen,
  onToggleDiet,
  lang,
  showHint = false,
  keyPrefix = 'dietary',
  scrollViewRef,
  scrollPosRef,
  othersFooterSlot,
}: DietaryChipsSelectorProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const othersSelectedCount = allergens.filter(id => OTHERS_IDS.has(id)).length;
  const [othersExpanded, setOthersExpanded] = useState(othersSelectedCount > 0);

  const handleAllergensToggle = (id: string) => {
    if (INTOLERANCE_RESTRICTION_IDS.has(id)) {
      onToggleDiet(id);
    } else {
      onToggleAllergen(id);
    }
  };

  const toggleOthersExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOthersExpanded(prev => {
      const next = !prev;
      if (next && scrollViewRef?.current) {
        const baseY = scrollPosRef?.current ?? 0;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: baseY + OTHERS_SCROLL_DELTA,
            animated: true,
          });
        }, 50);
      }
      return next;
    });
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

      <Pressable
        onPress={toggleOthersExpanded}
        style={({ pressed }) => [
          styles.othersHeader,
          pressed && styles.othersHeaderPressed,
        ]}
      >
        <Text style={styles.othersTitle}>{i18n.t('profile.others')}</Text>
        <View style={styles.othersRight}>
          {othersSelectedCount > 0 && (
            <View style={styles.othersBadge}>
              <Text style={styles.othersBadgeText}>{othersSelectedCount}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name={othersExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.textSecondary}
          />
        </View>
      </Pressable>
      {othersExpanded && (
        <>
          <Text style={styles.othersHint}>{i18n.t('profile.othersHint')}</Text>
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
          {othersFooterSlot}
        </>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
  othersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  othersHeaderPressed: {
    opacity: 0.6,
  },
  othersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  othersRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  othersBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  othersBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  othersHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 2,
  },
});
