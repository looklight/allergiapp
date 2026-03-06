import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RESTRICTION_ITEMS, RestrictionItemId, RestrictionCategoryId } from '../constants/otherRestrictions';
import { DIET_MODES, DietModeId, DietMode, VegetarianLevel, DEFAULT_VEGETARIAN_LEVEL } from '../constants/dietModes';
import { Language } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../contexts/AppContext';

const VEGETARIAN_LEVELS: VegetarianLevel[] = ['no_meat', 'no_meat_fish', 'no_animal_products'];

const SORTED_DIET_MODES = [...DIET_MODES].sort((a, b) => a.toggleOrder - b.toggleOrder);

// Reusable toggle component for diet modes
function DietModeToggle({
  mode,
  isActive,
  animValue,
  onToggle,
  isFirst,
}: {
  mode: DietMode;
  isActive: boolean;
  animValue: Animated.Value;
  onToggle: (enabled: boolean) => void;
  isFirst: boolean;
}) {
  const bgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, mode.toggleColors.activeBg],
  });
  const borderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, mode.toggleColors.activeBorder],
  });
  const hintOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const i18nKey = `otherRestrictions.${mode.id}Toggle` as const;
  const hintKey = `otherRestrictions.${mode.id}Hint` as const;

  return (
    <Animated.View style={[styles.dietModeToggle, {
      backgroundColor: bgColor,
      borderColor: borderColor,
      marginTop: isFirst ? 8 : 12,
    }]}>
      <View style={styles.dietModeToggleLeft}>
        <Text style={styles.dietModeIcon}>{mode.icon}</Text>
        <View style={styles.dietModeTextContainer}>
          <Text style={styles.dietModeTitle}>{i18n.t(i18nKey)}</Text>
          <Animated.Text style={[styles.dietModeHint, { opacity: hintOpacity }]}>
            {i18n.t(hintKey)}
          </Animated.Text>
        </View>
      </View>
      <Switch
        value={isActive}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: mode.toggleColors.activeBorder }}
        thumbColor={isActive ? mode.toggleColors.active : theme.colors.switchThumbInactive}
      />
    </Animated.View>
  );
}

export default function OtherRestrictionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    selectedRestrictions: savedRestrictions,
    setSelectedRestrictions: saveRestrictions,
    activeDietModes: savedDietModes,
    setActiveDietModes: saveDietModes,
    vegetarianLevel: savedVegetarianLevel,
    setVegetarianLevel: saveVegetarianLevel,
  } = useAppContext();
  const [selectedRestrictions, setSelectedRestrictions] = useState<RestrictionItemId[]>(savedRestrictions);
  const [localDietModes, setLocalDietModes] = useState<DietModeId[]>(savedDietModes);
  const [localVegetarianLevel, setLocalVegetarianLevel] = useState<VegetarianLevel>(savedVegetarianLevel);

  // Create animation values for each diet mode
  const animRefs = useRef<Record<DietModeId, Animated.Value>>(
    DIET_MODES.reduce((acc, mode) => {
      acc[mode.id] = new Animated.Value(savedDietModes.includes(mode.id) ? 1 : 0);
      return acc;
    }, {} as Record<DietModeId, Animated.Value>)
  ).current;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  // Mantiene l'ordine di RESTRICTION_ITEMS quando si aggiungono elementi
  const sortByDefinitionOrder = (ids: RestrictionItemId[]) => {
    const idSet = new Set(ids);
    return RESTRICTION_ITEMS.filter((item) => idSet.has(item.id)).map((item) => item.id);
  };

  const animateMode = (modeId: DietModeId, toValue: number) => {
    Animated.spring(animRefs[modeId], {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const isModeActive = (modeId: DietModeId) => localDietModes.includes(modeId);

  const handleDietModeToggle = (mode: DietMode, enabled: boolean) => {
    let newModes = [...localDietModes];

    if (enabled) {
      if (!newModes.includes(mode.id)) {
        newModes.push(mode.id);
      }
      animateMode(mode.id, 1);

      // Handle autoSelectRestrictions (e.g., pregnancy adds food items)
      if (mode.autoSelectRestrictions && mode.autoSelectRestrictions.length > 0) {
        setSelectedRestrictions((prev) => sortByDefinitionOrder([...prev, ...mode.autoSelectRestrictions!]));
      }
    } else {
      newModes = newModes.filter((id) => id !== mode.id);
      animateMode(mode.id, 0);

      // Handle autoSelectRestrictions removal
      if (mode.autoSelectRestrictions && mode.autoSelectRestrictions.length > 0) {
        setSelectedRestrictions((prev) => prev.filter((id) => !mode.autoSelectRestrictions!.includes(id)));
      }
    }

    setLocalDietModes(newModes);
  };

  const toggleRestriction = (id: RestrictionItemId) => {
    setSelectedRestrictions((prev) =>
      prev.includes(id)
        ? prev.filter((r) => r !== id)
        : sortByDefinitionOrder([...prev, id])
    );
  };

  const handleSave = async () => {
    await saveRestrictions(selectedRestrictions);
    await saveDietModes(localDietModes);
    await saveVegetarianLevel(localVegetarianLevel);
    router.back();
  };

  const locale = i18n.locale as Language;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={handleSave}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('otherRestrictions.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="bodyMedium" style={styles.subtitle}>
        {i18n.t('otherRestrictions.subtitle')}
      </Text>

      <ScrollView style={styles.list}>
        {/* Diet Mode Toggles */}
        {SORTED_DIET_MODES.map((mode, index) => (
          <View key={mode.id}>
            <DietModeToggle
              mode={mode}
              isActive={isModeActive(mode.id)}
              animValue={animRefs[mode.id]}
              onToggle={(enabled) => handleDietModeToggle(mode, enabled)}
              isFirst={index === 0}
            />
            {/* Vegetarian level radio buttons */}
            {mode.id === 'vegetarian' && isModeActive('vegetarian') && (
              <View style={styles.levelContainer}>
                {VEGETARIAN_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={styles.levelRow}
                    onPress={() => setLocalVegetarianLevel(level)}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      styles.radioOuter,
                      localVegetarianLevel === level && { borderColor: mode.toggleColors.active },
                    ]}>
                      {localVegetarianLevel === level && (
                        <View style={[styles.radioInner, { backgroundColor: mode.toggleColors.active }]} />
                      )}
                    </View>
                    <View style={styles.levelTextContainer}>
                      <Text style={[
                        styles.levelTitle,
                        localVegetarianLevel === level && { color: mode.toggleColors.active },
                      ]}>
                        {i18n.t(`otherRestrictions.vegetarianLevel_${level}`)}
                        {level === 'no_animal_products' && (
                          <Text style={{ color: theme.colors.success, fontWeight: '400' }}> ({i18n.t('otherRestrictions.vegetarianVeganTag')})</Text>
                        )}
                      </Text>
                      <Text style={styles.levelHint}>
                        {i18n.t(`otherRestrictions.vegetarianLevelHint_${level}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Restriction items (inline checkboxes) for modes with autoSelectRestrictions */}
            {mode.autoSelectRestrictions && mode.autoSelectRestrictions.length > 0 && isModeActive(mode.id) && (
              <View style={styles.levelContainer}>
                <Text style={styles.pregnancySectionLabel}>{i18n.t('otherRestrictions.foodsToAvoid')}</Text>
                {RESTRICTION_ITEMS
                  .filter((item) => item.categoryId === (mode.id as RestrictionCategoryId))
                  .map((item) => {
                  const isChecked = selectedRestrictions.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.levelRow}
                      onPress={() => toggleRestriction(item.id)}
                      activeOpacity={0.6}
                    >
                      <View style={[
                        styles.checkboxOuter,
                        isChecked && { borderColor: mode.toggleColors.active, backgroundColor: mode.toggleColors.active },
                      ]}>
                        {isChecked && (
                          <MaterialCommunityIcons name="check" size={14} color={theme.colors.onPrimary} />
                        )}
                      </View>
                      <Text style={styles.pregnancyItemIcon}>{item.icon}</Text>
                      <Text style={[
                        styles.levelTitle,
                        isChecked && { color: mode.toggleColors.active },
                      ]}>
                        {item.translations[locale] || item.translations.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {i18n.t('otherRestrictions.save')}
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
  dietModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dietModeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  dietModeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  dietModeTextContainer: {
    flex: 1,
  },
  dietModeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dietModeHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  levelContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pregnancyItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  pregnancySectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
  },
  levelTextContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  levelHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    paddingVertical: 4,
  },
});
