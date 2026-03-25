import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import {
  FOOD_RESTRICTIONS,
  getRestrictionsByCategory,
  INTOLERANCE_RESTRICTION_IDS,
} from '../../constants/foodRestrictions';
import ChipGrid from '../../components/ChipGrid';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../utils/i18n';
import type { FoodRestrictionId, DietId } from '../../types';

const DIETS_GROUP = getRestrictionsByCategory('diet');
const ALLERGENS_GROUP = FOOD_RESTRICTIONS.filter(r => r.category !== 'diet');

export default function OnboardingDietaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [allergens, setAllergens] = useState<FoodRestrictionId[]>([]);
  const [diets, setDiets] = useState<DietId[]>([]);
  const [saving, setSaving] = useState(false);

  const hasSelection = allergens.length > 0 || diets.length > 0;

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
    if (!user) return;
    setSaving(true);
    try {
      await AuthService.updateDietaryNeeds(user.uid, { allergens, diets });
      await refreshProfile();
      router.dismiss(2); // Chiude onboarding + signup
    } catch {
      Alert.alert('Errore', 'Impossibile salvare. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.dismiss(2); // Chiude onboarding + signup
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Le tue esigenze</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color={theme.colors.primary} />
          <Text style={styles.introTitle}>Aiutaci a personalizzare la tua esperienza</Text>
          <Text style={styles.introText}>
            Seleziona le tue allergie e diete. Verranno associate automaticamente alle tue recensioni,
            così altri utenti con le stesse esigenze potranno trovare i ristoranti giusti.
          </Text>
          <Text style={styles.introNote}>
            Potrai modificarle in qualsiasi momento dal tuo profilo.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{i18n.t('profile.diets')}</Text>
        <ChipGrid
          items={DIETS_GROUP}
          activeIds={diets}
          onToggle={toggleDiet}
          lang={i18n.locale}
          keyPrefix="diet"
        />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{i18n.t('profile.allergensIntolerances')}</Text>
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
          lang={i18n.locale}
          keyPrefix="intol"
        />

        <Text style={styles.gdprNote}>
          I dati sulle tue allergie sono trattati come dati sanitari ai sensi del GDPR.
          Salvando, acconsenti al loro trattamento per migliorare l'esperienza della community.
        </Text>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !hasSelection}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          Salva e continua
        </Button>

        <TouchableOpacity onPress={handleSkip} style={styles.skipRow}>
          <Text style={styles.skipText}>Non ho allergie o esigenze particolari</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
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
  content: {
    padding: 24,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  introNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  gdprNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  saveButton: {
    borderRadius: 10,
  },
  saveButtonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  skipRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
