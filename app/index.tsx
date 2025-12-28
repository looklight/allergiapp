import { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { Text, Button, IconButton, Chip, Surface, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { storage } from '../utils/storage';
import { ALLERGENS } from '../constants/allergens';
import { AllergenId, Language, LANGUAGES, DownloadableLanguageCode, AllLanguageCode } from '../types';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import i18n from '../utils/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>([]);
  const [cardLanguage, setCardLanguage] = useState<AllLanguageCode>('en');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [downloadedLanguages, setDownloadedLanguages] = useState<DownloadableLanguageCode[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const allergens = await storage.getSelectedAllergens();
    const settings = await storage.getSettings();
    const downloaded = await storage.getDownloadedLanguageCodes();
    setSelectedAllergens(allergens);
    setCardLanguage(settings.cardLanguage as AllLanguageCode);
    setDownloadedLanguages(downloaded);
  };

  // Combina lingue hardcoded + scaricate
  const allLanguages = useMemo(() => {
    const downloadedLangInfos = DOWNLOADABLE_LANGUAGES.filter(
      (lang) => downloadedLanguages.includes(lang.code)
    ).map((lang) => ({
      code: lang.code as AllLanguageCode,
      name: lang.name,
      nativeName: lang.nativeName,
      flag: lang.flag,
      isDownloaded: true,
    }));

    const hardcodedLangInfos = LANGUAGES.map((lang) => ({
      code: lang.code as AllLanguageCode,
      name: lang.name,
      nativeName: lang.nativeName,
      flag: lang.flag,
      isDownloaded: false,
    }));

    return [...hardcodedLangInfos, ...downloadedLangInfos];
  }, [downloadedLanguages]);

  const handleLanguageChange = async (lang: AllLanguageCode) => {
    setCardLanguage(lang);
    await storage.setCardLanguage(lang as Language);
    setShowLanguagePicker(false);
  };

  const getAllergenInfo = (id: AllergenId) => {
    return ALLERGENS.find((a) => a.id === id);
  };

  const currentLanguage = allLanguages.find((l) => l.code === cardLanguage);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AllergiApp',
          headerRight: () => (
            <IconButton
              icon="cog"
              iconColor="rgba(255, 255, 255, 0.8)"
              size={22}
              onPress={() => router.push('/settings')}
              style={{ margin: 0, backgroundColor: 'transparent' }}
            />
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sezione Allergie */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <Text style={styles.stepNumber}>1</Text>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {i18n.t('home.title')}
            </Text>
          </View>

          {selectedAllergens.length === 0 ? (
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
            <>
              <View style={styles.chipsContainer}>
                {selectedAllergens.map((id) => {
                  const allergen = getAllergenInfo(id);
                  if (!allergen) return null;
                  const locale = i18n.locale as Language;
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
              </View>
              <Button
                mode="text"
                onPress={() => router.push('/add-allergy')}
                style={styles.editButton}
              >
                {i18n.t('home.editAllergies')}
              </Button>
            </>
          )}
        </Surface>

        {/* Sezione Lingua */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardHeader}>
            <Text style={styles.stepNumber}>2</Text>
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
          >
            <Text style={styles.languageFlag}>{currentLanguage?.flag}</Text>
            <View style={styles.languageInfo}>
              <Text style={styles.languageNativeName}>
                {currentLanguage?.nativeName}
              </Text>
              <Text style={styles.languageName}>
                {currentLanguage?.name}
              </Text>
            </View>
            <Text style={styles.changeText}>{i18n.t('home.change')} ▼</Text>
          </Pressable>

          {/* Quick language buttons */}
          <View style={styles.quickLanguages}>
            {allLanguages.slice(0, 6).map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={[
                  styles.quickLangButton,
                  cardLanguage === lang.code && styles.quickLangButtonActive,
                ]}
              >
                <Text style={styles.quickLangFlag}>{lang.flag}</Text>
              </Pressable>
            ))}
            {allLanguages.length > 6 && (
              <Pressable
                onPress={() => setShowLanguagePicker(true)}
                style={styles.quickLangButton}
              >
                <Text style={styles.quickLangMore}>+{allLanguages.length - 6}</Text>
              </Pressable>
            )}
          </View>
        </Surface>

        {/* Bottone Mostra Card */}
        {selectedAllergens.length > 0 && (
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
            >
              {i18n.t('home.showCardToWaiter')}
            </Button>
          </Surface>
        )}
      </ScrollView>

      {/* Modal selezione lingua */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('home.selectLanguage')}</Text>
              <Pressable onPress={() => setShowLanguagePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={allLanguages}
              keyExtractor={(item) => item.code}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleLanguageChange(item.code)}
                  style={({ pressed }) => [
                    styles.languageItem,
                    pressed && styles.languageItemPressed,
                    item.code === cardLanguage && styles.languageItemSelected,
                  ]}
                >
                  <Text style={styles.itemFlag}>{item.flag}</Text>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemNativeName}>
                      {item.nativeName}
                      {item.isDownloaded && ' ⬇'}
                    </Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  {item.code === cardLanguage && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  cardTitle: {
    fontWeight: '600',
    flex: 1,
  },
  cardSubtitle: {
    color: '#666666',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
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
  chipText: {
    fontSize: 14,
  },
  chipIcon: {
    fontSize: 16,
  },
  editButton: {
    marginTop: 12,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  languageFlag: {
    fontSize: 40,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  languageName: {
    fontSize: 14,
    color: '#666666',
  },
  changeText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  quickLanguages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLangButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLangButtonActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  quickLangFlag: {
    fontSize: 24,
  },
  quickLangMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  showCardSection: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  readyText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  showCardButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  showCardButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  showCardButtonLabel: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
    padding: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  languageItemPressed: {
    backgroundColor: '#F5F5F5',
  },
  languageItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  itemFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemNativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  itemName: {
    fontSize: 14,
    color: '#666666',
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
