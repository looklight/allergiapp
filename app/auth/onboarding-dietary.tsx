import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import DietaryChipsSelector from '../../components/restaurants/DietaryChipsSelector';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../utils/i18n';
import type { FoodRestrictionId, DietId } from '../../types';

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
    setConfirmedNoNeeds(false);
    setAllergens((prev) =>
      prev.includes(id as FoodRestrictionId)
        ? prev.filter((a) => a !== id)
        : [...prev, id as FoodRestrictionId]
    );
  };

  const toggleDiet = (id: string) => {
    setConfirmedNoNeeds(false);
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
      Alert.alert(i18n.t('common.error'), i18n.t('onboardingDietary.alerts.saveError.message'));
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
        <Text style={styles.headerTitle}>{i18n.t('onboardingDietary.headerTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color={theme.colors.primary} />
          <Text style={styles.introTitle}>{i18n.t('onboardingDietary.introTitle')}</Text>
          <Text style={styles.introText}>{i18n.t('onboardingDietary.introText')}</Text>
        </View>

        <DietaryChipsSelector
          allergens={allergens}
          diets={diets}
          onToggleAllergen={toggleAllergen}
          onToggleDiet={toggleDiet}
          lang={i18n.locale}
          keyPrefix="onboarding"
        />

        <TouchableOpacity onPress={handleSkip} style={styles.skipRow}>
          <Text style={styles.skipText}>{i18n.t('onboardingDietary.skipLink')}</Text>
        </TouchableOpacity>

        {confirmedNoNeeds && (
          <View style={styles.noNeedsNote}>
            <MaterialCommunityIcons name="heart-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.noNeedsNoteText}>{i18n.t('onboardingDietary.noNeedsNote')}</Text>
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
          {i18n.t('onboardingDietary.saveButton')}
        </Button>
        {hasSelection && (
          <TouchableOpacity
            onPress={() => setHealthConsent(v => !v)}
            style={styles.consentRow}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={healthConsent ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={healthConsent ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={styles.consentText}>
              {i18n.t('onboardingDietary.consentPart1')}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/legal?tab=privacy')}
              >
                {i18n.t('onboardingDietary.consentLink')}
              </Text>
              {i18n.t('onboardingDietary.consentPart2')}
            </Text>
          </TouchableOpacity>
        )}
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  consentLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
