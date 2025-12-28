import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { ALLERGENS } from '../constants/allergens';
import { ALLERGEN_IMAGES } from '../constants/allergenImages';
import { CARD_TRANSLATIONS } from '../constants/cardTranslations';
import { AllergenId, Language, LANGUAGES, AppLanguage } from '../types';
import i18n from '../utils/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CardScreen() {
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>([]);
  const [cardLanguage, setCardLanguage] = useState<Language>('en');
  const [appLanguage, setAppLanguage] = useState<AppLanguage>('it');
  const [showInAppLanguage, setShowInAppLanguage] = useState(false);
  const [expandedAllergen, setExpandedAllergen] = useState<AllergenId | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const allergens = await storage.getSelectedAllergens();
    const settings = await storage.getSettings();
    setSelectedAllergens(allergens);
    setCardLanguage(settings.cardLanguage);
    setAppLanguage(settings.appLanguage);
    setShowInAppLanguage(false); // Reset to destination language when entering
  };

  const getAllergenInfo = (id: AllergenId) => {
    return ALLERGENS.find((a) => a.id === id);
  };

  const toggleExpand = (id: AllergenId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAllergen(expandedAllergen === id ? null : id);
  };

  // Current display language (either destination or app language)
  const displayLanguage = showInAppLanguage ? appLanguage : cardLanguage;
  const currentLanguage = LANGUAGES.find((l) => l.code === displayLanguage);
  const destLanguage = LANGUAGES.find((l) => l.code === cardLanguage);
  const appLang = LANGUAGES.find((l) => l.code === appLanguage);
  const translations = CARD_TRANSLATIONS[displayLanguage];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${currentLanguage?.flag} ${translations.subtitle}`,
          headerStyle: {
            backgroundColor: '#D32F2F',
          },
          headerTintColor: '#FFFFFF',
          headerLeft: () => (
            <IconButton
              icon="close"
              iconColor="#FFFFFF"
              size={24}
              onPress={() => router.back()}
            />
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.card} elevation={4}>
          <View style={styles.headerSection}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.header}>{translations.header}</Text>
            <Text style={styles.subtitle}>{translations.subtitle}</Text>
          </View>

          <View style={styles.messageSection}>
            <Text style={styles.message}>{translations.message}</Text>
          </View>

          <View style={styles.allergensSection}>
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
                      styles.allergenRow,
                      pressed && styles.allergenRowPressed,
                    ]}
                  >
                    <Text style={styles.allergenIcon}>{allergen.icon}</Text>
                    <View style={styles.allergenTextContainer}>
                      <Text style={styles.allergenText}>
                        {allergen.translations[displayLanguage]}
                      </Text>
                      <Text style={styles.tapHint}>
                        {translations.tapToSee} {isExpanded ? '▲' : '▼'}
                      </Text>
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.breakdownContainer}>
                      <View style={styles.examplesRow}>
                        {images.examples.map((emoji, index) => (
                          <Text key={index} style={styles.exampleEmoji}>
                            {emoji}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.breakdownDescription}>
                        {images.description[displayLanguage] || images.description.en}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.thanksSection}>
            <Text style={styles.thanks}>{translations.thanks}</Text>
          </View>
        </Surface>

        {/* Language Toggle - Secondary action */}
        <Pressable
          style={styles.languageToggle}
          onPress={() => setShowInAppLanguage(!showInAppLanguage)}
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
  container: {
    flex: 1,
    backgroundColor: '#D32F2F',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  headerSection: {
    backgroundColor: '#D32F2F',
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
    color: '#333333',
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
    borderBottomColor: '#EEEEEE',
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
    color: '#D32F2F',
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
    backgroundColor: '#E8F5E9',
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
