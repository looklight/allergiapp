import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated } from 'react-native';
import { Text, Checkbox, List, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RESTRICTION_CATEGORIES, RESTRICTION_ITEMS, RestrictionItemId, getRestrictionItemsByCategory } from '../constants/otherRestrictions';
import { Language } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';

export default function OtherRestrictionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    selectedRestrictions: savedRestrictions,
    setSelectedRestrictions: saveRestrictions,
    pregnancyMode: savedPregnancyMode,
    setPregnancyMode: savePregnancyMode,
  } = useAppContext();
  const [selectedRestrictions, setSelectedRestrictions] = useState<RestrictionItemId[]>(savedRestrictions);
  const [pregnancyMode, setPregnancyMode] = useState(savedPregnancyMode);
  const toggleAnim = useRef(new Animated.Value(savedPregnancyMode ? 1 : 0)).current;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handlePregnancyToggle = (enabled: boolean) => {
    setPregnancyMode(enabled);
    Animated.spring(toggleAnim, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    const pregnancyItemIds = getRestrictionItemsByCategory('pregnancy').map((item) => item.id);
    if (enabled) {
      setSelectedRestrictions((prev) => {
        const combined = new Set([...prev, ...pregnancyItemIds]);
        return Array.from(combined);
      });
    } else {
      setSelectedRestrictions((prev) => prev.filter((id) => !pregnancyItemIds.includes(id)));
    }
  };

  const toggleBgColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, '#FFF0F5'],
  });
  const toggleBorderColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, '#F8BBD0'],
  });
  const hintOpacity = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const toggleRestriction = (id: RestrictionItemId) => {
    setSelectedRestrictions((prev) =>
      prev.includes(id)
        ? prev.filter((r) => r !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    await saveRestrictions(selectedRestrictions);
    await savePregnancyMode(pregnancyMode);
    router.back();
  };

  const handleBack = async () => {
    await saveRestrictions(selectedRestrictions);
    await savePregnancyMode(pregnancyMode);
    router.back();
  };

  const locale = i18n.locale as Language;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={handleBack}
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
        {/* Toggle Gravidanza */}
        <Animated.View style={[styles.pregnancyToggle, {
          backgroundColor: toggleBgColor,
          borderColor: toggleBorderColor,
        }]}>
          <View style={styles.pregnancyToggleLeft}>
            <Text style={styles.pregnancyIcon}>🤰</Text>
            <View style={styles.pregnancyTextContainer}>
              <Text style={styles.pregnancyTitle}>{i18n.t('otherRestrictions.pregnancyToggle')}</Text>
              <Animated.Text style={[styles.pregnancyHint, { opacity: hintOpacity }]}>
                {i18n.t('otherRestrictions.pregnancyHint')}
              </Animated.Text>
            </View>
          </View>
          <Switch
            value={pregnancyMode}
            onValueChange={handlePregnancyToggle}
            trackColor={{ false: theme.colors.border, true: '#F48FB1' }}
            thumbColor={pregnancyMode ? '#E91E63' : '#F4F3F4'}
          />
        </Animated.View>

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
  pregnancyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pregnancyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  pregnancyIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  pregnancyTextContainer: {
    flex: 1,
  },
  pregnancyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  pregnancyHint: {
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
