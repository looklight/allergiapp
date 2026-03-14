import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Checkbox, List, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { OTHER_FOODS, OTHER_FOOD_CATEGORIES, OtherFoodId, OtherFoodCategory } from '../constants/otherFoods';
import { DIET_MODES, DietModeId } from '../constants/dietModes';
import { AllergenId, Language } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../contexts/AppContext';
import { Analytics } from '../services/analytics';

export default function AddAllergyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedAllergens: savedAllergens, setSelectedAllergens: saveAllergens, selectedOtherFoods: savedOtherFoods, setSelectedOtherFoods: saveOtherFoods, selectedRestrictions, activeDietModes, vegetarianLevel, settings } = useAppContext();
  const activeModeConfigs = DIET_MODES.filter(m => activeDietModes.includes(m.id)).sort((a, b) => a.toggleOrder - b.toggleOrder);
  const hasActiveModes = activeModeConfigs.length > 0;
  // Count only manually-selected restrictions (not auto-selected by active diet modes)
  const autoSelectedIds = new Set(activeModeConfigs.flatMap(m => m.autoSelectRestrictions ?? []));
  const manualRestrictionsCount = selectedRestrictions.filter(id => !autoSelectedIds.has(id)).length;
  // Mode with highest medical priority (lowest cardOrder) — used for icon and badge color
  const primaryMode = hasActiveModes
    ? [...activeModeConfigs].sort((a, b) => a.cardOrder - b.cardOrder)[0]
    : null;
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>(savedAllergens);
  const [selectedOtherFoods, setSelectedOtherFoods] = useState<OtherFoodId[]>(savedOtherFoods);
  const [otherFoodsExpanded, setOtherFoodsExpanded] = useState(savedOtherFoods.length > 0);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const toggleAllergen = (id: AllergenId) => {
    setSelectedAllergens((prev) =>
      prev.includes(id)
        ? prev.filter((a) => a !== id)
        : [...prev, id]
    );
  };

  const toggleOtherFood = (id: OtherFoodId) => {
    setSelectedOtherFoods((prev) =>
      prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    // Traccia allergie aggiunte e rimosse
    const added = selectedAllergens.filter((id) => !savedAllergens.includes(id));
    const removed = savedAllergens.filter((id) => !selectedAllergens.includes(id));

    // Log eventi individuali per allergie aggiunte/rimosse
    for (const allergen of added) {
      await Analytics.logAllergyAdded(allergen);
    }
    for (const allergen of removed) {
      await Analytics.logAllergyRemoved(allergen);
    }

    // Log evento aggregato del salvataggio
    await Analytics.logAllergiesSaved(
      selectedAllergens,
      savedAllergens.length,
      selectedAllergens.length
    );

    await saveAllergens(selectedAllergens);
    await saveOtherFoods(selectedOtherFoods);

    // Update user properties for segmentation
    Analytics.updateUserProperties({
      allergenCount: selectedAllergens.length + selectedOtherFoods.length,
      dietModes: activeDietModes,
      cardLanguage: settings.cardLanguage,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('addAllergy.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="bodyMedium" style={styles.subtitle}>
        {i18n.t('addAllergy.subtitle')}
      </Text>

      <ScrollView style={styles.list}>
        <Pressable
          onPress={() => router.push('/other-restrictions')}
          style={({ pressed }) => [
            styles.otherRow,
            pressed && styles.otherRowPressed,
          ]}
        >
          <Text style={styles.otherIcon}>{primaryMode ? primaryMode.icon : '📋'}</Text>
          <View style={styles.otherTextContainer}>
            <Text style={styles.otherTitle}>{i18n.t('otherRestrictions.other')}</Text>
            {hasActiveModes && (
              <Text style={styles.otherHint}>
                {activeModeConfigs.map((m, i) => (
                  <Text key={m.id}>
                    {i > 0 && <Text style={{ color: theme.colors.textDisabled }}> · </Text>}
                    <Text style={{ color: m.toggleColors.active }}>
                      {m.id === 'vegetarian'
                        ? i18n.t(`otherRestrictions.vegetarianLevel_${vegetarianLevel}`)
                        : i18n.t(`otherRestrictions.${m.id}Label`)}
                    </Text>
                  </Text>
                ))}
              </Text>
            )}
          </View>
          <View style={styles.otherRight}>
            {hasActiveModes && (
              <View style={[styles.otherBadge, primaryMode && { backgroundColor: primaryMode.toggleColors.active }]}>
                <Text style={styles.otherBadgeText}>{activeDietModes.length}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
        <Divider />

        {ALLERGENS.map((allergen, index) => (
          <View key={allergen.id}>
            <List.Item
              title={
                allergen.translations[i18n.locale as Language] ||
                allergen.translations.en
              }
              left={() => (
                <Text style={styles.icon}>{allergen.icon}</Text>
              )}
              right={() => (
                <Checkbox
                  status={
                    selectedAllergens.includes(allergen.id)
                      ? 'checked'
                      : 'unchecked'
                  }
                  onPress={() => toggleAllergen(allergen.id)}
                />
              )}
              onPress={() => toggleAllergen(allergen.id)}
              style={styles.listItem}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedAllergens.includes(allergen.id) }}
              accessibilityLabel={allergen.translations[i18n.locale as Language] || allergen.translations.en}
            />
            {index < ALLERGENS.length - 1 && <Divider />}
          </View>
        ))}

        <Divider />
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOtherFoodsExpanded((prev) => !prev);
          }}
          style={({ pressed }) => [
            styles.otherFoodsHeader,
            pressed && styles.otherFoodsHeaderPressed,
          ]}
        >
          <Text style={styles.otherFoodsTitle}>{i18n.t('addAllergy.otherFoods')}</Text>
          <View style={styles.otherRight}>
            {selectedOtherFoods.length > 0 && (
              <View style={styles.otherFoodsBadge}>
                <Text style={styles.otherBadgeText}>{selectedOtherFoods.length}</Text>
              </View>
            )}
            <MaterialCommunityIcons
              name={otherFoodsExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.textSecondary}
            />
          </View>
        </Pressable>

        {otherFoodsExpanded && OTHER_FOODS.map((food, index) => {
          const prevCategory = index > 0 ? OTHER_FOODS[index - 1].category : null;
          const showCategoryHeader = food.category !== prevCategory;
          return (
            <View key={food.id}>
              {showCategoryHeader && (
                <Text style={styles.categoryHeader}>
                  {OTHER_FOOD_CATEGORIES[food.category][i18n.locale as Language] || OTHER_FOOD_CATEGORIES[food.category].en}
                </Text>
              )}
              <List.Item
                title={
                  food.translations[i18n.locale as Language] ||
                  food.translations.en
                }
                left={() => (
                  <Text style={styles.icon}>{food.icon}</Text>
                )}
                right={() => (
                  <Checkbox
                    status={
                      selectedOtherFoods.includes(food.id)
                        ? 'checked'
                        : 'unchecked'
                    }
                    onPress={() => toggleOtherFood(food.id)}
                  />
                )}
                onPress={() => toggleOtherFood(food.id)}
                style={styles.listItem}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectedOtherFoods.includes(food.id) }}
                accessibilityLabel={food.translations[i18n.locale as Language] || food.translations.en}
              />
              {index < OTHER_FOODS.length - 1 && <Divider />}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {i18n.t('addAllergy.save')} ({selectedAllergens.length + selectedOtherFoods.length + manualRestrictionsCount + activeDietModes.length})
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  subtitle: {
    padding: 16,
    paddingBottom: 8,
    color: theme.colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listItem: {
    paddingVertical: 8,
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: theme.colors.background,
  },
  icon: {
    fontSize: 24,
    lineHeight: 32,
    marginLeft: 16,
    marginRight: 8,
    alignSelf: 'center',
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.restrictionRowBg,
  },
  otherRowPressed: {
    backgroundColor: theme.colors.restrictionRowBgPressed,
  },
  otherIcon: {
    fontSize: 24,
    lineHeight: 32,
    marginRight: 8,
    marginLeft: 16,
  },
  otherTextContainer: {
    flex: 1,
  },
  otherTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  otherRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otherBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  otherBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  otherHint: {
    fontSize: 12,
    marginTop: 2,
  },
  otherFoodsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
  },
  otherFoodsHeaderPressed: {
    backgroundColor: theme.colors.restrictionRowBgPressed,
  },
  otherFoodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otherFoodsBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    paddingVertical: 4,
  },
});
