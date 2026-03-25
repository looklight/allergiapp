import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import ChipGrid from '../ChipGrid';
import DietaryNeedsPicker from '../DietaryNeedsPicker';
import type { RestaurantCategoryId, AppLanguage } from '../../types';
import type { SortBy } from '../../services/restaurantService';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'distance', label: 'Distanza' },
  { key: 'recent', label: 'Recenti' },
  { key: 'rating', label: 'Stelle' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  // Filtri categoria
  activeFilters: RestaurantCategoryId[];
  onToggleFilter: (id: RestaurantCategoryId) => void;
  // Ordinamento
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  // Per le mie esigenze
  forMyNeeds: boolean;
  onToggleMyNeeds: () => void;
  filterAllergens: string[];
  filterDiets: string[];
  onAllergensChange: (a: string[]) => void;
  onDietsChange: (d: string[]) => void;
  profileAllergens: string[];
  profileDiets: string[];
  onSyncProfile: (allergens: string[], diets: string[]) => Promise<void>;
  // Reset
  hasActiveSettings: boolean;
  onReset: () => void;
  lang: AppLanguage;
};

export default function FilterModal({
  visible,
  onClose,
  activeFilters,
  onToggleFilter,
  sortBy,
  onSortChange,
  forMyNeeds,
  onToggleMyNeeds,
  filterAllergens,
  filterDiets,
  onAllergensChange,
  onDietsChange,
  profileAllergens,
  profileDiets,
  onSyncProfile,
  hasActiveSettings,
  onReset,
  lang,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtri</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.6}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Per le mie esigenze */}
            <View style={styles.section}>
              <TouchableOpacity onPress={onToggleMyNeeds} style={styles.myNeedsToggle} activeOpacity={0.7}>
                <MaterialCommunityIcons name="shield-check" size={18} color={theme.colors.primary} />
                <Text style={styles.myNeedsText}>Filtra per le mie esigenze</Text>
                <View style={[styles.switchTrack, forMyNeeds && styles.switchTrackActive]}>
                  <View style={[styles.switchThumb, forMyNeeds && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
              {forMyNeeds && (
                <>
                  <View style={{ height: 12 }} />
                  <DietaryNeedsPicker
                    allergens={filterAllergens}
                    diets={filterDiets}
                    onAllergensChange={onAllergensChange}
                    onDietsChange={onDietsChange}
                    profileAllergens={profileAllergens}
                    profileDiets={profileDiets}
                    onSyncProfile={onSyncProfile}
                    lang={lang}
                    subtitle="Mostra i ristoranti con recensioni di utenti che condividono le tue stesse esigenze."
                  />
                </>
              )}
            </View>

            {/*
              CATEGORIE DIETETICHE (gluten_free, vegan, vegetarian) — nascoste intenzionalmente.
              Mostrare questi filtri senza una certificazione ufficiale crea ambiguità con il
              profilo allergie dell'utente e un falso senso di sicurezza (es. celiaci).
              Da riabilitare quando sarà disponibile il sistema di "ristoranti certificati"
              con badge verificato — in quel contesto il filtro avrà una garanzia reale.
              I dati continuano ad essere raccolti nel DB tramite i voti community.
            */}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tipo di cucina</Text>
              <ChipGrid
                items={CUISINE_CATEGORIES}
                activeIds={activeFilters}
                onToggle={(id) => onToggleFilter(id as RestaurantCategoryId)}
                lang={lang}
              />
            </View>

            {/* Ordina per */}
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={styles.sectionLabel}>Ordina per</Text>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map(opt => {
                  const isActive = sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => onSortChange(opt.key)}
                      style={[styles.chip, isActive && styles.chipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {hasActiveSettings ? (
              <TouchableOpacity onPress={onReset} style={styles.resetButton} activeOpacity={0.7}>
                <Text style={styles.resetText}>Resetta filtri</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={onClose} style={styles.applyButton} activeOpacity={0.7}>
              <Text style={styles.applyText}>Applica</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  section: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  myNeedsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  myNeedsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: theme.colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
