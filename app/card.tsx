import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TouchableOpacity, LayoutAnimation, Platform, UIManager, useWindowDimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS } from '../constants/cardTranslations';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
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
  const { selectedAllergens, settings, downloadedLanguages } = useAppContext();
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
        message: downloadedLanguageData.cardTexts.message,
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

  const getAllergenWarning = (id: AllergenId): string | undefined => {
    const images = ALLERGEN_IMAGES[id];
    if (!images?.warning) return undefined;

    if (!showInAppLanguage && isDownloadedLanguage && downloadedLanguageData?.warnings) {
      return downloadedLanguageData.warnings[id] || images.warning.en;
    }
    return images.warning[displayLanguage as Language] || images.warning.en;
  };

  // Stili dinamici basati sull'orientamento (per portrait)
  const dynamicStyles = useMemo(() => StyleSheet.create({
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    headerSection: {
      backgroundColor: theme.colors.error,
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
    },
    messageSection: {
      padding: 20,
      backgroundColor: '#FFF3E0',
      borderBottomWidth: 1,
      borderBottomColor: '#FFE0B2',
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
      color: theme.colors.error,
    },
    tapHint: {
      fontSize: 12,
      color: '#888888',
      marginTop: 2,
    },
    breakdownContainer: {
      backgroundColor: '#FFF8E1',
      padding: 16,
      marginBottom: 8,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#FFC107',
    },
    exampleEmoji: {
      fontSize: 36,
    },
    breakdownDescription: {
      fontSize: 14,
      color: '#5D4037',
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
    warningText: {
      fontSize: 13,
      color: '#D84315',
      textAlign: 'center' as const,
      fontWeight: '600' as const,
      marginTop: 8,
      paddingHorizontal: 8,
    },
    thanksSection: {
      padding: 20,
      backgroundColor: theme.colors.primaryLight,
    },
    thanks: {
      fontSize: 16,
      color: '#2E7D32',
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
  }), []);

  const handleLanguageToggle = () => {
    const newValue = !showInAppLanguage;
    setShowInAppLanguage(newValue);
    Analytics.logCardLanguageToggled(newValue, cardLanguage, appLanguage);
  };

  // Render Landscape Layout - Design premium moderno
  const renderLandscape = () => {
    const safeLeft = Math.max(insets.left, 12);
    const safeRight = Math.max(insets.right, 12);
    const safeTop = Math.max(insets.top, 8);
    const safeBottom = Math.max(insets.bottom, 6);

    return (
      <View style={styles.landscapeWrapper}>
        <View style={[styles.landscapeCard, {
          marginTop: safeTop,
          marginLeft: safeLeft,
          marginRight: safeRight,
          marginBottom: safeBottom,
        }]}>
          {/* Contenuto a due colonne */}
          <View style={styles.landscapeBody}>
            {/* Colonna sinistra - Allergeni con header integrato */}
            <View style={styles.landscapeLeftColumn}>
              {/* Mini header nella colonna sinistra */}
              <View style={styles.landscapeLeftHeader}>
                <Text style={styles.landscapeWarningIcon}>⚠️</Text>
                <Text style={styles.landscapeLeftHeaderTitle}>{translations.header}</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.landscapeAllergensScroll}
              >
                {selectedAllergens.map((id, index) => {
                  const allergen = getAllergenInfo(id);
                  if (!allergen) return null;
                  const isSelected = selectedLandscapeAllergen === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedLandscapeAllergen(isSelected ? null : id)}
                      style={[
                        styles.landscapeAllergenItem,
                        isSelected && styles.landscapeAllergenItemSelected,
                        index === selectedAllergens.length - 1 && { marginBottom: 0 }
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
                        isSelected && styles.landscapeAllergenNameSelected
                      ]} numberOfLines={2}>
                        {getAllergenTranslation(id)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Colonna destra - Dettagli */}
            <View style={styles.landscapeRightColumn}>
              {/* Header colonna destra */}
              <View style={styles.landscapeRightHeader}>
                <Text style={styles.landscapeRightHeaderText}>{translations.message}</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.landscapeDetailsScroll}
              >
                {selectedAllergens.map((id, index) => {
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
                          isSelected && styles.landscapeDetailBadgeSelected
                        ]}>
                          <Text style={styles.landscapeDetailBadgeIcon}>{allergen.icon}</Text>
                          <Text style={styles.landscapeDetailBadgeText}>{getAllergenTranslation(id)}</Text>
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
              </ScrollView>

              {/* Footer integrato */}
              <View style={styles.landscapeFooter}>
                <Text style={styles.landscapeFooterText}>{translations.thanks}</Text>
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
            <Text style={dynamicStyles.warningIcon}>⚠️</Text>
            <Text style={dynamicStyles.header}>{translations.header}</Text>
            <Text style={dynamicStyles.subtitle}>{translations.subtitle}</Text>
          </View>

          <View style={dynamicStyles.messageSection}>
            <Text style={dynamicStyles.message}>{translations.message}</Text>
          </View>

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
          </View>

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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, headerPadding]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentLanguage?.flag} {translations.subtitle}</Text>
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
