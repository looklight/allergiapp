import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
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
  /** Salva nel profilo. Chiamato con i valori correnti. */
  onSyncProfile: (allergens: string[], diets: string[]) => Promise<void>;
  lang: string;
  /** Parte espanso (default: false) */
  initialExpanded?: boolean;
  /** Sottotitolo personalizzato (sovrascrive il testo default) */
  subtitle?: string;
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
}: DietaryNeedsPickerProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const hasNeeds = allergens.length > 0 || diets.length > 0;

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
      await onSyncProfile(allergens, diets);
      setJustSynced(true);
    } catch {
      // Errore gestito dal parent
    } finally {
      setSyncing(false);
    }
  };

  const renderNeedsPills = (containerStyle?: object) =>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>{i18n.t('restaurants.dietaryPicker.title')}</Text>
        {expanded && (
          <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="chevron-up" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

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
              <Text style={styles.syncText}>{i18n.t('restaurants.dietaryPicker.syncTitle')}</Text>
              <TouchableOpacity
                onPress={handleSync}
                disabled={syncing}
                activeOpacity={0.6}
                style={styles.syncBtn}
              >
                {syncing
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Text style={styles.syncBtnText}>{i18n.t('common.save')}</Text>
                }
              </TouchableOpacity>
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

const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipDiet: {},
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
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
  syncBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  syncDone: {
    fontSize: 13,
    color: theme.colors.success,
  },
});
