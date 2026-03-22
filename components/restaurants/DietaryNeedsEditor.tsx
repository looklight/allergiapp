import { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import {
  FOOD_RESTRICTIONS,
  getRestrictionsByCategory,
  INTOLERANCE_RESTRICTION_IDS,
} from '../../constants/foodRestrictions';
import ChipGrid from '../ChipGrid';
import i18n from '../../utils/i18n';
import type { FoodRestrictionId, DietId, DietaryNeeds } from '../../types';

// Stessi gruppi di add-review: diete separate, tutto il resto insieme
const DIETS_GROUP = getRestrictionsByCategory('diet');
const ALLERGENS_GROUP = FOOD_RESTRICTIONS.filter(r => r.category !== 'diet');

interface DietaryNeedsEditorProps {
  initialNeeds: DietaryNeeds;
  lang: string;
  onSave: (needs: DietaryNeeds) => Promise<void>;
}

export default function DietaryNeedsEditor({ initialNeeds, lang, onSave }: DietaryNeedsEditorProps) {
  const [allergens, setAllergens] = useState<FoodRestrictionId[]>([...initialNeeds.allergens]);
  const [diets, setDiets] = useState<DietId[]>([...initialNeeds.diets]);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    JSON.stringify([...allergens].sort()) !== JSON.stringify([...initialNeeds.allergens].sort()) ||
    JSON.stringify([...diets].sort()) !== JSON.stringify([...initialNeeds.diets].sort());

  const toggleAllergen = (id: string) => {
    setAllergens((prev) =>
      prev.includes(id as FoodRestrictionId)
        ? prev.filter((a) => a !== id)
        : [...prev, id as FoodRestrictionId]
    );
  };

  const toggleDiet = (id: string) => {
    setDiets((prev) =>
      prev.includes(id as DietId)
        ? prev.filter((d) => d !== id)
        : [...prev, id as DietId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ allergens, diets });
    } catch {
      Alert.alert(i18n.t('profile.error'), i18n.t('profile.saveDietaryError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {hasChanges && (
        <TouchableOpacity style={styles.unsavedBanner} onPress={handleSave} activeOpacity={0.85}>
          <MaterialCommunityIcons name="content-save-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.unsavedBannerText}>Modifiche non salvate</Text>
          <Text style={styles.unsavedBannerAction}>{saving ? 'Salvataggio...' : 'Salva'}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>{i18n.t('profile.diets')}</Text>
      <Text style={styles.sectionHint}>
        {i18n.t('profile.dietaryHint')}
      </Text>
      <ChipGrid
        items={DIETS_GROUP}
        activeIds={diets}
        onToggle={toggleDiet}
        lang={lang}
        keyPrefix="diet"
      />

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{i18n.t('profile.allergensIntolerances')}</Text>
      <ChipGrid
        items={ALLERGENS_GROUP}
        activeIds={[...diets, ...allergens]}
        onToggle={(id) => {
          if (INTOLERANCE_RESTRICTION_IDS.has(id)) {
            toggleDiet(id);
          } else {
            toggleAllergen(id);
          }
        }}
        lang={lang}
        keyPrefix="intol"
      />

      {hasChanges && (
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          {i18n.t('profile.saveDietary')}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  unsavedBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  unsavedBannerAction: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 10,
    marginTop: 20,
  },
  saveButtonLabel: {
    fontSize: 16,
  },
});
