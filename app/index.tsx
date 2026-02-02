import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TouchableOpacity, Modal, FlatList, Animated, PanResponder, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Text, Button, Chip, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ALLERGENS } from '../constants/allergens';
import { AllergenId, Language, LANGUAGES, AllLanguageCode, AppLanguage, DownloadableLanguageCode } from '../types';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { theme } from '../constants/theme';
import { getLocalizedLanguageName } from '../constants/languageNames';
import i18n from '../utils/i18n';
import { useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';
import BannerCarousel from './components/BannerCarousel';
import { useLanguageDownload } from '../hooks/useLanguageDownload';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedAllergens, settings, downloadedLanguageCodes, setCardLanguage, saveDownloadedLanguage } = useAppContext();
  const cardLanguage = settings.cardLanguage;
  const appLang = settings.appLanguage;
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { downloadingLang, downloadProgress, isDownloading, handleDownloadLanguage: downloadLanguage } = useLanguageDownload();
  const pickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const openPicker = useCallback(() => {
    setShowLanguagePicker(true);
    Animated.timing(pickerAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pickerAnim]);

  const closePicker = useCallback(() => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLanguagePicker(false);
      setSearchQuery('');
      dragY.setValue(0);
    });
  }, [pickerAnim]);

  // Swipe down to dismiss
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) dragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          Animated.timing(dragY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowLanguagePicker(false);
            setSearchQuery('');
            dragY.setValue(0);
            pickerAnim.setValue(0);
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  // Combina lingue hardcoded + scaricate
  const allLanguages = useMemo(() => {
    const buildLangInfo = (lang: { code: string; name: string; nativeName: string; flag: string }, isDownloaded: boolean) => ({
      code: lang.code as AllLanguageCode,
      englishName: lang.name,
      localizedName: getLocalizedLanguageName(lang.code, appLang) || lang.name,
      nativeName: lang.nativeName,
      flag: lang.flag,
      isDownloaded,
    });

    const hardcodedLangInfos = LANGUAGES.map((lang) => buildLangInfo(lang, false));
    const downloadedLangInfos = DOWNLOADABLE_LANGUAGES
      .filter((lang) => downloadedLanguageCodes.includes(lang.code))
      .map((lang) => buildLangInfo(lang, true));

    return [...hardcodedLangInfos, ...downloadedLangInfos];
  }, [downloadedLanguageCodes, appLang]);

  const filteredLanguages = useMemo(() => {
    const addType = (list: typeof allLanguages, needsDownload: boolean) =>
      list.map((l) => ({ ...l, needsDownload }));

    if (!searchQuery.trim()) return addType(allLanguages, false);
    const q = searchQuery.toLowerCase();

    const matchesQuery = (lang: { nativeName: string; localizedName: string; englishName: string }) =>
      lang.nativeName.toLowerCase().includes(q) ||
      lang.localizedName.toLowerCase().includes(q) ||
      lang.englishName.toLowerCase().includes(q);

    // Filtra lingue disponibili (hardcoded + scaricate)
    const matched = allLanguages.filter(matchesQuery);

    // Cerca anche nelle lingue scaricabili non ancora presenti
    const existingCodes = new Set(allLanguages.map((l) => l.code));
    const downloadable = DOWNLOADABLE_LANGUAGES
      .filter((lang) => {
        if (existingCodes.has(lang.code as AllLanguageCode)) return false;
        const localized = getLocalizedLanguageName(lang.code, appLang) || lang.name;
        return lang.name.toLowerCase().includes(q) ||
          lang.nativeName.toLowerCase().includes(q) ||
          localized.toLowerCase().includes(q);
      })
      .map((lang) => ({
        code: lang.code as AllLanguageCode,
        englishName: lang.name,
        localizedName: getLocalizedLanguageName(lang.code, appLang) || lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        isDownloaded: false,
      }));

    return [...addType(matched, false), ...addType(downloadable, true)];
  }, [allLanguages, searchQuery, appLang]);

  const handleLanguageChange = async (lang: AllLanguageCode) => {
    const previousLanguage = cardLanguage;
    await setCardLanguage(lang);
    await Analytics.logCardLanguageChanged(previousLanguage, lang);
    closePicker();
  };

  const handleDownloadLanguage = async (langCode: DownloadableLanguageCode) => {
    await downloadLanguage(langCode, saveDownloadedLanguage);
  };

  const getAllergenInfo = (id: AllergenId) => {
    return ALLERGENS.find((a) => a.id === id);
  };

  const currentLanguage = allLanguages.find((l) => l.code === cardLanguage);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>AllergiApp</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="cog" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            {selectedAllergens.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/add-allergy')}
                hitSlop={8}
                activeOpacity={0.6}
              >
                <Text style={styles.editLink}>
                  {i18n.t('home.editAllergies')}
                </Text>
              </TouchableOpacity>
            )}
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
            onPress={openPicker}
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
              accessibilityLabel={i18n.t('home.showCardToWaiter')}
            >
              {i18n.t('home.showCardToWaiter')}
            </Button>
          </Surface>
        )}
      </ScrollView>

      {/* Modal selezione lingua */}
      <Modal
        visible={showLanguagePicker}
        animationType="none"
        transparent={true}
        onRequestClose={closePicker}
      >
        <View style={styles.modalContainer}>
          {/* Overlay: fade in, dims on drag */}
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity: Animated.multiply(
                  pickerAnim,
                  dragY.interpolate({
                    inputRange: [0, 300],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  })
                ),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
          </Animated.View>

          {/* Pannello: slide up + drag down */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{
                  translateY: Animated.add(
                    pickerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                    dragY
                  ),
                }],
              },
            ]}
          >
            {/* Handle + header: area di drag */}
            <View {...panResponder.panHandlers}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{i18n.t('home.selectLanguage')}</Text>
                <Pressable
                  onPress={closePicker}
                  hitSlop={8}
                  style={styles.modalCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={i18n.t('settings.searchLanguage')}
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>
            <FlatList
              data={filteredLanguages}
              keyExtractor={(item: any) => item.code}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }: { item: any }) => {
                const isDownloading = downloadingLang === item.code;
                return (
                  <Pressable
                    onPress={() => {
                      if (isDownloading) return;
                      if (item.needsDownload) {
                        handleDownloadLanguage(item.code as DownloadableLanguageCode);
                      } else {
                        handleLanguageChange(item.code);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.languageItem,
                      pressed && !isDownloading && styles.languageItemPressed,
                      !item.needsDownload && item.code === cardLanguage && styles.languageItemSelected,
                    ]}
                  >
                    <Text style={styles.itemFlag}>{item.flag}</Text>
                    <View style={styles.itemTextContainer}>
                      <Text style={[styles.itemNativeName, item.needsDownload && !isDownloading && styles.itemNeedsDownload]}>
                        {item.nativeName}
                      </Text>
                      <Text style={styles.itemName}>
                        {isDownloading
                          ? `${i18n.t('settings.downloading')} ${Math.round(downloadProgress?.percentage || 0)}%`
                          : (() => {
                              const parts: string[] = [];
                              if (item.localizedName !== item.nativeName) parts.push(item.localizedName);
                              if (item.englishName !== item.nativeName && item.englishName !== item.localizedName) parts.push(item.englishName);
                              return parts.join(' · ') || item.englishName;
                            })()
                        }
                      </Text>
                    </View>
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : item.needsDownload ? (
                      <MaterialCommunityIcons name="download-outline" size={20} color={theme.colors.primary} />
                    ) : item.isDownloaded ? (
                      <MaterialCommunityIcons name="download-circle-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                    ) : null}
                    {!item.needsDownload && item.code === cardLanguage && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                );
              }}
              ListFooterComponent={() => (
                <>
                  <Divider />
                  <TouchableOpacity
                    onPress={() => {
                      closePicker();
                      router.push('/settings');
                    }}
                    activeOpacity={0.6}
                    style={styles.downloadMoreButton}
                  >
                    <MaterialCommunityIcons name="download" size={22} color={theme.colors.primary} />
                    <Text style={styles.downloadMoreText}>{i18n.t('home.downloadMoreLanguages')}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
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
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    color: '#FFFFFF',
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
  chipText: {
    fontSize: 14,
  },
  chipIcon: {
    fontSize: 16,
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
    color: '#FFFFFF',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    paddingVertical: 2,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  languageItemPressed: {
    backgroundColor: theme.colors.background,
  },
  languageItemSelected: {
    backgroundColor: theme.colors.primaryLight,
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
    color: theme.colors.textPrimary,
  },
  itemNeedsDownload: {
    color: theme.colors.textSecondary,
  },
  itemName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  downloadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 48,
  },
  downloadMoreText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 16,
  },
});
