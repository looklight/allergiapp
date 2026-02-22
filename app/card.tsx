import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TouchableOpacity, LayoutAnimation, Platform, UIManager, useWindowDimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS, RESTRICTION_CARD_TRANSLATIONS } from '../constants/cardTranslations';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../constants/otherRestrictions';
import { AllergenId, Language, LANGUAGES, DownloadableLanguageCode } from '../types';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { selectedAllergens, selectedRestrictions, pregnancyMode, settings, downloadedLanguages } = useAppContext();
  const cardLanguage = settings.cardLanguage;
  const appLanguage = settings.appLanguage;
  const [showInAppLanguage, setShowInAppLanguage] = useState(false);
  const [expandedAllergen, setExpandedAllergen] = useState<AllergenId | null>(null);
  const [selectedLandscapeAllergen, setSelectedLandscapeAllergen] = useState<AllergenId | null>(null);

  // Permetti tutte le orientazioni per questa schermata
  useEffect(() => {
    ScreenOrientation.unlockAsync();

    // Traccia visualizzazione card
    Analytics.logCardViewed(
      cardLanguage,
      selectedAllergens.length,
      selectedAllergens,
      isDownloadedLanguage
    );

    // Quando l'utente esce dalla card, ri-blocca in portrait
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Dati lingua scaricata dalla memoria (nessuna lettura AsyncStorage)
  const downloadedLanguageData = useMemo(() => {
    return downloadedLanguages[cardLanguage as DownloadableLanguageCode] ?? null;
  }, [downloadedLanguages, cardLanguage]);

  // Verifica se la lingua corrente è scaricata
  const isDownloadedLanguage = useMemo(() => {
    return DOWNLOADABLE_LANGUAGES.some((l) => l.code === cardLanguage);
  }, [cardLanguage]);

  const getAllergenInfo = (id: AllergenId) => {
    return ALLERGENS.find((a) => a.id === id);
  };

  const toggleExpand = (id: AllergenId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAllergen(expandedAllergen === id ? null : id);
  };

  // Current display language (either destination or app language)
  const displayLanguage = showInAppLanguage ? appLanguage : cardLanguage;

  // Trova info lingua corrente (sia hardcoded che scaricata)
  const currentLanguage = useMemo(() => {
    const hardcoded = LANGUAGES.find((l) => l.code === displayLanguage);
    if (hardcoded) return hardcoded;
    const downloaded = DOWNLOADABLE_LANGUAGES.find((l) => l.code === displayLanguage);
    return downloaded || null;
  }, [displayLanguage]);

  // Traduzioni card - usa dati scaricati se lingua scaricata
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

  // Funzione per ottenere nome allergene tradotto
  const getAllergenTranslation = (id: AllergenId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.allergens[id] || ALLERGENS.find((a) => a.id === id)?.translations.en || '';
    }
    const allergen = ALLERGENS.find((a) => a.id === id);
    return allergen?.translations[displayLanguage as Language] || allergen?.translations.en || '';
  };

  // Funzione per ottenere descrizione allergene tradotta
  const getAllergenDescription = (id: AllergenId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData) {
      return downloadedLanguageData.descriptions[id] || ALLERGEN_IMAGES[id]?.description.en || '';
    }
    return ALLERGEN_IMAGES[id]?.description[displayLanguage as Language] || ALLERGEN_IMAGES[id]?.description.en || '';
  };

  // Traduzioni per la sezione restrizioni
  const restrictionTranslations = useMemo(() => {
    const base = (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts)
      ? downloadedLanguageData.restrictionCardTexts
      : RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;

    // Se pregnancyMode, usa header e messaggio specifici
    if (pregnancyMode) {
      const hardcoded = RESTRICTION_CARD_TRANSLATIONS[displayLanguage as Language] || RESTRICTION_CARD_TRANSLATIONS.en;
      return {
        header: (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts?.pregnancyHeader)
          ? downloadedLanguageData.restrictionCardTexts.pregnancyHeader
          : hardcoded.pregnancyHeader,
        message: (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts?.pregnancyMessage)
          ? downloadedLanguageData.restrictionCardTexts.pregnancyMessage
          : hardcoded.pregnancyMessage,
        sectionMessage: (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictionCardTexts?.pregnancySectionMessage)
          ? downloadedLanguageData.restrictionCardTexts.pregnancySectionMessage
          : hardcoded.pregnancySectionMessage,
      };
    }
    return { header: base.header, message: base.message, sectionMessage: base.message };
  }, [displayLanguage, isDownloadedLanguage, downloadedLanguageData, showInAppLanguage, pregnancyMode]);

  const getRestrictionTranslation = (id: RestrictionItemId): string => {
    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.restrictions) {
      return downloadedLanguageData.restrictions[id] || RESTRICTION_ITEMS.find((r) => r.id === id)?.translations.en || '';
    }
    const item = RESTRICTION_ITEMS.find((r) => r.id === id);
    return item?.translations[displayLanguage as Language] || item?.translations.en || '';
  };

  const getRestrictionInfo = (id: RestrictionItemId) => {
    return RESTRICTION_ITEMS.find((r) => r.id === id);
  };

  const getAllergenWarning = (id: AllergenId): string | undefined => {
    const images = ALLERGEN_IMAGES[id];
    if (!images?.warning) return undefined;

    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.warnings) {
      return downloadedLanguageData.warnings[id] || images.warning.en;
    }
    return images.warning[displayLanguage as Language] || images.warning.en;
  };

  // Palette colori condizionale
  const colors = useMemo(() => {
    if (pregnancyMode && selectedRestrictions.length > 0) {
      return {
        isPregnancy: true,
        containerBg: '#F48FB1',
        headerBg: '#F48FB1',
        messageBg: '#FFF0F5',
        messageBorder: '#FCE4EC',
        allergenTextColor: '#C2185B',
        breakdownBg: '#FFF0F5',
        breakdownBorder: '#F8BBD0',
        breakdownDescColor: '#AD1457',
        warningTextColor: '#C2185B',
        thanksBg: '#F3E5F5',
        thanksColor: '#9C27B0',
        restrictionBg: '#FFF0F5',
        restrictionBorder: '#F8BBD0',
        restrictionHeaderColor: '#C2185B',
        restrictionTextColor: '#C2185B',
        landscapeLeftBg: '#F48FB1',
        landscapeWrapperBg: '#F06292',
        landscapeAllergenNameColor: '#AD1457',
        landscapeDetailBadgeBg: '#FFF0F5',
        landscapeDetailBadgeTextColor: '#C2185B',
      };
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
  }, [pregnancyMode, selectedRestrictions.length]);

  // Stili dinamici basati sull'orientamento (per portrait)
  const dynamicStyles = useMemo(() => StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    headerSection: {
      backgroundColor: colors.headerBg,
      padding: 24,
      alignItems: 'center',
    },
    warningIcon: {
      fontSize: 48,
      marginBottom: 8,
    },
    header: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      letterSpacing: 2,
    },
    subtitle: {
      fontSize: 18,
      color: '#FFFFFF',
      marginTop: 4,
      letterSpacing: 1,
      textAlign: 'center' as const,
    },
    messageSection: {
      padding: 20,
      backgroundColor: colors.messageBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.messageBorder,
    },
    message: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textPrimary,
      textAlign: 'center' as const,
    },
    allergensSection: {
      padding: 20,
    },
    allergenRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    allergenIcon: {
      fontSize: 28,
      marginRight: 16,
    },
    allergenText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.allergenTextColor,
    },
    tapHint: {
      fontSize: 12,
      color: '#888888',
      marginTop: 2,
    },
    breakdownContainer: {
      backgroundColor: colors.breakdownBg,
      padding: 16,
      marginBottom: 8,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.breakdownBorder,
    },
    exampleEmoji: {
      fontSize: 36,
    },
    breakdownDescription: {
      fontSize: 14,
      color: colors.breakdownDescColor,
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
    warningText: {
      fontSize: 13,
      color: colors.warningTextColor,
      textAlign: 'center' as const,
      fontWeight: '600' as const,
      marginTop: 8,
      paddingHorizontal: 8,
    },
    thanksSection: {
      padding: 20,
      backgroundColor: colors.thanksBg,
    },
    thanks: {
      fontSize: 16,
      color: colors.thanksColor,
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
  }), [colors]);

  const handleLanguageToggle = () => {
    const newValue = !showInAppLanguage;
    setShowInAppLanguage(newValue);
    Analytics.logCardLanguageToggled(newValue, cardLanguage, appLanguage);
  };

  const hasAllergens = selectedAllergens.length > 0;
  const hasRestrictions = selectedRestrictions.length > 0;

  // Restrictions inline (accodate agli allergeni) vs separate (sezione dedicata)
  // Solo la gravidanza merita una sezione separata; gli "altri" vanno in coda agli allergeni
  const inlineRestrictions = !pregnancyMode ? selectedRestrictions : [];
  const separateRestrictions = pregnancyMode ? selectedRestrictions : [];

  // Render Landscape Layout - Design premium moderno
  const renderLandscape = () => {
    const safeLeft = Math.max(insets.left, 12);
    const safeRight = Math.max(insets.right, 12);
    const safeTop = Math.max(insets.top, 8);
    const safeBottom = Math.max(insets.bottom, 6);

    return (
      <View style={[styles.landscapeWrapper, { backgroundColor: colors.landscapeWrapperBg }]}>
        <View style={[styles.landscapeCard, {
          marginTop: safeTop,
          marginLeft: safeLeft,
          marginRight: safeRight,
          marginBottom: safeBottom,
        }]}>
          {/* Contenuto a due colonne */}
          <View style={styles.landscapeBody}>
            {/* Colonna sinistra - Allergeni + inline restrictions con header integrato */}
            {(hasAllergens || inlineRestrictions.length > 0) && (
              <View style={[styles.landscapeLeftColumn, { backgroundColor: colors.landscapeLeftBg }]}>
                {/* Mini header nella colonna sinistra */}
                <View style={styles.landscapeLeftHeader}>
                  {!colors.isPregnancy && <Text style={styles.landscapeWarningIcon}>⚠️</Text>}
                  <Text style={styles.landscapeLeftHeaderTitle}>{colors.isPregnancy ? '🤰 ' : ''}{translations.header}</Text>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.landscapeAllergensScroll}
                >
                  {selectedAllergens.map((id, index) => {
                    const allergen = getAllergenInfo(id);
                    if (!allergen) return null;
                    const isSelected = selectedLandscapeAllergen === id;
                    const isLast = index === selectedAllergens.length - 1 && inlineRestrictions.length === 0;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => setSelectedLandscapeAllergen(isSelected ? null : id)}
                        style={[
                          styles.landscapeAllergenItem,
                          isSelected && styles.landscapeAllergenItemSelected,
                          isLast && { marginBottom: 0 }
                        ]}
                      >
                        <View style={[
                          styles.landscapeAllergenIconBg,
                          isSelected && styles.landscapeAllergenIconBgSelected
                        ]}>
                          <Text style={styles.landscapeAllergenIcon}>{allergen.icon}</Text>
                        </View>
                        <Text style={[
                          styles.landscapeAllergenName,
                          { color: colors.landscapeAllergenNameColor },
                          isSelected && styles.landscapeAllergenNameSelected
                        ]} numberOfLines={2}>
                          {getAllergenTranslation(id)}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {inlineRestrictions.map((id, index) => {
                    const item = getRestrictionInfo(id);
                    if (!item) return null;
                    const isLast = index === inlineRestrictions.length - 1;
                    return (
                      <View
                        key={id}
                        style={[
                          styles.landscapeAllergenItem,
                          isLast && { marginBottom: 0 }
                        ]}
                      >
                        <View style={styles.landscapeAllergenIconBg}>
                          <Text style={styles.landscapeAllergenIcon}>{item.icon}</Text>
                        </View>
                        <Text style={[
                          styles.landscapeAllergenName,
                          { color: colors.landscapeAllergenNameColor },
                        ]} numberOfLines={2}>
                          {getRestrictionTranslation(id)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Colonna destra - Dettagli */}
            <View style={styles.landscapeRightColumn}>
              {/* Header colonna destra - messaggio allergie solo se ci sono */}
              {hasAllergens && (
                <View style={styles.landscapeRightHeader}>
                  <Text style={styles.landscapeRightHeaderText}>{pregnancyMode ? translations.pregnancyMessage : translations.message}</Text>
                </View>
              )}

              {/* Header alternativo solo restrizioni (gravidanza o altri) */}
              {!hasAllergens && hasRestrictions && (
                <View style={[styles.landscapeRightHeader, { backgroundColor: colors.restrictionBg }]}>
                  {!colors.isPregnancy && <Text style={styles.landscapeWarningIcon}>⚠️</Text>}
                  <Text style={[styles.landscapeRightHeaderText, { fontWeight: 'bold' }]}>{restrictionTranslations.message}</Text>
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.landscapeDetailsScroll}
                style={{ flex: 1 }}
              >
                {hasAllergens && selectedAllergens.map((id, index) => {
                  const allergen = getAllergenInfo(id);
                  const images = ALLERGEN_IMAGES[id];
                  if (!allergen || !images) return null;
                  const isSelected = selectedLandscapeAllergen === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedLandscapeAllergen(isSelected ? null : id)}
                      style={[
                        styles.landscapeDetailCard,
                        isSelected && styles.landscapeDetailCardSelected,
                        index === selectedAllergens.length - 1 && { marginBottom: 0 }
                      ]}
                    >
                      <View style={styles.landscapeDetailTop}>
                        <View style={[
                          styles.landscapeDetailBadge,
                          { backgroundColor: colors.landscapeDetailBadgeBg },
                          isSelected && styles.landscapeDetailBadgeSelected
                        ]}>
                          <Text style={styles.landscapeDetailBadgeIcon}>{allergen.icon}</Text>
                          <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor }]}>{getAllergenTranslation(id)}</Text>
                        </View>
                      </View>
                      <View style={styles.landscapeExamplesRow}>
                        <Text style={styles.landscapeExamplesLabel}>{translations.examples || 'Examples:'}</Text>
                        {images.examples.slice(0, 5).map((emoji, idx) => (
                          <Text key={idx} style={styles.landscapeExampleEmoji}>{emoji}</Text>
                        ))}
                      </View>
                      <Text style={styles.landscapeDetailDescription}>{getAllergenDescription(id)}</Text>
                      {getAllergenWarning(id) && (
                        <View style={styles.landscapeWarningBox}>
                          <Text style={styles.landscapeDetailWarning}>{getAllergenWarning(id)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}

                {inlineRestrictions.map((id) => {
                  const item = getRestrictionInfo(id);
                  if (!item) return null;
                  return (
                    <View key={id} style={styles.landscapeDetailCard}>
                      <View style={styles.landscapeDetailTop}>
                        <View style={[styles.landscapeDetailBadge, { backgroundColor: colors.landscapeDetailBadgeBg }]}>
                          <Text style={styles.landscapeDetailBadgeIcon}>{item.icon}</Text>
                          <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor }]}>{getRestrictionTranslation(id)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {separateRestrictions.length > 0 && (
                  <View style={[styles.landscapeRestrictionSection, hasAllergens && { borderTopColor: colors.restrictionBorder }]}>
                    <View style={[styles.landscapeRestrictionHeader, { backgroundColor: colors.restrictionBg, borderBottomColor: colors.restrictionBorder }]}>
                      <Text style={[styles.landscapeRestrictionHeaderText, { color: colors.restrictionHeaderColor }]}>{restrictionTranslations.header}</Text>
                    </View>
                    <Text style={styles.landscapeRestrictionMessage}>{hasAllergens ? restrictionTranslations.sectionMessage : restrictionTranslations.message}</Text>
                    <View style={styles.landscapeRestrictionList}>
                      {separateRestrictions.map((id) => {
                        const item = getRestrictionInfo(id);
                        if (!item) return null;
                        return (
                          <View key={id} style={[styles.landscapeRestrictionItem, { borderColor: colors.restrictionBorder }]}>
                            <Text style={styles.landscapeRestrictionIcon}>{item.icon}</Text>
                            <Text style={[styles.landscapeRestrictionName, { color: colors.restrictionTextColor }]}>{getRestrictionTranslation(id)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer integrato */}
              <View style={[styles.landscapeFooter, { backgroundColor: colors.thanksBg }]}>
                <Text style={[styles.landscapeFooterText, { color: colors.thanksColor }]}>{translations.thanks}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render Portrait Layout
  const renderPortrait = () => (
    <ScrollView contentContainerStyle={dynamicStyles.content}>
      <Surface style={styles.card} elevation={4}>
        <View style={styles.cardContent}>
          <View style={dynamicStyles.headerSection}>
            {!colors.isPregnancy && <Text style={dynamicStyles.warningIcon}>⚠️</Text>}
            <Text style={dynamicStyles.header}>{colors.isPregnancy ? '🤰 ' : ''}{translations.header}</Text>
            {hasAllergens && (
              <Text style={dynamicStyles.subtitle}>{pregnancyMode ? translations.pregnancySubtitle : translations.subtitle}</Text>
            )}
            {!hasAllergens && inlineRestrictions.length > 0 && (
              <Text style={dynamicStyles.subtitle}>{restrictionTranslations.header}</Text>
            )}
          </View>

          {hasAllergens && (
            <View style={dynamicStyles.messageSection}>
              <Text style={dynamicStyles.message}>{pregnancyMode ? translations.pregnancyMessage : translations.message}</Text>
            </View>
          )}

          {!hasAllergens && inlineRestrictions.length > 0 && (
            <View style={dynamicStyles.messageSection}>
              <Text style={dynamicStyles.message}>{restrictionTranslations.message}</Text>
            </View>
          )}

          {(hasAllergens || inlineRestrictions.length > 0) && (
            <View style={dynamicStyles.allergensSection}>
              {selectedAllergens.map((id) => {
                const allergen = getAllergenInfo(id);
                const images = ALLERGEN_IMAGES[id];
                if (!allergen || !images) return null;
                const isExpanded = expandedAllergen === id;

                return (
                  <View key={id}>
                    <Pressable
                      onPress={() => toggleExpand(id)}
                      style={({ pressed }) => [
                        dynamicStyles.allergenRow,
                        pressed && styles.allergenRowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${getAllergenTranslation(id)}, ${translations.tapToSee}`}
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={dynamicStyles.allergenIcon}>{allergen.icon}</Text>
                      <View style={styles.allergenTextContainer}>
                        <Text style={dynamicStyles.allergenText}>{getAllergenTranslation(id)}</Text>
                        <Text style={dynamicStyles.tapHint}>{translations.tapToSee} {isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={dynamicStyles.breakdownContainer}>
                        <View style={styles.examplesRow}>
                          {images.examples.map((emoji, index) => (
                            <Text key={index} style={dynamicStyles.exampleEmoji}>{emoji}</Text>
                          ))}
                        </View>
                        <Text style={dynamicStyles.breakdownDescription}>{getAllergenDescription(id)}</Text>
                        {getAllergenWarning(id) && (
                          <Text style={dynamicStyles.warningText}>{getAllergenWarning(id)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {inlineRestrictions.map((id) => {
                const item = getRestrictionInfo(id);
                if (!item) return null;
                return (
                  <View key={id} style={dynamicStyles.allergenRow}>
                    <Text style={dynamicStyles.allergenIcon}>{item.icon}</Text>
                    <View style={styles.allergenTextContainer}>
                      <Text style={dynamicStyles.allergenText}>{getRestrictionTranslation(id)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {separateRestrictions.length > 0 && (
            <View style={[styles.restrictionsSection, { backgroundColor: colors.restrictionBg, borderTopColor: colors.restrictionBorder }]}>
              <View style={styles.restrictionHeader}>
                <Text style={[styles.restrictionHeaderText, { color: colors.restrictionHeaderColor }]}>{restrictionTranslations.header}</Text>
              </View>
              <Text style={styles.restrictionMessage}>{hasAllergens ? restrictionTranslations.sectionMessage : restrictionTranslations.message}</Text>
              {separateRestrictions.map((id) => {
                const item = getRestrictionInfo(id);
                if (!item) return null;
                return (
                  <View key={id} style={[styles.restrictionRow, { borderBottomColor: colors.restrictionBorder }]}>
                    <Text style={styles.restrictionIcon}>{item.icon}</Text>
                    <Text style={[styles.restrictionText, { color: colors.restrictionTextColor }]}>{getRestrictionTranslation(id)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={dynamicStyles.thanksSection}>
            <Text style={dynamicStyles.thanks}>{translations.thanks}</Text>
          </View>
        </View>
      </Surface>

      <Pressable
        style={styles.languageToggle}
        onPress={handleLanguageToggle}
        accessibilityRole="button"
        accessibilityLabel={showInAppLanguage ? i18n.t('card.showInDestLanguage') : i18n.t('card.showInMyLanguage')}
      >
        <Text style={styles.languageToggleText}>
          {showInAppLanguage ? i18n.t('card.showInDestLanguage') : i18n.t('card.showInMyLanguage')}
        </Text>
      </Pressable>
    </ScrollView>
  );

  // Padding header calcolato in base all'orientamento
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
          {currentLanguage?.flag} {hasAllergens ? (pregnancyMode ? translations.pregnancySubtitle : translations.subtitle) : restrictionTranslations.header}
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

      {isLandscape ? renderLandscape() : renderPortrait()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.error,
  },
  customHeader: {
    backgroundColor: theme.colors.error,
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
  card: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  allergenRowPressed: {
    backgroundColor: '#FFF3E0',
  },
  allergenTextContainer: {
    flex: 1,
  },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'center',
    gap: 8,
  },
  languageToggle: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  languageToggleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Landscape styles - Design premium
  landscapeWrapper: {
    flex: 1,
    backgroundColor: '#C62828',
  },
  landscapeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  // Colonna sinistra
  landscapeLeftColumn: {
    width: '35%',
    backgroundColor: '#D32F2F',
  },
  landscapeLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  landscapeWarningIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  landscapeLeftHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  landscapeAllergensScroll: {
    padding: 10,
    paddingBottom: 16,
  },
  landscapeAllergenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeAllergenItemSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFD600',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  landscapeAllergenIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeAllergenIconBgSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD600',
  },
  landscapeAllergenIcon: {
    fontSize: 30,
  },
  landscapeAllergenName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B71C1C',
    flex: 1,
    lineHeight: 22,
  },
  landscapeAllergenNameSelected: {
    color: '#E65100',
  },
  // Colonna destra
  landscapeRightColumn: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  landscapeRightHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  landscapeRightHeaderText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 22,
  },
  landscapeDetailsScroll: {
    padding: 10,
    paddingBottom: 8,
  },
  landscapeDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeDetailCardSelected: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFD600',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  landscapeDetailTop: {
    marginBottom: 6,
  },
  landscapeDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  landscapeDetailBadgeSelected: {
    backgroundColor: '#FFD600',
  },
  landscapeDetailBadgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  landscapeDetailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  landscapeExamplesLabel: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
    marginRight: 8,
  },
  landscapeExamplesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  landscapeExampleEmoji: {
    fontSize: 32,
  },
  landscapeDetailDescription: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 21,
  },
  landscapeWarningBox: {
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  landscapeDetailWarning: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '600',
    lineHeight: 19,
  },
  // Portrait restriction styles
  restrictionsSection: {
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#FFE082',
    backgroundColor: '#FFF8E1',
  },
  restrictionHeader: {
    marginBottom: 8,
  },
  restrictionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
    letterSpacing: 1,
  },
  restrictionMessage: {
    fontSize: 14,
    color: '#5D4037',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  restrictionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  restrictionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    flex: 1,
  },
  // Landscape restriction styles
  landscapeRestrictionSection: {
    borderTopWidth: 2,
    borderTopColor: '#FFE082',
  },
  landscapeRestrictionHeader: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  landscapeRestrictionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
    letterSpacing: 1,
  },
  landscapeRestrictionMessage: {
    fontSize: 13,
    color: '#5D4037',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  landscapeRestrictionList: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  landscapeRestrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  landscapeRestrictionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  landscapeRestrictionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    flex: 1,
  },
  landscapeFooter: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  landscapeFooterText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
