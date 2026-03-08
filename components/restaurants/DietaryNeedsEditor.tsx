import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { ALLERGENS } from '../../constants/allergens';
import { DIETS } from '../../constants/diets';
import ChipGrid from '../ChipGrid';
import type { AllergenId, DietId, DietaryNeeds } from '../../types';

interface DietaryNeedsEditorProps {
  initialNeeds: DietaryNeeds;
  lang: string;
  onSave: (needs: DietaryNeeds) => Promise<void>;
}

export default function DietaryNeedsEditor({ initialNeeds, lang, onSave }: DietaryNeedsEditorProps) {
  const [allergens, setAllergens] = useState<AllergenId[]>(initialNeeds.allergens);
  const [diets, setDiets] = useState<DietId[]>(initialNeeds.diets);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    JSON.stringify([...allergens].sort()) !== JSON.stringify([...initialNeeds.allergens].sort()) ||
    JSON.stringify([...diets].sort()) !== JSON.stringify([...initialNeeds.diets].sort());

  const toggleAllergen = (id: string) => {
    setAllergens((prev) =>
      prev.includes(id as AllergenId)
        ? prev.filter((a) => a !== id)
        : [...prev, id as AllergenId]
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
      Alert.alert('Errore', 'Impossibile salvare le esigenze alimentari. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Diete e intolleranze</Text>
      <Text style={styles.sectionHint}>
        Seleziona le tue esigenze. Verranno associate automaticamente ai tuoi contributi.
      </Text>
      <ChipGrid
        items={DIETS}
        activeIds={diets}
        onToggle={toggleDiet}
        lang={lang}
        keyPrefix="diet"
      />

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Allergeni</Text>
      <ChipGrid
        items={ALLERGENS}
        activeIds={allergens}
        onToggle={toggleAllergen}
        lang={lang}
        keyPrefix="allergen"
      />

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving || !hasChanges}
        style={styles.saveButton}
        labelStyle={styles.saveButtonLabel}
      >
        Salva esigenze alimentari
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
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
