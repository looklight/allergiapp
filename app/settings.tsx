import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppLanguage, DownloadableLanguageCode } from '../types';
import i18n from '../utils/i18n';
import { DownloadProgress } from '../services/translationService';
import { theme } from '../constants/theme';
import { useAppContext } from '../contexts/AppContext';
import { Analytics } from '../services/analytics';
import { useLanguageDownload } from '../hooks/useLanguageDownload';
import DownloadableLanguagesSection from './components/DownloadableLanguagesSection';
import LegalDialogs from './components/LegalDialogs';

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
  const { downloadingLang, downloadProgress, handleDownloadLanguage: downloadLanguage } = useLanguageDownload();

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
          accessibilityRole="button"
          accessibilityLabel={i18n.t('settings.back')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        <View style={styles.appLanguageWrapper}>
          <Pressable
            onPress={() => setShowLangMenu(!showLangMenu)}
            style={styles.langPickerRow}
            accessibilityRole="button"
            accessibilityLabel={`${i18n.t('settings.appLanguage')}: ${APP_LANGUAGES.find((l) => l.code === appLang)?.name}`}
            accessibilityState={{ expanded: showLangMenu }}
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
                  accessibilityRole="radio"
                  accessibilityLabel={lang.name}
                  accessibilityState={{ checked: lang.code === appLang }}
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

        {/* Why Free - Perché è gratuita come header */}
        <Divider style={styles.sectionDivider} />
        <Pressable
          onPress={() => router.push('/about')}
          style={({ pressed }) => [styles.sectionHeaderRow, pressed && styles.settingsRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('settings.whyFree')}
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.whyFree')}</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSecondary}
            style={{ marginLeft: 'auto' }}
          />
        </Pressable>

        {/* Reset App */}
        <Divider style={styles.sectionDivider} />
        <Pressable
          onPress={handleResetApp}
          style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('settings.clearData')}
        >
          <MaterialCommunityIcons name="restart" size={22} color={theme.colors.error} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowTitle, { color: theme.colors.error }]}>{i18n.t('settings.clearData')}</Text>
          </View>
        </Pressable>

        {/* Footer Legal Links - Privacy e Disclaimer in basso */}
        <View style={styles.legalFooter}>
          <View style={styles.legalRow}>
            <Pressable
              onPress={() => setShowPrivacyDialog(true)}
              style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('settings.privacyPolicy')}
            >
              <Text style={styles.legalLinkText}>{i18n.t('settings.privacyPolicy')}</Text>
            </Pressable>

            <Text style={styles.legalSeparator} accessibilityElementsHidden>•</Text>

            <Pressable
              onPress={() => setShowDisclaimerDialog(true)}
              style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('settings.disclaimer')}
            >
              <Text style={styles.legalLinkText}>{i18n.t('settings.disclaimer')}</Text>
            </Pressable>
          </View>
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
    color: theme.colors.onPrimary,
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
    paddingVertical: 14,
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
  legalFooter: {
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  legalLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  legalLinkText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  legalSeparator: {
    fontSize: 13,
    color: theme.colors.textDisabled,
  },
});
