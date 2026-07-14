import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { getRestrictionById } from '../constants/foodRestrictions';
import DietaryChipsSelector from './restaurants/DietaryChipsSelector';
import i18n from '../utils/i18n';

interface DietaryNeedsPickerProps {
  allergens: string[];
  diets: string[];
  onAllergensChange: (allergens: string[]) => void;
  onDietsChange: (diets: string[]) => void;
  /** Valori dal profilo utente, per confronto e sync */
  profileAllergens: readonly string[];
  profileDiets: readonly string[];
  /** Salva nel profilo. Chiamato con i valori correnti; consentAt è il
   *  timestamp del consenso salute (art. 9 GDPR) quando raccolto qui. */
  onSyncProfile: (allergens: string[], diets: string[], consentAt?: string) => Promise<void>;
  lang: string;
  /** Parte espanso (default: false) */
  initialExpanded?: boolean;
  /** Sottotitolo personalizzato (sovrascrive il testo default) */
  subtitle?: string;
  /** Nasconde la riga icona+titolo: per i contesti dove il picker è annidato
   *  sotto un'intestazione che dice già la stessa cosa (es. toggle "Filtra per
   *  le mie esigenze" nel FilterModal). Il collasso resta sul link "Chiudi". */
  hideHeader?: boolean;
  /** Override del container (margini/radius nei contesti annidati) */
  style?: StyleProp<ViewStyle>;
}

export default function DietaryNeedsPicker({
  allergens,
  diets,
  onAllergensChange,
  onDietsChange,
  profileAllergens,
  profileDiets,
  onSyncProfile,
  lang,
  initialExpanded = false,
  subtitle,
  hideHeader = false,
  style,
}: DietaryNeedsPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { userProfile } = useAuth();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const hasNeeds = allergens.length > 0 || diets.length > 0;

  // Consenso salute (art. 9 GDPR): chi ha saltato le esigenze in onboarding
  // non l'ha mai dato — va raccolto qui prima di scrivere dati sul profilo.
  // Svuotare il profilo (hasNeeds false) è una rimozione e non lo richiede.
  const needsHealthConsent = !!userProfile && !userProfile.health_consent_at && hasNeeds;

  const profileAllergenSet = new Set(profileAllergens);
  const profileDietSet = new Set(profileDiets);
  const needsDifferFromProfile =
    allergens.length !== profileAllergenSet.size ||
    diets.length !== profileDietSet.size ||
    allergens.some(a => !profileAllergenSet.has(a)) ||
    diets.some(d => !profileDietSet.has(d));

  const handleToggleAllergen = (id: string) => {
    setJustSynced(false);
    onAllergensChange(
      allergens.includes(id) ? allergens.filter(a => a !== id) : [...allergens, id],
    );
  };

  const handleToggleDiet = (id: string) => {
    setJustSynced(false);
    onDietsChange(
      diets.includes(id) ? diets.filter(d => d !== id) : [...diets, id],
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSyncProfile(
        allergens,
        diets,
        needsHealthConsent ? new Date().toISOString() : undefined,
      );
      setJustSynced(true);
    } catch {
      // Errore gestito dal parent
    } finally {
      setSyncing(false);
    }
  };

  const renderNeedsPills = (containerStyle?: StyleProp<ViewStyle>) =>
    hasNeeds ? (
      <View style={[styles.chips, containerStyle]}>
        {allergens.map(code => {
          const a = getRestrictionById(code);
          return (
            <View key={code} style={styles.chip}>
              <Text style={styles.chipText}>
                {a ? (a.translations[lang as keyof typeof a.translations] ?? a.translations.en) : code}
              </Text>
            </View>
          );
        })}
        {diets.map(code => {
          const d = getRestrictionById(code);
          return (
            <View key={code} style={[styles.chip, styles.chipDiet]}>
              <Text style={styles.chipText}>
                {d ? (d.translations[lang as keyof typeof d.translations] ?? d.translations.en) : code}
              </Text>
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <View style={[styles.container, style]}>
      {!hideHeader && (
        <View style={styles.header}>
          <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.title}>{i18n.t('restaurants.dietaryPicker.title')}</Text>
          {expanded && (
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} activeOpacity={0.6}>
              <MaterialCommunityIcons name="chevron-up" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.description}>
        {subtitle
          ?? (hasNeeds
            ? i18n.t('restaurants.dietaryPicker.descriptionWithNeeds')
            : i18n.t('restaurants.dietaryPicker.descriptionEmpty'))}
      </Text>

      {/* Chip riepilogo (quando collassato) */}
      {!expanded && renderNeedsPills()}

      {/* Link Modifica/Aggiungi */}
      {!expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.6} style={styles.bottomLink}>
          <Text style={styles.bottomLinkText}>{hasNeeds ? i18n.t('common.edit') : i18n.t('restaurants.dietaryPicker.addNeeds')}</Text>
        </TouchableOpacity>
      )}

      {/* Editor espanso */}
      {expanded && (
        <View style={styles.editor}>
          {/* Riepilogo selezioni correnti */}
          {renderNeedsPills(styles.chipsExpanded)}
          {needsDifferFromProfile && (
            <View style={styles.syncCard}>
              <View style={styles.syncRow}>
                <Text style={styles.syncText}>{i18n.t('restaurants.dietaryPicker.syncTitle')}</Text>
                <TouchableOpacity
                  onPress={handleSync}
                  disabled={syncing || (needsHealthConsent && !consentChecked)}
                  activeOpacity={0.6}
                  style={[styles.syncBtn, needsHealthConsent && !consentChecked && styles.syncBtnDisabled]}
                >
                  {syncing
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Text style={styles.syncBtnText}>{i18n.t('common.save')}</Text>
                  }
                </TouchableOpacity>
              </View>
              {needsHealthConsent && (
                <TouchableOpacity
                  onPress={() => setConsentChecked(v => !v)}
                  style={styles.consentRow}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={consentChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={consentChecked ? theme.colors.primary : theme.colors.textSecondary}
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
          )}
          {justSynced && !needsDifferFromProfile && (
            <View style={styles.syncCardDone}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={theme.colors.success} />
              <Text style={styles.syncDone}>{i18n.t('restaurants.dietaryPicker.syncDone')}</Text>
            </View>
          )}
          <DietaryChipsSelector
            allergens={allergens}
            diets={diets}
            onToggleAllergen={handleToggleAllergen}
            onToggleDiet={handleToggleDiet}
            lang={lang}
            keyPrefix="dnp"
            // Con l'intestazione nascosta il chevron di chiusura trasloca
            // sulla prima riga dell'editor (accanto a "Diete").
            titleRight={hideHeader ? (
              <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} activeOpacity={0.6}>
                <MaterialCommunityIcons name="chevron-up" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            ) : undefined}
          />
          <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.6} style={styles.bottomLink}>
            <MaterialCommunityIcons name="chevron-up" size={16} color={theme.colors.primary} />
            <Text style={styles.bottomLinkText}>{i18n.t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chipsExpanded: {
    marginBottom: 6,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDiet: {},
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  bottomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 2,
  },
  bottomLinkText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  editor: {
    marginTop: 4,
    gap: 4,
  },
  syncCard: {
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  syncCardDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  syncText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  syncBtn: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncBtnDisabled: {
    opacity: 0.4,
  },
  syncBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  syncDone: {
    fontSize: 13,
    color: theme.colors.success,
  },
});
