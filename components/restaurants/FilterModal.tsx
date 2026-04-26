import { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { CUISINE_CATEGORIES } from '../../constants/restaurantCategories';
import ChipGrid from '../ChipGrid';
import DietaryNeedsPicker from '../DietaryNeedsPicker';
import i18n from '../../utils/i18n';
import type { RestaurantCategoryId, AppLanguage } from '../../types';

export type FilterApplyResult = {
  filters: RestaurantCategoryId[];
  forMyNeeds: boolean;
  allergens: string[];
  diets: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  // Valori iniziali (snapshot all'apertura del modal)
  activeFilters: RestaurantCategoryId[];
  forMyNeeds: boolean;
  filterAllergens: string[];
  filterDiets: string[];
  // Profilo (per DietaryNeedsPicker)
  profileAllergens: string[];
  profileDiets: string[];
  onSyncProfile: (allergens: string[], diets: string[]) => Promise<void>;
  // Auth
  isAuthenticated: boolean;
  onRequestLogin: () => void;
  // Apply / Reset
  onApply: (result: FilterApplyResult) => void;
  onReset: () => void;
  lang: AppLanguage;
};

export default function FilterModal({
  visible,
  onClose,
  activeFilters,
  forMyNeeds,
  filterAllergens,
  filterDiets,
  profileAllergens,
  profileDiets,
  onSyncProfile,
  isAuthenticated,
  onRequestLogin,
  onApply,
  onReset,
  lang,
}: Props) {
  // Tutto il pending state vive qui — nessuna modifica al parent fino ad "Applica".
  const [pendingFilters, setPendingFilters] = useState<RestaurantCategoryId[]>(activeFilters);
  const [pendingMyNeeds, setPendingMyNeeds] = useState(forMyNeeds);
  const [pendingAllergens, setPendingAllergens] = useState(filterAllergens);
  const [pendingDiets, setPendingDiets] = useState(filterDiets);

  useEffect(() => {
    if (visible) {
      setPendingFilters(activeFilters);
      setPendingMyNeeds(forMyNeeds);
      setPendingAllergens(filterAllergens);
      setPendingDiets(filterDiets);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleToggleMyNeeds = () => {
    if (!isAuthenticated) { onRequestLogin(); return; }
    if (!pendingMyNeeds) {
      const hasNeeds = pendingAllergens.length > 0 || pendingDiets.length > 0;
      if (!hasNeeds) {
        Alert.alert(
          i18n.t('restaurants.filter.noNeedsTitle'),
          i18n.t('restaurants.filter.noNeedsMsg'),
        );
        return;
      }
    }
    setPendingMyNeeds(prev => !prev);
  };

  const handleApply = () => {
    onApply({ filters: pendingFilters, forMyNeeds: pendingMyNeeds, allergens: pendingAllergens, diets: pendingDiets });
    onClose();
  };

  const handleReset = () => {
    setPendingFilters([]);
    onReset();
    onClose();
  };

  const hasPendingOrActive = pendingFilters.length > 0 || pendingMyNeeds;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('restaurants.filter.title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.6}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Per le mie esigenze */}
            <View style={styles.section}>
              <TouchableOpacity onPress={handleToggleMyNeeds} style={styles.myNeedsToggle} activeOpacity={0.7}>
                <MaterialCommunityIcons name="shield-check" size={18} color={theme.colors.primary} />
                <Text style={styles.myNeedsText}>{i18n.t('restaurants.filter.myNeeds')}</Text>
                <View style={[styles.switchTrack, pendingMyNeeds && styles.switchTrackActive]}>
                  <View style={[styles.switchThumb, pendingMyNeeds && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>
              <Text style={styles.sectionHint}>
                {i18n.t('restaurants.filter.myNeedsHint')}
              </Text>
              {pendingMyNeeds && (
                <DietaryNeedsPicker
                  allergens={pendingAllergens}
                  diets={pendingDiets}
                  onAllergensChange={setPendingAllergens}
                  onDietsChange={setPendingDiets}
                  profileAllergens={profileAllergens}
                  profileDiets={profileDiets}
                  onSyncProfile={onSyncProfile}
                  lang={lang}
                  subtitle={i18n.t('restaurants.filter.dietarySubtitle')}
                />
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

            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={styles.sectionLabel}>{i18n.t('restaurants.filter.cuisineLabel')}</Text>
              <Text style={styles.sectionHint}>
                {i18n.t('restaurants.filter.cuisineHint')}
              </Text>
              <ChipGrid
                items={CUISINE_CATEGORIES}
                activeIds={pendingFilters}
                onToggle={(id) => setPendingFilters(prev =>
                  prev.includes(id as RestaurantCategoryId)
                    ? prev.filter(x => x !== id)
                    : [...prev, id as RestaurantCategoryId]
                )}
                lang={lang}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {hasPendingOrActive ? (
              <TouchableOpacity onPress={handleReset} style={styles.resetButton} activeOpacity={0.7}>
                <Text style={styles.resetText}>{i18n.t('restaurants.filter.reset')}</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={handleApply} style={styles.applyButton} activeOpacity={0.7}>
              <Text style={styles.applyText}>{i18n.t('restaurants.filter.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
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
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 12,
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
