import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS, RESTRICTION_CARD_TRANSLATIONS } from '../constants/cardTranslations';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../constants/otherRestrictions';
import { getVisibleModes, getFullCardMode, getDietModeById, DietModeId } from '../constants/dietModes';
import { AllergenId, Language, LANGUAGES, DownloadableLanguageCode } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';
import CardPortrait from './components/card/CardPortrait';
import CardLandscape from './components/card/CardLandscape';
import { CardColors, DietModeSectionData } from './components/card/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { selectedAllergens, selectedRestrictions, activeDietModes, pregnancyMode, settings, downloadedLanguages } = useAppContext();
  const cardLanguage = settings.cardLanguage;
  const appLanguage = settings.appLanguage;
  const [showInAppLanguage, setShowInAppLanguage] = useState(false);
  const [expandedAllergen, setExpandedAllergen] = useState<AllergenId | null>(null);
  const [selectedLandscapeAllergen, setSelectedLandscapeAllergen] = useState<AllergenId | null>(null);

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

  const displayLanguage = showInAppLanguage ? appLanguage : cardLanguage;

  const currentLanguage = useMemo(() => {
    const hardcoded = LANGUAGES.find((l) => l.code === displayLanguage);
    if (hardcoded) return hardcoded;
    return DOWNLOADABLE_LANGUAGES.find((l) => l.code === displayLanguage) || null;
  }, [displayLanguage]);

  const translations = useMemo(() => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData) {
      return {
        header: downloadedLanguageData.cardTexts.header,
        subtitle: downloadedLanguageData.cardTexts.subtitle,
        pregnancySubtitle: downloadedLanguageData.cardTexts.pregnancySubtitle || downloadedLanguageData.cardTexts.subtitle,
        message: downloadedLanguageData.cardTexts.message,
        pregnancyMessage: downloadedLanguageData.cardTexts.pregnancyMessage || downloadedLanguageData.cardTexts.message,
        thanks: downloadedLanguageData.cardTexts.thanks,
        tapToSee: downloadedLanguageData.cardTexts.tapToSee,
        showIn: downloadedLanguageData.cardTexts.showIn,
        examples: downloadedLanguageData.cardTexts.examples || CARD_TRANSLATIONS.en.examples,
      };
    }
    return CARD_TRANSLATIONS[displayLanguage as Language] || CARD_TRANSLATIONS.en;
  }, [displayLanguage, isDownloadedLanguage, downloadedLanguageData, showInAppLanguage]);

  const getAllergenTranslation = (id: AllergenId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.allergens[id] || ALLERGENS.find((a) => a.id === id)?.translations.en || '';
    }
    const allergen = ALLERGENS.find((a) => a.id === id);
    return allergen?.translations[displayLanguage as Language] || allergen?.translations.en || '';
  };

  const getAllergenDescription = (id: AllergenId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.descriptions[id] || ALLERGEN_IMAGES[id]?.description.en || '';
    }
    return ALLERGEN_IMAGES[id]?.description[displayLanguage as Language] || ALLERGEN_IMAGES[id]?.description.en || '';
  };

  const getAllergenWarning = (id: AllergenId): string | undefined => {
    const images = ALLERGEN_IMAGES[id];
    if (!images?.warning) return undefined;
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.warnings) {
      return downloadedLanguageData.warnings[id] || images.warning.en;
    }
    return images.warning[displayLanguage as Language] || images.warning.en;
  };

  const getRestrictionTranslation = (id: RestrictionItemId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictions) {
      return downloadedLanguageData.restrictions[id] || RESTRICTION_ITEMS.find((r) => r.id === id)?.translations.en || '';
    }
    const item = RESTRICTION_ITEMS.find((r) => r.id === id);
    return item?.translations[displayLanguage as Language] || item?.translations.en || '';
  };

  // Restriction translations for the pregnancy section header/message
  const restrictionTranslations = useMemo(() => {
    const hardcoded = RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;
    if (pregnancyMode) {
      const downloaded = (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts);
      return {
        header: downloaded ? (downloadedLanguageData!.restrictionCardTexts!.pregnancyHeader || hardcoded.dietModes.pregnancy.header) : hardcoded.dietModes.pregnancy.header,
        message: downloaded ? (downloadedLanguageData!.restrictionCardTexts!.pregnancyMessage || hardcoded.dietModes.pregnancy.message) : hardcoded.dietModes.pregnancy.message,
        sectionMessage: downloaded ? (downloadedLanguageData!.restrictionCardTexts!.pregnancySectionMessage || hardcoded.dietModes.pregnancy.sectionMessage) : hardcoded.dietModes.pregnancy.sectionMessage,
      };
    }
    const base = (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts)
      ? downloadedLanguageData.restrictionCardTexts
      : hardcoded;
    return { header: base.header, message: base.message, sectionMessage: base.message };
  }, [displayLanguage, isDownloadedLanguage, downloadedLanguageData, showInAppLanguage, pregnancyMode]);

  // Get diet mode translations, supporting downloaded languages
  const getDietModeTranslation = (modeId: DietModeId) => {
    const hardcoded = RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;
    const base = hardcoded.dietModes[modeId];
    if (showInAppLanguage || !isDownloadedLanguage || !downloadedLanguageData?.restrictionCardTexts) {
      return base;
    }
    const d = downloadedLanguageData.restrictionCardTexts;
    if (modeId === 'pregnancy') {
      return {
        header: d.pregnancyHeader || base.header,
        message: d.pregnancyMessage || base.message,
        sectionMessage: d.pregnancySectionMessage || base.sectionMessage,
      };
    }
    if (modeId === 'vegetarian') {
      return {
        header: d.vegetarianHeader || base.header,
        message: d.vegetarianMessage || base.message,
        sectionMessage: d.vegetarianSectionMessage || base.sectionMessage,
      };
    }
    if (modeId === 'vegan') {
      return {
        header: d.veganHeader || base.header,
        message: d.veganMessage || base.message,
        sectionMessage: d.veganSectionMessage || base.sectionMessage,
      };
    }
    return base;
  };

  // Build diet mode sections for the card
  const dietModeSections = useMemo((): DietModeSectionData[] => {
    const visibleModes = getVisibleModes(activeDietModes);
    const hasOtherContent = selectedAllergens.length > 0 || selectedRestrictions.length > 0;
    const sections: DietModeSectionData[] = [];

    for (const mode of visibleModes) {
      const modeTranslations = getDietModeTranslation(mode.id);
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

      // For pregnancy mode, attach restriction items
      if (mode.id === 'pregnancy' && selectedRestrictions.length > 0) {
        section.restrictionItems = selectedRestrictions;
        section.message = hasOtherContent ? restrictionTranslations.sectionMessage : restrictionTranslations.message;
        section.header = restrictionTranslations.header;
      }

      sections.push(section);
    }

    return sections;
  }, [activeDietModes, displayLanguage, selectedAllergens.length, selectedRestrictions, restrictionTranslations, isDownloadedLanguage, downloadedLanguageData, showInAppLanguage]);

  // Color palette - full card override for pregnancy
  const colors = useMemo((): CardColors => {
    const fullCardMode = getFullCardMode(activeDietModes);
    if (fullCardMode?.fullCardColors) {
      return { isPregnancy: true, ...fullCardMode.fullCardColors };
    }
    return {
      isPregnancy: false,
      containerBg: theme.colors.error,
      headerBg: theme.colors.error,
      messageBg: '#FFF3E0',
      messageBorder: '#FFE0B2',
      allergenTextColor: theme.colors.error,
      breakdownBg: '#FFF8E1',
      breakdownBorder: '#FFC107',
      breakdownDescColor: '#5D4037',
      warningTextColor: '#D84315',
      thanksBg: theme.colors.primaryLight,
      thanksColor: '#2E7D32',
      restrictionBg: '#FFF8E1',
      restrictionBorder: '#FFE082',
      restrictionHeaderColor: '#E65100',
      restrictionTextColor: '#E65100',
      landscapeLeftBg: '#D32F2F',
      landscapeWrapperBg: '#C62828',
      landscapeAllergenNameColor: '#B71C1C',
      landscapeDetailBadgeBg: '#FFEBEE',
      landscapeDetailBadgeTextColor: '#C62828',
    };
  }, [activeDietModes]);

  // Inline vs separate restrictions: pregnancy-specific items go to pregnancy section,
  // general items (intolerances, etc.) always show inline with allergens
  const pregnancyRestrictionIds = useMemo(() => {
    return new Set(getDietModeById('pregnancy')?.autoSelectRestrictions ?? []);
  }, []);

  const inlineRestrictions = pregnancyMode
    ? selectedRestrictions.filter(id => !pregnancyRestrictionIds.has(id))
    : selectedRestrictions;
  const separateRestrictions = pregnancyMode
    ? selectedRestrictions.filter(id => pregnancyRestrictionIds.has(id))
    : [];

  const toggleExpand = (id: AllergenId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAllergen(expandedAllergen === id ? null : id);
  };

  const handleLanguageToggle = () => {
    const newValue = !showInAppLanguage;
    setShowInAppLanguage(newValue);
    Analytics.logCardLanguageToggled(newValue, cardLanguage, appLanguage);
  };

  const hasAllergens = selectedAllergens.length > 0;
  const hasRestrictions = selectedRestrictions.length > 0;

  // Header title computation
  const headerTitleText = useMemo(() => {
    if (hasAllergens) return pregnancyMode ? translations.pregnancySubtitle : translations.subtitle;
    if (hasRestrictions || pregnancyMode) return restrictionTranslations.header;
    if (dietModeSections.length > 0) return dietModeSections[0].header;
    return restrictionTranslations.header;
  }, [hasAllergens, hasRestrictions, pregnancyMode, translations, restrictionTranslations, dietModeSections]);

  const headerPadding = useMemo(() => ({
    paddingTop: isLandscape ? Math.max(insets.top, 20) : insets.top + 16,
    paddingLeft: isLandscape ? Math.max(insets.left, 16) : 16,
    paddingRight: isLandscape ? Math.max(insets.right, 16) : 16,
    paddingBottom: isLandscape ? 8 : 12,
  }), [isLandscape, insets]);

  return (
    <View style={[styles.container, { backgroundColor: colors.containerBg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, headerPadding, { backgroundColor: colors.containerBg }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign: 'center', flex: 1 }]} numberOfLines={2} adjustsFontSizeToFit={false}>
          {currentLanguage?.flag} {headerTitleText}
        </Text>
        {isLandscape ? (
          <TouchableOpacity
            onPress={handleLanguageToggle}
            hitSlop={8}
            activeOpacity={0.6}
            style={styles.headerLanguageButton}
          >
            <MaterialCommunityIcons name="translate" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {isLandscape ? (
        <CardLandscape
          selectedAllergens={selectedAllergens}
          inlineRestrictions={inlineRestrictions}
          separateRestrictions={separateRestrictions}
          colors={colors}
          translations={translations}
          restrictionTranslations={restrictionTranslations}
          dietModeSections={dietModeSections}
          selectedLandscapeAllergen={selectedLandscapeAllergen}
          setSelectedLandscapeAllergen={setSelectedLandscapeAllergen}
          pregnancyMode={pregnancyMode}
          getAllergenTranslation={getAllergenTranslation}
          getAllergenDescription={getAllergenDescription}
          getAllergenWarning={getAllergenWarning}
          getRestrictionTranslation={getRestrictionTranslation}
          insets={insets}
        />
      ) : (
        <CardPortrait
          selectedAllergens={selectedAllergens}
          inlineRestrictions={inlineRestrictions}
          separateRestrictions={separateRestrictions}
          colors={colors}
          translations={translations}
          restrictionTranslations={restrictionTranslations}
          dietModeSections={dietModeSections}
          expandedAllergen={expandedAllergen}
          showInAppLanguage={showInAppLanguage}
          pregnancyMode={pregnancyMode}
          getAllergenTranslation={getAllergenTranslation}
          getAllergenDescription={getAllergenDescription}
          getAllergenWarning={getAllergenWarning}
          getRestrictionTranslation={getRestrictionTranslation}
          toggleExpand={toggleExpand}
          handleLanguageToggle={handleLanguageToggle}
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerLanguageButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 6,
  },
  headerSpacer: {
    width: 24,
  },
});
