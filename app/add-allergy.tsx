import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Checkbox, List, Button, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { storage } from '../utils/storage';
import { ALLERGENS } from '../constants/allergens';
import { AllergenId } from '../types';
import i18n from '../utils/i18n';

export default function AddAllergyScreen() {
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAllergens();
    }, [])
  );

  const loadAllergens = async () => {
    const allergens = await storage.getSelectedAllergens();
    setSelectedAllergens(allergens);
  };

  const toggleAllergen = (id: AllergenId) => {
    setSelectedAllergens((prev) =>
      prev.includes(id)
        ? prev.filter((a) => a !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    await storage.setSelectedAllergens(selectedAllergens);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: i18n.t('addAllergy.title'),
        }}
      />

      <Text variant="bodyMedium" style={styles.subtitle}>
        {i18n.t('addAllergy.subtitle')}
      </Text>

      <ScrollView style={styles.list}>
        {ALLERGENS.map((allergen, index) => (
          <View key={allergen.id}>
            <List.Item
              title={
                allergen.translations[i18n.locale as 'it' | 'en'] ||
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
            />
            {index < ALLERGENS.length - 1 && <Divider />}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          {i18n.t('addAllergy.save')} ({selectedAllergens.length})
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  subtitle: {
    padding: 16,
    paddingBottom: 8,
    color: '#666666',
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
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    paddingVertical: 4,
  },
});
