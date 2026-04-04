import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS, RESTRICTION_CARD_TRANSLATIONS, DIET_FOOD_TRANSLATIONS } from '../constants/cardTranslations';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../constants/otherRestrictions';
import { OTHER_FOODS, OtherFoodId } from '../constants/otherFoods';
import { getVisibleModes, getFullCardMode, getDietModeById, getDietCardKey, DietCardKey, DIET_LEVEL_FOOD_ITEMS, DIET_FOOD_EMOJI, DIET_MODES, DietModeId } from '../constants/dietModes';
import { AllergenId, Language, LANGUAGES, DownloadableLanguageCode } from '../types';
import { getLocalizedLanguageName } from '../constants/languageNames';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../contexts/AppContext';
import { Analytics } from '../services/analytics';
import CardPortrait from './components/card/CardPortrait';
import CardLandscape from './components/card/CardLandscape';
import { CardColors, CardDisplayMode, DietModeSectionData } from '../types/card';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COMPLEX_SCRIPT_LANGS = new Set([
  'zh', 'ja', 'ko',           // CJK
  'ar', 'ur', 'fa',           // Arabic script
  'th', 'lo', 'km',           // Thai, Lao, Khmer
  'hi', 'mr', 'ne',           // Devanagari
  'bn', 'ta', 'te', 'si',     // South Asian
  'my',                        // Burmese
  'ka', 'hy',                  // Georgian, Armenian
  'he',                        // Hebrew
  'am',                        // Amharic (Ge'ez)
]);

export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { selectedAllergens, selectedOtherFoods, selectedRestrictions, activeDietModes, vegetarianLevel, pregnancyMode, settings, downloadedLanguages } = useAppContext();
  const cardLanguage = settings.cardLanguage;
  const appLanguage = settings.appLanguage;
  const [displayMode, setDisplayMode] = useState<CardDisplayMode>('card');
  const [expandedAllergen, setExpandedAllergen] = useState<AllergenId | null>(null);
  const [selectedLandscapeItem, setSelectedLandscapeItem] = useState<string | null>(null);

  const isDownloadedLanguage = useMemo(() => {
    return DOWNLOADABLE_LANGUAGES.some((l) => l.code === cardLanguage);
  }, [cardLanguage]);

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    Analytics.logCardViewed(cardLanguage, selectedAllergens.length, selectedAllergens, isDownloadedLanguage);
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []);

  const downloadedLanguageData = useMemo(() => {
    return downloadedLanguages[cardLanguage as DownloadableLanguageCode] ?? null;
  }, [downloadedLanguages, cardLanguage]);

  const displayLanguage = displayMode === 'card' ? cardLanguage : displayMode === 'app' ? appLanguage : 'en';

  const currentLanguage = useMemo(() => {
    const hardcoded = LANGUAGES.find((l) => l.code === displayLanguage);
    if (hardcoded) return hardcoded;
    return DOWNLOADABLE_LANGUAGES.find((l) => l.code === displayLanguage) || null;
  }, [displayLanguage]);

  const translations = useMemo(() => {
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData) {
      return {
        header: downloadedLanguageData.cardTexts.header,
        subtitle: downloadedLanguageData.cardTexts.subtitle,
        pregnancySubtitle: downloadedLanguageData.cardTexts.pregnancySubtitle || downloadedLanguageData.cardTexts.subtitle,
        message: downloadedLanguageData.cardTexts.message,
        pregnancyMessage: downloadedLanguageData.cardTexts.pregnancyMessage || downloadedLanguageData.cardTexts.message,
        thanks: downloadedLanguageData.cardTexts.thanks,
        tapToSee: downloadedLanguageData.cardTexts.tapToSee,
        examples: downloadedLanguageData.cardTexts.examples || CARD_TRANSLATIONS.en.examples,
      };
    }
    return CARD_TRANSLATIONS[displayLanguage as Language] || CARD_TRANSLATIONS.en;
  }, [displayLanguage, isDownloadedLanguage, downloadedLanguageData, displayMode]);

  const getAllergenTranslation = (id: AllergenId): string => {
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.allergens[id] || ALLERGENS.find((a) => a.id === id)?.translations.en || '';
    }
    const allergen = ALLERGENS.find((a) => a.id === id);
    return allergen?.translations[displayLanguage as Language] || allergen?.translations.en || '';
  };

  const getAllergenDescription = (id: AllergenId): string => {
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.descriptions[id] || ALLERGEN_IMAGES[id]?.description.en || '';
    }
    return ALLERGEN_IMAGES[id]?.description[displayLanguage as Language] || ALLERGEN_IMAGES[id]?.description.en || '';
  };

  const getAllergenWarning = (id: AllergenId): string | undefined => {
    const images = ALLERGEN_IMAGES[id];
    if (!images?.warning) return undefined;
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData?.warnings) {
      return downloadedLanguageData.warnings[id] || images.warning.en;
    }
    return images.warning[displayLanguage as Language] || images.warning.en;
  };

  const getRestrictionTranslation = (id: RestrictionItemId): string => {
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData?.restrictions) {
      return downloadedLanguageData.restrictions[id] || RESTRICTION_ITEMS.find((r) => r.id === id)?.translations.en || '';
    }
    const item = RESTRICTION_ITEMS.find((r) => r.id === id);
    return item?.translations[displayLanguage as Language] || item?.translations.en || '';
  };

  const getOtherFoodTranslation = (id: OtherFoodId): string => {
    if (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData?.otherFoods) {
      return downloadedLanguageData.otherFoods[id] || OTHER_FOODS.find((f) => f.id === id)?.translations.en || '';
    }
    const food = OTHER_FOODS.find((f) => f.id === id);
    return food?.translations[displayLanguage as Language] || food?.translations.en || '';
  };

  // Get diet mode translations, supporting downloaded languages
  const getDietModeTranslation = (cardKey: DietCardKey) => {
    const hardcoded = RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;
    const base = hardcoded.dietModes[cardKey];
    if (displayMode !== 'card' || !isDownloadedLanguage || !downloadedLanguageData?.restrictionCardTexts?.dietModeTexts) {
      return base;
    }
    const downloaded = downloadedLanguageData.restrictionCardTexts.dietModeTexts[cardKey];
    if (!downloaded) return base;
    return {
      header: downloaded.header || base.header,
      message: downloaded.message || base.message,
      sectionMessage: downloaded.sectionMessage || base.sectionMessage,
    };
  };

  // Restriction translations for the pregnancy section header/message
  const restrictionTranslations = useMemo(() => {
    if (pregnancyMode) {
      return getDietModeTranslation('pregnancy');
    }
    const hardcoded = RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;
    const downloaded = (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts);
    const header = downloaded ? (downloadedLanguageData!.restrictionCardTexts!.header || hardcoded.header) : hardcoded.header;
    const message = downloaded ? (downloadedLanguageData!.restrictionCardTexts!.message || hardcoded.message) : hardcoded.message;
    return { header, message, sectionMessage: message };
  }, [displayLanguage, isDownloadedLanguage, downloadedLanguageData, displayMode, pregnancyMode]);

  // Auto-selected restriction IDs per mode (stable, never changes)
  const modeRestrictionIds = useMemo(() => {
    const map = new Map<DietModeId, Set<RestrictionItemId>>();
    DIET_MODES.forEach(mode => {
      if (mode.autoSelectRestrictions?.length) {
        map.set(mode.id, new Set(mode.autoSelectRestrictions as RestrictionItemId[]));
      }
    });
    return map;
  }, []);

  // Build diet mode sections for the card
  const dietModeSections = useMemo((): DietModeSectionData[] => {
    const visibleModes = getVisibleModes(activeDietModes);
    // Only count restrictions shown inline (before diet sections).
    // Pregnancy auto-selected restrictions are rendered inside the pregnancy DietModeSection,
    // so they shouldn't make other diet sections use "Additionally..." phrasing.
    const autoSelectedIds = new Set(
      activeDietModes.flatMap(id => [...(modeRestrictionIds.get(id) ?? [])])
    );
    const inlineRestrictionCount = selectedRestrictions.filter(id => !autoSelectedIds.has(id)).length;
    const hasOtherContent = selectedAllergens.length > 0 || selectedOtherFoods.length > 0 || inlineRestrictionCount > 0;
    const sections: DietModeSectionData[] = [];

    for (const mode of visibleModes) {
      const cardKey = getDietCardKey(mode.id, vegetarianLevel);
      const modeTranslations = getDietModeTranslation(cardKey);
      const message = hasOtherContent || sections.length > 0
        ? modeTranslations.sectionMessage
        : modeTranslations.message;

      const section: DietModeSectionData = {
        modeId: mode.id,
        icon: mode.icon,
        header: modeTranslations.header,
        message,
        sectionColors: mode.sectionColors,
      };

      // For vegetarian mode, attach food item indicators
      if (mode.id === 'vegetarian') {
        const levelItems = DIET_LEVEL_FOOD_ITEMS[vegetarianLevel];
        const foodTrans = (displayMode === 'card' && isDownloadedLanguage && downloadedLanguageData?.dietFoods)
          ? downloadedLanguageData.dietFoods as Record<string, string>
          : (DIET_FOOD_TRANSLATIONS[displayLanguage as Language] || DIET_FOOD_TRANSLATIONS.en);
        section.foodItems = {
          forbidden: levelItems.forbidden.map(id => ({ name: foodTrans[id] || DIET_FOOD_TRANSLATIONS.en[id], emoji: DIET_FOOD_EMOJI[id] })),
          allowed: levelItems.allowed.map(id => ({ name: foodTrans[id] || DIET_FOOD_TRANSLATIONS.en[id], emoji: DIET_FOOD_EMOJI[id] })),
        };
      }

      // Attach auto-selected restriction items to the section
      const restrictionSet = modeRestrictionIds.get(mode.id);
      if (restrictionSet) {
        const modeItems = selectedRestrictions.filter(id => restrictionSet.has(id));
        if (modeItems.length > 0) {
          section.restrictionItems = modeItems;
          // Pregnancy mode overrides header/message from restrictionTranslations
          if (mode.id === 'pregnancy') {
            section.message = hasOtherContent ? restrictionTranslations.sectionMessage : restrictionTranslations.message;
            section.header = restrictionTranslations.header;
          }
        }
      }

      sections.push(section);
    }

    return sections;
  }, [activeDietModes, vegetarianLevel, displayLanguage, selectedAllergens.length, selectedOtherFoods.length, selectedRestrictions, modeRestrictionIds, restrictionTranslations, isDownloadedLanguage, downloadedLanguageData, displayMode]);

  const autoModeRestrictionIds = new Set(
    activeDietModes.flatMap(id => [...(modeRestrictionIds.get(id) ?? [])])
  );
  const inlineRestrictions = selectedRestrictions.filter(id => !autoModeRestrictionIds.has(id));
  const separateRestrictions = pregnancyMode
    ? selectedRestrictions.filter(id => modeRestrictionIds.get('pregnancy')?.has(id))
    : [];

  const hasAllergyContent = selectedAllergens.length > 0 || selectedOtherFoods.length > 0 || inlineRestrictions.length > 0;

  const fontBoost = COMPLEX_SCRIPT_LANGS.has(displayLanguage) ? 2 : 0;

  // Color palette
  const colors = useMemo((): CardColors => {
    const fullCardMode = getFullCardMode(activeDietModes);
    if (fullCardMode?.fullCardColors) {
      return { cardStyle: 'pregnancy', ...fullCardMode.fullCardColors };
    }
    if (!hasAllergyContent && !separateRestrictions.length && dietModeSections.length > 0) {
      // Diet-only card (vegetarian/vegan without allergens)
      const primaryMode = dietModeSections[0];
      return {
        cardStyle: 'dietOnly',
        containerBg: primaryMode.sectionColors.headerBg,
        headerBg: primaryMode.sectionColors.headerBg,
        messageBg: primaryMode.sectionColors.background,
        messageBorder: primaryMode.sectionColors.border,
        allergenTextColor: primaryMode.sectionColors.primary,
        breakdownBg: primaryMode.sectionColors.background,
        breakdownBorder: primaryMode.sectionColors.border,
        breakdownDescColor: primaryMode.sectionColors.text,
        warningTextColor: primaryMode.sectionColors.primary,
        thanksBg: primaryMode.sectionColors.background,
        thanksColor: primaryMode.sectionColors.primary,
        restrictionBg: primaryMode.sectionColors.background,
        restrictionBorder: primaryMode.sectionColors.border,
        restrictionHeaderColor: primaryMode.sectionColors.primary,
        restrictionTextColor: primaryMode.sectionColors.primary,
        landscapeLeftBg: primaryMode.sectionColors.headerBg,
        landscapeWrapperBg: primaryMode.sectionColors.primary,
        landscapeAllergenNameColor: primaryMode.sectionColors.primary,
        landscapeDetailBadgeBg: primaryMode.sectionColors.background,
        landscapeDetailBadgeTextColor: primaryMode.sectionColors.primary,
      };
    }
    return {
      cardStyle: 'allergy',
      containerBg: theme.colors.error,
      headerBg: theme.colors.error,
      messageBg: theme.colors.orangeLight,
      messageBorder: theme.colors.orangeBorder,
      allergenTextColor: theme.colors.error,
      breakdownBg: theme.colors.amberLight,
      breakdownBorder: theme.colors.amber,
      breakdownDescColor: theme.colors.cardDescriptionText,
      warningTextColor: theme.colors.warningDark,
      thanksBg: theme.colors.primaryLight,
      thanksColor: theme.colors.success,
      restrictionBg: theme.colors.amberLight,
      restrictionBorder: theme.colors.amberBorder,
      restrictionHeaderColor: theme.colors.warning,
      restrictionTextColor: theme.colors.warning,
      landscapeLeftBg: theme.colors.error,
      landscapeWrapperBg: theme.colors.errorDark,
      landscapeAllergenNameColor: theme.colors.errorDarker,
      landscapeDetailBadgeBg: theme.colors.errorLight,
      landscapeDetailBadgeTextColor: theme.colors.errorDark,
    };
  }, [activeDietModes, hasAllergyContent, separateRestrictions.length, dietModeSections]);

  const toggleExpand = (id: AllergenId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAllergen(expandedAllergen === id ? null : id);
  };

  const showAppToggle = cardLanguage !== appLanguage;
  const showEnglishToggle = cardLanguage !== 'en' && appLanguage !== 'en';

  const cardLanguageLabel = useMemo(() => {
    return getLocalizedLanguageName(cardLanguage, appLanguage) || cardLanguage;
  }, [cardLanguage, appLanguage]);

  const appLanguageLabel = useMemo(() => {
    return getLocalizedLanguageName(appLanguage, appLanguage) || appLanguage;
  }, [appLanguage]);

  const englishLabel = useMemo(() => {
    return getLocalizedLanguageName('en', appLanguage) || 'English';
  }, [appLanguage]);

  const handleLanguageCycle = () => {
    const modes: CardDisplayMode[] = ['card'];
    if (showAppToggle) modes.push('app');
    if (showEnglishToggle) modes.push('english');
    const nextIndex = (modes.indexOf(displayMode) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setDisplayMode(nextMode);
    Analytics.logCardLanguageToggled(nextMode, cardLanguage, appLanguage);
  };

  const hasAllergens = selectedAllergens.length > 0 || selectedOtherFoods.length > 0;
  const hasRestrictions = selectedRestrictions.length > 0;

  // Header title computation
  const headerTitleText = useMemo(() => {
    if (hasAllergens) return pregnancyMode ? translations.pregnancySubtitle : translations.subtitle;
    if (hasRestrictions || pregnancyMode) return restrictionTranslations.header;
    if (dietModeSections.length > 0) return dietModeSections[0].header;
    return restrictionTranslations.header;
  }, [hasAllergens, hasRestrictions, pregnancyMode, translations, restrictionTranslations, dietModeSections]);

  const headerPadding = useMemo(() => ({
    paddingTop: insets.top + 16,
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 12,
  }), [insets]);

  return (
    <View style={[styles.container, { backgroundColor: colors.containerBg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {!isLandscape && (
        <View style={[styles.customHeader, headerPadding, { backgroundColor: colors.containerBg }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign: 'center', flex: 1 }]} numberOfLines={2} adjustsFontSizeToFit={false}>
            {currentLanguage?.flag} {headerTitleText}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {isLandscape ? (
        <>
          <CardLandscape
            selectedAllergens={selectedAllergens}
            selectedOtherFoods={selectedOtherFoods}
            inlineRestrictions={inlineRestrictions}
            separateRestrictions={separateRestrictions}
            colors={colors}
            translations={translations}
            restrictionTranslations={restrictionTranslations}
            dietModeSections={dietModeSections}
            selectedLandscapeItem={selectedLandscapeItem}
            setSelectedLandscapeItem={setSelectedLandscapeItem}
            pregnancyMode={pregnancyMode}
            getAllergenTranslation={getAllergenTranslation}
            getAllergenDescription={getAllergenDescription}
            getAllergenWarning={getAllergenWarning}
            getRestrictionTranslation={getRestrictionTranslation}
            getOtherFoodTranslation={getOtherFoodTranslation}
            fontBoost={fontBoost}
            insets={insets}
          />
          {(() => {
            const safeH = Math.max(insets.left, insets.right, 48);
            const safeV = Math.max(insets.top, insets.bottom, 8);
            const buttonSize = 38;
            return (
              <>
                <TouchableOpacity
                  onPress={() => router.back()}
                  hitSlop={8}
                  activeOpacity={0.6}
                  style={[styles.landscapeOverlayButton, {
                    top: safeV + 10,
                    left: (safeH - buttonSize) / 2,
                  }]}
                >
                  <MaterialCommunityIcons name="close" size={22} color={theme.colors.onPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLanguageCycle}
                  hitSlop={8}
                  activeOpacity={0.6}
                  style={[styles.landscapeOverlayButton, {
                    top: safeV + 10,
                    right: (safeH - buttonSize) / 2,
                  }]}
                >
                  <MaterialCommunityIcons name="translate" size={20} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              </>
            );
          })()}
        </>
      ) : (
        <CardPortrait
          selectedAllergens={selectedAllergens}
          selectedOtherFoods={selectedOtherFoods}
          inlineRestrictions={inlineRestrictions}
          separateRestrictions={separateRestrictions}
          colors={colors}
          translations={translations}
          restrictionTranslations={restrictionTranslations}
          dietModeSections={dietModeSections}
          expandedAllergen={expandedAllergen}
          displayMode={displayMode}
          showAppToggle={showAppToggle}
          showEnglishToggle={showEnglishToggle}
          cardLanguageLabel={cardLanguageLabel}
          appLanguageLabel={appLanguageLabel}
          englishLabel={englishLabel}
          pregnancyMode={pregnancyMode}
          getAllergenTranslation={getAllergenTranslation}
          getAllergenDescription={getAllergenDescription}
          getAllergenWarning={getAllergenWarning}
          getRestrictionTranslation={getRestrictionTranslation}
          getOtherFoodTranslation={getOtherFoodTranslation}
          fontBoost={fontBoost}
          toggleExpand={toggleExpand}
          onDisplayModeChange={(mode) => {
            setDisplayMode(mode);
            Analytics.logCardLanguageToggled(mode, cardLanguage, appLanguage);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  landscapeOverlayButton: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  headerSpacer: {
    width: 24,
  },
});
