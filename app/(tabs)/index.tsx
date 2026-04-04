import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Text, Button, Chip, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../../constants/allergens';
import { OTHER_FOODS } from '../../constants/otherFoods';
import { AllergenId, AllLanguageCode, AppLanguage, DownloadableLanguageCode, LANGUAGES, OtherFoodId } from '../../types';
import { DOWNLOADABLE_LANGUAGES } from '../../constants/downloadableLanguages';
import { getVisibleModes, getDietModeById } from '../../constants/dietModes';
import { theme } from '../../constants/theme';
import { getLocalizedLanguageName } from '../../constants/languageNames';
import i18n from '../../utils/i18n';
import { useAppContext } from '../../contexts/AppContext';
import { Analytics } from '../../services/analytics';
import BannerCarousel from '../components/BannerCarousel';
import LanguagePickerModal from '../components/LanguagePickerModal';
import { useLanguageDownload } from '../../hooks/useLanguageDownload';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedAllergens, selectedOtherFoods, selectedRestrictions, activeDietModes, vegetarianLevel, settings, downloadedLanguageCodes, setCardLanguage, saveDownloadedLanguage } = useAppContext();
  const hasSelections = selectedAllergens.length > 0 || selectedOtherFoods.length > 0 || selectedRestrictions.length > 0 || activeDietModes.length > 0;
  const cardLanguage = settings.cardLanguage;
  const appLang = settings.appLanguage;
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const { downloadingLang, downloadProgress, handleDownloadLanguage: downloadLanguage } = useLanguageDownload();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handleLanguageChange = async (lang: AllLanguageCode) => {
    const previousLanguage = cardLanguage;
    await setCardLanguage(lang);
    await Analytics.logCardLanguageChanged(previousLanguage, lang);
  };

  const handleDownloadLanguage = async (langCode: DownloadableLanguageCode) => {
    await downloadLanguage(langCode, saveDownloadedLanguage);
  };

  const getAllergenInfo = (id: AllergenId) => {
    return ALLERGENS.find((a) => a.id === id);
  };

  const getOtherFoodInfo = (id: OtherFoodId) => {
    return OTHER_FOODS.find((f) => f.id === id);
  };

  const currentLanguage = useMemo(() => {
    const lang = LANGUAGES.find(l => l.code === cardLanguage) ||
      DOWNLOADABLE_LANGUAGES.find(l => l.code === cardLanguage);
    if (!lang) return null;
    return {
      ...lang,
      localizedName: getLocalizedLanguageName(lang.code, appLang) || lang.name,
    };
  }, [cardLanguage, appLang]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>AllergiApp</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={8}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('home.settings')}
        >
          <MaterialCommunityIcons name="cog" size={26} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + 49 + insets.bottom }]}>
        {/* Banner Carousel */}
        <BannerCarousel />

        {/* Sezione Allergie */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {i18n.t('home.title')}
              </Text>
            </View>
            {hasSelections && (
              <TouchableOpacity
                onPress={() => router.push('/add-allergy')}
                hitSlop={8}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('home.editAllergies')}
              >
                <Text style={styles.editLink}>
                  {i18n.t('home.editAllergies')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!hasSelections ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>
                {i18n.t('home.noAllergies')}
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/add-allergy')}
              >
                {i18n.t('home.addAllergies')}
              </Button>
            </View>
          ) : (
            <View style={styles.chipsContainer}>
              {selectedAllergens.map((id) => {
                const allergen = getAllergenInfo(id);
                if (!allergen) return null;
                const locale = i18n.locale as AppLanguage;
                return (
                  <Chip
                    key={id}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    icon={() => (
                      <Text style={styles.chipIcon}>{allergen.icon}</Text>
                    )}
                  >
                    {allergen.translations[locale] || allergen.translations.en}
                  </Chip>
                );
              })}
              {selectedOtherFoods.map((id) => {
                const food = getOtherFoodInfo(id);
                if (!food) return null;
                const locale = i18n.locale as AppLanguage;
                return (
                  <Chip
                    key={id}
                    style={styles.chip}
                    textStyle={styles.chipText}
                    icon={() => (
                      <Text style={styles.chipIcon}>{food.icon}</Text>
                    )}
                  >
                    {food.translations[locale] || food.translations.en}
                  </Chip>
                );
              })}
              {(() => {
                const autoIds = new Set(
                  activeDietModes.flatMap(id => getDietModeById(id)?.autoSelectRestrictions ?? [])
                );
                const generalCount = selectedRestrictions.filter(id => !autoIds.has(id)).length;
                return generalCount > 0 ? (
                  <Chip
                    style={styles.restrictionChip}
                    textStyle={styles.chipText}
                    icon={() => (
                      <Text style={styles.chipIcon}>{'\uD83D\uDCCB'}</Text>
                    )}
                  >
                    {i18n.t('otherRestrictions.other')} ({generalCount})
                  </Chip>
                ) : null;
              })()}
              {getVisibleModes(activeDietModes).map((mode) => (
                <Chip
                  key={mode.id}
                  style={[styles.dietModeChip, { backgroundColor: mode.sectionColors.background }]}
                  textStyle={[styles.dietModeChipText, { color: mode.sectionColors.primary }]}
                  icon={() => (
                    <Text style={styles.chipIcon}>{mode.icon}</Text>
                  )}
                >
                  {mode.id === 'vegetarian'
                    ? i18n.t(`otherRestrictions.vegetarianLevel_${vegetarianLevel}`)
                    : i18n.t(`otherRestrictions.${mode.id}Label`)}
                </Chip>
              ))}
            </View>
          )}
        </Surface>

        {/* Sezione Lingua */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {i18n.t('home.whereAreYouTraveling')}
            </Text>
          </View>

          <Text style={styles.cardSubtitle}>
            {i18n.t('home.chooseLanguage')}
          </Text>

          <Pressable
            onPress={() => setShowLanguagePicker(true)}
            style={styles.languageSelector}
            accessibilityRole="button"
            accessibilityLabel={`${i18n.t('home.change')} ${currentLanguage?.nativeName}`}
          >
            <Text style={styles.languageFlag}>{currentLanguage?.flag}</Text>
            <View style={styles.languageInfo}>
              <Text style={styles.languageNativeName}>
                {currentLanguage?.nativeName}
              </Text>
              <Text style={styles.languageName}>
                {currentLanguage?.localizedName}
              </Text>
            </View>
            <Text style={styles.changeText}>{i18n.t('home.change')} ▼</Text>
          </Pressable>

        </Surface>

        {/* Bottone Mostra Card */}
        {hasSelections && (
          <Surface style={styles.showCardSection} elevation={2}>
            <Text style={styles.readyText}>
              {i18n.t('home.cardReadyIn')} {currentLanguage?.nativeName}!
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/card')}
              style={styles.showCardButton}
              contentStyle={styles.showCardButtonContent}
              labelStyle={styles.showCardButtonLabel}
              icon="card-account-details"
              accessibilityLabel={i18n.t('home.showCardToWaiter')}
            >
              {i18n.t('home.showCardToWaiter')}
            </Button>
          </Surface>
        )}
      </ScrollView>

      <LanguagePickerModal
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        cardLanguage={cardLanguage}
        appLang={appLang}
        downloadedLanguageCodes={downloadedLanguageCodes}
        onLanguageChange={handleLanguageChange}
        onDownloadLanguage={handleDownloadLanguage}
        downloadingLang={downloadingLang}
        downloadProgress={downloadProgress}
        onNavigateToSettings={() => router.push('/settings')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontWeight: '600',
    flex: 1,
  },
  editLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyIcon: {
    fontSize: 48,
    lineHeight: 58,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  restrictionChip: {
    marginBottom: 4,
    backgroundColor: theme.colors.amberLight,
  },
  dietModeChip: {
    marginBottom: 4,
  },
  dietModeChipText: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 14,
  },
  chipIcon: {
    fontSize: 16,
    lineHeight: 22,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  languageFlag: {
    fontSize: 40,
    lineHeight: 50,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  languageName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  changeText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  showCardSection: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  readyText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  showCardButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  showCardButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  showCardButtonLabel: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
