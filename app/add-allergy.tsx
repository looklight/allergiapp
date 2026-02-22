import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Text, Checkbox, List, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { AllergenId, Language } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';

export default function AddAllergyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedAllergens: savedAllergens, setSelectedAllergens: saveAllergens, selectedRestrictions, pregnancyMode } = useAppContext();
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>(savedAllergens);

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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('addAllergy.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="bodyMedium" style={styles.subtitle}>
        {i18n.t('addAllergy.subtitle')}
      </Text>

      <ScrollView style={styles.list}>
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
          onPress={() => router.push('/other-restrictions')}
          style={({ pressed }) => [
            styles.otherRow,
            pressed && styles.otherRowPressed,
          ]}
        >
          <Text style={styles.otherIcon}>{pregnancyMode ? '🤰' : '📋'}</Text>
          <View style={styles.otherTextContainer}>
            <Text style={styles.otherTitle}>{i18n.t('otherRestrictions.other')}</Text>
            {pregnancyMode && (
              <Text style={styles.otherHint}>{i18n.t('otherRestrictions.pregnancyActive')}</Text>
            )}
          </View>
          <View style={styles.otherRight}>
            {selectedRestrictions.length > 0 && (
              <View style={[styles.otherBadge, pregnancyMode && styles.otherBadgePregnancy]}>
                <Text style={[styles.otherBadgeText, pregnancyMode && styles.otherBadgeTextPregnancy]}>{selectedRestrictions.length}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSecondary} />
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {i18n.t('addAllergy.save')} ({selectedAllergens.length + selectedRestrictions.length})
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
  listItem: {
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginLeft: 16,
    marginRight: 8,
    alignSelf: 'center',
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9F5FF',
  },
  otherRowPressed: {
    backgroundColor: '#F0EAFC',
  },
  otherIcon: {
    fontSize: 24,
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  otherBadgePregnancy: {
    backgroundColor: '#E91E63',
  },
  otherBadgeTextPregnancy: {
    color: '#FFFFFF',
  },
  otherHint: {
    fontSize: 12,
    color: '#E91E63',
    marginTop: 2,
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
