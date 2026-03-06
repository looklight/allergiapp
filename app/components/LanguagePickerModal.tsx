import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, Modal, FlatList, Animated, PanResponder, TextInput, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AllLanguageCode, AppLanguage, DownloadableLanguageCode, LANGUAGES } from '../../types';
import { DOWNLOADABLE_LANGUAGES } from '../../constants/downloadableLanguages';
import { getLocalizedLanguageName } from '../../constants/languageNames';
import { DownloadProgress } from '../../services/translationService';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  cardLanguage: AllLanguageCode;
  appLang: AppLanguage;
  downloadedLanguageCodes: DownloadableLanguageCode[];
  onLanguageChange: (lang: AllLanguageCode) => Promise<void>;
  onDownloadLanguage: (lang: DownloadableLanguageCode) => Promise<void>;
  downloadingLang: DownloadableLanguageCode | null;
  downloadProgress: DownloadProgress | null;
  onNavigateToSettings: () => void;
}

export default function LanguagePickerModal({
  visible,
  onClose,
  cardLanguage,
  appLang,
  downloadedLanguageCodes,
  onLanguageChange,
  onDownloadLanguage,
  downloadingLang,
  downloadProgress,
  onNavigateToSettings,
}: LanguagePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  // Ref per onClose stabile nel panResponder
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      Animated.timing(pickerAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const close = useCallback(() => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSearchQuery('');
      dragY.setValue(0);
      onCloseRef.current();
    });
  }, [pickerAnim, dragY]);

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
            setSearchQuery('');
            dragY.setValue(0);
            pickerAnim.setValue(0);
            onCloseRef.current();
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

    const matched = allLanguages.filter(matchesQuery);

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

  const handleSelect = async (lang: AllLanguageCode) => {
    await onLanguageChange(lang);
    close();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={close}
    >
      <View style={styles.modalContainer}>
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
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

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
          <View {...panResponder.panHandlers}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('home.selectLanguage')}</Text>
              <Pressable
                onPress={close}
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
              const isItemDownloading = downloadingLang === item.code;
              return (
                <Pressable
                  onPress={() => {
                    if (isItemDownloading) return;
                    if (item.needsDownload) {
                      onDownloadLanguage(item.code as DownloadableLanguageCode);
                    } else {
                      handleSelect(item.code);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.languageItem,
                    pressed && !isItemDownloading && styles.languageItemPressed,
                    !item.needsDownload && item.code === cardLanguage && styles.languageItemSelected,
                  ]}
                >
                  <Text style={styles.itemFlag}>{item.flag}</Text>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemNativeName, item.needsDownload && !isItemDownloading && styles.itemNeedsDownload]}>
                      {item.nativeName}
                    </Text>
                    <Text style={styles.itemName}>
                      {isItemDownloading
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
                  {isItemDownloading ? (
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
                    close();
                    onNavigateToSettings();
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
  );
}

const styles = StyleSheet.create({
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
