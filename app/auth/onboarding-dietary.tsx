import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Checkbox } from 'react-native-paper';
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
  const [confirmedNoNeeds, setConfirmedNoNeeds] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);

  const hasSelection = allergens.length > 0 || diets.length > 0;
  const canSave = (hasSelection && healthConsent) || confirmedNoNeeds;

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
      await AuthService.completeOnboarding(user.uid);
      await refreshProfile();
      router.replace('/auth/onboarding-tutorial');
    } catch {
      Alert.alert('Errore', 'Impossibile salvare. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setConfirmedNoNeeds(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.replace('/auth/onboarding-nickname')} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Le tue esigenze</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color={theme.colors.primary} />
          <Text style={styles.introTitle}>Trova le soluzioni giuste per te</Text>
          <Text style={styles.introText}>
            Indica le tue allergie e preferenze alimentari e trova subito i ristoranti più adatti a te.
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

        {hasSelection && (
          <TouchableOpacity
            onPress={() => setHealthConsent(v => !v)}
            style={styles.consentRow}
            activeOpacity={0.7}
          >
            <Checkbox
              status={healthConsent ? 'checked' : 'unchecked'}
              onPress={() => setHealthConsent(v => !v)}
              color={theme.colors.primary}
            />
            <Text style={styles.consentText}>
              Acconsento a salvare allergie e restrizioni sul mio profilo per personalizzare la ricerca ristoranti e per associarle alle mie recensioni, in modo da aiutare altri utenti con le stesse esigenze. Sono dati sulla salute (Art. 9 GDPR), revocabili dalle impostazioni.
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleSkip} style={styles.skipRow}>
          <Text style={styles.skipText}>Non ho allergie o esigenze particolari</Text>
        </TouchableOpacity>

        {confirmedNoNeeds && (
          <View style={styles.noNeedsNote}>
            <MaterialCommunityIcons name="heart-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.noNeedsNoteText}>
              AllergiApp funziona grazie alle recensioni degli utenti. Indicare le proprie esigenze aiuta altri con le stesse allergie o diete a trovare i ristoranti giusti. Puoi aggiungerle in qualsiasi momento dal tuo profilo.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !canSave}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          Salva e continua
        </Button>
        <Text style={styles.saveNote}>Potrai modificarle in qualsiasi momento dal tuo profilo.</Text>
      </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    paddingTop: 8,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    borderRadius: 10,
  },
  saveButtonLabel: {
    fontSize: 16,
    paddingVertical: 4,
  },
  saveNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
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
  noNeedsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  noNeedsNoteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    lineHeight: 18,
  },
});
