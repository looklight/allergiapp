import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import {
  FOOD_RESTRICTIONS,
  getRestrictionsByCategory,
  INTOLERANCE_RESTRICTION_IDS,
} from '../constants/foodRestrictions';
import {
  OTHER_FOODS,
  OTHER_FOOD_CATEGORIES,
  type OtherFood,
  type OtherFoodCategory,
} from '../constants/otherFoods';
import type { Language } from '../types';
import ChipGrid from './ChipGrid';
import DietaryNeedsChips from './DietaryNeedsChips';

const DIETS_GROUP = getRestrictionsByCategory('diet');
// Allergeni EU + le 2 intolleranze (istamina, nichel): 17 chip flat, quantità gestibile.
const EU_AND_INTOLERANCES_GROUP = FOOD_RESTRICTIONS.filter(
  r => r.category === 'eu_allergen' || r.category === 'intolerance',
);
// "Altri allergeni" = food_sensitivity, raggruppato per sotto-categoria (verdure, frutta, ecc).
const OTHER_ALLERGEN_CATEGORIES: OtherFoodCategory[] = ['vegetables', 'fruits', 'legumes_other', 'proteins'];
const OTHER_ALLERGENS_BY_CATEGORY: Record<OtherFoodCategory, readonly OtherFood[]> = {
  vegetables: OTHER_FOODS.filter(f => f.category === 'vegetables'),
  fruits: OTHER_FOODS.filter(f => f.category === 'fruits'),
  legumes_other: OTHER_FOODS.filter(f => f.category === 'legumes_other'),
  proteins: OTHER_FOODS.filter(f => f.category === 'proteins'),
};

interface DietaryNeedsPickerProps {
  allergens: string[];
  diets: string[];
  onAllergensChange: (allergens: string[]) => void;
  onDietsChange: (diets: string[]) => void;
  /** Valori dal profilo utente, per confronto e sync. Omettere per disabilitare la UI di sync. */
  profileAllergens?: readonly string[];
  profileDiets?: readonly string[];
  /** Salva nel profilo. Omettere per disabilitare la UI di sync. */
  onSyncProfile?: (allergens: string[], diets: string[]) => Promise<void>;
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
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Ordina per nome nella lingua corrente: "Altri allergeni" sono ordinati alfabeticamente
  // per categoria (più facile trovare l'alimento quando la lista è lunga).
  const sortByLang = useMemo(() => {
    return (a: OtherFood, b: OtherFood) => {
      const la = a.translations[lang as Language] ?? a.translations.en;
      const lb = b.translations[lang as Language] ?? b.translations.en;
      return la.localeCompare(lb, lang);
    };
  }, [lang]);

  const otherAllergensByCategory = useMemo(() => {
    const byCat = {} as Record<OtherFoodCategory, OtherFood[]>;
    for (const cat of OTHER_ALLERGEN_CATEGORIES) {
      byCat[cat] = [...OTHER_ALLERGENS_BY_CATEGORY[cat]].sort(sortByLang);
    }
    return byCat;
  }, [sortByLang]);

  // Selezioni in "Altri allergeni": servono per contatore e per la riga "sempre visibile" quando collassato.
  const selectedOtherFoods = useMemo(
    () => OTHER_FOODS.filter(f => allergens.includes(f.id)).sort(sortByLang),
    [allergens, sortByLang],
  );

  const hasNeeds = allergens.length > 0 || diets.length > 0;

  const syncEnabled = !!onSyncProfile && !!profileAllergens && !!profileDiets;
  const profileAllergenSet = new Set(profileAllergens ?? []);
  const profileDietSet = new Set(profileDiets ?? []);
  const needsDifferFromProfile = syncEnabled && (
    allergens.length !== profileAllergenSet.size ||
    diets.length !== profileDietSet.size ||
    allergens.some(a => !profileAllergenSet.has(a)) ||
    diets.some(d => !profileDietSet.has(d))
  );

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
    if (!onSyncProfile) return;
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Le tue esigenze alimentari</Text>
      </View>

      <Text style={styles.description}>
        {subtitle
          ?? (hasNeeds
            ? 'Questi dati aiutano altri utenti con le stesse esigenze a trovare ristoranti compatibili.'
            : 'Hai allergie o segui una dieta? Aggiungile per aiutare chi ha le tue stesse esigenze.')}
      </Text>

      {/* Chip riepilogo (quando collassato) */}
      {!expanded && hasNeeds && (
        <DietaryNeedsChips allergens={allergens} diets={diets} lang={lang} />
      )}

      {/* Link Modifica/Aggiungi */}
      {!expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.6} style={styles.bottomLink}>
          <Text style={styles.bottomLinkText}>{hasNeeds ? 'Modifica' : 'Aggiungi esigenze'}</Text>
        </TouchableOpacity>
      )}

      {/* Editor espanso */}
      {expanded && (
        <View style={styles.editor}>
          {needsDifferFromProfile && (
            <View style={styles.syncCard}>
              <Text style={styles.syncText}>Usa queste esigenze come predefinite</Text>
              <TouchableOpacity
                onPress={handleSync}
                disabled={syncing}
                activeOpacity={0.6}
                style={styles.syncBtn}
              >
                {syncing
                  ? <ActivityIndicator size="small" color={theme.colors.primary} />
                  : <Text style={styles.syncBtnText}>Salva</Text>
                }
              </TouchableOpacity>
            </View>
          )}
          {justSynced && !needsDifferFromProfile && (
            <View style={styles.syncCardDone}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={theme.colors.success} />
              <Text style={styles.syncDone}>Profilo aggiornato</Text>
            </View>
          )}
          <Text style={styles.editorLabel}>Diete</Text>
          <ChipGrid
            items={DIETS_GROUP}
            activeIds={diets}
            onToggle={handleToggleDiet}
            lang={lang}
            keyPrefix="dnp-diet"
            hideIcons
          />
          <Text style={[styles.editorLabel, { marginTop: 14 }]}>Allergeni e intolleranze</Text>
          <ChipGrid
            items={EU_AND_INTOLERANCES_GROUP}
            activeIds={[...diets, ...allergens]}
            onToggle={(id) => {
              if (INTOLERANCE_RESTRICTION_IDS.has(id)) {
                handleToggleDiet(id);
              } else {
                handleToggleAllergen(id);
              }
            }}
            lang={lang}
            keyPrefix="dnp-intol"
            hideIcons
          />

          {/* Altri allergeni — sotto-categorie collassabili. Quando chiuso mostra i selezionati. */}
          <TouchableOpacity
            onPress={() => setOtherExpanded(v => !v)}
            activeOpacity={0.6}
            style={[styles.otherHeader, { marginTop: 14 }]}
          >
            <Text style={styles.editorLabel}>
              Altri allergeni{selectedOtherFoods.length > 0 ? ` (${selectedOtherFoods.length})` : ''}
            </Text>
            <MaterialCommunityIcons
              name={otherExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Collassato + ha selezioni → riga chip selezionati (tap = deseleziona). */}
          {!otherExpanded && selectedOtherFoods.length > 0 && (
            <ChipGrid
              items={selectedOtherFoods}
              activeIds={allergens}
              onToggle={handleToggleAllergen}
              lang={lang}
              keyPrefix="dnp-other-sel"
              hideIcons
            />
          )}

          {/* Espanso → sotto-categorie. I chip già selezionati restano evidenziati nel loro gruppo. */}
          {otherExpanded && OTHER_ALLERGEN_CATEGORIES.map(cat => {
            const items = otherAllergensByCategory[cat];
            if (items.length === 0) return null;
            const label = OTHER_FOOD_CATEGORIES[cat][lang as Language] ?? OTHER_FOOD_CATEGORIES[cat].en;
            return (
              <View key={cat} style={styles.otherCategory}>
                <Text style={styles.subCategoryLabel}>{label}</Text>
                <ChipGrid
                  items={items}
                  activeIds={allergens}
                  onToggle={handleToggleAllergen}
                  lang={lang}
                  keyPrefix={`dnp-other-${cat}`}
                  hideIcons
                />
              </View>
            );
          })}

          <TouchableOpacity onPress={() => setExpanded(false)} activeOpacity={0.6} style={styles.bottomLink}>
            <MaterialCommunityIcons name="chevron-up" size={16} color={theme.colors.primary} />
            <Text style={styles.bottomLinkText}>Chiudi</Text>
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
  editorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  otherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  otherCategory: {
    marginTop: 8,
  },
  subCategoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    opacity: 0.8,
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
