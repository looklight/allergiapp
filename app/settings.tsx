import { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import {
  Text,
  List,
  RadioButton,
  Button,
  Divider,
  Portal,
  Dialog,
  ActivityIndicator,
  ProgressBar,
  Chip,
  IconButton,
} from 'react-native-paper';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { storage } from '../utils/storage';
import { AppLanguage, DownloadableLanguageCode, LanguageRegion, DownloadableLanguageInfo } from '../types';
import i18n, { setAppLanguage } from '../utils/i18n';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { downloadLanguageTranslations, DownloadProgress } from '../utils/translationService';

const REGION_ICONS: Record<LanguageRegion, string> = {
  europe: '🇪🇺',
  asia: '🌏',
  africa: '🌍',
  other: '🌐',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [appLang, setAppLang] = useState<AppLanguage>('it');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [, forceUpdate] = useState({});
  const [downloadedLanguages, setDownloadedLanguages] = useState<DownloadableLanguageCode[]>([]);
  const [downloadingLang, setDownloadingLang] = useState<DownloadableLanguageCode | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Record<LanguageRegion, boolean>>({
    europe: true,
    asia: false,
    africa: false,
    other: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadDownloadedLanguages();
    }, [])
  );

  const loadSettings = async () => {
    const settings = await storage.getSettings();
    setAppLang(settings.appLanguage);
  };

  const loadDownloadedLanguages = async () => {
    const codes = await storage.getDownloadedLanguageCodes();
    setDownloadedLanguages(codes);
  };

  const handleDownloadLanguage = async (langCode: DownloadableLanguageCode) => {
    setDownloadingLang(langCode);
    setDownloadProgress(null);

    try {
      const data = await downloadLanguageTranslations(langCode, (progress) => {
        setDownloadProgress(progress);
      });
      await storage.saveDownloadedLanguage(langCode, data);
      await loadDownloadedLanguages();
      Alert.alert('', i18n.t('settings.downloaded'));
    } catch {
      Alert.alert('', i18n.t('settings.downloadError'));
    } finally {
      setDownloadingLang(null);
      setDownloadProgress(null);
    }
  };

  const handleDeleteLanguage = (langCode: DownloadableLanguageCode) => {
    Alert.alert(
      '',
      i18n.t('settings.deleteConfirm'),
      [
        { text: i18n.t('settings.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.delete'),
          style: 'destructive',
          onPress: async () => {
            await storage.deleteDownloadedLanguage(langCode);
            await loadDownloadedLanguages();
          },
        },
      ]
    );
  };

  const getProgressText = (progress: DownloadProgress): string => {
    switch (progress.phase) {
      case 'allergens':
        return i18n.t('settings.translatingAllergens');
      case 'descriptions':
        return i18n.t('settings.translatingDescriptions');
      case 'cardTexts':
        return i18n.t('settings.translatingCard');
      default:
        return '';
    }
  };

  // Filtra lingue in base alla ricerca
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return DOWNLOADABLE_LANGUAGES;
    }
    const query = searchQuery.toLowerCase().trim();
    return DOWNLOADABLE_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Separa lingue scaricate e disponibili
  const downloadedLangs = useMemo(() => {
    return filteredLanguages.filter((lang) =>
      downloadedLanguages.includes(lang.code)
    );
  }, [filteredLanguages, downloadedLanguages]);

  // Raggruppa lingue disponibili per regione (ordinate alfabeticamente)
  const availableLangsByRegion = useMemo(() => {
    const available = filteredLanguages.filter(
      (lang) => !downloadedLanguages.includes(lang.code)
    );

    const grouped: Record<LanguageRegion, DownloadableLanguageInfo[]> = {
      europe: [],
      asia: [],
      africa: [],
      other: [],
    };

    available.forEach((lang) => {
      grouped[lang.region].push(lang);
    });

    // Ordina alfabeticamente per nome nativo
    Object.keys(grouped).forEach((region) => {
      grouped[region as LanguageRegion].sort((a, b) =>
        a.nativeName.localeCompare(b.nativeName)
      );
    });

    return grouped;
  }, [filteredLanguages, downloadedLanguages]);

  const getRegionName = (region: LanguageRegion): string => {
    return i18n.t(`settings.region_${region}`);
  };

  const toggleRegion = (region: LanguageRegion) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [region]: !prev[region],
    }));
  };

  const handleAppLanguageChange = async (lang: string) => {
    const language = lang as AppLanguage;
    setAppLang(language);
    await storage.setAppLanguage(language);
    setAppLanguage(language);
    // Force re-render to update all translations
    forceUpdate({});
  };

  const handleClearData = async () => {
    await storage.clearAll();
    setShowClearDialog(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: i18n.t('settings.title'),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{
                marginLeft: 8,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '300' }}>‹</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView>
        <List.Section>
          <List.Subheader>{i18n.t('settings.appLanguage')}</List.Subheader>

          <RadioButton.Group
            onValueChange={handleAppLanguageChange}
            value={appLang}
          >
            <List.Item
              title="Italiano"
              left={() => <Text style={styles.flag}>🇮🇹</Text>}
              right={() => <RadioButton value="it" />}
              onPress={() => handleAppLanguageChange('it')}
            />
            <Divider />
            <List.Item
              title="English"
              left={() => <Text style={styles.flag}>🇬🇧</Text>}
              right={() => <RadioButton value="en" />}
              onPress={() => handleAppLanguageChange('en')}
            />
          </RadioButton.Group>
        </List.Section>

        <Divider style={styles.sectionDivider} />

        <List.Section>
          <List.Subheader>{i18n.t('settings.downloadLanguages')}</List.Subheader>
          <Text style={styles.downloadDesc}>
            {i18n.t('settings.downloadLanguagesDesc')}
          </Text>

          {/* Barra di ricerca */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={i18n.t('settings.searchLanguage')}
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.languageCount}>
              {filteredLanguages.length} {i18n.t('settings.languagesAvailable')}
            </Text>
          </View>

          {/* Lingue scaricate */}
          {downloadedLangs.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  ✓ {i18n.t('settings.downloadedLanguages')} ({downloadedLangs.length})
                </Text>
              </View>
              {downloadedLangs.map((lang) => {
                const isDownloading = downloadingLang === lang.code;
                return (
                  <View key={lang.code}>
                    <List.Item
                      title={lang.nativeName}
                      description={lang.name}
                      left={() => <Text style={styles.flag}>{lang.flag}</Text>}
                      right={() => (
                        <View style={styles.langAction}>
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                          ) : (
                            <IconButton
                              icon="delete-outline"
                              iconColor="#D32F2F"
                              size={20}
                              onPress={() => handleDeleteLanguage(lang.code)}
                            />
                          )}
                        </View>
                      )}
                      style={styles.downloadedItem}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {/* Risultati ricerca (lista piatta) */}
          {searchQuery.trim().length > 0 && filteredLanguages.filter(l => !downloadedLanguages.includes(l.code)).length > 0 && (
            <View style={styles.searchResults}>
              {filteredLanguages
                .filter((lang) => !downloadedLanguages.includes(lang.code))
                .map((lang) => {
                  const isDownloading = downloadingLang === lang.code;
                  return (
                    <View key={lang.code}>
                      <Pressable
                        onPress={() => !isDownloading && handleDownloadLanguage(lang.code)}
                        style={({ pressed }) => [
                          styles.languageItem,
                          pressed && styles.languageItemPressed,
                        ]}
                      >
                        <Text style={styles.langFlag}>{lang.flag}</Text>
                        <View style={styles.langInfo}>
                          <Text style={styles.langNativeName}>{lang.nativeName}</Text>
                          <Text style={styles.langName}>{lang.name}</Text>
                        </View>
                        {isDownloading ? (
                          <View style={styles.downloadingIndicator}>
                            <ActivityIndicator size="small" color="#4CAF50" />
                            {downloadProgress && (
                              <Text style={styles.progressText}>
                                {downloadProgress.percentage}%
                              </Text>
                            )}
                          </View>
                        ) : (
                          <IconButton
                            icon="download"
                            iconColor="#4CAF50"
                            size={20}
                            style={styles.downloadButton}
                          />
                        )}
                      </Pressable>
                      {isDownloading && downloadProgress && (
                        <View style={styles.progressContainer}>
                          <ProgressBar
                            progress={downloadProgress.percentage / 100}
                            color="#4CAF50"
                            style={styles.progressBar}
                          />
                          <Text style={styles.progressLabel}>
                            {getProgressText(downloadProgress)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          )}

          {/* Lingue disponibili per regione (solo se non c'è ricerca) */}
          {searchQuery.trim().length === 0 && (['europe', 'asia', 'africa', 'other'] as LanguageRegion[]).map((region) => {
            const regionLangs = availableLangsByRegion[region];
            if (regionLangs.length === 0) return null;
            const isExpanded = expandedRegions[region];

            return (
              <View key={region} style={styles.regionContainer}>
                <Pressable
                  onPress={() => toggleRegion(region)}
                  style={({ pressed }) => [
                    styles.regionHeader,
                    pressed && styles.regionHeaderPressed,
                  ]}
                >
                  <Text style={styles.regionIcon}>{REGION_ICONS[region]}</Text>
                  <Text style={styles.regionTitle}>
                    {getRegionName(region)} ({regionLangs.length})
                  </Text>
                  <IconButton
                    icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                    iconColor="#78909C"
                    size={20}
                    style={styles.chevronButton}
                  />
                </Pressable>
                {isExpanded && regionLangs.map((lang) => {
                  const isDownloading = downloadingLang === lang.code;
                  return (
                    <View key={lang.code}>
                      <Pressable
                        onPress={() => !isDownloading && handleDownloadLanguage(lang.code)}
                        style={({ pressed }) => [
                          styles.languageItem,
                          pressed && styles.languageItemPressed,
                        ]}
                      >
                        <Text style={styles.langFlag}>{lang.flag}</Text>
                        <View style={styles.langInfo}>
                          <Text style={styles.langNativeName}>{lang.nativeName}</Text>
                          <Text style={styles.langName}>{lang.name}</Text>
                        </View>
                        {isDownloading ? (
                          <View style={styles.downloadingIndicator}>
                            <ActivityIndicator size="small" color="#4CAF50" />
                            {downloadProgress && (
                              <Text style={styles.progressText}>
                                {downloadProgress.percentage}%
                              </Text>
                            )}
                          </View>
                        ) : (
                          <IconButton
                            icon="download"
                            iconColor="#4CAF50"
                            size={20}
                            style={styles.downloadButton}
                          />
                        )}
                      </Pressable>
                      {isDownloading && downloadProgress && (
                        <View style={styles.progressContainer}>
                          <ProgressBar
                            progress={downloadProgress.percentage / 100}
                            color="#4CAF50"
                            style={styles.progressBar}
                          />
                          <Text style={styles.progressLabel}>
                            {getProgressText(downloadProgress)}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Nessun risultato */}
          {searchQuery.trim().length > 0 && filteredLanguages.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                {i18n.t('settings.noLanguagesFound')}
              </Text>
            </View>
          )}
        </List.Section>

        <Divider style={styles.sectionDivider} />

        <View style={styles.dangerSection}>
          <Button
            mode="outlined"
            textColor="#D32F2F"
            style={styles.clearButton}
            onPress={() => setShowClearDialog(true)}
          >
            {i18n.t('settings.clearData')}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={showClearDialog}
          onDismiss={() => setShowClearDialog(false)}
        >
          <Dialog.Title>{i18n.t('settings.clearData')}</Dialog.Title>
          <Dialog.Content>
            <Text>{i18n.t('settings.clearDataConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearDialog(false)}>
              {i18n.t('settings.cancel')}
            </Button>
            <Button textColor="#D32F2F" onPress={handleClearData}>
              {i18n.t('settings.confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flag: {
    fontSize: 24,
    marginLeft: 16,
    alignSelf: 'center',
  },
  sectionDivider: {
    marginVertical: 16,
  },
  dangerSection: {
    padding: 16,
    paddingBottom: 32,
  },
  clearButton: {
    borderColor: '#D32F2F',
  },
  downloadDesc: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: '#666666',
    fontSize: 14,
  },
  // Barra di ricerca
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 4,
  },
  clearSearch: {
    fontSize: 16,
    color: '#999999',
    padding: 4,
  },
  languageCount: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  // Sezioni lingue
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
  },
  downloadedItem: {
    backgroundColor: '#E8F5E9',
  },
  // Lista lingue disponibili
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  languageItemPressed: {
    backgroundColor: '#F5F5F5',
  },
  langFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  langInfo: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  langName: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  downloadIcon: {
    fontSize: 18,
    color: '#4CAF50',
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langAction: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  progressText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  searchResults: {
    marginTop: 8,
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999999',
  },
  // Regioni
  regionContainer: {
    marginBottom: 8,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F0F4F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  regionHeaderPressed: {
    backgroundColor: '#E3E8ED',
  },
  regionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  regionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#455A64',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevronButton: {
    margin: 0,
    marginRight: -8,
  },
  downloadButton: {
    margin: 0,
  },
});
