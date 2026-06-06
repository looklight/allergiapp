import { useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withDelay, withTiming, ReduceMotion } from 'react-native-reanimated';
import { Text, Button, Chip, Surface } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALLERGENS } from '../../constants/allergens';
import { OTHER_FOODS } from '../../constants/otherFoods';
import { AllergenId, AllLanguageCode, AppLanguage, DownloadableLanguageCode, LANGUAGES, OtherFoodId } from '../../types';
import { DOWNLOADABLE_LANGUAGES } from '../../constants/downloadableLanguages';
import { getVisibleModes, getDietModeById } from '../../constants/dietModes';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { getLocalizedLanguageName } from '../../constants/languageNames';
import i18n from '../../utils/i18n';
import { useAppContext } from '../../contexts/AppContext';
import { Analytics } from '../../services/analytics';
import BannerCarousel from '../components/BannerCarousel';
import CardBadgesSection from '../components/CardBadgesSection';
import LanguagePickerModal from '../components/LanguagePickerModal';
import AppHeader from '../components/AppHeader';
import { useLanguageDownload } from '../../hooks/useLanguageDownload';
import FoodIcon from '../../components/FoodIcon';

export default function HomeScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  // Pulse decorativo sul bottone "Mostra card" al cambio lingua: segnala che la card è aggiornata e pronta.
  const cardPulse = useSharedValue(1);
  const isFirstLanguageRender = useRef(true);
  useEffect(() => {
    if (isFirstLanguageRender.current) {
      isFirstLanguageRender.current = false;
      return;
    }
    cardPulse.value = withDelay(
      250,
      withSequence(
        withTiming(1.03, { duration: 120, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 160, reduceMotion: ReduceMotion.System })
      )
    );
  }, [cardLanguage]);
  const cardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardPulse.value }],
  }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader
        title="AllergiApp"
        leading="none"
        titleAlign="left"
        actions={[{
          icon: 'cog',
          onPress: () => router.push('/settings'),
          accessibilityLabel: i18n.t('home.settings'),
        }]}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + 49 + insets.bottom }]}>
        {/* Banner Carousel */}
        <BannerCarousel />

        {/* Card Badges */}
        <CardBadgesSection />

        {/* Sezione Allergie */}
        <Surface style={styles.card} elevation={0}>
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
                      <FoodIcon id={allergen.id} emoji={allergen.icon} size={18} style={styles.chipIcon} />
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
                      <FoodIcon id={food.id} emoji={food.icon} size={18} style={styles.chipIcon} />
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
                      <Text style={styles.chipIcon}>{'\u26A0\uFE0F'}</Text>
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
        <Surface style={styles.card} elevation={0}>
          <View style={styles.cardHeader}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {i18n.t('home.whereAreYouTraveling')}
            </Text>
          </View>

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
            <View style={styles.changeContainer}>
              <Text style={styles.changeText}>{i18n.t('home.change')}</Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={theme.colors.primary}
                style={styles.changeChevron}
              />
            </View>
          </Pressable>

        </Surface>

        {/* Bottone Mostra Card */}
        {hasSelections && (
          <View style={styles.showCardSection}>
            <Text style={styles.readyText}>
              {i18n.t('home.cardReadyIn')} {currentLanguage?.nativeName}!
            </Text>
            <Animated.View style={cardPulseStyle}>
              <Button
                mode="contained"
                onPress={() => router.push('/card')}
                style={styles.showCardButton}
                contentStyle={styles.showCardButtonContent}
                labelStyle={styles.showCardButtonLabel}
                icon="card-bulleted-outline"
                accessibilityLabel={i18n.t('home.showCardToWaiter')}
              >
                {i18n.t('home.showCardToWaiter')}
              </Button>
            </Animated.View>
          </View>
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    // Ombra molto leggera per staccare i box dal fondo bianco
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyIcon: {
    fontSize: 48,
    lineHeight: 58,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 14,
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
    paddingVertical: 0,
    paddingHorizontal: 14,
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
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  changeChevron: {
    marginLeft: 2,
  },
  showCardSection: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  readyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  showCardButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  showCardButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  showCardButtonLabel: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
