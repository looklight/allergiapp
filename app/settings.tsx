import { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import {
  Text,
  Button,
  Divider,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppLanguage, DownloadableLanguageCode, LanguageRegion, DownloadableLanguageInfo } from '../types';
import i18n from '../utils/i18n';
import { DOWNLOADABLE_LANGUAGES } from '../constants/downloadableLanguages';
import { DownloadProgress } from '../utils/translationService';
import { theme } from '../constants/theme';
import { useAppContext } from '../utils/AppContext';
import { Analytics } from '../utils/analytics';
import { useLanguageDownload } from '../hooks/useLanguageDownload';
import DownloadableLanguagesSection from './components/DownloadableLanguagesSection';
import LegalDialogs from './components/LegalDialogs';

const REGION_ICONS: Record<LanguageRegion, string> = {
  europe: '🇪🇺',
  asia: '🌏',
  africa: '🌍',
  other: '🌐',
};

const APP_LANGUAGES = [
  { code: 'it' as const, name: 'Italiano', flag: '🇮🇹' },
  { code: 'en' as const, name: 'English', flag: '🇬🇧' },
  { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
  { code: 'de' as const, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr' as const, name: 'Français', flag: '🇫🇷' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    settings,
    downloadedLanguageCodes,
    setAppLang: contextSetAppLang,
    saveDownloadedLanguage,
    deleteDownloadedLanguage: contextDeleteLanguage,
    clearAll,
  } = useAppContext();
  const appLang = settings.appLanguage;
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const { downloadingLang, downloadProgress, isDownloading, handleDownloadLanguage: downloadLanguage } = useLanguageDownload();

  // Blocca orientamento in portrait
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handleDownloadLanguage = async (langCode: DownloadableLanguageCode) => {
    await downloadLanguage(langCode, async (code, data) => {
      await saveDownloadedLanguage(code, data);
      Alert.alert('', i18n.t('settings.downloaded'));
    });
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
            await contextDeleteLanguage(langCode);
            await Analytics.logLanguageDeleted(langCode);
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      i18n.t('settings.clearData'),
      i18n.t('settings.clearDataConfirm'),
      [
        { text: i18n.t('settings.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.confirm'),
          style: 'destructive',
          onPress: async () => {
            await Analytics.logDataCleared();
            await clearAll();
            setRenderKey((k) => k + 1);
            // Feedback di successo
            Alert.alert('', i18n.t('settings.clearDataSuccess'));
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

  const handleAppLanguageChange = async (lang: string) => {
    const language = lang as AppLanguage;
    const previousLanguage = appLang;
    await contextSetAppLang(language);
    await Analytics.logAppLanguageChanged(previousLanguage, language);
    setRenderKey((k) => k + 1);
  };


  return (
    <View style={styles.container} key={renderKey}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        <View style={styles.appLanguageWrapper}>
          <Pressable
            onPress={() => setShowLangMenu(!showLangMenu)}
            style={styles.langPickerRow}
          >
            <MaterialCommunityIcons name="translate" size={22} color={theme.colors.primary} />
            <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.appLanguage')}</Text>
            <View style={styles.langPickerAnchor}>
              <Text style={styles.langPickerFlag}>
                {APP_LANGUAGES.find((l) => l.code === appLang)?.flag}
              </Text>
              <Text style={styles.langPickerLabel}>
                {APP_LANGUAGES.find((l) => l.code === appLang)?.name}
              </Text>
              <MaterialCommunityIcons
                name={showLangMenu ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
          </Pressable>
          {showLangMenu && (
            <View style={styles.langPickerOptions}>
              {APP_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    handleAppLanguageChange(lang.code);
                    setShowLangMenu(false);
                  }}
                  style={({ pressed }) => [
                    styles.langPickerOption,
                    lang.code === appLang && styles.langPickerOptionSelected,
                    pressed && styles.langPickerOptionPressed,
                  ]}
                >
                  <Text style={styles.langPickerOptionFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.langPickerOptionName,
                    lang.code === appLang && styles.langPickerOptionNameSelected,
                  ]}>
                    {lang.name}
                  </Text>
                  {lang.code === appLang && (
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <DownloadableLanguagesSection
          downloadedLanguageCodes={downloadedLanguageCodes}
          downloadingLang={downloadingLang}
          downloadProgress={downloadProgress}
          onDownload={handleDownloadLanguage}
          onDelete={handleDeleteLanguage}
        />

        {/* Informazioni e Privacy */}
        <Divider style={styles.sectionDivider} />
        <View>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="information-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.about')}</Text>
          </View>

          {/* Privacy e Disclaimer sulla stessa riga */}
          <View style={styles.twoColumnsRow}>
            <Pressable
              onPress={() => setShowPrivacyDialog(true)}
              style={({ pressed }) => [styles.halfButton, pressed && styles.settingsRowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.settingsRowTitle}>{i18n.t('settings.privacyPolicy')}</Text>
            </Pressable>

            <View style={styles.columnDivider} />

            <Pressable
              onPress={() => setShowDisclaimerDialog(true)}
              style={({ pressed }) => [styles.halfButton, pressed && styles.settingsRowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.settingsRowTitle}>{i18n.t('settings.disclaimer')}</Text>
            </Pressable>
          </View>

          <Divider style={styles.sectionDivider} />
          <Pressable
            onPress={handleResetApp}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="restart" size={22} color={theme.colors.error} />
            <View style={styles.settingsRowText}>
              <Text style={[styles.settingsRowTitle, { color: theme.colors.error }]}>{i18n.t('settings.clearData')}</Text>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LegalDialogs
        showPrivacyDialog={showPrivacyDialog}
        showDisclaimerDialog={showDisclaimerDialog}
        onDismissPrivacy={() => setShowPrivacyDialog(false)}
        onDismissDisclaimer={() => setShowDisclaimerDialog(false)}
      />
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
    backgroundColor: theme.colors.surface,
  },
  appLanguageWrapper: {
    paddingTop: 12,
  },
  langPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    minHeight: 56,
  },
  langPickerAnchor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
    marginLeft: 'auto',
  },
  langPickerFlag: {
    fontSize: 18,
  },
  langPickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  langPickerOptions: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  langPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  langPickerOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  langPickerOptionPressed: {
    backgroundColor: theme.colors.background,
    opacity: 0.7,
  },
  langPickerOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langPickerOptionName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  langPickerOptionNameSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sectionDivider: {
    marginVertical: 12,
    marginHorizontal: 16,
    backgroundColor: theme.colors.divider,
    height: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  settingsRowPressed: {
    opacity: 0.6,
  },
  settingsRowText: {
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  settingsRowDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  twoColumnsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
  },
  halfButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginVertical: 8,
  },
  downloadDesc: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.textPrimary,
    paddingVertical: 4,
  },
  clearSearch: {
    fontSize: 16,
    color: theme.colors.textDisabled,
    padding: 4,
  },
  languageCount: {
    fontSize: 12,
    color: theme.colors.textDisabled,
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
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  downloadedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  downloadedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 10,
    flexBasis: '47%',
  },
  downloadedChipFlag: {
    fontSize: 20,
  },
  downloadedChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  downloadedChipSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  // Lista lingue disponibili
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  languageItemPressed: {
    backgroundColor: theme.colors.background,
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
    color: theme.colors.textPrimary,
  },
  langName: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.primary,
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
    color: theme.colors.textSecondary,
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
    color: theme.colors.textDisabled,
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
    borderTopColor: theme.colors.border,
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
  iconAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
