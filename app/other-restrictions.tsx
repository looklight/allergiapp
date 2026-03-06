import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import { Text, Checkbox, List, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RESTRICTION_CATEGORIES, RESTRICTION_ITEMS, RestrictionItemId, getRestrictionItemsByCategory } from '../constants/otherRestrictions';
import { DIET_MODES, DietModeId, DietMode } from '../constants/dietModes';
import { Language } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';

// Reusable toggle component for diet modes
function DietModeToggle({
  mode,
  isActive,
  animValue,
  onToggle,
}: {
  mode: DietMode;
  isActive: boolean;
  animValue: Animated.Value;
  onToggle: (enabled: boolean) => void;
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
      marginTop: mode.order === 1 ? 8 : 12,
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
        thumbColor={isActive ? mode.toggleColors.active : '#F4F3F4'}
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
  } = useAppContext();
  const [selectedRestrictions, setSelectedRestrictions] = useState<RestrictionItemId[]>(savedRestrictions);
  const [localDietModes, setLocalDietModes] = useState<DietModeId[]>(savedDietModes);

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

      // If vegan is activated, also activate vegetarian
      if (mode.id === 'vegan' && !newModes.includes('vegetarian')) {
        newModes.push('vegetarian');
        animateMode('vegetarian', 1);
      }
    } else {
      newModes = newModes.filter((id) => id !== mode.id);
      animateMode(mode.id, 0);

      // Handle autoSelectRestrictions removal
      if (mode.autoSelectRestrictions && mode.autoSelectRestrictions.length > 0) {
        setSelectedRestrictions((prev) => prev.filter((id) => !mode.autoSelectRestrictions!.includes(id)));
      }

      // If vegetarian is deactivated, also deactivate vegan
      if (mode.id === 'vegetarian' && newModes.includes('vegan')) {
        newModes = newModes.filter((id) => id !== 'vegan');
        animateMode('vegan', 0);
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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('otherRestrictions.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="bodyMedium" style={styles.subtitle}>
        {i18n.t('otherRestrictions.subtitle')}
      </Text>

      <ScrollView style={styles.list}>
        {/* Diet Mode Toggles - generated dynamically */}
        {DIET_MODES.map((mode) => (
          <DietModeToggle
            key={mode.id}
            mode={mode}
            isActive={isModeActive(mode.id)}
            animValue={animRefs[mode.id]}
            onToggle={(enabled) => handleDietModeToggle(mode, enabled)}
          />
        ))}

        {/* Lista alimenti */}
        {RESTRICTION_CATEGORIES.map((category) => {
          const items = getRestrictionItemsByCategory(category.id);
          return (
            <View key={category.id}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {i18n.t('otherRestrictions.foodsToAvoid')}
                </Text>
              </View>
              {items.map((item, index) => (
                <View key={item.id}>
                  <List.Item
                    title={
                      item.translations[locale] ||
                      item.translations.en
                    }
                    left={() => (
                      <Text style={styles.icon}>{item.icon}</Text>
                    )}
                    right={() => (
                      <Checkbox
                        status={
                          selectedRestrictions.includes(item.id)
                            ? 'checked'
                            : 'unchecked'
                        }
                        onPress={() => toggleRestriction(item.id)}
                      />
                    )}
                    onPress={() => toggleRestriction(item.id)}
                    style={styles.listItem}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedRestrictions.includes(item.id) }}
                    accessibilityLabel={item.translations[locale] || item.translations.en}
                  />
                  {index < items.length - 1 && <Divider />}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {i18n.t('otherRestrictions.save')} ({selectedRestrictions.length})
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
    color: '#FFFFFF',
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
  categoryHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItem: {
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginLeft: 16,
    marginRight: 8,
    alignSelf: 'center',
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
