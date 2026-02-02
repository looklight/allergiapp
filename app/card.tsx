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
        tapToSee: CARD_TRANSLATIONS.en.tapToSee, // Fallback a inglese per UI
        showIn: CARD_TRANSLATIONS.en.showIn,
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

  // Stili dinamici basati sull'orientamento
  const dynamicStyles = useMemo(() => StyleSheet.create({
    content: {
      padding: isLandscape ? 12 : 16,
      paddingBottom: isLandscape ? 12 : 32,
      paddingLeft: isLandscape ? Math.max(insets.left, 12) : 16,
      paddingRight: isLandscape ? Math.max(insets.right, 12) : 16,
    },
    headerSection: {
      backgroundColor: theme.colors.error,
      padding: isLandscape ? 16 : 24,
      alignItems: 'center',
    },
    warningIcon: {
      fontSize: isLandscape ? 36 : 48,
      marginBottom: isLandscape ? 4 : 8,
    },
    header: {
      fontSize: isLandscape ? 22 : 28,
      fontWeight: 'bold' as const,
      color: '#FFFFFF',
      letterSpacing: 2,
    },
    subtitle: {
      fontSize: isLandscape ? 16 : 18,
      color: '#FFFFFF',
      marginTop: 4,
      letterSpacing: 1,
    },
    messageSection: {
      padding: isLandscape ? 12 : 20,
      backgroundColor: '#FFF3E0',
      borderBottomWidth: 1,
      borderBottomColor: '#FFE0B2',
    },
    message: {
      fontSize: isLandscape ? 14 : 16,
      lineHeight: isLandscape ? 20 : 24,
      color: theme.colors.textPrimary,
      textAlign: 'center' as const,
    },
    allergensSection: {
      padding: isLandscape ? 12 : 20,
    },
    allergenRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: isLandscape ? 8 : 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    allergenIcon: {
      fontSize: isLandscape ? 24 : 28,
      marginRight: isLandscape ? 12 : 16,
    },
    allergenText: {
      fontSize: isLandscape ? 16 : 18,
      fontWeight: '600' as const,
      color: theme.colors.error,
    },
    tapHint: {
      fontSize: isLandscape ? 11 : 12,
      color: '#888888',
      marginTop: 2,
    },
    breakdownContainer: {
      backgroundColor: '#FFF8E1',
      padding: isLandscape ? 12 : 16,
      marginBottom: isLandscape ? 6 : 8,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#FFC107',
    },
    exampleEmoji: {
      fontSize: isLandscape ? 28 : 36,
    },
    breakdownDescription: {
      fontSize: isLandscape ? 13 : 14,
      color: '#5D4037',
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
    warningText: {
      fontSize: isLandscape ? 12 : 13,
      color: '#D84315',
      textAlign: 'center' as const,
      fontWeight: '600' as const,
      marginTop: isLandscape ? 6 : 8,
      paddingHorizontal: 8,
    },
    thanksSection: {
      padding: isLandscape ? 12 : 20,
      backgroundColor: theme.colors.primaryLight,
    },
    thanks: {
      fontSize: isLandscape ? 14 : 16,
      color: '#2E7D32',
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
  }), [isLandscape]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[
        styles.customHeader,
        {
          paddingTop: isLandscape ? Math.max(insets.top, insets.left, insets.right) : insets.top,
          paddingLeft: isLandscape ? Math.max(insets.left, 16) : 16,
          paddingRight: isLandscape ? Math.max(insets.right, 16) : 16,
        }
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentLanguage?.flag} {translations.subtitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.content}>
        <Surface style={styles.card} elevation={4}>
          <View style={styles.cardContent}>
          {isLandscape ? (
            /* Layout Orizzontale - compatto e chiaro */
            <View style={styles.landscapeContainer}>
              {/* Header compatto in alto */}
              <View style={styles.landscapeHeader}>
                <Text style={styles.landscapeWarningIcon}>⚠️</Text>
                <View style={styles.landscapeHeaderText}>
                  <Text style={styles.landscapeTitle}>{translations.header}</Text>
                  <Text style={styles.landscapeMessage}>{translations.message}</Text>
                </View>
              </View>

              {/* Griglia allergeni - tutti visibili */}
              <View style={styles.landscapeAllergensGrid}>
                {selectedAllergens.map((id) => {
                  const allergen = getAllergenInfo(id);
                  const images = ALLERGEN_IMAGES[id];
                  if (!allergen || !images) return null;

                  return (
                    <View key={id} style={styles.landscapeAllergenCard}>
                      <Text style={styles.landscapeAllergenIcon}>{allergen.icon}</Text>
                      <Text style={styles.landscapeAllergenName}>
                        {getAllergenTranslation(id)}
                      </Text>
                      <View style={styles.landscapeExamplesRow}>
                        {images.examples.slice(0, 4).map((emoji, index) => (
                          <Text key={index} style={styles.landscapeExampleEmoji}>
                            {emoji}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Footer con ringraziamento */}
              <View style={styles.landscapeFooter}>
                <Text style={styles.landscapeThanks}>{translations.thanks}</Text>
              </View>
            </View>
          ) : (
            /* Layout Verticale - struttura originale */
            <>
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
                          <Text style={dynamicStyles.allergenText}>
                            {getAllergenTranslation(id)}
                          </Text>
                          <Text style={dynamicStyles.tapHint}>
                            {translations.tapToSee} {isExpanded ? '▲' : '▼'}
                          </Text>
                        </View>
                      </Pressable>

                      {isExpanded && (
                        <View style={dynamicStyles.breakdownContainer}>
                          <View style={styles.examplesRow}>
                            {images.examples.map((emoji, index) => (
                              <Text key={index} style={dynamicStyles.exampleEmoji}>
                                {emoji}
                              </Text>
                            ))}
                          </View>
                          <Text style={dynamicStyles.breakdownDescription}>
                            {getAllergenDescription(id)}
                          </Text>
                          {images.warning && (
                            <Text style={dynamicStyles.warningText}>
                              {images.warning[displayLanguage as Language] || images.warning.en}
                            </Text>
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
            </>
          )}
          </View>
        </Surface>

        {/* Language Toggle - Secondary action */}
        <Pressable
          style={styles.languageToggle}
          onPress={() => {
            const newValue = !showInAppLanguage;
            setShowInAppLanguage(newValue);
            Analytics.logCardLanguageToggled(newValue, cardLanguage, appLanguage);
          }}
          accessibilityRole="button"
          accessibilityLabel={showInAppLanguage
            ? i18n.t('card.showInDestLanguage')
            : i18n.t('card.showInMyLanguage')}
        >
          <Text style={styles.languageToggleText}>
            {showInAppLanguage
              ? i18n.t('card.showInDestLanguage')
              : i18n.t('card.showInMyLanguage')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.error,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  landscapeContainer: {
    flex: 1,
  },
  landscapeHeader: {
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  landscapeWarningIcon: {
    fontSize: 32,
  },
  landscapeHeaderText: {
    flex: 1,
  },
  landscapeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  landscapeMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  landscapeAllergensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
    backgroundColor: theme.colors.surface,
  },
  landscapeAllergenCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    minWidth: 110,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  landscapeAllergenIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  landscapeAllergenName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 6,
  },
  landscapeExamplesRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  landscapeExampleEmoji: {
    fontSize: 20,
  },
  landscapeFooter: {
    backgroundColor: theme.colors.primaryLight,
    padding: 10,
    alignItems: 'center',
  },
  landscapeThanks: {
    fontSize: 13,
    color: '#2E7D32',
    fontStyle: 'italic',
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
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
  allergensSection: {
    padding: 20,
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  allergenRowPressed: {
    backgroundColor: '#FFF3E0',
  },
  allergenIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  allergenTextContainer: {
    flex: 1,
  },
  allergenText: {
    fontSize: 18,
    fontWeight: '600',
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
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'center',
    gap: 8,
  },
  exampleEmoji: {
    fontSize: 36,
  },
  breakdownDescription: {
    fontSize: 14,
    color: '#5D4037',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  thanksSection: {
    padding: 20,
    backgroundColor: theme.colors.primaryLight,
  },
  thanks: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    fontStyle: 'italic',
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
});
