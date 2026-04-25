import { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import DietaryChipsSelector from './DietaryChipsSelector';
import i18n from '../../utils/i18n';
import type { FoodRestrictionId, DietId, DietaryNeeds } from '../../types';

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
      <DietaryChipsSelector
        allergens={allergens}
        diets={diets}
        onToggleAllergen={toggleAllergen}
        onToggleDiet={toggleDiet}
        lang={lang}
        showHint
        keyPrefix="editor"
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
  saveButton: {
    borderRadius: 10,
    marginTop: 20,
  },
  saveButtonLabel: {
    fontSize: 16,
  },
});
