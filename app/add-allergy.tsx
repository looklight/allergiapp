import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, LayoutAnimation, Platform, UIManager, TextInput } from 'react-native';
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
  const [otherFoodsExpanded, setOtherFoodsExpanded] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const locale = i18n.locale as Language;
  const normalizedQuery = searchQuery.toLowerCase().trim();
  const isSearching = searchActive && normalizedQuery.length > 0;

  const filteredAllergens = isSearching
    ? ALLERGENS.filter(a => (a.translations[locale] || a.translations.en).toLowerCase().includes(normalizedQuery))
    : ALLERGENS;

  const filteredOtherFoods = isSearching
    ? OTHER_FOODS.filter(f => (f.translations[locale] || f.translations.en).toLowerCase().includes(normalizedQuery))
    : OTHER_FOODS;

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

    // Traccia other foods aggiunti e rimossi
    const addedFoods = selectedOtherFoods.filter((id) => !savedOtherFoods.includes(id));
    const removedFoods = savedOtherFoods.filter((id) => !selectedOtherFoods.includes(id));

    for (const food of addedFoods) {
      await Analytics.logOtherFoodAdded(food);
    }
    for (const food of removedFoods) {
      await Analytics.logOtherFoodRemoved(food);
    }

    await Analytics.logOtherFoodsSaved(
      selectedOtherFoods,
      savedOtherFoods.length,
      selectedOtherFoods.length
    );

    await saveAllergens(selectedAllergens);
    await saveOtherFoods(selectedOtherFoods);

    // Update user properties for segmentation
    Analytics.updateUserProperties({
      allergenCount: selectedAllergens.length + selectedOtherFoods.length,
      allergenIds: selectedAllergens,
      otherFoodIds: selectedOtherFoods,
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
          onPress={() => {
            if (searchActive) {
              setSearchActive(false);
              setSearchQuery('');
            } else {
              router.back();
            }
          }}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        {searchActive ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n.t('addAllergy.searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoFocus
              returnKeyType="search"
              selectionColor={theme.colors.onPrimary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.headerTitle}>{i18n.t('addAllergy.title')}</Text>
        )}
        {!searchActive && (
          <TouchableOpacity
            onPress={() => setSearchActive(true)}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {!searchActive && (
        <Text variant="bodyMedium" style={styles.subtitle}>
          {i18n.t('addAllergy.subtitle')}
        </Text>
      )}

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {!isSearching && (
          <>
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
          </>
        )}

        {isSearching && filteredAllergens.length === 0 && filteredOtherFoods.length === 0 && (
          <View style={styles.emptySearch}>
            <MaterialCommunityIcons name="magnify" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.emptySearchText}>{i18n.t('addAllergy.noResults')}</Text>
          </View>
        )}

        {filteredAllergens.length > 0 && (
          <>
            {isSearching && (
              <Text style={styles.searchSectionLabel}>{i18n.t('addAllergy.allergens')}</Text>
            )}
            {filteredAllergens.map((allergen, index) => (
              <View key={allergen.id}>
                <List.Item
                  title={allergen.translations[locale] || allergen.translations.en}
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
                  accessibilityLabel={allergen.translations[locale] || allergen.translations.en}
                />
                {index < filteredAllergens.length - 1 && <Divider />}
              </View>
            ))}
          </>
        )}

        {!isSearching && (
          <>
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
          </>
        )}

        {(isSearching ? filteredOtherFoods.length > 0 : otherFoodsExpanded) && (
          <>
            {isSearching && (
              <Text style={styles.searchSectionLabel}>{i18n.t('addAllergy.otherFoods')}</Text>
            )}
            {(isSearching ? filteredOtherFoods : OTHER_FOODS).map((food, index, arr) => {
              const showCategoryHeader = !isSearching && (index === 0 || food.category !== arr[index - 1].category);
              return (
                <View key={food.id}>
                  {showCategoryHeader && (
                    <Text style={styles.categoryHeader}>
                      {OTHER_FOOD_CATEGORIES[food.category][locale] || OTHER_FOOD_CATEGORIES[food.category].en}
                    </Text>
                  )}
                  <List.Item
                    title={food.translations[locale] || food.translations.en}
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
                    accessibilityLabel={food.translations[locale] || food.translations.en}
                  />
                  {index < arr.length - 1 && <Divider />}
                </View>
              );
            })}
          </>
        )}
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
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.onPrimary,
    fontSize: 16,
    paddingVertical: 0,
  },
  searchSectionLabel: {
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
  emptySearch: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptySearchText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
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
